/**
 * 4단계 최종 검증: 데이터 무결성 + 날짜 범위
 * 실행: node scripts/verify-data-integrity.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import { GYEONGGI_CODES } from "./lib/gyeonggi-districts.mjs";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const SEOUL_CODES = [
  "11110", "11140", "11170", "11200", "11215", "11230", "11260", "11290",
  "11305", "11320", "11350", "11380", "11410", "11440", "11470", "11500",
  "11530", "11545", "11560", "11590", "11620", "11650", "11680", "11710", "11740",
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function countApts(codes) {
  let total = 0;
  for (let i = 0; i < codes.length; i += 20) {
    const chunk = codes.slice(i, i + 20);
    const { count, error } = await supabase
      .from("apartments")
      .select("id", { count: "exact", head: true })
      .in("sigungu_code", chunk);
    if (error) throw new Error(error.message);
    total += count || 0;
  }
  return total;
}

async function countTxForAptCodes(codes) {
  const ids = [];
  for (const code of codes) {
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("apartments")
        .select("id")
        .eq("sigungu_code", code)
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      ids.push(...data.map((r) => r.id));
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  let tx = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { count, error } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .in("apartment_id", chunk);
    if (error) throw new Error(error.message);
    tx += count || 0;
  }
  return tx;
}

async function countNullCoords(codes) {
  let total = 0;
  for (const code of codes) {
    const { count, error } = await supabase
      .from("apartments")
      .select("id", { count: "exact", head: true })
      .eq("sigungu_code", code)
      .is("latitude", null);
    if (error) throw new Error(error.message);
    total += count || 0;
  }
  return total;
}

async function dateRange() {
  const { data: minRow, error: e1 } = await supabase
    .from("transactions")
    .select("deal_date")
    .order("deal_date", { ascending: true })
    .limit(1);
  const { data: maxRow, error: e2 } = await supabase
    .from("transactions")
    .select("deal_date")
    .order("deal_date", { ascending: false })
    .limit(1);
  if (e1 || e2) throw new Error(e1?.message || e2?.message);

  const { count: oldCount, error: e3 } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .lt("deal_date", "2025-06-01");
  if (e3) throw new Error(e3.message);

  return {
    min: minRow?.[0]?.deal_date,
    max: maxRow?.[0]?.deal_date,
    beforeCutoff: oldCount || 0,
  };
}

const aptTotal = await supabase.from("apartments").select("id", { count: "exact", head: true });
const txTotal = await supabase.from("transactions").select("id", { count: "exact", head: true });

const seoulApt = await countApts(SEOUL_CODES);
const gyeonggiApt = await countApts(GYEONGGI_CODES);
const seoulTx = await countTxForAptCodes(SEOUL_CODES);
const gyeonggiTx = await countTxForAptCodes(GYEONGGI_CODES);
const nullCoords = await countNullCoords([...SEOUL_CODES, ...GYEONGGI_CODES]);
const dates = await dateRange();

const apts = aptTotal.count || 0;
const txs = txTotal.count || 0;
const estMb = Math.round(((apts + txs) * 1024) / 1024 / 1024 * 10) / 10;

const out = {
  apartments: { total: apts, seoul: seoulApt, gyeonggi: gyeonggiApt },
  transactions: { total: txs, seoul: seoulTx, gyeonggi: gyeonggiTx },
  nullCoordinates: nullCoords,
  dealDateMin: dates.min,
  dealDateMax: dates.max,
  transactionsBefore20250601: dates.beforeCutoff,
  estimatedMb: estMb,
  gyeonggiDistrictsInDb: GYEONGGI_CODES.filter(async () => false),
};

// count gyeonggi districts with data
let gyeonggiWithData = 0;
for (const code of GYEONGGI_CODES) {
  const { count } = await supabase
    .from("apartments")
    .select("id", { count: "exact", head: true })
    .eq("sigungu_code", code);
  if (count > 0) gyeonggiWithData++;
}
out.gyeonggiDistrictsWithData = gyeonggiWithData;
out.gyeonggiDistrictsTotal = GYEONGGI_CODES.length;

console.log(JSON.stringify(out, null, 2));
