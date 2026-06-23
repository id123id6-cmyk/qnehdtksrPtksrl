/**
 * 경기도 누락 구역만 MOLIT 수집 (DB에 단지 0건인 LAWD)
 * 실행: node scripts/import-gyeonggi-missing.mjs
 * 옵션: --from 2025-06 --to 2026-06 --max-mb 495 --dry-run
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import { GYEONGGI_DISTRICTS } from "./lib/gyeonggi-districts.mjs";
import { DEFAULT_MAX_MB, estimateDbMb } from "./lib/estimate-db-size.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IMPORT_SCRIPT = path.join(__dirname, "import-molit-5years.mjs");
const BACKUP_DIR = path.join(ROOT, "data", "gyeonggi", "import-backup");
const PROGRESS_FILE = path.join(BACKUP_DIR, "missing-progress.json");

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const FROM = getArg("from", "2025-06");
const TO = getArg("to", "2026-06");
const MAX_MB = parseInt(getArg("max-mb", String(DEFAULT_MAX_MB)), 10);
const MAX_CONSECUTIVE_ERRORS = 5;
const DRY_RUN = args.includes("--dry-run");

loadEnvLocal();
requireEnv(["MOLIT_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function countAptsForCode(code) {
  const { count, error } = await supabase
    .from("apartments")
    .select("id", { count: "exact", head: true })
    .eq("sigungu_code", code);
  if (error) throw new Error(error.message);
  return count || 0;
}

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return { completed: [], failed: [], startedAt: null };
  return JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function runImport(district) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [IMPORT_SCRIPT, "--lawd", district.code, "--from", FROM, "--to", TO, "--jeonse-only"],
      { cwd: ROOT, env: process.env }
    );
    let stdout = "";
    child.stdout?.on("data", (d) => {
      stdout += d.toString();
      process.stdout.write(d);
    });
    child.stderr?.on("data", (d) => process.stderr.write(d));
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${district.name} exit ${code}`));
    });
  });
}

mkdirSync(BACKUP_DIR, { recursive: true });

const before = await estimateDbMb(supabase);
const missing = [];

for (const d of GYEONGGI_DISTRICTS) {
  const apt = await countAptsForCode(d.code);
  if (apt === 0) missing.push(d);
}

console.log("=== 경기도 누락 구역 수집 ===");
console.log(`기간: ${FROM} ~ ${TO}`);
console.log(
  `작업 전 추정 용량: ~${before.mb} MB (Supabase 실측 보정, ${before.rows.toLocaleString()} rows)`
);
console.log(`용량 한도: ${MAX_MB} MB (Free 500MB 기준)`);
console.log(`누락 구역: ${missing.length}개`);
missing.forEach((d, i) => console.log(`  ${i + 1}. ${d.name} (${d.code})`));

if (DRY_RUN) process.exit(0);
if (missing.length === 0) {
  console.log("누락 구역 없음 — 종료");
  process.exit(0);
}

if (before.mb >= MAX_MB) {
  console.error(`⚠️ 이미 용량 ${before.mb} MB >= 한도 ${MAX_MB} MB — 수집 중단`);
  process.exit(2);
}

const progress = loadProgress();
if (!progress.startedAt) progress.startedAt = new Date().toISOString();

let consecutiveErrors = 0;
const started = Date.now();
const sessionStats = { districts: 0, addedRows: 0 };

for (let i = 0; i < missing.length; i++) {
  const d = missing[i];
  if (progress.completed.includes(d.code)) {
    console.log(`⏭️ ${d.name} — 이미 완료`);
    continue;
  }

  const rowsBefore = (await estimateDbMb(supabase)).rows;
  console.log(`\n[${i + 1}/${missing.length}] ${d.name}(${d.code}) 수집 시작...`);

  try {
    await runImport(d);
    const after = await estimateDbMb(supabase);
    const added = after.rows - rowsBefore;
    sessionStats.districts++;
    sessionStats.addedRows += added;
    progress.completed = [...new Set([...progress.completed, d.code])];
    progress.failed = progress.failed.filter((f) => f.code !== d.code);
    saveProgress(progress);
    consecutiveErrors = 0;
    console.log(`✅ ${d.name} 완료 | +${added.toLocaleString()} rows | 용량 ~${after.mb} MB`);

    if (after.mb >= MAX_MB) {
      console.error(`\n⚠️ 용량 ${after.mb} MB >= ${MAX_MB} MB — 중단`);
      break;
    }
  } catch (err) {
    consecutiveErrors++;
    const fail = { code: d.code, name: d.name, error: err.message, at: new Date().toISOString() };
    progress.failed = [...progress.failed.filter((f) => f.code !== d.code), fail];
    saveProgress(progress);
    console.error(`❌ ${d.name} 실패 (${consecutiveErrors}회 연속): ${err.message}`);
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error("⚠️ API 오류 5회 연속 — 중단");
      break;
    }
  }
}

const afterAll = await estimateDbMb(supabase);
const elapsed = Math.round((Date.now() - started) / 1000);

console.log("\n========== 누락 구역 수집 요약 ==========");
console.log(`완료 구역: ${sessionStats.districts}개`);
console.log(`추가 rows(추정): +${sessionStats.addedRows.toLocaleString()}`);
console.log(`용량: ${before.mb} MB → ${afterAll.mb} MB`);
console.log(`소요: ${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`);
console.log("========================================");
