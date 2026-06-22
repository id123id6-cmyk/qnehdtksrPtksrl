/**
 * 경기도 시·군·구 MOLIT 실거래 수집 → Supabase + JSON 백업
 *
 * 실행:
 *   node scripts/import-gyeonggi-31cities.mjs
 *   node scripts/import-gyeonggi-31cities.mjs --from 2024-06 --to 2026-06
 *   node scripts/import-gyeonggi-31cities.mjs --start 10 --limit 5   # 분산 수집
 *   node scripts/import-gyeonggi-31cities.mjs --dry-run
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import { GYEONGGI_DISTRICTS } from "./lib/gyeonggi-districts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IMPORT_SCRIPT = path.join(__dirname, "import-molit-5years.mjs");
const BACKUP_DIR = path.join(ROOT, "data", "gyeonggi", "import-backup");
const PROGRESS_FILE = path.join(BACKUP_DIR, "progress.json");

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const FROM = getArg("from", "2024-06");
const TO = getArg("to", "2026-06");
const START = parseInt(getArg("start", "0"), 10);
const LIMIT = getArg("limit", null);
const DRY_RUN = args.includes("--dry-run");
const SKIP_DONE = args.includes("--skip-done");
const MAX_MB = parseInt(getArg("max-mb", "450"), 10);

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function estimateDbMb() {
  const [{ count: apts }, { count: txs }] = await Promise.all([
    supabase.from("apartments").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
  ]);
  return Math.round((((apts || 0) + (txs || 0)) * 1024) / 1024 / 1024 * 10) / 10;
}

const districts = LIMIT
  ? GYEONGGI_DISTRICTS.slice(START, START + parseInt(LIMIT, 10))
  : GYEONGGI_DISTRICTS.slice(START);

mkdirSync(BACKUP_DIR, { recursive: true });

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return { completed: [], failed: [], startedAt: null };
  return JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function runImport(district) {
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
      const backup = {
        code: district.code,
        name: district.name,
        from: FROM,
        to: TO,
        finishedAt: new Date().toISOString(),
        exitCode: code,
        summary: stdout.slice(-2000),
      };
      writeFileSync(
        path.join(BACKUP_DIR, `${district.code}-${district.slug}.json`),
        JSON.stringify(backup, null, 2)
      );
      if (code === 0) resolve(backup);
      else reject(new Error(`${district.name} exit ${code}`));
    });
  });
}

const started = Date.now();
const progress = loadProgress();
if (!progress.startedAt) progress.startedAt = new Date().toISOString();

console.log("=== 경기도 실거래 수집 (매매+전세) ===");
console.log(`기간: ${FROM} ~ ${TO}`);
console.log(`대상: ${districts.length}개 구역 (전체 ${GYEONGGI_DISTRICTS.length}개 중 ${START}번째부터)`);
if (DRY_RUN) {
  districts.forEach((d, i) => console.log(`  ${START + i + 1}. ${d.name} (${d.code})`));
  process.exit(0);
}

let apiCallsEstimate = districts.length * 13 * 2;
console.log(`예상 API 호출: ~${apiCallsEstimate}회 (월×매매/전세)`);
console.log(`용량 한도: ${MAX_MB} MB`);
console.log("백업:", BACKUP_DIR, "\n");

let sessionCompleted = 0;

for (let i = 0; i < districts.length; i++) {
  const d = districts[i];
  const idx = START + i + 1;

  if (SKIP_DONE && progress.completed.includes(d.code)) {
    console.log(`⏭️ [${idx}/${GYEONGGI_DISTRICTS.length}] ${d.name} — 이미 완료`);
    continue;
  }

  console.log(`\n[${idx}/${GYEONGGI_DISTRICTS.length}] ${d.name}(${d.code}) 수집 시작...`);
  try {
    await runImport(d);
    progress.completed = [...new Set([...progress.completed, d.code])];
    progress.failed = progress.failed.filter((f) => f.code !== d.code);
    saveProgress(progress);
    sessionCompleted++;
    const estMb = await estimateDbMb();
    console.log(`✅ [${idx}/${GYEONGGI_DISTRICTS.length}] ${d.name} 완료 | 추정 용량 ~${estMb} MB`);

    if (sessionCompleted % 5 === 0) {
      console.log(`\n📊 [${sessionCompleted}구역 완료] 누적 ${progress.completed.length}/${GYEONGGI_DISTRICTS.length} | 용량 ~${estMb} MB\n`);
    }

    if (estMb > MAX_MB) {
      console.error(`\n⚠️ 용량 ${estMb} MB > ${MAX_MB} MB 한도 — 수집 중단`);
      process.exit(2);
    }
  } catch (err) {
    const fail = { code: d.code, name: d.name, error: err.message, at: new Date().toISOString() };
    progress.failed = [...progress.failed.filter((f) => f.code !== d.code), fail];
    saveProgress(progress);
    console.error(`❌ [${idx}/${GYEONGGI_DISTRICTS.length}] ${d.name} 실패: ${err.message}`);
    console.error("⚠️ 중단 — 재개: node scripts/import-gyeonggi-31cities.mjs --skip-done");
    process.exit(1);
  }
}

const elapsed = Math.round((Date.now() - started) / 1000);
console.log("\n========== 경기도 수집 요약 ==========");
console.log(`완료: ${progress.completed.length}/${GYEONGGI_DISTRICTS.length}`);
console.log(`실패: ${progress.failed.length}`);
console.log(`소요: ${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`);
console.log("통계: node scripts/report-gyeonggi-stats.mjs");
console.log("====================================");
