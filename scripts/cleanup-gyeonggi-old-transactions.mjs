/**
 * 경기도 6개 구역 2024년 거래 삭제 (1년치 정리)
 * 실행: node scripts/cleanup-gyeonggi-old-transactions.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const CODES = ["41111", "41113", "41115", "41117", "41131", "41133"];
const CUTOFF = "2025-06-01";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function countAll(table) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count || 0;
}

async function fetchApartmentIds(codes) {
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
  return ids;
}

async function countOldTx(apartmentIds) {
  let total = 0;
  for (let i = 0; i < apartmentIds.length; i += 100) {
    const chunk = apartmentIds.slice(i, i + 100);
    const { count, error } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .in("apartment_id", chunk)
      .lt("deal_date", CUTOFF);
    if (error) throw new Error(error.message);
    total += count || 0;
  }
  return total;
}

async function deleteOldTx(apartmentIds) {
  let deleted = 0;
  for (let i = 0; i < apartmentIds.length; i += 50) {
    const chunk = apartmentIds.slice(i, i + 50);
    const { error, count } = await supabase
      .from("transactions")
      .delete({ count: "exact" })
      .in("apartment_id", chunk)
      .lt("deal_date", CUTOFF);
    if (error) throw new Error(error.message);
    deleted += count || 0;
  }
  return deleted;
}

console.log("=== 경기 6구역 구거래 삭제 (deal_date < 2025-06-01) ===\n");
console.log("대상 코드:", CODES.join(", "));

const txBefore = await countAll("transactions");
const aptBefore = await countAll("apartments");

const aptIds = await fetchApartmentIds(CODES);
console.log(`해당 단지: ${aptIds.length}개`);

const oldCount = await countOldTx(aptIds);
console.log(`삭제 대상 거래: ${oldCount.toLocaleString()}건`);

const deleted = await deleteOldTx(aptIds);
console.log(`삭제 완료: ${deleted.toLocaleString()}건`);

const txAfter = await countAll("transactions");
const aptAfter = await countAll("apartments");

console.log("\n========== Before / After ==========");
console.log(`단지: ${aptBefore.toLocaleString()} → ${aptAfter.toLocaleString()}`);
console.log(`거래: ${txBefore.toLocaleString()} → ${txAfter.toLocaleString()} (-${(txBefore - txAfter).toLocaleString()})`);
console.log(`추정 용량: ~${Math.round(((aptAfter + txAfter) * 1024) / 1024 / 1024 * 10) / 10} MB`);
console.log("====================================");
