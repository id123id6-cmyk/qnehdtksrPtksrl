/**
 * 강남3구 월세 거래 데이터 삭제
 * 실행: node scripts/delete-gangnam3-wolse.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const TARGET_CODES = ["11680", "11650", "11710"];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function fetchApartmentIds(sigunguCodes) {
  const ids = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("apartments")
      .select("id, sigungu_code")
      .in("sigungu_code", sigunguCodes)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    ids.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return ids;
}

async function countWolseByDistrict(apartmentRows) {
  const byCode = {};
  for (const code of TARGET_CODES) byCode[code] = 0;

  const idToCode = new Map(apartmentRows.map((r) => [r.id, r.sigungu_code]));
  const allIds = apartmentRows.map((r) => r.id);

  for (let i = 0; i < allIds.length; i += 200) {
    const chunk = allIds.slice(i, i + 200);
    const { count, error } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("deal_type", "월세")
      .in("apartment_id", chunk);
    if (error) throw new Error(error.message);
    // per-chunk total only — detailed per district below
  }

  for (const code of TARGET_CODES) {
    const ids = apartmentRows.filter((r) => r.sigungu_code === code).map((r) => r.id);
    let total = 0;
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { count, error } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("deal_type", "월세")
        .in("apartment_id", chunk);
      if (error) throw new Error(error.message);
      total += count || 0;
    }
    byCode[code] = total;
  }
  return byCode;
}

async function deleteWolse(apartmentRows) {
  const allIds = apartmentRows.map((r) => r.id);
  let deleted = 0;

  for (let i = 0; i < allIds.length; i += 100) {
    const chunk = allIds.slice(i, i + 100);
    const { data, error } = await supabase
      .from("transactions")
      .delete()
      .eq("deal_type", "월세")
      .in("apartment_id", chunk)
      .select("id");
    if (error) throw new Error(error.message);
    deleted += data?.length || 0;
  }
  return deleted;
}

async function countRemaining(apartmentRows) {
  const allIds = apartmentRows.map((r) => r.id);
  const counts = { 매매: 0, 전세: 0, 월세: 0 };
  for (let i = 0; i < allIds.length; i += 200) {
    const chunk = allIds.slice(i, i + 200);
    for (const type of Object.keys(counts)) {
      const { count, error } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("deal_type", type)
        .in("apartment_id", chunk);
      if (error) throw new Error(error.message);
      counts[type] += count || 0;
    }
  }
  return counts;
}

const NAMES = { "11680": "강남구", "11650": "서초구", "11710": "송파구" };

console.log("=== Phase 0: 강남3구 월세 데이터 정리 ===\n");

const apartments = await fetchApartmentIds(TARGET_CODES);
console.log(`대상 단지: ${apartments.length}개\n`);

console.log("[삭제 전] 구별 월세 건수:");
const before = await countWolseByDistrict(apartments);
let beforeTotal = 0;
for (const code of TARGET_CODES) {
  console.log(`  ${NAMES[code]} (${code}): 월세 ${before[code].toLocaleString()}건`);
  beforeTotal += before[code];
}
console.log(`  합계: ${beforeTotal.toLocaleString()}건\n`);

const deleted = await deleteWolse(apartments);
console.log(`[삭제 완료] ${deleted.toLocaleString()}건 삭제됨\n`);

console.log("[삭제 후] 구별 월세 잔여:");
const after = await countWolseByDistrict(apartments);
for (const code of TARGET_CODES) {
  console.log(`  ${NAMES[code]}: 월세 ${after[code]}건`);
}

const remaining = await countRemaining(apartments);
console.log("\n[삭제 후] 강남3구 거래 유형별 잔여:");
console.log(`  매매: ${remaining.매매.toLocaleString()}건`);
console.log(`  전세: ${remaining.전세.toLocaleString()}건`);
console.log(`  월세: ${remaining.월세.toLocaleString()}건`);
