/**
 * 송파구 행정동·자치구 GeoJSON 생성
 * 실행: node scripts/build-songpa-boundaries.mjs
 */
import { buildDistrictBoundaries } from "./lib/build-district-boundaries.mjs";

await buildDistrictBoundaries({
  lawdCode: "11710",
  districtName: "송파구",
  slug: "songpa",
});
