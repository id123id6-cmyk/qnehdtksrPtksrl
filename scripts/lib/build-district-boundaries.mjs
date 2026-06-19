/**
 * 행정동·자치구 GeoJSON 생성 (공통)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../../tools/realestate-map/data");

const SEOUL_DONG_URL =
  "https://raw.githubusercontent.com/raqoon886/Local_HangJeongDong/master/hangjeongdong_%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C.geojson";
const SEOUL_GU_URL =
  "https://raw.githubusercontent.com/southkorea/seoul-maps/master/kostat/2013/json/seoul_municipalities_geo_simple.json";

export async function buildDistrictBoundaries({ lawdCode, districtName, slug }) {
  const dongFile = path.join(outDir, `${slug}-dong.geojson`);
  const guFile = path.join(outDir, `${slug}-gu.geojson`);

  console.log(`\n=== ${districtName} (${lawdCode}) GeoJSON 생성 ===`);

  console.log("다운로드:", SEOUL_DONG_URL);
  const dongRes = await fetch(SEOUL_DONG_URL);
  if (!dongRes.ok) throw new Error(`동 GeoJSON HTTP ${dongRes.status}`);
  const seoul = await dongRes.json();

  const dongFeatures = seoul.features.filter((f) => {
    const name = f.properties?.adm_nm || f.properties?.EMD_NM || "";
    return name.includes(districtName);
  });

  console.log(`${districtName} 행정동: ${dongFeatures.length}개`);

  for (const f of dongFeatures) {
    const nm = f.properties?.adm_nm || "";
    const parts = nm.split(" ");
    f.properties.dong_nm = parts[parts.length - 1] || nm;
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    dongFile,
    JSON.stringify({ type: "FeatureCollection", features: dongFeatures })
  );
  console.log("저장:", dongFile);

  let guGeojson;
  let guSource;

  try {
    console.log("다운로드:", SEOUL_GU_URL);
    const guRes = await fetch(SEOUL_GU_URL);
    if (!guRes.ok) throw new Error(`HTTP ${guRes.status}`);
    const guData = await guRes.json();
    const guFeature = guData.features.find((f) => {
      const name =
        f.properties?.name ||
        f.properties?.NAME ||
        f.properties?.adm_nm ||
        "";
      const code = String(f.properties?.code || f.properties?.CODE || "");
      return (
        name.includes(districtName.replace("구", "")) ||
        code === lawdCode ||
        code.endsWith(lawdCode.slice(-3))
      );
    });
    if (!guFeature) throw new Error(`${districtName} feature 없음`);
    guFeature.properties = {
      name: districtName,
      sgg: lawdCode,
      source: "southkorea/seoul-maps (kostat 2013)",
    };
    guGeojson = { type: "FeatureCollection", features: [guFeature] };
    guSource = "southkorea/seoul-maps";
  } catch (err) {
    console.warn("자치구 GeoJSON 실패:", err.message);
    console.log("동 GeoJSON union 폴백...");
    const turf = await import("@turf/turf");
    const flat = turf.flatten({ type: "FeatureCollection", features: dongFeatures });
    const polygons = flat.features.filter((f) => f.geometry?.type === "Polygon");
    if (!polygons.length) throw new Error("Polygon feature 없음");

    let merged = polygons[0];
    for (let i = 1; i < polygons.length; i++) {
      try {
        const next = turf.union(merged, polygons[i]);
        if (next) merged = next;
      } catch (unionErr) {
        console.warn(`union 실패 (${i}):`, unionErr.message);
      }
    }

    merged.properties = {
      name: districtName,
      sgg: lawdCode,
      source: `${slug}-dong.geojson union (@turf/turf)`,
    };
    guGeojson = { type: "FeatureCollection", features: [merged] };
    guSource = "dong union";
  }

  writeFileSync(guFile, JSON.stringify(guGeojson));
  console.log("저장:", guFile);
  console.log("자치구 출처:", guSource);

  dongFeatures.forEach((f) => console.log(" -", f.properties.dong_nm));

  return { dongFile, guFile, dongCount: dongFeatures.length };
}
