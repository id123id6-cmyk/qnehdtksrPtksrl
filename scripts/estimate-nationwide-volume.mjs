/**
 * 전국 데이터 용량 사전 예측 (시도별 대표 시군구 1개 샘플링)
 *
 * 실행:
 *   node scripts/estimate-nationwide-volume.mjs
 *   node scripts/estimate-nationwide-volume.mjs --from 202506 --to 202606
 *   node scripts/estimate-nationwide-volume.mjs --sample-month 202506
 */
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import {
  SIDO_CODES,
  getDistrictsBySido,
  getSidoName,
  getSidoShort,
  getTotalDistrictCount,
} from "./lib/nationwide-districts.mjs";
import { BYTES_PER_ROW, estimateMbFromRows } from "./lib/estimate-db-size.mjs";

const TRADE_URL =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";
const RENT_URL =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";

const SUPABASE_FREE_MB = 500;
const API_DELAY_MS = 300;

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

function normalizeYm(raw) {
  const s = String(raw).trim();
  if (/^\d{6}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  throw new Error(`기간 형식 오류: ${raw}`);
}

function toDealYmd(ym) {
  return ym.replace("-", "");
}

function countMonths(fromYm, toYm) {
  const [fy, fm] = fromYm.split("-").map(Number);
  const [ty, tm] = toYm.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm) + 1;
}

function buildMonthRange(fromYm, toYm) {
  const list = [];
  const [fy, fm] = fromYm.split("-").map(Number);
  const [ty, tm] = toYm.split("-").map(Number);
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    list.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return list;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchTotalCount(url, serviceKey, lawd, dealYmd) {
  const u = new URL(url);
  u.searchParams.set("serviceKey", serviceKey);
  u.searchParams.set("LAWD_CD", lawd);
  u.searchParams.set("DEAL_YMD", dealYmd);
  u.searchParams.set("pageNo", "1");
  u.searchParams.set("numOfRows", "1");

  const res = await fetch(u.toString());
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const code = text.match(/<resultCode>([^<]+)<\/resultCode>/)?.[1]?.trim();
  if (code && code !== "000") {
    const msg = text.match(/<resultMsg>([^<]+)<\/resultMsg>/)?.[1] || "";
    throw new Error(`API ${code} ${msg}`);
  }

  return parseInt(text.match(/<totalCount>([^<]+)<\/totalCount>/)?.[1] || "0", 10);
}

async function sampleDistrict(lawd, sampleMonth, tradeKey, rentKey) {
  const dealYmd = toDealYmd(sampleMonth);
  const trade = await fetchTotalCount(TRADE_URL, tradeKey, lawd, dealYmd);
  await sleep(API_DELAY_MS);
  let rent = 0;
  try {
    rent = await fetchTotalCount(RENT_URL, rentKey, lawd, dealYmd);
  } catch {
    rent = Math.round(trade * 0.6);
  }
  await sleep(API_DELAY_MS);
  return { trade, rent, total: trade + rent };
}

loadEnvLocal();
requireEnv(["MOLIT_API_KEY"]);

const FROM = normalizeYm(getArg("from", "2025-06"));
const TO = normalizeYm(getArg("to", "2026-06"));
const SAMPLE_MONTH = normalizeYm(getArg("sample-month", FROM));
const MONTH_COUNT = countMonths(FROM, TO);
const TRADE_KEY = process.env.MOLIT_API_KEY;
const RENT_KEY = process.env.MOLIT_RENT_KEY || process.env.MOLIT_API_KEY;

console.log("=== 전국 데이터 용량 예측 (샘플링) ===");
console.log(`샘플 월: ${SAMPLE_MONTH} | 추정 기간: ${FROM} ~ ${TO} (${MONTH_COUNT}개월)`);
console.log(`전체 시군구: ${getTotalDistrictCount()}개\n`);

const samples = [];
let totalMonthlyTx = 0;

for (const sidoCode of SIDO_CODES) {
  const districts = getDistrictsBySido(sidoCode);
  const sample = districts[0];
  process.stdout.write(`  ${getSidoShort(sidoCode)} ${sample.name}(${sample.code}) 조회...`);

  try {
    const counts = await sampleDistrict(sample.code, SAMPLE_MONTH, TRADE_KEY, RENT_KEY);
    const districtCount = districts.length;
    const sidoMonthly = counts.total * districtCount;
    totalMonthlyTx += sidoMonthly;

    samples.push({
      sidoCode,
      sidoName: getSidoName(sidoCode),
      sidoShort: getSidoShort(sidoCode),
      sampleCode: sample.code,
      sampleName: sample.name,
      districtCount,
      tradePerMonth: counts.trade,
      rentPerMonth: counts.rent,
      totalPerMonth: counts.total,
      sidoMonthly,
    });
    console.log(` 매매 ${counts.trade} + 전세 ${counts.rent} = ${counts.total}건/월 × ${districtCount}구역`);
  } catch (err) {
    console.log(` ❌ ${err.message}`);
    samples.push({
      sidoCode,
      sidoName: getSidoName(sidoCode),
      sidoShort: getSidoShort(sidoCode),
      sampleCode: sample.code,
      sampleName: sample.name,
      districtCount: districts.length,
      error: err.message,
    });
  }
}

const validSamples = samples.filter((s) => !s.error);
const estimatedTx = totalMonthlyTx * MONTH_COUNT;
const estimatedApts = Math.round(estimatedTx * 0.027);
const estimatedRows = estimatedTx + estimatedApts;
const estimatedMb = estimateMbFromRows(estimatedRows);
const freeRatio = Math.round((estimatedMb / SUPABASE_FREE_MB) * 1000) / 10;

console.log("\n--- 시도별 월간 추정 (대표 샘플 × 시군구 수) ---");
for (const s of validSamples) {
  console.log(
    `  ${s.sidoCode} ${s.sidoShort.padEnd(4)} ${String(s.districtCount).padStart(2)}구역  ` +
      `~${s.sidoMonthly.toLocaleString()}건/월  (샘플: ${s.sampleName} ${s.totalPerMonth}건)`
  );
}

console.log("\n--- 전국 13개월 예측 ---");
console.log(`예상 거래 건수:  ~${estimatedTx.toLocaleString()}건`);
console.log(`예상 단지 건수:  ~${estimatedApts.toLocaleString()}개 (거래 대비 ~2.7%)`);
console.log(`예상 DB 행 수:   ~${estimatedRows.toLocaleString()}행`);
console.log(`예상 DB 용량:    ~${estimatedMb} MB`);
console.log(`Supabase Free(${SUPABASE_FREE_MB}MB) 대비: ${freeRatio}%`);

if (freeRatio > 100) {
  console.log("\n⚠️  무료 티어 초과 예상 — Pro 업그레이드 또는 수집 기간·지역 축소 검토");
} else if (freeRatio > 80) {
  console.log("\n⚠️  무료 티어 80% 이상 — 용량 모니터링 권장");
} else {
  console.log("\n✅ 무료 티어 내 수집 가능 (추정치, 실제는 ±30% 오차 가능)");
}

console.log(`\n참고: 행당 ${BYTES_PER_ROW} bytes 추정 (서울·경기 실측 기반)`);
