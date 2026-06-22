/**
 * 경기도 31개 시·군 GeoJSON 생성 → data/gyeonggi/
 * 실행: node scripts/build-gyeonggi-boundaries.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GYEONGGI_CITIES, GYEONGGI_DISTRICTS } from "./lib/gyeonggi-districts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../data/gyeonggi");
const MAP_DATA_DIR = path.join(__dirname, "../tools/realestate-map/data/gyeonggi");

const GYEONGGI_DONG_URL =
  "https://raw.githubusercontent.com/raqoon886/Local_HangJeongDong/master/hangjeongdong_%EA%B2%BD%EA%B8%B0%EB%8F%84.geojson";

function centroidOfRing(ring) {
  let lat = 0;
  let lng = 0;
  const n = ring.length;
  for (const [x, y] of ring) {
    lng += x;
    lat += y;
  }
  return { lat: lat / n, lng: lng / n };
}

function centroidOfFeature(feature) {
  const g = feature.geometry;
  if (!g) return null;
  if (g.type === "Polygon") return centroidOfRing(g.coordinates[0]);
  if (g.type === "MultiPolygon") {
    const ring = g.coordinates[0]?.[0];
    return ring ? centroidOfRing(ring) : null;
  }
  return null;
}

console.log("경기도 행정동 GeoJSON 다운로드...");
const res = await fetch(GYEONGGI_DONG_URL);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const gyeonggi = await res.json();

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(MAP_DATA_DIR, { recursive: true });

const districtCentroids = {};

for (const city of GYEONGGI_CITIES) {
  const lawdSet = new Set(city.lawdCodes);
  let dongFeatures = gyeonggi.features.filter((f) => lawdSet.has(f.properties?.sgg));

  // 부천시: GeoJSON은 구제 전 41190 단일 코드 → 시명으로 매칭
  if (city.slug === "bucheon-si" && !dongFeatures.length) {
    dongFeatures = gyeonggi.features.filter((f) =>
      (f.properties?.adm_nm || "").includes("부천시")
    );
    for (const f of dongFeatures) {
      f.properties.sgg = f.properties.sgg || "41190";
    }
  }

  for (const f of dongFeatures) {
    const nm = f.properties?.adm_nm || "";
    const parts = nm.split(" ");
    f.properties.dong_nm = parts[parts.length - 1] || nm;
    f.properties.sgg = f.properties.sgg || [...lawdSet][0];
  }

  const guFeatures = [];
  for (const code of city.lawdCodes) {
    let sub = dongFeatures.filter((f) => f.properties?.sgg === code);
    if (city.slug === "bucheon-si") {
      sub = dongFeatures;
    }
    if (!sub.length) {
      console.warn(`  ⚠️ ${city.name} ${code}: 행정동 0개`);
      continue;
    }
    const district = GYEONGGI_DISTRICTS.find((d) => d.code === code);
    const name = district?.name || code;
    let merged = sub[0];
    if (sub.length > 1) {
      try {
        const turf = await import("@turf/turf");
        merged = sub[0];
        for (let i = 1; i < sub.length; i++) {
          const next = turf.union(merged, sub[i]);
          if (next) merged = next;
        }
      } catch {
        merged = sub[0];
      }
    }
    const c = centroidOfFeature(merged);
    if (c) districtCentroids[code] = c;

    guFeatures.push({
      type: "Feature",
      properties: {
        name,
        sgg: code,
        city: city.name,
        source: "Local_HangJeongDong/경기도",
      },
      geometry: merged.geometry,
    });
  }

  const cityGeo = { type: "FeatureCollection", features: guFeatures };
  const outFile = path.join(OUT_DIR, `${city.slug}.geojson`);
  const mapFile = path.join(MAP_DATA_DIR, `${city.slug}.geojson`);
  const json = JSON.stringify(cityGeo);
  writeFileSync(outFile, json);
  writeFileSync(mapFile, json);

  for (const code of city.lawdCodes) {
    const district = GYEONGGI_DISTRICTS.find((d) => d.code === code);
    if (!district) continue;
    let subDong = dongFeatures.filter((f) => f.properties?.sgg === code);
    if (city.slug === "bucheon-si") {
      subDong = dongFeatures;
    }
    const subGu = guFeatures.find((f) => f.properties?.sgg === code);
    if (subDong.length) {
      const dongJson = JSON.stringify({ type: "FeatureCollection", features: subDong });
      writeFileSync(path.join(MAP_DATA_DIR, `${district.slug}-dong.geojson`), dongJson);
      writeFileSync(path.join(OUT_DIR, `${district.slug}-dong.geojson`), dongJson);
    }
    if (subGu) {
      const guJson = JSON.stringify({ type: "FeatureCollection", features: [subGu] });
      writeFileSync(path.join(MAP_DATA_DIR, `${district.slug}-gu.geojson`), guJson);
      writeFileSync(path.join(OUT_DIR, `${district.slug}-gu.geojson`), guJson);
    }
  }

  console.log(`✅ ${city.name}: ${dongFeatures.length}동 → ${guFeatures.length}구역 | ${outFile}`);
}

writeFileSync(
  path.join(OUT_DIR, "centroids.json"),
  JSON.stringify(districtCentroids, null, 2)
);
console.log("\n중심좌표 저장:", path.join(OUT_DIR, "centroids.json"));
console.log("완료: 31개 시·군 GeoJSON");
