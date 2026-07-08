/**
 * 전국 실거래 수집 오케스트레이터
 *
 * 실행:
 *   node scripts/import-nationwide.mjs --sido 26 --from 202506 --to 202606
 *   node scripts/import-nationwide.mjs --sido all --from 2025-06 --to 2026-06
 *   node scripts/import-nationwide.mjs --sido 26 --dry-run
 *   node scripts/import-nationwide.mjs --sido all --skip-existing
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import {
  NATIONWIDE_DISTRICTS,
  SIDO_CODES,
  getDistrictsBySido,
  getSidoName,
  getSidoShort,
} from "./lib/nationwide-districts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IMPORT_SCRIPT = path.join(__dirname, "import-molit-5years.mjs");
const DATA_DIR = path.join(ROOT, "data", "nationwide");
const BACKUP_DIR = path.join(DATA_DIR, "import-backup");
const PROGRESS_FILE = path.join(DATA_DIR, "progress.json");
const FAILED_FILE = path.join(DATA_DIR, "failed-districts.json");
const STOP_FLAG = path.join(DATA_DIR, "STOP-COLLECTION.flag");

const DISTRICT_DELAY_MS = 500;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;
const PROGRESS_SAVE_INTERVAL_MS = 5 * 60 * 1000;

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const SIDO_ARG = getArg("sido", null);
const FROM_RAW = getArg("from", "2025-06");
const TO_RAW = getArg("to", "2026-06");
const DRY_RUN = args.includes("--dry-run");
const SKIP_EXISTING = args.includes("--skip-existing");

if (!SIDO_ARG) {
  console.error("사용법: node scripts/import-nationwide.mjs --sido <코드|all> [--from YYYYMM] [--to YYYYMM]");
  console.error("시도코드:", SIDO_CODES.join(", "));
  process.exit(1);
}

/** YYYYMM 또는 YYYY-MM → YYYY-MM */
function normalizeYm(raw) {
  const s = String(raw).trim();
  if (/^\d{6}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
  }
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  throw new Error(`기간 형식 오류: ${raw} (YYYYMM 또는 YYYY-MM)`);
}

const FROM = normalizeYm(FROM_RAW);
const TO = normalizeYm(TO_RAW);

function countMonths(fromYm, toYm) {
  const [fy, fm] = fromYm.split("-").map(Number);
  const [ty, tm] = toYm.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm) + 1;
}

const MONTH_COUNT = countMonths(FROM, TO);

function resolveTargetSidos() {
  if (SIDO_ARG === "all") return SIDO_CODES;
  const codes = SIDO_ARG.split(",").map((s) => s.trim());
  for (const c of codes) {
    if (!NATIONWIDE_DISTRICTS[c]) {
      throw new Error(`알 수 없는 시도코드: ${c}`);
    }
  }
  return codes;
}

function buildTaskList(sidoCodes) {
  const tasks = [];
  for (const sidoCode of sidoCodes) {
    const districts = getDistrictsBySido(sidoCode);
    for (const d of districts) {
      tasks.push({
        sidoCode,
        sidoName: getSidoName(sidoCode),
        sidoShort: getSidoShort(sidoCode),
        code: d.code,
        name: d.name,
      });
    }
  }
  return tasks;
}

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) {
    return { completed: [], failed: [], skipped: [], startedAt: null };
  }
  return JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
}

function saveProgress(progress) {
  progress.updatedAt = new Date().toISOString();
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function saveFailedDistricts(failedList, meta = {}) {
  writeFileSync(
    FAILED_FILE,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        from: FROM,
        to: TO,
        sidoCodes,
        ...meta,
        districts: failedList,
      },
      null,
      2
    )
  );
}

function isStopRequested() {
  return existsSync(STOP_FLAG);
}

function parseNewTransactions(stdout) {
  let total = 0;
  const buy = stdout.match(/매매 거래 수:[\s\S]*?신규 ([\d,]+)/);
  const rent = stdout.match(/전세 거래 수:[\s\S]*?신규 ([\d,]+)/);
  if (buy) total += parseInt(buy[1].replace(/,/g, ""), 10);
  if (rent) total += parseInt(rent[1].replace(/,/g, ""), 10);
  return total;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function runImportOnce(district) {
  return new Promise((resolve, reject) => {
    const childArgs = [
      IMPORT_SCRIPT,
      "--lawd",
      district.code,
      "--from",
      FROM,
      "--to",
      TO,
      "--jeonse-only",
    ];
    let stdout = "";
    const child = spawn(process.execPath, childArgs, {
      cwd: ROOT,
      env: process.env,
    });
    child.stdout?.on("data", (d) => {
      stdout += d.toString();
      process.stdout.write(d);
    });
    child.stderr?.on("data", (d) => process.stderr.write(d));
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, newTx: parseNewTransactions(stdout) });
      } else {
        reject(new Error(`exit ${code}`));
      }
    });
  });
}

async function runImportWithRetry(district) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await runImportOnce(district);
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        console.warn(`  ↻ 재시도 ${attempt}/${MAX_RETRIES - 1} (${district.name})...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw lastErr;
}

let supabase = null;

async function initSupabase() {
  if (DRY_RUN) return;
  loadEnvLocal();
  requireEnv(["MOLIT_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function hasExistingData(code) {
  if (!supabase) return false;
  const { count, error } = await supabase
    .from("apartments")
    .select("id", { count: "exact", head: true })
    .eq("sigungu_code", code);
  if (error) throw new Error(error.message);
  return (count || 0) > 0;
}

const started = Date.now();
const sidoCodes = resolveTargetSidos();
const tasks = buildTaskList(sidoCodes);

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(BACKUP_DIR, { recursive: true });

const apiCallsPerDistrict = MONTH_COUNT * 2;
const totalApiCalls = tasks.length * apiCallsPerDistrict;

console.log("=== 전국 실거래 수집 오케스트레이터 ===");
console.log(`시도: ${sidoCodes.map((c) => `${c} ${getSidoShort(c)}`).join(", ")}`);
console.log(`기간: ${FROM} ~ ${TO} (${MONTH_COUNT}개월)`);
console.log(`대상 시군구: ${tasks.length}개`);
console.log(`예상 API 호출: ${totalApiCalls.toLocaleString()}회 (시군구×${MONTH_COUNT}개월×매매/전세)`);
if (SKIP_EXISTING) console.log("옵션: --skip-existing (DB에 단지 있는 구역 건너뜀)");
if (DRY_RUN) console.log("옵션: --dry-run (API 호출 없음)\n");

if (DRY_RUN) {
  console.log("--- 호출 예정 목록 ---");
  tasks.forEach((t, i) => {
    console.log(
      `  [${i + 1}/${tasks.length}] ${t.sidoShort} ${t.name} (${t.code}) — API ${apiCallsPerDistrict}회`
    );
  });
  console.log(`\n총 API 호출 예정: ${totalApiCalls.toLocaleString()}회`);
  process.exit(0);
}

await initSupabase();

const progress = loadProgress();
if (!progress.startedAt) progress.startedAt = new Date().toISOString();
progress.run = { from: FROM, to: TO, sidoCodes, totalTasks: tasks.length };
let lastProgressSaveAt = Date.now();

function maybeSaveProgress(force = false) {
  const now = Date.now();
  if (force || now - lastProgressSaveAt >= PROGRESS_SAVE_INTERVAL_MS) {
    saveProgress(progress);
    lastProgressSaveAt = now;
  }
}

const results = { success: 0, failed: 0, skipped: 0, newTx: 0 };
const failedList = [];

for (let i = 0; i < tasks.length; i++) {
  if (isStopRequested()) {
    console.warn("\n🛑 STOP-COLLECTION.flag 감지 — 수집을 정상 종료합니다.");
    progress.stoppedAt = new Date().toISOString();
    progress.stopReason = "STOP-COLLECTION.flag";
    saveProgress(progress);
    saveFailedDistricts(failedList, { stopped: true });
    break;
  }

  const t = tasks[i];
  const label = `[${i + 1}/${tasks.length}] ${t.sidoShort} ${t.name} (${t.code})`;

  if (SKIP_EXISTING) {
    const exists = await hasExistingData(t.code);
    if (exists) {
      console.log(`⏭️  ${label} — DB 기존 데이터 있음, 건너뜀`);
      progress.skipped = [...new Set([...(progress.skipped || []), t.code])];
      saveProgress(progress);
      results.skipped++;
      continue;
    }
  }

  console.log(`\n${label} 수집 중...`);
  try {
    const { newTx } = await runImportWithRetry(t);
    results.success++;
    results.newTx += newTx;
    progress.completed = [...new Set([...progress.completed, t.code])];
    progress.failed = (progress.failed || []).filter((f) => f.code !== t.code);
    progress.lastSuccess = { code: t.code, name: t.name, sido: t.sidoCode, at: new Date().toISOString() };
    maybeSaveProgress(true);
    console.log(`✅ ${label} 완료 (${newTx.toLocaleString()}건 신규)`);
  } catch (err) {
    results.failed++;
    const fail = {
      code: t.code,
      name: t.name,
      sido: t.sidoCode,
      sidoShort: t.sidoShort,
      error: err.message,
      at: new Date().toISOString(),
    };
    failedList.push(fail);
    progress.failed = [...(progress.failed || []).filter((f) => f.code !== t.code), fail];
    progress.lastFailure = fail;
    saveFailedDistricts(failedList);
    maybeSaveProgress(true);
    console.error(`❌ ${label} 실패: ${err.message} — 다음 구역으로 진행`);
  }

  maybeSaveProgress();
  if (i < tasks.length - 1) await sleep(DISTRICT_DELAY_MS);
}

progress.finishedAt = new Date().toISOString();
progress.results = results;
saveProgress(progress);
if (failedList.length) saveFailedDistricts(failedList);

const elapsed = Math.round((Date.now() - started) / 1000);
console.log("\n========== 전국 수집 요약 ==========");
console.log(`성공: ${results.success}/${tasks.length}`);
console.log(`건너뜀: ${results.skipped}`);
console.log(`실패: ${results.failed}`);
console.log(`신규 거래: ${results.newTx.toLocaleString()}건`);
console.log(`소요: ${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`);
if (failedList.length) {
  console.log("실패 목록:", failedList.map((f) => `${f.name}(${f.code})`).join(", "));
}
console.log("진행 현황: node scripts/report-nationwide-progress.mjs");
console.log("====================================");

if (results.failed > 0) process.exit(1);
