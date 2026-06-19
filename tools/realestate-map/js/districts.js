/**
 * 서울 25개구 설정 (지도·지역·GeoJSON)
 */
(function (global) {
  "use strict";

  const SEOUL_DISTRICTS = {
    "11680": { name: "강남구", slug: "gangnam", lat: 37.5172, lng: 127.0473, zoom: 5 },
    "11650": { name: "서초구", slug: "seocho", lat: 37.4837, lng: 127.0324, zoom: 5 },
    "11710": { name: "송파구", slug: "songpa", lat: 37.5145, lng: 127.1059, zoom: 5 },
    "11110": { name: "종로구", slug: "jongno", lat: 37.5735, lng: 126.9788, zoom: 5 },
    "11140": { name: "중구", slug: "jung", lat: 37.5641, lng: 126.9979, zoom: 5 },
    "11170": { name: "용산구", slug: "yongsan", lat: 37.5326, lng: 126.9905, zoom: 5 },
    "11200": { name: "성동구", slug: "seongdong", lat: 37.5634, lng: 127.0367, zoom: 5 },
    "11215": { name: "광진구", slug: "gwangjin", lat: 37.5384, lng: 127.0822, zoom: 5 },
    "11230": { name: "동대문구", slug: "dongdaemun", lat: 37.5744, lng: 127.0396, zoom: 5 },
    "11260": { name: "중랑구", slug: "jungnang", lat: 37.6063, lng: 127.0925, zoom: 5 },
    "11290": { name: "성북구", slug: "seongbuk", lat: 37.5894, lng: 127.0167, zoom: 5 },
    "11305": { name: "강북구", slug: "gangbuk", lat: 37.6396, lng: 127.0257, zoom: 5 },
    "11320": { name: "도봉구", slug: "dobong", lat: 37.6688, lng: 127.0471, zoom: 5 },
    "11350": { name: "노원구", slug: "nowon", lat: 37.6543, lng: 127.0568, zoom: 5 },
    "11380": { name: "은평구", slug: "eunpyeong", lat: 37.6027, lng: 126.9291, zoom: 5 },
    "11410": { name: "서대문구", slug: "seodaemun", lat: 37.5791, lng: 126.9368, zoom: 5 },
    "11440": { name: "마포구", slug: "mapo", lat: 37.5663, lng: 126.9019, zoom: 5 },
    "11470": { name: "양천구", slug: "yangcheon", lat: 37.517, lng: 126.8665, zoom: 5 },
    "11500": { name: "강서구", slug: "gangseo", lat: 37.5509, lng: 126.8495, zoom: 5 },
    "11530": { name: "구로구", slug: "guro", lat: 37.4954, lng: 126.8874, zoom: 5 },
    "11545": { name: "금천구", slug: "geumcheon", lat: 37.4565, lng: 126.8955, zoom: 5 },
    "11560": { name: "영등포구", slug: "yeongdeungpo", lat: 37.5263, lng: 126.8962, zoom: 5 },
    "11590": { name: "동작구", slug: "dongjak", lat: 37.5124, lng: 126.9393, zoom: 5 },
    "11620": { name: "관악구", slug: "gwanak", lat: 37.4784, lng: 126.9516, zoom: 5 },
    "11740": { name: "강동구", slug: "gangdong", lat: 37.5301, lng: 127.1238, zoom: 5 },
  };

  function getSortedDistrictEntries() {
    return Object.entries(SEOUL_DISTRICTS).sort((a, b) =>
      a[1].name.localeCompare(b[1].name, "ko")
    );
  }

  function getDistrictName(code) {
    return SEOUL_DISTRICTS[code]?.name || code;
  }

  function getGeoUrls(slug) {
    return {
      dong: `data/${slug}-dong.geojson`,
      gu: `data/${slug}-gu.geojson`,
    };
  }

  global.RealEstateMapDistricts = {
    SEOUL_DISTRICTS,
    getSortedDistrictEntries,
    getDistrictName,
    getGeoUrls,
  };
})(window);
