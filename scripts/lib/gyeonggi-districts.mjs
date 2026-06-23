/**
 * 경기도 시·군·구 LAWD 코드 및 지도 설정
 * - MOLIT API: 구가 있는 시는 구별 5자리 코드 사용
 * - 부천시(2024 구제): 41192 원미구, 41194 소사구, 41196 오정구
 */

/** 지도·적재용 (구 단위 포함) */
export const GYEONGGI_DISTRICTS = [
  { code: "41111", name: "수원시 장안구", slug: "suwon-jangan", city: "수원시", lat: 37.3038, lng: 127.0102 },
  { code: "41113", name: "수원시 권선구", slug: "suwon-gwonseon", city: "수원시", lat: 37.2575, lng: 126.972 },
  { code: "41115", name: "수원시 팔달구", slug: "suwon-paldal", city: "수원시", lat: 37.2794, lng: 127.0146 },
  { code: "41117", name: "수원시 영통구", slug: "suwon-yeongtong", city: "수원시", lat: 37.2593, lng: 127.0465 },
  { code: "41131", name: "성남시 수정구", slug: "seongnam-sujeong", city: "성남시", lat: 37.4504, lng: 127.1456 },
  { code: "41133", name: "성남시 중원구", slug: "seongnam-jungwon", city: "성남시", lat: 37.4306, lng: 127.1378 },
  { code: "41135", name: "성남시 분당구", slug: "seongnam-bundang", city: "성남시", lat: 37.3827, lng: 127.1189 },
  { code: "41150", name: "의정부시", slug: "uijeongbu-si", city: "의정부시", lat: 37.7381, lng: 127.0338 },
  { code: "41171", name: "안양시 만안구", slug: "anyang-manan", city: "안양시", lat: 37.3894, lng: 126.9199 },
  { code: "41173", name: "안양시 동안구", slug: "anyang-dongan", city: "안양시", lat: 37.3925, lng: 126.9519 },
  { code: "41192", name: "부천시 원미구", slug: "bucheon-wonmi", city: "부천시", lat: 37.5036, lng: 126.787 },
  { code: "41194", name: "부천시 소사구", slug: "bucheon-sosa", city: "부천시", lat: 37.4759, lng: 126.7928 },
  { code: "41196", name: "부천시 오정구", slug: "bucheon-ojeong", city: "부천시", lat: 37.5267, lng: 126.7894 },
  { code: "41210", name: "광명시", slug: "gwangmyeong-si", city: "광명시", lat: 37.4786, lng: 126.8646 },
  { code: "41220", name: "평택시", slug: "pyeongtaek-si", city: "평택시", lat: 36.9921, lng: 127.1129 },
  { code: "41250", name: "동두천시", slug: "dongducheon-si", city: "동두천시", lat: 37.9034, lng: 127.0606 },
  { code: "41271", name: "안산시 상록구", slug: "ansan-sangnok", city: "안산시", lat: 37.3012, lng: 126.8458 },
  { code: "41273", name: "안산시 단원구", slug: "ansan-danwon", city: "안산시", lat: 37.3271, lng: 126.8155 },
  { code: "41281", name: "고양시 덕양구", slug: "goyang-deogyang", city: "고양시", lat: 37.6372, lng: 126.8323 },
  { code: "41285", name: "고양시 일산동구", slug: "goyang-ilsandong", city: "고양시", lat: 37.6588, lng: 126.7752 },
  { code: "41287", name: "고양시 일산서구", slug: "goyang-ilsanseo", city: "고양시", lat: 37.6761, lng: 126.7479 },
  { code: "41290", name: "과천시", slug: "gwacheon-si", city: "과천시", lat: 37.4292, lng: 126.9877 },
  { code: "41310", name: "구리시", slug: "guri-si", city: "구리시", lat: 37.5943, lng: 127.1296 },
  { code: "41360", name: "남양주시", slug: "namyangju-si", city: "남양주시", lat: 37.636, lng: 127.2167 },
  { code: "41370", name: "오산시", slug: "osan-si", city: "오산시", lat: 37.1498, lng: 127.0775 },
  { code: "41390", name: "시흥시", slug: "siheung-si", city: "시흥시", lat: 37.3801, lng: 126.8031 },
  { code: "41410", name: "군포시", slug: "gunpo-si", city: "군포시", lat: 37.3616, lng: 126.9352 },
  { code: "41430", name: "의왕시", slug: "uiwang-si", city: "의왕시", lat: 37.3449, lng: 126.9687 },
  { code: "41450", name: "하남시", slug: "hanam-si", city: "하남시", lat: 37.5394, lng: 127.2149 },
  { code: "41461", name: "용인시 처인구", slug: "yongin-cheoin", city: "용인시", lat: 37.2344, lng: 127.2013 },
  { code: "41463", name: "용인시 기흥구", slug: "yongin-giheung", city: "용인시", lat: 37.2804, lng: 127.1147 },
  { code: "41465", name: "용인시 수지구", slug: "yongin-suji", city: "용인시", lat: 37.3222, lng: 127.0975 },
  { code: "41480", name: "파주시", slug: "paju-si", city: "파주시", lat: 37.7599, lng: 126.78 },
  { code: "41500", name: "이천시", slug: "icheon-si", city: "이천시", lat: 37.272, lng: 127.435 },
  { code: "41550", name: "안성시", slug: "anseong-si", city: "안성시", lat: 37.0078, lng: 127.2797 },
  { code: "41570", name: "김포시", slug: "gimpo-si", city: "김포시", lat: 37.6153, lng: 126.7155 },
  // 화성시: 2026.2.1 일반구 신설 → MOLIT는 구별 LAWD 사용 (41590은 데이터 없음)
  { code: "41591", name: "화성시 만세구", slug: "hwaseong-manse", city: "화성시", lat: 37.21, lng: 126.82 },
  { code: "41593", name: "화성시 효행구", slug: "hwaseong-hyohaeng", city: "화성시", lat: 37.16, lng: 126.89 },
  { code: "41595", name: "화성시 병점구", slug: "hwaseong-byeongjeom", city: "화성시", lat: 37.21, lng: 126.97 },
  { code: "41597", name: "화성시 동탄구", slug: "hwaseong-dongtan", city: "화성시", lat: 37.20, lng: 127.07 },
  { code: "41610", name: "광주시", slug: "gwangju-si", city: "광주시", lat: 37.4294, lng: 127.255 },
  { code: "41630", name: "양주시", slug: "yangju-si", city: "양주시", lat: 37.7852, lng: 127.0458 },
  { code: "41650", name: "포천시", slug: "pocheon-si", city: "포천시", lat: 37.8949, lng: 127.2002 },
  { code: "41670", name: "여주시", slug: "yeoju-si", city: "여주시", lat: 37.2983, lng: 127.6375 },
  { code: "41800", name: "연천군", slug: "yeoncheon-gun", city: "연천군", lat: 38.0968, lng: 127.0747 },
  { code: "41820", name: "가평군", slug: "gapyeong-gun", city: "가평군", lat: 37.8315, lng: 127.5105 },
  { code: "41830", name: "양평군", slug: "yangpyeong-gun", city: "양평군", lat: 37.4914, lng: 127.4874 },
];

/** GeoJSON 31개 시·군 (상위 행정구역) */
export const GYEONGGI_CITIES = [
  { slug: "suwon-si", name: "수원시", lawdCodes: ["41111", "41113", "41115", "41117"] },
  { slug: "seongnam-si", name: "성남시", lawdCodes: ["41131", "41133", "41135"] },
  { slug: "uijeongbu-si", name: "의정부시", lawdCodes: ["41150"] },
  { slug: "anyang-si", name: "안양시", lawdCodes: ["41171", "41173"] },
  { slug: "bucheon-si", name: "부천시", lawdCodes: ["41192", "41194", "41196"] },
  { slug: "gwangmyeong-si", name: "광명시", lawdCodes: ["41210"] },
  { slug: "pyeongtaek-si", name: "평택시", lawdCodes: ["41220"] },
  { slug: "dongducheon-si", name: "동두천시", lawdCodes: ["41250"] },
  { slug: "ansan-si", name: "안산시", lawdCodes: ["41271", "41273"] },
  { slug: "goyang-si", name: "고양시", lawdCodes: ["41281", "41285", "41287"] },
  { slug: "gwacheon-si", name: "과천시", lawdCodes: ["41290"] },
  { slug: "guri-si", name: "구리시", lawdCodes: ["41310"] },
  { slug: "namyangju-si", name: "남양주시", lawdCodes: ["41360"] },
  { slug: "osan-si", name: "오산시", lawdCodes: ["41370"] },
  { slug: "siheung-si", name: "시흥시", lawdCodes: ["41390"] },
  { slug: "gunpo-si", name: "군포시", lawdCodes: ["41410"] },
  { slug: "uiwang-si", name: "의왕시", lawdCodes: ["41430"] },
  { slug: "hanam-si", name: "하남시", lawdCodes: ["41450"] },
  { slug: "yongin-si", name: "용인시", lawdCodes: ["41461", "41463", "41465"] },
  { slug: "paju-si", name: "파주시", lawdCodes: ["41480"] },
  { slug: "icheon-si", name: "이천시", lawdCodes: ["41500"] },
  { slug: "anseong-si", name: "안성시", lawdCodes: ["41550"] },
  { slug: "gimpo-si", name: "김포시", lawdCodes: ["41570"] },
  { slug: "hwaseong-si", name: "화성시", lawdCodes: ["41591", "41593", "41595", "41597"] },
  { slug: "gwangju-si", name: "광주시", lawdCodes: ["41610"] },
  { slug: "yangju-si", name: "양주시", lawdCodes: ["41630"] },
  { slug: "pocheon-si", name: "포천시", lawdCodes: ["41650"] },
  { slug: "yeoju-si", name: "여주시", lawdCodes: ["41670"] },
  { slug: "yeoncheon-gun", name: "연천군", lawdCodes: ["41800"] },
  { slug: "gapyeong-gun", name: "가평군", lawdCodes: ["41820"] },
  { slug: "yangpyeong-gun", name: "양평군", lawdCodes: ["41830"] },
];

export const GYEONGGI_CODES = GYEONGGI_DISTRICTS.map((d) => d.code);

export const GYEONGGI_NAMES = Object.fromEntries(
  GYEONGGI_DISTRICTS.map((d) => [d.code, d.name])
);

export function geocodePrefix(code) {
  const d = GYEONGGI_DISTRICTS.find((x) => x.code === code);
  return d ? `경기 ${d.name}` : "경기도";
}
