/**
 * 전국 LAWD 코드 마스터 (MOLIT API 5자리)
 * - 행정구역 개편 반영 (2026-07-01 기준):
 *   * 강원 42xxx → 51xxx (2023.6 강원특별자치도)
 *   * 전북 45xxx → 52xxx (2024.1 전북특별자치도)
 *   * 광주 29xxx + 전남 46xxx → 12xxx (2026.7 전남광주통합특별시)
 *   * 인천 중구·동구·서구 개편 → 제물포·영종·서해·검단구
 */
import { GYEONGGI_DISTRICTS } from "./gyeonggi-districts.mjs";

/** import-seoul-22districts.mjs DISTRICTS + 강남·서초·송파 */
const SEOUL_DISTRICTS = [
  { code: "11110", name: "종로구" },
  { code: "11140", name: "중구" },
  { code: "11170", name: "용산구" },
  { code: "11200", name: "성동구" },
  { code: "11215", name: "광진구" },
  { code: "11230", name: "동대문구" },
  { code: "11260", name: "중랑구" },
  { code: "11290", name: "성북구" },
  { code: "11305", name: "강북구" },
  { code: "11320", name: "도봉구" },
  { code: "11350", name: "노원구" },
  { code: "11380", name: "은평구" },
  { code: "11410", name: "서대문구" },
  { code: "11440", name: "마포구" },
  { code: "11470", name: "양천구" },
  { code: "11500", name: "강서구" },
  { code: "11530", name: "구로구" },
  { code: "11545", name: "금천구" },
  { code: "11560", name: "영등포구" },
  { code: "11590", name: "동작구" },
  { code: "11620", name: "관악구" },
  { code: "11650", name: "서초구" },
  { code: "11680", name: "강남구" },
  { code: "11710", name: "송파구" },
  { code: "11740", name: "강동구" },
];

const GYEONGGI = GYEONGGI_DISTRICTS.map(({ code, name }) => ({ code, name }));

export const NATIONWIDE_DISTRICTS = {
  "11": {
    name: "서울특별시",
    short: "서울",
    districts: SEOUL_DISTRICTS,
  },
  "26": {
    name: "부산광역시",
    short: "부산",
    districts: [
      { code: "26110", name: "중구" },
      { code: "26140", name: "서구" },
      { code: "26170", name: "동구" },
      { code: "26200", name: "영도구" },
      { code: "26230", name: "부산진구" },
      { code: "26260", name: "동래구" },
      { code: "26290", name: "남구" },
      { code: "26320", name: "북구" },
      { code: "26350", name: "해운대구" },
      { code: "26380", name: "사하구" },
      { code: "26410", name: "금정구" },
      { code: "26440", name: "강서구" },
      { code: "26470", name: "연제구" },
      { code: "26500", name: "수영구" },
      { code: "26530", name: "사상구" },
      { code: "26710", name: "기장군" },
    ],
  },
  "27": {
    name: "대구광역시",
    short: "대구",
    districts: [
      { code: "27110", name: "중구" },
      { code: "27140", name: "동구" },
      { code: "27170", name: "서구" },
      { code: "27200", name: "남구" },
      { code: "27230", name: "북구" },
      { code: "27260", name: "수성구" },
      { code: "27290", name: "달서구" },
      { code: "27710", name: "달성군" },
      { code: "27720", name: "군위군" },
    ],
  },
  "28": {
    name: "인천광역시",
    short: "인천",
    districts: [
      { code: "28125", name: "제물포구" },
      { code: "28155", name: "영종구" },
      { code: "28177", name: "미추홀구" },
      { code: "28185", name: "연수구" },
      { code: "28200", name: "남동구" },
      { code: "28237", name: "부평구" },
      { code: "28245", name: "계양구" },
      { code: "28275", name: "서해구" },
      { code: "28290", name: "검단구" },
      { code: "28710", name: "강화군" },
      { code: "28720", name: "옹진군" },
    ],
  },
  "12": {
    name: "전남광주통합특별시",
    short: "전남광주",
    districts: [
      { code: "12210", name: "동구" },
      { code: "12240", name: "서구" },
      { code: "12270", name: "남구" },
      { code: "12300", name: "북구" },
      { code: "12330", name: "광산구" },
      { code: "12110", name: "목포시" },
      { code: "12130", name: "여수시" },
      { code: "12150", name: "순천시" },
      { code: "12170", name: "나주시" },
      { code: "12190", name: "광양시" },
      { code: "12710", name: "담양군" },
      { code: "12720", name: "곡성군" },
      { code: "12730", name: "구례군" },
      { code: "12740", name: "고흥군" },
      { code: "12750", name: "보성군" },
      { code: "12760", name: "화순군" },
      { code: "12770", name: "장흥군" },
      { code: "12780", name: "강진군" },
      { code: "12790", name: "해남군" },
      { code: "12800", name: "영암군" },
      { code: "12810", name: "무안군" },
      { code: "12820", name: "함평군" },
      { code: "12830", name: "영광군" },
      { code: "12840", name: "장성군" },
      { code: "12850", name: "완도군" },
      { code: "12860", name: "진도군" },
      { code: "12870", name: "신안군" },
    ],
  },
  "30": {
    name: "대전광역시",
    short: "대전",
    districts: [
      { code: "30110", name: "동구" },
      { code: "30140", name: "중구" },
      { code: "30170", name: "서구" },
      { code: "30200", name: "유성구" },
      { code: "30230", name: "대덕구" },
    ],
  },
  "31": {
    name: "울산광역시",
    short: "울산",
    districts: [
      { code: "31110", name: "중구" },
      { code: "31140", name: "남구" },
      { code: "31170", name: "동구" },
      { code: "31200", name: "북구" },
      { code: "31710", name: "울주군" },
    ],
  },
  "36": {
    name: "세종특별자치시",
    short: "세종",
    districts: [{ code: "36110", name: "세종특별자치시" }],
  },
  "41": {
    name: "경기도",
    short: "경기",
    districts: GYEONGGI,
  },
  "42": {
    name: "강원특별자치도",
    short: "강원",
    districts: [
      { code: "51110", name: "춘천시" },
      { code: "51130", name: "원주시" },
      { code: "51150", name: "강릉시" },
      { code: "51170", name: "동해시" },
      { code: "51190", name: "태백시" },
      { code: "51210", name: "속초시" },
      { code: "51230", name: "삼척시" },
      { code: "51720", name: "홍천군" },
      { code: "51730", name: "횡성군" },
      { code: "51750", name: "영월군" },
      { code: "51760", name: "평창군" },
      { code: "51770", name: "정선군" },
      { code: "51780", name: "철원군" },
      { code: "51790", name: "화천군" },
      { code: "51800", name: "양구군" },
      { code: "51810", name: "인제군" },
      { code: "51820", name: "고성군" },
      { code: "51830", name: "양양군" },
    ],
  },
  "43": {
    name: "충청북도",
    short: "충북",
    districts: [
      { code: "43111", name: "청주시 상당구" },
      { code: "43112", name: "청주시 서원구" },
      { code: "43113", name: "청주시 흥덕구" },
      { code: "43114", name: "청주시 청원구" },
      { code: "43130", name: "충주시" },
      { code: "43150", name: "제천시" },
      { code: "43720", name: "보은군" },
      { code: "43730", name: "옥천군" },
      { code: "43740", name: "영동군" },
      { code: "43745", name: "증평군" },
      { code: "43750", name: "진천군" },
      { code: "43760", name: "괴산군" },
      { code: "43770", name: "음성군" },
      { code: "43800", name: "단양군" },
    ],
  },
  "44": {
    name: "충청남도",
    short: "충남",
    districts: [
      { code: "44131", name: "천안시 동남구" },
      { code: "44133", name: "천안시 서북구" },
      { code: "44150", name: "공주시" },
      { code: "44180", name: "보령시" },
      { code: "44200", name: "아산시" },
      { code: "44210", name: "서산시" },
      { code: "44230", name: "논산시" },
      { code: "44250", name: "계룡시" },
      { code: "44270", name: "당진시" },
      { code: "44710", name: "금산군" },
      { code: "44760", name: "부여군" },
      { code: "44770", name: "서천군" },
      { code: "44790", name: "청양군" },
      { code: "44800", name: "홍성군" },
      { code: "44810", name: "예산군" },
      { code: "44825", name: "태안군" },
    ],
  },
  "45": {
    name: "전북특별자치도",
    short: "전북",
    districts: [
      { code: "52111", name: "전주시 완산구" },
      { code: "52113", name: "전주시 덕진구" },
      { code: "52130", name: "군산시" },
      { code: "52140", name: "익산시" },
      { code: "52180", name: "정읍시" },
      { code: "52190", name: "남원시" },
      { code: "52210", name: "김제시" },
      { code: "52710", name: "완주군" },
      { code: "52720", name: "진안군" },
      { code: "52730", name: "무주군" },
      { code: "52740", name: "장수군" },
      { code: "52750", name: "임실군" },
      { code: "52770", name: "순창군" },
      { code: "52790", name: "고창군" },
      { code: "52800", name: "부안군" },
    ],
  },
  "47": {
    name: "경상북도",
    short: "경북",
    districts: [
      { code: "47111", name: "포항시 남구" },
      { code: "47113", name: "포항시 북구" },
      { code: "47130", name: "경주시" },
      { code: "47150", name: "김천시" },
      { code: "47170", name: "안동시" },
      { code: "47190", name: "구미시" },
      { code: "47210", name: "영주시" },
      { code: "47230", name: "영천시" },
      { code: "47250", name: "상주시" },
      { code: "47280", name: "문경시" },
      { code: "47290", name: "경산시" },
      { code: "47730", name: "의성군" },
      { code: "47750", name: "청송군" },
      { code: "47760", name: "영양군" },
      { code: "47770", name: "영덕군" },
      { code: "47820", name: "청도군" },
      { code: "47830", name: "고령군" },
      { code: "47840", name: "성주군" },
      { code: "47850", name: "칠곡군" },
      { code: "47900", name: "예천군" },
      { code: "47920", name: "봉화군" },
      { code: "47930", name: "울진군" },
      { code: "47940", name: "울릉군" },
    ],
  },
  "48": {
    name: "경상남도",
    short: "경남",
    districts: [
      { code: "48121", name: "창원시 의창구" },
      { code: "48123", name: "창원시 성산구" },
      { code: "48125", name: "창원시 마산합포구" },
      { code: "48127", name: "창원시 마산회원구" },
      { code: "48129", name: "창원시 진해구" },
      { code: "48170", name: "진주시" },
      { code: "48220", name: "통영시" },
      { code: "48240", name: "사천시" },
      { code: "48250", name: "김해시" },
      { code: "48270", name: "밀양시" },
      { code: "48310", name: "거제시" },
      { code: "48330", name: "양산시" },
      { code: "48720", name: "의령군" },
      { code: "48730", name: "함안군" },
      { code: "48740", name: "창녕군" },
      { code: "48820", name: "고성군" },
      { code: "48840", name: "남해군" },
      { code: "48850", name: "하동군" },
      { code: "48860", name: "산청군" },
      { code: "48870", name: "함양군" },
      { code: "48880", name: "거창군" },
      { code: "48890", name: "합천군" },
    ],
  },
  "50": {
    name: "제주특별자치도",
    short: "제주",
    districts: [
      { code: "50110", name: "제주시" },
      { code: "50130", name: "서귀포시" },
    ],
  },
};

/** 시도 코드 목록 (정렬) */
export const SIDO_CODES = Object.keys(NATIONWIDE_DISTRICTS).sort();

/**
 * @param {string} sidoCode - 2자리 시도코드 (예: "11", "26")
 * @returns {{ code: string, name: string }[]}
 */
export function getDistrictsBySido(sidoCode) {
  const entry = NATIONWIDE_DISTRICTS[sidoCode];
  if (!entry) return [];
  return entry.districts;
}

/**
 * @returns {{ code: string, name: string, sidoCode: string, sidoName: string, sidoShort: string }[]}
 */
export function getAllLawdCodes() {
  const list = [];
  for (const [sidoCode, entry] of Object.entries(NATIONWIDE_DISTRICTS)) {
    for (const d of entry.districts) {
      list.push({
        code: d.code,
        name: d.name,
        sidoCode,
        sidoName: entry.name,
        sidoShort: entry.short,
      });
    }
  }
  return list;
}

/**
 * @param {string} sidoCode
 * @returns {string}
 */
export function getSidoName(sidoCode) {
  return NATIONWIDE_DISTRICTS[sidoCode]?.name || sidoCode;
}

/**
 * @param {string} sidoCode
 * @returns {string}
 */
export function getSidoShort(sidoCode) {
  return NATIONWIDE_DISTRICTS[sidoCode]?.short || sidoCode;
}

/** 시도별 시군구 개수 */
export function getDistrictCounts() {
  return SIDO_CODES.map((code) => ({
    sidoCode: code,
    sidoName: getSidoName(code),
    sidoShort: getSidoShort(code),
    count: NATIONWIDE_DISTRICTS[code].districts.length,
  }));
}

/** 전체 시군구 개수 */
export function getTotalDistrictCount() {
  return getAllLawdCodes().length;
}
