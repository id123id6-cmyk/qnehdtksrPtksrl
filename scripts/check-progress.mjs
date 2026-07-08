/**
 * 전국 수집 진행률 실시간 확인 (회사·원격 모니터링용)
 *
 * 실행: node scripts/check-progress.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import {
  SIDO_CODES,
  getDistrictsBySido,
  getSidoShort,
} from "./lib/nationwide-districts.mjs";
import { estimateDbMb } from "./lib/estimate-db-size.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data", "nationwide");
const PROGRESS_FILE = path.join(DATA_DIR, "progress.json");
const STOP_FLAG = path.join(DATA_DIR, "STOP-COLLECTION.flag");

const TARGET_SIDO = SIDO_CODES.filter((c) => c !== "11" && c !== "41");
const TARGET_DISTRICTS = TARGET_SIDO.reduce(
  (n, c) => n + getDistrictsBySido(c).length,
  0
);

const SUPABASE_FREE_MB = 500;

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
  } catch {
    return null;
  }
}

function formatKst(date = new Date()) {
  return date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}

function formatEta(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "계산 중";
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `약 ${min}분 후`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `약 ${h}시간 ${m}분 후`;
}

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const { rows, mb } = await estimateDbMb(supabase);
const freePct = Math.round((mb / SUPABASE_FREE_MB) * 1000) / 10;

async function fetchTargetDistrictCodes(supabase) {
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
  return codes;
}

const codesWithData = await fetchTargetDistrictCodes(supabase);

const doneCount = codesWithData.size;
const pct = Math.round((doneCount / TARGET_DISTRICTS) * 1000) / 10;

const progress = loadProgress();
const completedFromFile = progress?.completed?.filter((code) => {
  const sido = code.slice(0, 2);
  return TARGET_SIDO.includes(sido);
}).length;

const startedAt = progress?.startedAt ? new Date(progress.startedAt) : null;
const elapsedMs = startedAt ? Date.now() - startedAt.getTime() : 0;
const processed = Math.max(doneCount, completedFromFile, 0);
const etaMs =
  processed > 0 && processed < TARGET_DISTRICTS
    ? (elapsedMs / processed) * (TARGET_DISTRICTS - processed)
    : null;

const etaTime = etaMs ? new Date(Date.now() + etaMs) : null;

const sidoDone = TARGET_SIDO.map((sidoCode) => {
  const total = getDistrictsBySido(sidoCode).length;
  const done = getDistrictsBySido(sidoCode).filter((d) => codesWithData.has(d.code)).length;
  return { sidoCode, short: getSidoShort(sidoCode), done, total, pct: total ? Math.round((done / total) * 100) : 0 };
});

const inProgress = sidoDone.find((s) => s.done > 0 && s.done < s.total);
const lastSuccess = progress?.lastSuccess;
const lastFailure = progress?.lastFailure;

console.log(`📊 전국 수집 진행률 (${formatKst()})`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`✅ 완료: ${doneCount}/${TARGET_DISTRICTS} (${pct}%)`);

if (inProgress) {
  console.log(
    `🟡 진행: ${inProgress.sidoCode}/${inProgress.total}구 ${inProgress.short} ` +
      `${inProgress.done}/${inProgress.total}구 완료`
  );
} else if (doneCount >= TARGET_DISTRICTS) {
  console.log("🟢 상태: 15개 시도 수집 완료");
} else {
  console.log("⬜ 상태: 수집 대기 또는 시작 전");
}

if (etaTime && doneCount < TARGET_DISTRICTS) {
  console.log(`⏱️  예상 완료: ${formatKst(etaTime)} (${formatEta(etaMs)})`);
}

console.log(`💾 현재 용량: ${mb}MB / ${SUPABASE_FREE_MB}MB (${freePct}%)`);

if (lastSuccess) {
  console.log(`   마지막 성공: ${lastSuccess.sido || lastSuccess.code?.slice(0, 2)} ${lastSuccess.name} (${lastSuccess.code})`);
}
if (lastFailure) {
  console.log(`   마지막 실패: ${lastFailure.sidoShort || lastFailure.sido} ${lastFailure.name} — ${lastFailure.error}`);
}

if (existsSync(STOP_FLAG)) {
  console.log("🛑 STOP-COLLECTION.flag 활성 — 수집이 중단되었거나 중단 예정");
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("상세: node scripts/report-nationwide-progress.mjs");
