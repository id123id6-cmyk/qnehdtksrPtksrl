/**
 * 강남구 경계 GeoJSON 생성
 * 1순위: 서울시 자치구 GeoJSON (southkorea/seoul-maps)에서 강남구 추출
 * 2순위: gangnam-dong.geojson 행정동 폴리곤 union (@turf/turf)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../tools/realestate-map/data");
const outFile = path.join(outDir, "gangnam-gu.geojson");
const dongFile = path.join(outDir, "gangnam-dong.geojson");

const SEOUL_GU_URL =
  "https://raw.githubusercontent.com/southkorea/seoul-maps/master/kostat/2013/json/seoul_municipalities_geo_simple.json";

async function fromSeoulMaps() {
  console.log("다운로드:", SEOUL_GU_URL);
  const res = await fetch(SEOUL_GU_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const gangnam = data.features.find((f) => {
    const name =
      f.properties?.name ||
      f.properties?.NAME ||
      f.properties?.adm_nm ||
      "";
    const code = String(f.properties?.code || f.properties?.CODE || "");
    return name.includes("강남") || code === "11680" || code.endsWith("680");
  });
  if (!gangnam) throw new Error("강남구 feature 없음");
  gangnam.properties = {
    name: "강남구",
    sgg: "11680",
    source: "southkorea/seoul-maps (kostat 2013)",
  };
  return {
    type: "FeatureCollection",
    features: [gangnam],
  };
}

async function fromDongUnion() {
  const turf = await import("@turf/turf");
  if (!existsSync(dongFile)) {
    throw new Error(`동 GeoJSON 없음: ${dongFile}`);
  }
  const dong = JSON.parse(readFileSync(dongFile, "utf8"));
  const flat = turf.flatten(dong);
  const polygons = flat.features.filter(
    (f) => f.geometry?.type === "Polygon"
  );
  if (!polygons.length) throw new Error("Polygon feature 없음");

  let merged = polygons[0];
  for (let i = 1; i < polygons.length; i++) {
    try {
      const next = turf.union(merged, polygons[i]);
      if (next) merged = next;
    } catch (err) {
      console.warn(`union 실패 (${i}):`, err.message);
    }
  }

  merged.properties = {
    name: "강남구",
    sgg: "11680",
    source: "gangnam-dong.geojson union (@turf/turf)",
  };

  return { type: "FeatureCollection", features: [merged] };
}

let geojson;
let source;

try {
  geojson = await fromSeoulMaps();
  source = "southkorea/seoul-maps";
} catch (err) {
  console.warn("서울시 자치구 GeoJSON 실패:", err.message);
  console.log("동 GeoJSON union 폴백 시도...");
  geojson = await fromDongUnion();
  source = "dong union";
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(geojson));

const geom = geojson.features[0].geometry;
const ringCount =
  geom.type === "Polygon"
    ? 1
    : geom.type === "MultiPolygon"
      ? geom.coordinates.length
      : 0;

console.log("저장:", outFile);
console.log("출처:", source);
console.log("geometry:", geom.type, "rings:", ringCount);
