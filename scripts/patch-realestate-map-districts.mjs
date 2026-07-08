/**
 * districts.js에 전국 구역 데이터 병합
 * 실행: node scripts/patch-realestate-map-districts.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DISTRICTS_JS = path.join(__dirname, "../tools/realestate-map/js/districts.js");
const GENERATED = path.join(__dirname, "../data/nationwide/map-districts-generated.json");

const { jsBlocks } = JSON.parse(readFileSync(GENERATED, "utf8"));

let src = readFileSync(DISTRICTS_JS, "utf8");

const newDistrictBlocks = jsBlocks.map((b) => b.js).join("\n\n");

// Insert new district constants after BUSAN_DISTRICTS
const busanEnd = src.indexOf("  const SIDO_DISTRICT_MAP");
if (busanEnd === -1) throw new Error("SIDO_DISTRICT_MAP not found");

const beforeMap = src.slice(0, busanEnd);
const afterMap = src.slice(busanEnd);

if (!beforeMap.includes("JEONNAMGWANGJU_DISTRICTS")) {
  src = beforeMap + "\n" + newDistrictBlocks + "\n\n" + afterMap;
}

// Update SIDO_VIEWS
src = src.replace(
  /gangwon: \{ lat: [^}]+\}/,
  "gangwon: { lat: 37.8813, lng: 127.7298, zoom: MAP_ZOOM.sido }"
);
src = src.replace(
  /jeonbuk: \{ lat: [^}]+\}/,
  "jeonbuk: { lat: 35.8242, lng: 127.148, zoom: MAP_ZOOM.sido }"
);

if (!src.includes("jeonnamgwangju:")) {
  src = src.replace(
    /incheon: \{ lat: [^}]+\},/,
    `incheon: { lat: 37.4563, lng: 126.7052, zoom: MAP_ZOOM.sido },
    jeonnamgwangju: { lat: 35.1595, lng: 126.8526, zoom: MAP_ZOOM.sido },`
  );
}

// Update SIDO_OPTIONS - merge gwangju+jeonnam
src = src.replace(
  /\{ id: "gwangju", name: "광주광역시" \},\s*\{ id: "daejeon"/,
  `{ id: "jeonnamgwangju", name: "전남광주통합특별시" },
    { id: "daejeon"`
);
src = src.replace(
  /\{ id: "jeonnam", name: "전라남도" \},\s*\{ id: "gyeongbuk"/,
  `{ id: "gyeongbuk"`
);

// Remove old gwangju from SIDO_VIEWS if duplicate
src = src.replace(/\s*gwangju: \{ lat: 35\.1595[^}]+\},/, "");

// NOT_READY_CODES - only 옹진군 (경기 미수집 구역은 데이터 있으므로 제거)
src = src.replace(
  /const NOT_READY_CODES = new Set\(\[[\s\S]*?\]\);/,
  `const NOT_READY_CODES = new Set([
    "28720",
  ]);`
);

// Enable 경기 previously-not-ready districts
src = src.replace(/, isReady: false/g, "");

// Update SIDO_DISTRICT_MAP
const mapEntries = [
  "seoul: SEOUL_DISTRICTS",
  "gyeonggi: GYEONGGI_DISTRICTS",
  "busan: BUSAN_DISTRICTS",
  ...jsBlocks.map((b) => `${b.sidoId}: ${b.constName}`),
].join(",\n    ");

src = src.replace(
  /const SIDO_DISTRICT_MAP = \{[\s\S]*?\};/,
  `const SIDO_DISTRICT_MAP = {\n    ${mapEntries},\n  };`
);

// Update getAllDistricts spread
const spreads = [
  "SEOUL_DISTRICTS",
  "GYEONGGI_DISTRICTS",
  "BUSAN_DISTRICTS",
  ...jsBlocks.map((b) => b.constName),
].join(", ...");

src = src.replace(
  /const all = \{ \.\.\.[^}]+\};/,
  `const all = { ...${spreads} };`
);

// Export new constants
const exportNames = jsBlocks.map((b) => b.constName).join(",\n    ");
if (!src.includes("JEONNAMGWANGJU_DISTRICTS,")) {
  src = src.replace(
    /BUSAN_DISTRICTS,\s*NOT_READY_CODES/,
    `BUSAN_DISTRICTS,\n    ${exportNames},\n    NOT_READY_CODES`
  );
}

writeFileSync(DISTRICTS_JS, src);
console.log("districts.js 패치 완료");
