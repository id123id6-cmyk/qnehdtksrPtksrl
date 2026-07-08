/**
 * 전국 6개월 실거래 수집 — 자동 실행·모니터링·보고서 생성
 *
 * 실행: node scripts/run-nationwide-collection.mjs
 */
import { spawn, execSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  appendFileSync,
  existsSync,
  openSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import {
  SIDO_CODES,
  getDistrictsBySido,
  getSidoName,
  getSidoShort,
} from "./lib/nationwide-districts.mjs";
import { estimateDbMb } from "./lib/estimate-db-size.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data", "nationwide");

const IMPORT_LOG = path.join(DATA_DIR, "import-6months.log");
const IMPORT_ERR = path.join(DATA_DIR, "import-6months.err.log");
const IMPORT_PID = path.join(DATA_DIR, "import.pid");
const GUARD_PID = path.join(DATA_DIR, "guard.pid");
const GUARD_LOG = path.join(DATA_DIR, "volume-guard.log");
const PROGRESS_FILE = path.join(DATA_DIR, "progress.json");
const FAILED_FILE = path.join(DATA_DIR, "failed-districts.json");
const STOP_FLAG = path.join(DATA_DIR, "STOP-COLLECTION.flag");
const MONITOR_LOG = path.join(DATA_DIR, "monitoring-log.md");

const TARGET_SIDO = SIDO_CODES.filter((c) => c !== "11" && c !== "41");
const TARGET_TOTAL = TARGET_SIDO.reduce((n, c) => n + getDistrictsBySido(c).length, 0);

const BASELINE = { rows: 567663, mb: 243.6, txs: 552740, apts: 14923 };
const STARTED_AT = new Date();

const MONITOR_INTERVAL_MS = 10 * 60 * 1000;
const MAX_MONITOR_MS = 6 * 60 * 60 * 1000;
const INITIAL_WAIT_MS = 2 * 60 * 1000;
const STALL_THRESHOLD_MS = 30 * 60 * 1000;
const WARN_MB = 450;
const STOP_MB = 480;

const reportDate = STARTED_AT.toISOString().slice(0, 10).replace(/-/g, "");
const REPORT_FILE = path.join(DATA_DIR, `collection-report-${reportDate}.md`);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatKst(date = new Date()) {
  return date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}

function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    execSync(`tasklist /FI "PID eq ${pid}" /NH`, { stdio: "pipe" });
    const out = execSync(`tasklist /FI "PID eq ${pid}" /NH`, { encoding: "utf8" });
    return out.includes(String(pid));
  } catch {
    return false;
  }
}

function killProcess(pid) {
  if (!pid || !isProcessAlive(pid)) return;
  try {
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: "pipe" });
  } catch (_) {}
}

function spawnDetached(args, logPath, errPath) {
  const out = openSync(logPath, "a");
  const err = openSync(errPath, "a");
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", out, err],
    env: process.env,
    windowsHide: true,
  });
  child.unref();
  return child.pid;
}

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
  } catch {
    return null;
  }
}

function appendMonitor(text) {
  appendFileSync(MONITOR_LOG, text + "\n");
  console.log(text);
}

async function getDbStats() {
  loadEnvLocal();
  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return estimateDbMb(supabase);
}

async function countDoneDistricts() {
  loadEnvLocal();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const codes = new Set();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("apartments")
      .select("sigungu_code")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const row of data) {
      const sido = row.sigungu_code?.slice(0, 2);
      if (TARGET_SIDO.includes(sido)) codes.add(row.sigungu_code);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  return codes.size;
}

function readLogTail(file, lines = 40) {
  if (!existsSync(file)) return "";
  const content = readFileSync(file, "utf8");
  return content.split("\n").slice(-lines).join("\n");
}

function detectCompletion(importPid, progress, logTail) {
  if (logTail.includes("========== 전국 수집 요약 ==========")) return true;
  if (!isProcessAlive(importPid)) return true;
  const done = progress?.completed?.filter((c) => TARGET_SIDO.includes(c.slice(0, 2))).length || 0;
  if (done >= TARGET_TOTAL) return true;
  return false;
}

async function generateReport(finishedAt, anomalies) {
  const stats = await getDbStats();
  const progress = loadProgress();
  const failed = existsSync(FAILED_FILE)
    ? JSON.parse(readFileSync(FAILED_FILE, "utf8"))
    : { districts: [] };

  const elapsedMin = Math.round((finishedAt - STARTED_AT) / 60000);
  const sidoRows = [];

  loadEnvLocal();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const bySido = new Map();
  for (const s of TARGET_SIDO) bySido.set(s, { codes: new Set(), aptIds: [] });
  let aptFrom = 0;
  while (true) {
    const { data: apts, error: aptErr } = await supabase
      .from("apartments")
      .select("id, sigungu_code")
      .range(aptFrom, aptFrom + 999);
    if (aptErr) throw new Error(aptErr.message);
    if (!apts?.length) break;
    for (const a of apts) {
      const sido = a.sigungu_code?.slice(0, 2);
      if (!bySido.has(sido)) continue;
      bySido.get(sido).codes.add(a.sigungu_code);
      bySido.get(sido).aptIds.push(a.id);
    }
    if (apts.length < 1000) break;
    aptFrom += 1000;
  }

  for (const sidoCode of TARGET_SIDO) {
    const total = getDistrictsBySido(sidoCode).length;
    const info = bySido.get(sidoCode);
    const done = info?.codes?.size || 0;
    const failedInSido = (failed.districts || []).filter((f) => f.sido === sidoCode).length;
    let txCount = 0;
    const ids = info?.aptIds || [];
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { count } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .in("apartment_id", chunk);
      txCount += count || 0;
    }
    sidoRows.push({
      sidoCode,
      name: getSidoShort(sidoCode),
      total,
      done,
      failed: failedInSido,
      txs: txCount,
    });
  }

  const newRows = stats.rows - BASELINE.rows;
  const newMb = Math.round((stats.mb - BASELINE.mb) * 10) / 10;

  let md = `# 전국 6개월치 실거래가 수집 완료 보고서\n\n`;
  md += `## 📊 최종 통계\n`;
  md += `- 시작 시각: ${formatKst(STARTED_AT)}\n`;
  md += `- 완료 시각: ${formatKst(finishedAt)}\n`;
  md += `- 총 소요 시간: ${Math.floor(elapsedMin / 60)}시간 ${elapsedMin % 60}분\n\n`;
  md += `## 📈 데이터 증가\n`;
  md += `- 이전: ${BASELINE.rows.toLocaleString()}행 (${BASELINE.mb}MB)\n`;
  md += `- 이후: ${stats.rows.toLocaleString()}행 (${stats.mb}MB)\n`;
  md += `- 증가: +${newRows.toLocaleString()}행 (+${newMb}MB)\n\n`;
  md += `## ✅ 시도별 수집 결과\n`;
  md += `| 시도 | 시군구 수 | 완료 | 실패 | 신규 거래 |\n`;
  md += `|---|---:|---:|---:|---:|\n`;
  for (const r of sidoRows) {
    md += `| ${r.name} | ${r.total} | ${r.done} | ${r.failed} | ${r.txs.toLocaleString()} |\n`;
  }
  md += `\n## ❌ 실패 시군구\n`;
  if (failed.districts?.length) {
    for (const f of failed.districts) {
      md += `- ${f.sidoShort || f.sido} ${f.name} (${f.code}) — ${f.error}\n`;
    }
  } else {
    md += `- 없음\n`;
  }
  md += `\n## 🔍 이상 징후\n`;
  if (anomalies.length) {
    for (const a of anomalies) md += `- ${a}\n`;
  } else {
    md += `- 없음\n`;
  }
  md += `\n## 🎯 다음 단계\n`;
  const allDone = sidoRows.every((r) => r.done >= r.total);
  md += allDone
    ? `- Step 4: 지도 UI에 전국 데이터 반영 가능\n`
    : `- 실패·미완료 시군구 재수집 후 Step 4 진행\n`;

  writeFileSync(REPORT_FILE, md, "utf8");
  return { md, stats, sidoRows, allDone, failed: failed.districts || [] };
}

// ─── 1. 사전 확인 ───
mkdirSync(DATA_DIR, { recursive: true });
if (existsSync(STOP_FLAG)) unlinkSync(STOP_FLAG);
if (existsSync(PROGRESS_FILE)) {
  renameSync(PROGRESS_FILE, path.join(DATA_DIR, "progress.prev.json"));
}

writeFileSync(
  MONITOR_LOG,
  `# 전국 수집 모니터링 로그\n\n시작: ${formatKst(STARTED_AT)}\n\n`,
  "utf8"
);

const baseline = await getDbStats();
appendMonitor(`## 기준선 (${formatKst()})\n- DB: ${baseline.rows.toLocaleString()}행, ${baseline.mb}MB\n`);

// ─── 2. 수집 프로세스 ───
const importArgs = [
  path.join("scripts", "import-nationwide.mjs"),
  "--sido",
  TARGET_SIDO.join(","),
  "--from",
  "202601",
  "--to",
  "202606",
  "--skip-existing",
];
loadEnvLocal();
const importPid = spawnDetached(importArgs, IMPORT_LOG, IMPORT_ERR);
writeFileSync(IMPORT_PID, String(importPid));
appendMonitor(`\n## 프로세스 시작\n- import PID: ${importPid}\n`);

// ─── 3. 용량 감시 ───
const guardPid = spawnDetached(
  [path.join("data", "nationwide", "volume-guard.mjs")],
  GUARD_LOG,
  GUARD_LOG
);
writeFileSync(GUARD_PID, String(guardPid));
appendMonitor(`- guard PID: ${guardPid}\n`);

// ─── 4. 초기 검증 (2분) ───
appendMonitor(`\n## 초기 검증 (2분 대기...)\n`);
await sleep(INITIAL_WAIT_MS);

const aliveAfter2m = isProcessAlive(importPid);
const logTail2m = readLogTail(IMPORT_LOG, 50);
const errTail2m = readLogTail(IMPORT_ERR, 20);
const startedBusan = logTail2m.includes("26110") || logTail2m.includes("부산");

appendMonitor(`- import 프로세스: ${aliveAfter2m ? "✅ 실행 중" : "❌ 종료됨"}`);
appendMonitor(`- 부산 수집 시작: ${startedBusan ? "✅" : "⚠️ 미확인"}`);
if (errTail2m.trim()) appendMonitor(`- stderr (최근):\n\`\`\`\n${errTail2m}\n\`\`\``);

if (!aliveAfter2m && !logTail2m.includes("전국 수집 요약")) {
  appendMonitor(`\n**❌ 초기 검증 실패 — 프로세스 조기 종료. 자동 재시작하지 않음.**\n`);
  killProcess(guardPid);
  process.exit(1);
}

// ─── 5. 주기적 모니터링 ───
const anomalies = [];
let lastDone = await countDoneDistricts();
let lastProgressAt = Date.now();
const monitorStart = Date.now();

while (Date.now() - monitorStart < MAX_MONITOR_MS) {
  await sleep(MONITOR_INTERVAL_MS);

  const now = new Date();
  const progress = loadProgress();
  const done = await countDoneDistricts();
  const pct = Math.round((done / TARGET_TOTAL) * 1000) / 10;
  const db = await getDbStats();
  const importAlive = isProcessAlive(importPid);
  const logTail = readLogTail(IMPORT_LOG, 30);

  if (done > lastDone) {
    lastProgressAt = Date.now();
    lastDone = done;
  } else if (Date.now() - lastProgressAt >= STALL_THRESHOLD_MS && importAlive) {
    const msg = `${formatKst(now)}: 30분간 진행률 정체 (${done}/${TARGET_TOTAL})`;
    if (!anomalies.includes(msg)) anomalies.push(msg);
    appendMonitor(`\n⚠️ ${msg}`);
    if (logTail.includes("429")) {
      anomalies.push("API 429 감지 — 30분 대기 후 import 재시작 시도");
      appendMonitor(`⚠️ API 429 — 30분 대기...`);
      killProcess(importPid);
      await sleep(30 * 60 * 1000);
      if (!existsSync(STOP_FLAG)) {
        const newPid = spawnDetached(importArgs, IMPORT_LOG, IMPORT_ERR);
        writeFileSync(IMPORT_PID, String(newPid));
        appendMonitor(`↻ import 재시작 PID: ${newPid}`);
        lastProgressAt = Date.now();
      }
    }
  }

  const failCount = progress?.failed?.length || 0;
  if (failCount >= 5) {
    const msg = `실패 시군구 ${failCount}개 — API 이슈 의심`;
    if (!anomalies.some((a) => a.includes("실패 시군구"))) anomalies.push(msg);
  }

  if (db.mb >= WARN_MB && db.mb < STOP_MB) {
    appendMonitor(`⚠️ 용량 경고: ${db.mb}MB >= ${WARN_MB}MB`);
  }
  if (db.mb >= STOP_MB && !existsSync(STOP_FLAG)) {
    writeFileSync(STOP_FLAG, JSON.stringify({ at: now.toISOString(), mb: db.mb }), "utf8");
    anomalies.push(`용량 ${db.mb}MB — STOP flag 생성`);
  }

  const elapsed = Date.now() - STARTED_AT.getTime();
  const etaMs = done > 0 ? (elapsed / done) * (TARGET_TOTAL - done) : null;
  const etaStr = etaMs ? formatKst(new Date(Date.now() + etaMs)) : "계산 중";

  appendMonitor(
    `\n### ${formatKst(now)}\n` +
      `- 완료: ${done}/${TARGET_TOTAL} (${pct}%)\n` +
      `- 용량: ${db.mb}MB\n` +
      `- 프로세스: ${importAlive ? "실행 중" : "종료"}\n` +
      `- 마지막 성공: ${progress?.lastSuccess ? `${progress.lastSuccess.name} (${progress.lastSuccess.code})` : "-"}\n` +
      `- 마지막 실패: ${progress?.lastFailure ? `${progress.lastFailure.name}` : "-"}\n` +
      `- 예상 완료: ${etaStr}\n`
  );

  if (detectCompletion(importPid, progress, logTail)) {
    appendMonitor(`\n## 완료 감지 (${formatKst()})\n`);
    break;
  }
}

// ─── 6. 정리 및 최종 검증 ───
const guardPidNum = parseInt(readFileSync(GUARD_PID, "utf8"), 10);
killProcess(guardPidNum);

const finishedAt = new Date();
let reportOut;
try {
  execSync("node scripts/report-nationwide-progress.mjs", { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
} catch (_) {}

try {
  reportOut = await generateReport(finishedAt, anomalies);
  writeFileSync(REPORT_FILE, reportOut.md);
} catch (err) {
  appendMonitor(`\n보고서 생성 오류: ${err.message}`);
}

appendMonitor(`\n## 최종 완료\n- 보고서: ${REPORT_FILE}\n`);
console.log("\n========== 수집 오케스트레이터 종료 ==========");
if (reportOut) {
  console.log(`완료: ${reportOut.stats.rows}행, ${reportOut.stats.mb}MB`);
  console.log(`Step 4 가능: ${reportOut.allDone ? "Yes" : "No"}`);
}
