/**
 * 1단계: 2026-10 서울 아파트 매매(60~85㎡) 자치구 집계
 * node scripts/step1-oct2026-seoul-report.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET;
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SEOUL = {
  "11110": "종로구",
  "11140": "중구",
  "11170": "용산구",
  "11200": "성동구",
  "11215": "광진구",
  "11230": "동대문구",
  "11260": "중랑구",
  "11290": "성북구",
  "11305": "강북구",
  "11320": "도봉구",
  "11350": "노원구",
  "11380": "은평구",
  "11410": "서대문구",
  "11440": "마포구",
  "11470": "양천구",
  "11500": "강서구",
  "11530": "구로구",
  "11545": "금천구",
  "11560": "영등포구",
  "11590": "동작구",
  "11620": "관악구",
  "11650": "서초구",
  "11680": "강남구",
  "11710": "송파구",
  "11740": "강동구",
};
const SEOUL_CODES = Object.keys(SEOUL);

function median(nums) {
  if (!nums.length) return null;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function pctChange(cur, prev) {
  if (prev == null || prev === 0 || cur == null) return null;
  return ((cur - prev) / prev) * 100;
}

async function fetchAmounts(year, month) {
  // Join via apartments filter: get apartment ids for Seoul first would be huge.
  // Better: RPC or filter deal_year/month/type/area then join sigungu in pages.
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "deal_amount, exclu_use_ar, deal_date, deal_year, deal_month, deal_type, apartment_id, apartments!inner(sigungu_code)"
      )
      .eq("deal_year", year)
      .eq("deal_month", month)
      .eq("deal_type", "매매")
      .gte("exclu_use_ar", 60)
      .lte("exclu_use_ar", 85)
      .in("apartments.sigungu_code", SEOUL_CODES)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`${year}-${month} query: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function aggregate(rows) {
  const byGu = {};
  for (const code of SEOUL_CODES) {
    byGu[code] = { name: SEOUL[code], amounts: [], count: 0 };
  }
  let maxDate = null;
  for (const r of rows) {
    const code = r.apartments?.sigungu_code;
    if (!code || !byGu[code]) continue;
    byGu[code].amounts.push(r.deal_amount);
    byGu[code].count += 1;
    if (r.deal_date && (!maxDate || r.deal_date > maxDate)) maxDate = r.deal_date;
  }
  const out = {};
  for (const code of SEOUL_CODES) {
    const g = byGu[code];
    out[code] = {
      name: g.name,
      count: g.count,
      median: g.count ? median(g.amounts) : null,
    };
  }
  return { byGu: out, maxDate, total: rows.length };
}

async function latestDealDate() {
  const { data, error } = await supabase
    .from("transactions")
    .select("deal_date, deal_year, deal_month")
    .eq("deal_type", "매매")
    .order("deal_date", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

async function latestSeoulDealDate() {
  const { data, error } = await supabase
    .from("transactions")
    .select("deal_date, deal_year, deal_month, apartments!inner(sigungu_code)")
    .eq("deal_type", "매매")
    .in("apartments.sigungu_code", SEOUL_CODES)
    .order("deal_date", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

async function main() {
  const latestAll = await latestDealDate();
  const latestSeoul = await latestSeoulDealDate();
  console.log("latest_all", latestAll);
  console.log("latest_seoul", latestSeoul);

  const oct = await fetchAmounts(2026, 10);
  console.log("oct2026_rows", oct.length);

  if (!oct.length) {
    const ym =
      latestSeoul?.deal_year && latestSeoul?.deal_month
        ? `${latestSeoul.deal_year}-${String(latestSeoul.deal_month).padStart(2, "0")}`
        : latestAll?.deal_year && latestAll?.deal_month
          ? `${latestAll.deal_year}-${String(latestAll.deal_month).padStart(2, "0")}`
          : "unknown";
    console.log(`STATUS: 10월 데이터 없음, 최신월은 ${ym}`);
    process.exit(2);
  }

  const sep = await fetchAmounts(2026, 9);
  const yoy = await fetchAmounts(2025, 10);
  console.log("sep2026_rows", sep.length, "yoy2025_10_rows", yoy.length);

  const cur = aggregate(oct);
  const prev = aggregate(sep);
  const prevY = aggregate(yoy);

  const table = SEOUL_CODES.map((code) => {
    const c = cur.byGu[code];
    const p = prev.byGu[code];
    const y = prevY.byGu[code];
    return {
      code,
      name: c.name,
      count: c.count,
      median: c.median,
      mom_pct: pctChange(c.median, p.median),
      yoy_pct: pctChange(c.median, y.median),
      prev_median: p.median,
      yoy_median: y.median,
      prev_count: p.count,
      yoy_count: y.count,
    };
  }).sort((a, b) => b.count - a.count);

  const result = {
    generated_at: "2026-11-16",
    filter: {
      period: "2026-10",
      sido: "서울",
      deal_type: "매매",
      exclu_use_ar: "60~85",
    },
    latest_deal_date_used: cur.maxDate,
    latest_all: latestAll,
    latest_seoul: latestSeoul,
    total_count: cur.total,
    rows: table,
  };

  const outPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "step1-oct2026-seoul-report.json"
  );
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  console.log("STATUS: OK");
  console.log("total_count", cur.total);
  console.log("latest_deal_date", cur.maxDate);
  console.log("wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
