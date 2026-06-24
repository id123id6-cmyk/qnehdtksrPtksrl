/**
 * GeoJSON bbox 중심 vs districts.js 설정 좌표 + DB 마커 평균 비교
 * 실행: node scripts/validate-all-districts.mjs
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "tools/realestate-map/data");
const DISTRICTS_JS = path.join(ROOT, "tools/realestate-map/js/districts.js");
const REPORT = path.join(ROOT, "data/validation/district-alignment-report.json");
const THRESHOLD = 0.1;

mkdirSync(path.dirname(REPORT), { recursive: true });

function parseDistrictsFromJs() {
  const src = readFileSync(DISTRICTS_JS, "utf8");
  const districts = {};
  const re =
    /"(\d{5})"\s*:\s*\{\s*name:\s*"([^"]+)"\s*,\s*slug:\s*"([^"]+)"\s*,\s*lat:\s*([\d.-]+)\s*,\s*lng:\s*([\d.-]+)/g;
  let m;
  while ((m = re.exec(src))) {
    districts[m[1]] = {
      code: m[1],
      name: m[2],
      slug: m[3],
      lat: Number(m[4]),
      lng: Number(m[5]),
    };
  }
  return districts;
}

function bboxFromGeojson(file) {
  const g = JSON.parse(readFileSync(file, "utf8"));
  let minLat = 999,
    maxLat = -999,
    minLng = 999,
    maxLng = -999;
  function walk(coords) {
    if (typeof coords[0] === "number") {
      const [lng, lat] = coords;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      return;
    }
    for (const c of coords) walk(c);
  }
  for (const f of g.features || []) walk(f.geometry?.coordinates);
  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    cx: (minLng + maxLng) / 2,
    cy: (minLat + maxLat) / 2,
    sgg: g.features?.[0]?.properties?.sgg || null,
  };
}

function findGuGeojson(slug, sido) {
  if (sido === "gyeonggi") {
    const p = path.join(DATA, "gyeonggi", `${slug}-gu.geojson`);
    if (exists(p)) return p;
    const alt = path.join(DATA, "gyeonggi", `${slug}.geojson`);
    if (exists(alt)) return alt;
  }
  const p = path.join(DATA, `${slug}-gu.geojson`);
  return exists(p) ? p : null;
}

function exists(p) {
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
}

function dist(a, b) {
  return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2);
}

async function fetchAptCentroid(sb, code) {
  const { data, error } = await sb
    .from("apartments")
    .select("latitude, longitude")
    .eq("sigungu_code", code)
    .not("latitude", "is", null);
  if (error || !data?.length) return null;
  const lat = data.reduce((s, r) => s + r.latitude, 0) / data.length;
  const lng = data.reduce((s, r) => s + r.longitude, 0) / data.length;
  return { lat, lng, count: data.length };
}

async function main() {
  loadEnvLocal();
  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET,
    { auth: { persistSession: false } }
  );

  const districts = parseDistrictsFromJs();
  const rows = [];
  let ok = 0;
  let bad = 0;
  let missingGeo = 0;

  for (const [code, d] of Object.entries(districts)) {
    const sido = code.startsWith("11") ? "seoul" : "gyeonggi";
    const geoPath = findGuGeojson(d.slug, sido);
    const row = {
      code,
      name: d.name,
      slug: d.slug,
      config: { lat: d.lat, lng: d.lng },
      geoPath: geoPath ? path.relative(ROOT, geoPath) : null,
      status: "ok",
      issues: [],
    };

    if (!geoPath) {
      row.status = "missing_geo";
      missingGeo++;
      rows.push(row);
      continue;
    }

    const bbox = bboxFromGeojson(geoPath);
    row.geoCenter = { lat: bbox.cy, lng: bbox.cx };
    row.geoBbox = {
      minLat: bbox.minLat,
      maxLat: bbox.maxLat,
      minLng: bbox.minLng,
      maxLng: bbox.maxLng,
    };

    const dConfig = dist(d, bbox);
    const dConfigGeo = { lat: bbox.cy, lng: bbox.cx };
    row.deltaConfigVsGeo = dConfig;
    if (dConfig > THRESHOLD) {
      row.status = "mismatch";
      row.issues.push(`config↔geo ${dConfig.toFixed(3)}°`);
      bad++;
    }

    const apt = await fetchAptCentroid(sb, code);
    if (apt) {
      row.aptCenter = apt;
      const dAptGeo = dist(apt, dConfigGeo);
      row.deltaAptVsGeo = dAptGeo;
      if (dAptGeo > THRESHOLD) {
        row.status = "mismatch";
        row.issues.push(`apt↔geo ${dAptGeo.toFixed(3)}°`);
        if (!row.issues.some((i) => i.startsWith("config"))) bad++;
      }
    }

    if (row.status === "ok") ok++;
    rows.push(row);
  }

  const report = {
    thresholdDeg: THRESHOLD,
    total: rows.length,
    ok,
    mismatch: bad,
    missingGeo,
    mismatches: rows.filter((r) => r.status === "mismatch"),
    rows,
  };

  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ total: report.total, ok, mismatch: bad, missingGeo, report: REPORT }, null, 2));
  if (bad > 0) {
    console.log("\n비정상 구역:");
    for (const r of report.mismatches) {
      console.log(`- ${r.name} (${r.code}): ${r.issues.join(", ")}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
