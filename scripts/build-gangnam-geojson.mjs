/**
 * 서울 행정동 GeoJSON → 강남구만 추출
 * 출처: https://github.com/raqoon886/Local_HangJeongDong (vuski/admdongkor 기반)
 */
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../tools/realestate-map/data");
const outFile = path.join(outDir, "gangnam-dong.geojson");

const URL =
  "https://raw.githubusercontent.com/raqoon886/Local_HangJeongDong/master/hangjeongdong_%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C.geojson";

console.log("다운로드:", URL);
const res = await fetch(URL);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const seoul = await res.json();

const gangnam = seoul.features.filter((f) => {
  const props = f.properties || {};
  const name = props.adm_nm || props.EMD_NM || props.dong || "";
  return name.includes("강남구");
});

console.log(`강남구 행정동: ${gangnam.length}개`);

for (const f of gangnam) {
  const nm = f.properties?.adm_nm || "";
  const parts = nm.split(" ");
  f.properties.dong_nm = parts[parts.length - 1] || nm;
}

mkdirSync(outDir, { recursive: true });
writeFileSync(
  outFile,
  JSON.stringify({ type: "FeatureCollection", features: gangnam })
);

console.log("저장:", outFile);
gangnam.forEach((f) => console.log(" -", f.properties.dong_nm));
