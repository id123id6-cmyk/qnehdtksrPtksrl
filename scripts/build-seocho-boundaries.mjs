/**
 * 서초구 행정동·자치구 GeoJSON 생성
 * 실행: node scripts/build-seocho-boundaries.mjs
 */
import { buildDistrictBoundaries } from "./lib/build-district-boundaries.mjs";

await buildDistrictBoundaries({
  lawdCode: "11650",
  districtName: "서초구",
  slug: "seocho",
});
