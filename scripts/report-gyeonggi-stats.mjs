/**
 * 경기도 DB 통계 + Supabase 용량 추정
 * 실행: node scripts/report-gyeonggi-stats.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import {
  GYEONGGI_DISTRICTS,
  GYEONGGI_CODES,
  GYEONGGI_NAMES,
} from "./lib/gyeonggi-districts.mjs";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function countTable(table, filter) {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count || 0;
}

async function countAptsForCode(code) {
  const { count, error } = await supabase
    .from("apartments")
    .select("id", { count: "exact", head: true })
    .eq("sigungu_code", code);
  if (error) throw new Error(error.message);
  return count || 0;
}

async function countTxForCode(code) {
  const { data: apts, error: aptErr } = await supabase
    .from("apartments")
    .select("id")
    .eq("sigungu_code", code);
  if (aptErr) throw new Error(aptErr.message);
  if (!apts?.length) return { 매매: 0, 전세: 0 };

  const ids = apts.map((a) => a.id);
  let 매매 = 0;
  let 전세 = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    for (const type of ["매매", "전세"]) {
      const { count, error } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("deal_type", type)
        .in("apartment_id", chunk);
      if (error) throw new Error(error.message);
      if (type === "매매") 매매 += count || 0;
      else 전세 += count || 0;
    }
  }
  return { 매매, 전세 };
}

console.log("=== 경기도 DB 통계 ===\n");

const aptTotal = await countTable("apartments");
const txTotal = await countTable("transactions");

const gyeonggiApt = await countTable("apartments", (q) =>
  q.in("sigungu_code", GYEONGGI_CODES)
);

let gyeonggiTx = 0;
const rows = [];

for (const d of GYEONGGI_DISTRICTS) {
  const apt = await countAptsForCode(d.code);
  const tx = apt > 0 ? await countTxForCode(d.code) : { 매매: 0, 전세: 0 };
  gyeonggiTx += tx.매매 + tx.전세;
  rows.push({ ...d, apt, tx });
  console.log(
    `${d.name} (${d.code}): 단지 ${apt} | 매매 ${tx.매매} | 전세 ${tx.전세}`
  );
}

const estRows = aptTotal + txTotal;
const estMb = Math.round((estRows * 1024) / 1024 / 1024 * 10) / 10;

console.log("\n========== 요약 ==========");
console.log(`전체 단지: ${aptTotal.toLocaleString()}`);
console.log(`전체 거래: ${txTotal.toLocaleString()}`);
console.log(`경기 단지: ${gyeonggiApt.toLocaleString()}`);
console.log(`경기 거래(추정): ${gyeonggiTx.toLocaleString()}`);
console.log(`추정 DB rows: ${estRows.toLocaleString()}`);
console.log(`추정 용량: ~${estMb} MB (row당 ~1KB 가정)`);
console.log("==========================");
