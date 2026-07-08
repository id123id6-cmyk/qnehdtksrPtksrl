/**
 * 전국 데이터 수집 진행 현황 대시보드
 *
 * 실행: node scripts/report-nationwide-progress.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import {
  SIDO_CODES,
  getDistrictsBySido,
  getSidoName,
  getSidoShort,
  getTotalDistrictCount,
} from "./lib/nationwide-districts.mjs";
import { estimateMbFromRows } from "./lib/estimate-db-size.mjs";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const SUPABASE_FREE_MB = 500;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function fetchAllApartments() {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("apartments")
      .select("id, sigungu_code")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function countTransactionsForIds(ids) {
  let total = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { count, error } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .in("apartment_id", chunk);
    if (error) throw new Error(error.message);
    total += count || 0;
  }
  return total;
}

function statusIcon(pct) {
  if (pct >= 100) return "✅";
  if (pct > 0) return "🟡";
  return "⬜";
}

const apartments = await fetchAllApartments();

const byCode = new Map();
for (const apt of apartments) {
  const code = apt.sigungu_code;
  if (!byCode.has(code)) byCode.set(code, []);
  byCode.get(code).push(apt.id);
}

const sidoStats = [];
let totalDoneDistricts = 0;
let totalTx = 0;

for (const sidoCode of SIDO_CODES) {
  const districts = getDistrictsBySido(sidoCode);
  const codesWithData = districts.filter((d) => byCode.has(d.code) && byCode.get(d.code).length > 0);
  const doneCount = codesWithData.length;
  const totalCount = districts.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  let txCount = 0;
  for (const d of codesWithData) {
    txCount += await countTransactionsForIds(byCode.get(d.code));
  }

  totalDoneDistricts += doneCount;
  totalTx += txCount;

  sidoStats.push({
    sidoCode,
    sidoName: getSidoName(sidoCode),
    sidoShort: getSidoShort(sidoCode),
    doneCount,
    totalCount,
    pct,
    txCount,
  });
}

const totalDistricts = getTotalDistrictCount();
const overallPct = Math.round((totalDoneDistricts / totalDistricts) * 100);
const totalRows = apartments.length + totalTx;
const estMb = estimateMbFromRows(totalRows);
const freeRatio = Math.round((estMb / SUPABASE_FREE_MB) * 1000) / 10;

const incomplete = sidoStats.filter((s) => s.pct < 100);

console.log("📊 전국 데이터 수집 현황");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(
  "시도".padEnd(6) +
    "진행".padEnd(12) +
    "비율".padEnd(8) +
    "거래건수".padStart(12)
);
console.log("─".repeat(50));

for (const s of sidoStats) {
  const progress = `${s.doneCount}/${String(s.totalCount).padStart(2)}구`;
  console.log(
    `${statusIcon(s.pct)} ${s.sidoCode} ${s.sidoShort.padEnd(4)}` +
      `  ${progress.padEnd(10)}` +
      `  ${String(s.pct).padStart(3)}%` +
      `  ${s.txCount.toLocaleString().padStart(12)}건`
  );
}

console.log("─".repeat(50));
console.log(
  `합계   ${totalDoneDistricts}/${totalDistricts}구역  ${overallPct}%  ${totalTx.toLocaleString()}건`
);
console.log(`DB: 단지 ${apartments.length.toLocaleString()} + 거래 ${totalTx.toLocaleString()} = ${totalRows.toLocaleString()}행 (~${estMb}MB, Free ${freeRatio}%)`);

if (incomplete.length) {
  console.log("\n미완료 시도:");
  for (const s of incomplete) {
    const missing = getDistrictsBySido(s.sidoCode)
      .filter((d) => !byCode.has(d.code) || byCode.get(d.code).length === 0)
      .map((d) => d.name);
    const preview = missing.slice(0, 5).join(", ");
    const more = missing.length > 5 ? ` 외 ${missing.length - 5}개` : "";
    console.log(`  ${s.sidoCode} ${s.sidoShort}: ${s.doneCount}/${s.totalCount} — 미수집: ${preview}${more}`);
  }
} else {
  console.log("\n✅ 전국 17개 시도 수집 완료");
}
