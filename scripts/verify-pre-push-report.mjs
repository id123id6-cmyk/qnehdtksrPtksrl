/**
 * push 전 검증 리포트 (DB 분석 + 전국 통계)
 * 실행: node scripts/verify-pre-push-report.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import { resolveArea } from "./lib/pyeong-map.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "validation", "pre-push-report.json");

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false } }
);

const cutoff = new Date();
cutoff.setFullYear(cutoff.getFullYear() - 1);
const cutoffStr = cutoff.toISOString().slice(0, 10);

function formatDisplay(avgPrice1Y) {
  if (avgPrice1Y == null || avgPrice1Y <= 0) return "거래없음";
  const eok = Math.round((avgPrice1Y / 10000) * 10) / 10;
  return `${eok}억`;
}

async function fetchAllApts() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("apartments")
      .select("id,name,latitude,longitude,dong,build_year,sigungu_code")
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

async function fetchMaemae1yForIds(ids) {
  const sums = new Map();
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150);
    let from = 0;
    while (true) {
      const { data, error } = await sb
        .from("transactions")
        .select("apartment_id,deal_amount,exclu_use_ar,deal_date")
        .eq("deal_type", "매매")
        .gte("deal_date", cutoffStr)
        .in("apartment_id", chunk)
        .range(from, from + 1999);
      if (error) throw error;
      if (!data?.length) break;
      for (const row of data) {
        const prev = sums.get(row.apartment_id) || {
          count: 0,
          sum: 0,
          areas: [],
        };
        prev.count += 1;
        prev.sum += row.deal_amount;
        if (row.exclu_use_ar != null) prev.areas.push(row.exclu_use_ar);
        sums.set(row.apartment_id, prev);
      }
      if (data.length < 2000) break;
      from += 2000;
    }
  }
  return sums;
}

async function fetchAreaMetaForIds(ids) {
  const map = new Map();
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150);
    let from = 0;
    while (true) {
      const { data, error } = await sb
        .from("transactions")
        .select("apartment_id,exclu_use_ar")
        .eq("deal_type", "매매")
        .not("exclu_use_ar", "is", null)
        .in("apartment_id", chunk)
        .range(from, from + 1999);
      if (error) throw error;
      if (!data?.length) break;
      for (const row of data) {
        if (!map.has(row.apartment_id)) {
          map.set(row.apartment_id, { bands: new Set(), pyeongCounts: new Map() });
        }
        const entry = map.get(row.apartment_id);
        const resolved = resolveArea(row.exclu_use_ar);
        if (resolved.band) entry.bands.add(resolved.band);
        if (resolved.pyeong) {
          const k = String(resolved.pyeong);
          entry.pyeongCounts.set(k, (entry.pyeongCounts.get(k) || 0) + 1);
        }
      }
      if (data.length < 2000) break;
      from += 2000;
    }
  }
  return map;
}

async function fetchTxCounts(ids, dealType, sinceDate = null) {
  const counts = new Map();
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150);
    let q = sb
      .from("transactions")
      .select("apartment_id")
      .in("apartment_id", chunk);
    if (dealType) q = q.eq("deal_type", dealType);
    if (sinceDate) q = q.gte("deal_date", sinceDate);
    const { data, error } = await q;
    if (error) throw error;
    for (const row of data || []) {
      counts.set(row.apartment_id, (counts.get(row.apartment_id) || 0) + 1);
    }
  }
  return counts;
}

function dominantPyeong(meta) {
  if (!meta?.pyeongCounts?.size) return null;
  let best = null;
  let n = 0;
  for (const [p, c] of meta.pyeongCounts) {
    if (c > n) {
      n = c;
      best = Number(p);
    }
  }
  return best;
}

function sidoKey(code) {
  if (code.startsWith("11")) return "seoul";
  if (code.startsWith("41")) return "gyeonggi";
  return "other";
}

console.log("=== push 전 DB 검증 리포트 생성 ===\n");

// --- 평택 상세 ---
const { data: ptApts, error: ptErr } = await sb
  .from("apartments")
  .select("id,name,latitude,longitude,dong,build_year")
  .eq("sigungu_code", "41220")
  .not("latitude", "is", null)
  .not("longitude", "is", null);
if (ptErr) throw ptErr;

const ptIds = ptApts.map((a) => a.id);
const [ptMaemae1y, ptAreaMeta, ptAllTx, ptJeonse1y] = await Promise.all([
  fetchMaemae1yForIds(ptIds),
  fetchAreaMetaForIds(ptIds),
  fetchTxCounts(ptIds, null),
  fetchTxCounts(ptIds, "전세", cutoffStr),
]);

const ptRows = [];
const ptClass = { A: 0, B: 0, C: 0, D: 0 };

for (const apt of ptApts) {
  const m = ptMaemae1y.get(apt.id);
  const count1y = m?.count || 0;
  const avgPrice1Y = count1y ? Math.round(m.sum / count1y) : null;
  const display = formatDisplay(avgPrice1Y);
  const meta = ptAreaMeta.get(apt.id);
  const dom = dominantPyeong(meta);
  const areaCats = meta ? [...meta.bands] : [];
  const allTx = ptAllTx.get(apt.id) || 0;
  const jeonse1y = ptJeonse1y.get(apt.id) || 0;

  let cls = "OK";
  if (display !== "거래없음") {
    cls = "OK";
  } else if (count1y === 0) {
    cls = "A";
    ptClass.A += 1;
  } else if (count1y > 0 && (avgPrice1Y == null || avgPrice1Y <= 0)) {
    cls = "B";
    ptClass.B += 1;
  } else if (count1y > 0 && areaCats.length === 0) {
    cls = "C";
    ptClass.C += 1;
  } else if (count1y > 0 && dom == null) {
    cls = "D";
    ptClass.D += 1;
  } else {
    cls = "?";
  }

  if (display === "거래없음") {
    ptRows.push({
      name: apt.name,
      id: apt.id,
      lat: apt.latitude,
      lng: apt.longitude,
      dbMaemae1Y: count1y,
      avgPrice1Y,
      display,
      cls,
      allTxEver: allTx,
      jeonse1y,
      build_year: apt.build_year,
      dominantPyeong: dom,
      areaCategories: areaCats,
    });
  }
}

// --- 전국 통계 ---
const allApts = await fetchAllApts();
const allIds = allApts.map((a) => a.id);
const nationalMaemae1y = await fetchMaemae1yForIds(allIds);

let nationalNoTrade = 0;
const bySido = {
  seoul: { total: 0, noTrade: 0, newNoTrade: 0, newTotal: 0 },
  gyeonggi: { total: 0, noTrade: 0, newNoTrade: 0, newTotal: 0 },
  other: { total: 0, noTrade: 0, newNoTrade: 0, newTotal: 0 },
};
const byGu = new Map();
let nationalB = 0;

for (const apt of allApts) {
  const sido = sidoKey(apt.sigungu_code);
  const m = nationalMaemae1y.get(apt.id);
  const count1y = m?.count || 0;
  const avgPrice1Y = count1y ? Math.round(m.sum / count1y) : null;
  const noTrade = avgPrice1Y == null || avgPrice1Y <= 0;
  if (count1y > 0 && noTrade) nationalB += 1;

  bySido[sido].total += 1;
  if (noTrade) bySido[sido].noTrade += 1;

  const age = apt.build_year ? new Date().getFullYear() - apt.build_year : null;
  if (age != null && age <= 5) {
    bySido[sido].newTotal += 1;
    if (noTrade) bySido[sido].newNoTrade += 1;
  }

  if (!byGu.has(apt.sigungu_code)) {
    byGu.set(apt.sigungu_code, { total: 0, noTrade: 0 });
  }
  const g = byGu.get(apt.sigungu_code);
  g.total += 1;
  if (noTrade) g.noTrade += 1;
  if (noTrade) nationalNoTrade += 1;
}

const guRanking = [...byGu.entries()]
  .map(([code, v]) => ({
    code,
    total: v.total,
    noTrade: v.noTrade,
    rate: ((v.noTrade / v.total) * 100).toFixed(1) + "%",
  }))
  .sort((a, b) => b.noTrade - a.noTrade)
  .slice(0, 15);

const report = {
  generatedAt: new Date().toISOString(),
  pyeongtaek: {
    total: ptApts.length,
    noTradeDisplay: ptRows.length,
    classification: ptClass,
    classificationRates: {
      A: ((ptClass.A / ptRows.length) * 100).toFixed(1) + "%",
      B: ((ptClass.B / ptRows.length) * 100).toFixed(1) + "%",
      C: ((ptClass.C / ptRows.length) * 100).toFixed(1) + "%",
      D: ((ptClass.D / ptRows.length) * 100).toFixed(1) + "%",
    },
    tableSample: ptRows.slice(0, 30).map((r) => ({
      단지명: r.name,
      "DB거래수(1Y)": r.dbMaemae1Y,
      avgPrice1Y: r.avgPrice1Y,
      표시: r.display,
      분류: r.cls,
    })),
    fullList: ptRows,
    insight: {
      jeonseOnly1y: ptRows.filter((r) => r.dbMaemae1Y === 0 && r.jeonse1y > 0).length,
      zeroTxEver: ptRows.filter((r) => r.allTxEver === 0).length,
      newBuildNoTrade: ptRows.filter(
        (r) => r.build_year && new Date().getFullYear() - r.build_year <= 5
      ).length,
    },
  },
  national: {
    total: allApts.length,
    noTradeCount: nationalNoTrade,
    noTradeRate: ((nationalNoTrade / allApts.length) * 100).toFixed(2) + "%",
    hasTradeCount: allApts.length - nationalNoTrade,
    bugB_count: nationalB,
    bySido: Object.fromEntries(
      Object.entries(bySido).map(([k, v]) => [
        k,
        {
          ...v,
          noTradeRate: v.total ? ((v.noTrade / v.total) * 100).toFixed(1) + "%" : "N/A",
          newNoTradeRate:
            v.newTotal > 0
              ? ((v.newNoTrade / v.newTotal) * 100).toFixed(1) + "%"
              : "N/A",
        },
      ])
    ),
    topGuByNoTrade: guRanking,
    note: "DB는 서울+경기만 수집됨. 인천·비수도권 데이터 없음.",
  },
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
