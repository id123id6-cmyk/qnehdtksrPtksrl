/**
 * 시·군 gu GeoJSON을 행정동 전체 MultiPolygon으로 재생성 (union 실패 보정)
 * 실행: node scripts/fix-gyeonggi-gu-geojson.mjs [city-slug]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GYEONGGI_CITIES } from "./lib/gyeonggi-districts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAP_DIR = path.join(__dirname, "../tools/realestate-map/data/gyeonggi");
const DATA_DIR = path.join(__dirname, "../data/gyeonggi");

function geometryToMultiPolygon(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Polygon") return { type: "MultiPolygon", coordinates: [geometry.coordinates] };
  if (geometry.type === "MultiPolygon") return geometry;
  return null;
}

function mergeFeaturesToMultiPolygon(features) {
  const coordinates = [];
  for (const f of features) {
    const mp = geometryToMultiPolygon(f.geometry);
    if (mp) coordinates.push(...mp.coordinates);
  }
  if (!coordinates.length) return null;
  return { type: "MultiPolygon", coordinates };
}

const slugArg = process.argv[2];
const cities = slugArg
  ? GYEONGGI_CITIES.filter((c) => c.slug === slugArg)
  : GYEONGGI_CITIES;

if (!cities.length) {
  console.error("대상 시·군 없음:", slugArg);
  process.exit(1);
}

const report = [];

for (const city of cities) {
  const dongPath = path.join(MAP_DIR, `${city.slug}-dong.geojson`);
  if (!existsSync(dongPath)) {
    console.warn(`skip ${city.name}: dong 없음`);
    continue;
  }
  const dongGeo = JSON.parse(readFileSync(dongPath, "utf8"));
  const guFeatures = [];

  for (const code of city.lawdCodes) {
    const sub = dongGeo.features.filter((f) => f.properties?.sgg === code);
    if (!sub.length) {
      console.warn(`  ⚠️ ${city.name} ${code}: dong 0`);
      continue;
    }
    const geometry = mergeFeaturesToMultiPolygon(sub);
    const districtName =
      sub[0]?.properties?.sggnm?.replace(/^경기도\s*/, "") || city.name;
    guFeatures.push({
      type: "Feature",
      properties: {
        name: districtName,
        sgg: code,
        city: city.name,
        source: "Local_HangJeongDong/경기도 (merged)",
        dongCount: sub.length,
      },
      geometry,
    });
    report.push({ city: city.name, code, dongCount: sub.length, polygons: geometry.coordinates.length });
  }

  const guGeo = { type: "FeatureCollection", features: guFeatures };
  const json = JSON.stringify(guGeo);
  writeFileSync(path.join(MAP_DIR, `${city.slug}-gu.geojson`), json);
  if (existsSync(path.join(DATA_DIR, `${city.slug}-dong.geojson`))) {
    writeFileSync(path.join(DATA_DIR, `${city.slug}-gu.geojson`), json);
  }
  writeFileSync(path.join(MAP_DIR, `${city.slug}.geojson`), json);
  if (existsSync(DATA_DIR)) {
    writeFileSync(path.join(DATA_DIR, `${city.slug}.geojson`), json);
  }
}

console.log(JSON.stringify({ fixed: report.length, report }, null, 2));
