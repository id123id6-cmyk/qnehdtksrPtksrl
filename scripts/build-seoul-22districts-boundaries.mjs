/**
 * 서울 22개 신규 구 GeoJSON 일괄 빌드
 * 실행: node scripts/build-seoul-22districts-boundaries.mjs
 */
import { buildDistrictBoundaries } from "./lib/build-district-boundaries.mjs";

const DISTRICTS = [
  { lawdCode: "11110", districtName: "종로구", slug: "jongno" },
  { lawdCode: "11140", districtName: "중구", slug: "jung" },
  { lawdCode: "11170", districtName: "용산구", slug: "yongsan" },
  { lawdCode: "11200", districtName: "성동구", slug: "seongdong" },
  { lawdCode: "11215", districtName: "광진구", slug: "gwangjin" },
  { lawdCode: "11230", districtName: "동대문구", slug: "dongdaemun" },
  { lawdCode: "11260", districtName: "중랑구", slug: "jungnang" },
  { lawdCode: "11290", districtName: "성북구", slug: "seongbuk" },
  { lawdCode: "11305", districtName: "강북구", slug: "gangbuk" },
  { lawdCode: "11320", districtName: "도봉구", slug: "dobong" },
  { lawdCode: "11350", districtName: "노원구", slug: "nowon" },
  { lawdCode: "11380", districtName: "은평구", slug: "eunpyeong" },
  { lawdCode: "11410", districtName: "서대문구", slug: "seodaemun" },
  { lawdCode: "11440", districtName: "마포구", slug: "mapo" },
  { lawdCode: "11470", districtName: "양천구", slug: "yangcheon" },
  { lawdCode: "11500", districtName: "강서구", slug: "gangseo" },
  { lawdCode: "11530", districtName: "구로구", slug: "guro" },
  { lawdCode: "11545", districtName: "금천구", slug: "geumcheon" },
  { lawdCode: "11560", districtName: "영등포구", slug: "yeongdeungpo" },
  { lawdCode: "11590", districtName: "동작구", slug: "dongjak" },
  { lawdCode: "11620", districtName: "관악구", slug: "gwanak" },
  { lawdCode: "11740", districtName: "강동구", slug: "gangdong" },
];

console.log("=== 서울 22개구 GeoJSON 빌드 ===\n");

const results = [];
for (let i = 0; i < DISTRICTS.length; i++) {
  const d = DISTRICTS[i];
  console.log(`[${i + 1}/${DISTRICTS.length}] ${d.districtName}...`);
  try {
    const r = await buildDistrictBoundaries({
      lawdCode: d.lawdCode,
      districtName: d.districtName,
      slug: d.slug,
    });
    results.push({ ...d, dongCount: r.dongCount, ok: true });
  } catch (err) {
    console.error(`  ❌ ${d.districtName}: ${err.message}`);
    results.push({ ...d, ok: false, error: err.message });
  }
}

const ok = results.filter((r) => r.ok);
const fail = results.filter((r) => !r.ok);
console.log(`\n완료: ${ok.length}/${DISTRICTS.length}, 실패: ${fail.length}`);
if (fail.length) console.log("실패:", fail.map((f) => f.districtName).join(", "));
