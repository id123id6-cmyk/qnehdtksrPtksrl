/**
 * admdongkor( MIT ) → 전국 시군구·동 GeoJSON 분할 저장
 * 실행: node scripts/build-nationwide-geojson.mjs
 *
 * 소스: https://github.com/vuski/admdongkor (버전 20260701, WGS84)
 * 출력:
 *   tools/realestate-map/geojson/sigungu/sigungu-{code}.geojson
 *   tools/realestate-map/geojson/dong/dong-{code}.geojson
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "admdongkor";
import { getAllLawdCodes } from "./lib/nationwide-districts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_SIGUNGU = path.join(ROOT, "tools/realestate-map/geojson/sigungu");
const OUT_DONG = path.join(ROOT, "tools/realestate-map/geojson/dong");
const VERSION = "20260701";
const MAX_FILE_BYTES = 100 * 1024;

mkdirSync(OUT_SIGUNGU, { recursive: true });
mkdirSync(OUT_DONG, { recursive: true });

function roundCoord(n) {
  return Math.round(n * 1e5) / 1e5;
}

function simplifyGeometry(geometry) {
  if (!geometry) return geometry;
  const roundRing = (ring) => ring.map(([lng, lat]) => [roundCoord(lng), roundCoord(lat)]);
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.coordinates.map(roundRing) };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((poly) => poly.map(roundRing)),
    };
  }
  return geometry;
}

function toDongFeature(f) {
  const p = f.properties;
  return {
    type: "Feature",
    properties: {
      dong_nm: p.emdnm,
      sgg: p.sggcd,
      sido: p.sidocd,
      sidonm: p.sidonm,
      sggnm: p.sggnm,
      adm_cd: p.emdcd || p.emd8 || "",
      adm_nm: `${p.sidonm} ${p.sggnm} ${p.emdnm}`,
    },
    geometry: simplifyGeometry(f.geometry),
  };
}

function toSigunguFeature(f) {
  const p = f.properties;
  return {
    type: "Feature",
    properties: {
      name: p.sggnm,
      sgg: p.sggcd,
      sido: p.sidocd,
      sidonm: p.sidonm,
      source: `admdongkor/${VERSION}`,
    },
    geometry: simplifyGeometry(f.geometry),
  };
}

function writeJson(filePath, data) {
  let json = JSON.stringify(data);
  if (json.length > MAX_FILE_BYTES) {
    json = JSON.stringify(data, null, 0);
  }
  writeFileSync(filePath, json);
  return Buffer.byteLength(json);
}

const lawdCodes = new Set(getAllLawdCodes().map((d) => d.code));

console.log(`=== 전국 GeoJSON 빌드 (admdongkor ${VERSION}) ===`);
console.log(`대상 LAWD: ${lawdCodes.size}개`);

const [sggFc, emdFc] = await Promise.all([
  get(VERSION, "sgg"),
  get(VERSION, "emd"),
]);

const sggByCode = new Map();
for (const f of sggFc.features) {
  sggByCode.set(f.properties.sggcd, f);
}

const emdBySgg = new Map();
for (const f of emdFc.features) {
  const code = f.properties.sggcd;
  if (!emdBySgg.has(code)) emdBySgg.set(code, []);
  emdBySgg.get(code).push(f);
}

let sigunguBytes = 0;
let dongBytes = 0;
let sigunguCount = 0;
let dongCount = 0;
let skipped = 0;

for (const code of [...lawdCodes].sort()) {
  const sggPath = path.join(OUT_SIGUNGU, `sigungu-${code}.geojson`);
  const dongPath = path.join(OUT_DONG, `dong-${code}.geojson`);

  const sggFeature = sggByCode.get(code);
  const emdFeatures = emdBySgg.get(code) || [];

  if (!sggFeature && !emdFeatures.length) {
    console.warn(`  ⚠ ${code}: admdongkor 데이터 없음`);
    skipped++;
    continue;
  }

  if (sggFeature) {
    sigunguBytes += writeJson(sggPath, {
      type: "FeatureCollection",
      features: [toSigunguFeature(sggFeature)],
    });
    sigunguCount++;
  }

  if (emdFeatures.length) {
    dongBytes += writeJson(dongPath, {
      type: "FeatureCollection",
      features: emdFeatures.map(toDongFeature),
    });
    dongCount++;
  }
}

console.log("\n========== 결과 ==========");
console.log(`시군구 파일: ${sigunguCount}개 (${(sigunguBytes / 1024).toFixed(0)} KB)`);
console.log(`동 파일: ${dongCount}개 (${(dongBytes / 1024).toFixed(0)} KB)`);
console.log(`총 용량: ${((sigunguBytes + dongBytes) / 1024 / 1024).toFixed(2)} MB`);
console.log(`스킵: ${skipped}개`);
console.log(`라이선스: MIT (vuski/admdongkor)`);
