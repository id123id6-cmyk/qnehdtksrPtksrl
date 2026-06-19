/**
 * 구별/거래유형별 Supabase 통계 출력
 *
 * 실행:
 *   node scripts/report-district-stats.mjs
 *   node scripts/report-district-stats.mjs --lawd 11650,11710
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const DISTRICT_NAMES = {
  "11680": "강남구",
  "11650": "서초구",
  "11710": "송파구",
};

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const lawdFilter = getArg("lawd", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function fetchAllApartments(sigunguCode) {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("apartments")
      .select("id, sigungu_code, latitude, longitude, created_at")
      .eq("sigungu_code", sigunguCode)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function countTransactionsByType(apartmentIds) {
  const counts = { 매매: 0, 전세: 0, 월세: 0 };
  const chunkSize = 200;
  for (let i = 0; i < apartmentIds.length; i += chunkSize) {
    const chunk = apartmentIds.slice(i, i + chunkSize);
    for (const dealType of Object.keys(counts)) {
      const { count, error } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .in("apartment_id", chunk)
        .eq("deal_type", dealType);
      if (error) throw new Error(error.message);
      counts[dealType] += count || 0;
    }
  }
  return counts;
}

async function main() {
  const codes =
    lawdFilter.length > 0
      ? lawdFilter
      : ["11680", "11650", "11710"];

  console.log("=== 부동산 DB 구별 통계 ===\n");

  let totalNeedGeocode = 0;

  for (const code of codes) {
    const name = DISTRICT_NAMES[code] || code;
    const apartments = await fetchAllApartments(code);
    const needGeocode = apartments.filter((a) => a.latitude == null).length;
    totalNeedGeocode += needGeocode;

    const txCounts = await countTransactionsByType(apartments.map((a) => a.id));
    const totalTx = Object.values(txCounts).reduce((s, n) => s + n, 0);

    console.log(`[${name} / ${code}]`);
    console.log(`  단지 수: ${apartments.length.toLocaleString()}개`);
    console.log(`  좌표 없음(지오코딩 필요): ${needGeocode.toLocaleString()}개`);
    console.log(`  거래 합계: ${totalTx.toLocaleString()}건`);
    for (const [type, count] of Object.entries(txCounts)) {
      console.log(`    - ${type}: ${count.toLocaleString()}건`);
    }
    console.log("");
  }

  console.log(`지오코딩 필요 단지 합계: ${totalNeedGeocode.toLocaleString()}개`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
