/**
 * 전국(서울+경기) 부동산 DB 무결성 검증
 * 실행: node scripts/validate-realestate-data.mjs
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import { GYEONGGI_DISTRICTS } from "./lib/gyeonggi-districts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAP_GG = path.join(__dirname, "../tools/realestate-map/data/gyeonggi");
import { resolveArea, SQM_PER_PYEONG } from "./lib/pyeong-map.mjs";

function ringsFromGeometry(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates[0]];
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((poly) => poly[0]);
  }
  return [];
}

function bboxFromRings(rings) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  }
  return { minLat, maxLat, minLng, maxLng };
}

function loadDistrictBbox(code, slug, sido) {
  if (sido === "gyeonggi" && slug) {
    const guPath = path.join(MAP_GG, `${slug}-gu.geojson`);
    const dongPath = path.join(MAP_GG, `${slug}-dong.geojson`);
    const file = existsSync(guPath) ? guPath : existsSync(dongPath) ? dongPath : null;
    if (!file) return null;
    const geo = JSON.parse(readFileSync(file, "utf8"));
    const rings = [];
    let polygonCount = 0;
    for (const f of geo.features || []) {
      const rs = ringsFromGeometry(f.geometry);
      polygonCount += rs.length;
      rings.push(...rs);
    }
    if (!rings.length) return null;
    return { ...bboxFromRings(rings), polygonCount, source: path.basename(file) };
  }
  const seoulPath = path.join(__dirname, `../tools/realestate-map/data/${slug}-gu.geojson`);
  if (existsSync(seoulPath)) {
    const geo = JSON.parse(readFileSync(seoulPath, "utf8"));
    const rings = ringsFromGeometry(geo.features?.[0]?.geometry);
    return rings.length ? { ...bboxFromRings(rings), polygonCount: rings.length, source: path.basename(seoulPath) } : null;
  }
  return null;
}

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const cutoff = new Date();
cutoff.setFullYear(cutoff.getFullYear() - 1);
const cutoffStr = cutoff.toISOString().slice(0, 10);

console.log("=== 부동산 DB 무결성 검증 ===\n");

const [{ count: aptTotal }, { count: txTotal }] = await Promise.all([
  supabase.from("apartments").select("id", { count: "exact", head: true }),
  supabase.from("transactions").select("id", { count: "exact", head: true }),
]);

const issues = {
  noCoords: [],
  noTxEver: [],
  noTx1yButOlder: [],
  areaInconsistent: [],
  pyeongDrift: [],
  outsideBbox: [],
  weakGeojson: [],
};

const districtStats = new Map();

async function fetchAllApts() {
  const all = [];
  let from = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("apartments")
      .select("id, name, dong, jibun, sigungu_code, latitude, longitude, build_year")
      .order("sigungu_code")
      .range(from, from + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return all;
}

const apts = await fetchAllApts();
const aptIds = apts.map((a) => a.id);

const txCountMap = new Map();
const tx1yMap = new Map();
const areaByApt = new Map();

for (let i = 0; i < aptIds.length; i += 200) {
  const chunk = aptIds.slice(i, i + 200);
  const { data: txs, error } = await supabase
    .from("transactions")
    .select("apartment_id, deal_type, deal_date, exclu_use_ar")
    .in("apartment_id", chunk);
  if (error) throw error;
  for (const tx of txs || []) {
    txCountMap.set(tx.apartment_id, (txCountMap.get(tx.apartment_id) || 0) + 1);
    if (tx.deal_type === "매매" && tx.deal_date >= cutoffStr) {
      tx1yMap.set(tx.apartment_id, (tx1yMap.get(tx.apartment_id) || 0) + 1);
    }
    if (tx.exclu_use_ar != null) {
      if (!areaByApt.has(tx.apartment_id)) areaByApt.set(tx.apartment_id, new Set());
      areaByApt.get(tx.apartment_id).add(Number(tx.exclu_use_ar));
    }
  }
}

const districtMeta = {};
for (const d of GYEONGGI_DISTRICTS) {
  districtMeta[d.code] = { name: d.name, slug: d.slug, sido: "gyeonggi" };
}
const distJs = readFileSync(
  path.join(__dirname, "../tools/realestate-map/js/districts.js"),
  "utf8"
);
const seoulMatches = [...distJs.matchAll(/"(\d{5})":\s*\{[^}]*name:\s*"([^"]+)"[^}]*slug:\s*"([^"]+)"[^}]*sido:\s*"seoul"/g)];
for (const [, code, name, slug] of seoulMatches) {
  districtMeta[code] = { name, slug, sido: "seoul" };
}

const bboxCache = new Map();
const weakGeoSeen = new Set();

for (const apt of apts) {
  const code = apt.sigungu_code;
  if (!districtStats.has(code)) {
    districtStats.set(code, { total: 0, issues: 0 });
  }
  const ds = districtStats.get(code);
  ds.total++;

  const bump = (list, item) => {
    ds.issues++;
    if (list.length < 500) list.push(item);
  };

  if (apt.latitude == null || apt.longitude == null) {
    bump(issues.noCoords, { name: apt.name, dong: apt.dong, code });
    continue;
  }

  const totalTx = txCountMap.get(apt.id) || 0;
  const tx1y = tx1yMap.get(apt.id) || 0;

  if (totalTx === 0) {
    bump(issues.noTxEver, { name: apt.name, dong: apt.dong, code });
  } else if (tx1y === 0) {
    bump(issues.noTx1yButOlder, { name: apt.name, dong: apt.dong, code, totalTx });
  }

  const areas = areaByApt.get(apt.id);
  if (areas && areas.size > 1) {
    const pyeongs = [...areas].map((a) => resolveArea(a).pyeong);
    const uniquePyeong = new Set(pyeongs);
    if (uniquePyeong.size > 3) {
      bump(issues.areaInconsistent, {
        name: apt.name,
        code,
        areas: [...areas].slice(0, 6),
        pyeongs: [...uniquePyeong],
      });
    }
    for (const sqm of areas) {
      const r = resolveArea(sqm);
      const rounded = Math.round(Number(sqm) / SQM_PER_PYEONG);
      if (Math.abs(rounded - r.pyeong) >= 8) {
        bump(issues.pyeongDrift, {
          name: apt.name,
          sqm,
          exclRoundPyeong: rounded,
          supplyPyeong: r.pyeong,
          code,
        });
        break;
      }
    }
  }

  const meta = districtMeta[code];
  if (meta) {
    const key = `${meta.sido}:${meta.slug}`;
    if (!bboxCache.has(key)) {
      const bb = loadDistrictBbox(code, meta.slug, meta.sido);
      bboxCache.set(key, bb);
      if (bb && bb.polygonCount === 1 && meta.sido === "gyeonggi" && !weakGeoSeen.has(code)) {
        const dongPath = path.join(MAP_GG, `${meta.slug}-dong.geojson`);
        if (existsSync(dongPath)) {
          const dongCount = JSON.parse(readFileSync(dongPath, "utf8")).features?.length || 0;
          if (dongCount > 3) {
            weakGeoSeen.add(code);
            issues.weakGeojson.push({
              code,
              name: meta.name,
              polygonCount: bb.polygonCount,
              dongCount,
            });
          }
        }
      }
    }
    const bb = bboxCache.get(key);
    if (bb) {
      const pad = 0.02;
      if (
        apt.latitude < bb.minLat - pad ||
        apt.latitude > bb.maxLat + pad ||
        apt.longitude < bb.minLng - pad ||
        apt.longitude > bb.maxLng + pad
      ) {
        bump(issues.outsideBbox, {
          name: apt.name,
          dong: apt.dong,
          code,
          lat: apt.latitude,
          lng: apt.longitude,
          bbox: bb,
        });
      }
    }
  }
}

const topIssueDistricts = [...districtStats.entries()]
  .map(([code, v]) => ({
    code,
    name: districtMeta[code]?.name || code,
    total: v.total,
    issues: v.issues,
    rate: v.total ? Math.round((v.issues / v.total) * 1000) / 10 : 0,
  }))
  .sort((a, b) => b.issues - a.issues)
  .slice(0, 10);

const summary = {
  generatedAt: new Date().toISOString(),
  totals: { apartments: aptTotal, transactions: txTotal, scanned: apts.length },
  issueCounts: {
    noCoords: issues.noCoords.length,
    noTxEver: issues.noTxEver.length,
    noTx1yButOlder: issues.noTx1yButOlder.length,
    areaInconsistent: issues.areaInconsistent.length,
    pyeongDrift: issues.pyeongDrift.length,
    outsideBbox: issues.outsideBbox.length,
    weakGeojson: issues.weakGeojson.length,
  },
  issueRates: {
    noCoords: ((issues.noCoords.length / apts.length) * 100).toFixed(2) + "%",
    outsideBbox: ((issues.outsideBbox.length / apts.length) * 100).toFixed(2) + "%",
  },
  topIssueDistricts,
  samples: {
    noCoords: issues.noCoords.slice(0, 3),
    noTx1yButOlder: issues.noTx1yButOlder.slice(0, 3),
    outsideBbox: issues.outsideBbox.slice(0, 3),
    pyeongDrift: issues.pyeongDrift.slice(0, 3),
    weakGeojson: issues.weakGeojson.slice(0, 5),
  },
};

console.log(JSON.stringify(summary, null, 2));

const reportDir = path.join(__dirname, "../data/validation");
mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, "realestate-report.json");
writeFileSync(reportPath, JSON.stringify({ summary, issues: {
  noCoords: issues.noCoords.slice(0, 50),
  noTxEver: issues.noTxEver.slice(0, 50),
  noTx1yButOlder: issues.noTx1yButOlder.slice(0, 50),
  areaInconsistent: issues.areaInconsistent.slice(0, 50),
  pyeongDrift: issues.pyeongDrift.slice(0, 50),
  outsideBbox: issues.outsideBbox.slice(0, 50),
  weakGeojson: issues.weakGeojson,
} }, null, 2));
console.error(`\n저장: ${reportPath}`);

export { summary, issues };
