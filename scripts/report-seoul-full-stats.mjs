/**
 * 서울 전체 DB 통계 (구별 단지/거래, DB 규모 추정)
 * 실행: node scripts/report-seoul-full-stats.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const SEOUL_CODES = [
  "11110", "11140", "11170", "11200", "11215", "11230", "11260", "11290",
  "11305", "11320", "11350", "11380", "11410", "11440", "11470", "11500",
  "11530", "11545", "11560", "11590", "11620", "11650", "11680", "11710", "11740",
];

const NAMES = {
  "11110": "종로구", "11140": "중구", "11170": "용산구", "11200": "성동구",
  "11215": "광진구", "11230": "동대문구", "11260": "중랑구", "11290": "성북구",
  "11305": "강북구", "11320": "도봉구", "11350": "노원구", "11380": "은평구",
  "11410": "서대문구", "11440": "마포구", "11470": "양천구", "11500": "강서구",
  "11530": "구로구", "11545": "금천구", "11560": "영등포구", "11590": "동작구",
  "11620": "관악구", "11650": "서초구", "11680": "강남구", "11710": "송파구", "11740": "강동구",
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function countTable(table) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count || 0;
}

async function fetchApartmentsByCode(code) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("apartments")
      .select("id, sigungu_code, latitude")
      .eq("sigungu_code", code)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function countTxForIds(ids, dealType) {
  let total = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { count, error } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("deal_type", dealType)
      .in("apartment_id", chunk);
    if (error) throw new Error(error.message);
    total += count || 0;
  }
  return total;
}

console.log("=== 서울 25개구 DB 통계 ===\n");

const aptTotal = await countTable("apartments");
const txTotal = await countTable("transactions");
const wolseTotal = await countTable("transactions"); // recount below

const { count: wolseCount } = await supabase
  .from("transactions")
  .select("id", { count: "exact", head: true })
  .eq("deal_type", "월세");

console.log(`전체 단지: ${aptTotal.toLocaleString()}개`);
console.log(`전체 거래: ${txTotal.toLocaleString()}건`);
console.log(`월세 잔여: ${(wolseCount || 0).toLocaleString()}건`);
console.log(`추정 DB 행 수: ${(aptTotal + txTotal).toLocaleString()} rows\n`);

let sumApt = 0;
let sumGeo = 0;
let sumMae = 0;
let sumJeon = 0;
let sumWol = 0;

for (const code of SEOUL_CODES) {
  const apts = await fetchApartmentsByCode(code);
  const ids = apts.map((a) => a.id);
  const needGeo = apts.filter((a) => a.latitude == null).length;
  const mae = ids.length ? await countTxForIds(ids, "매매") : 0;
  const jeon = ids.length ? await countTxForIds(ids, "전세") : 0;
  const wol = ids.length ? await countTxForIds(ids, "월세") : 0;

  sumApt += apts.length;
  sumGeo += needGeo;
  sumMae += mae;
  sumJeon += jeon;
  sumWol += wol;

  console.log(
    `${NAMES[code]} (${code}): 단지 ${apts.length} | 매매 ${mae} | 전세 ${jeon} | 월세 ${wol} | 좌표없음 ${needGeo}`
  );
}

console.log("\n--- 합계 ---");
console.log(`단지: ${sumApt.toLocaleString()} | 매매: ${sumMae.toLocaleString()} | 전세: ${sumJeon.toLocaleString()} | 월세: ${sumWol.toLocaleString()}`);
console.log(`지오코딩 필요: ${sumGeo.toLocaleString()}개`);
