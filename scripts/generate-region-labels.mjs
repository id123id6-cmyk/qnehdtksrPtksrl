/**
 * region-labels.json 생성 (시군구·동 centroid)
 * 실행: node scripts/generate-region-labels.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "admdongkor";
import { NATIONWIDE_DISTRICTS } from "./lib/nationwide-districts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "tools/realestate-map/data/region-labels.json");
const VERSION = "20260701";

function centroidOfGeometry(geometry) {
  const rings = [];
  if (geometry.type === "Polygon") rings.push(geometry.coordinates[0]);
  else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) rings.push(poly[0]);
  }
  let sumLat = 0;
  let sumLng = 0;
  let n = 0;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      sumLat += lat;
      sumLng += lng;
      n++;
    }
  }
  if (!n) return null;
  return {
    lat: Math.round((sumLat / n) * 1e5) / 1e5,
    lng: Math.round((sumLng / n) * 1e5) / 1e5,
  };
}

const sidoShort = {};
for (const [code, entry] of Object.entries(NATIONWIDE_DISTRICTS)) {
  sidoShort[code] = entry.short;
}

console.log("=== region-labels.json 생성 ===");
const [sggFc, emdFc] = await Promise.all([
  get(VERSION, "sgg"),
  get(VERSION, "emd"),
]);

const sigungu = {};
for (const f of sggFc.features) {
  const p = f.properties;
  const c = centroidOfGeometry(f.geometry);
  if (!c) continue;
  sigungu[p.sggcd] = {
    name: p.sggnm,
    lat: c.lat,
    lng: c.lng,
    sido: sidoShort[p.sidocd] || p.sidonm,
  };
}

const dong = {};
for (const f of emdFc.features) {
  const p = f.properties;
  const c = centroidOfGeometry(f.geometry);
  const key = p.emdcd || p.emd8;
  if (!key || !c) continue;
  dong[key] = {
    name: p.emdnm,
    lat: c.lat,
    lng: c.lng,
    sigungu: p.sggcd,
  };
}

const out = { sigungu, dong, version: VERSION, generatedAt: new Date().toISOString() };
writeFileSync(OUT, JSON.stringify(out));
console.log(`시군구 라벨: ${Object.keys(sigungu).length}개`);
console.log(`동 라벨: ${Object.keys(dong).length}개`);
console.log(`저장: ${OUT}`);
