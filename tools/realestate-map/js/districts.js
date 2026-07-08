/**
 * 서울·경기 시·군·구 설정 (지도·지역·GeoJSON)
 */
(function (global) {
  "use strict";

  const DISTRICT_FLY_LEVEL = 8;

  const MAP_ZOOM = {
    sido: 10,
    sigungu: 8,
    dong: 6,
  };

  const SIDO_VIEWS = {
    seoul: { lat: 37.5665, lng: 126.978, zoom: MAP_ZOOM.sido },
    busan: { lat: 35.1796, lng: 129.0756, zoom: MAP_ZOOM.sido },
    daegu: { lat: 35.8714, lng: 128.6014, zoom: MAP_ZOOM.sido },
    incheon: { lat: 37.4563, lng: 126.7052, zoom: MAP_ZOOM.sido },
    jeonnamgwangju: { lat: 35.1595, lng: 126.8526, zoom: MAP_ZOOM.sido },
    daejeon: { lat: 36.3504, lng: 127.3845, zoom: MAP_ZOOM.sido },
    ulsan: { lat: 35.5384, lng: 129.3114, zoom: MAP_ZOOM.sido },
    sejong: { lat: 36.4801, lng: 127.289, zoom: MAP_ZOOM.sido },
    gyeonggi: { lat: 37.275, lng: 127.009, zoom: MAP_ZOOM.sido },
    gangwon: { lat: 37.8813, lng: 127.7298, zoom: MAP_ZOOM.sido },
    chungbuk: { lat: 36.8, lng: 127.7, zoom: MAP_ZOOM.sido },
    chungnam: { lat: 36.5184, lng: 126.8, zoom: MAP_ZOOM.sido },
    jeonbuk: { lat: 35.8242, lng: 127.148, zoom: MAP_ZOOM.sido },
    gyeongbuk: { lat: 36.4919, lng: 128.8889, zoom: MAP_ZOOM.sido },
    gyeongnam: { lat: 35.4606, lng: 128.2132, zoom: MAP_ZOOM.sido },
    jeju: { lat: 33.4996, lng: 126.5312, zoom: MAP_ZOOM.sido },
  };

  function getSidoView(sidoId) {
    return SIDO_VIEWS[sidoId] || SIDO_VIEWS.seoul;
  }

  const SIDO_OPTIONS = [
    { id: "seoul", name: "서울특별시" },
    { id: "busan", name: "부산광역시" },
    { id: "daegu", name: "대구광역시" },
    { id: "incheon", name: "인천광역시" },
    { id: "jeonnamgwangju", name: "전남광주통합특별시" },
    { id: "daejeon", name: "대전광역시" },
    { id: "ulsan", name: "울산광역시" },
    { id: "sejong", name: "세종특별자치시" },
    { id: "gyeonggi", name: "경기도" },
    { id: "gangwon", name: "강원특별자치도" },
    { id: "chungbuk", name: "충청북도" },
    { id: "chungnam", name: "충청남도" },
    { id: "jeonbuk", name: "전북특별자치도" },
    { id: "gyeongbuk", name: "경상북도" },
    { id: "gyeongnam", name: "경상남도" },
    { id: "jeju", name: "제주특별자치도" },
  ];

  /** MOLIT 미수집 구역 — 드롭다운·지도에서 숨김 (데이터 적재 후 isReady: true로 전환) */
  const NOT_READY_CODES = new Set([
    "28720",
  ]);

  function isDistrictReady(district) {
    return district?.isReady !== false;
  }

  function filterReadyDistricts(map) {
    return Object.fromEntries(
      Object.entries(map).filter(([, d]) => isDistrictReady(d))
    );
  }

  const SEOUL_DISTRICTS = {
    "11680": { name: "강남구", slug: "gangnam", lat: 37.5172, lng: 127.0473, zoom: 5, sido: "seoul" },
    "11650": { name: "서초구", slug: "seocho", lat: 37.4837, lng: 127.0324, zoom: 5, sido: "seoul" },
    "11710": { name: "송파구", slug: "songpa", lat: 37.5145, lng: 127.1059, zoom: 5, sido: "seoul" },
    "11110": { name: "종로구", slug: "jongno", lat: 37.5735, lng: 126.9788, zoom: 5, sido: "seoul" },
    "11140": { name: "중구", slug: "jung", lat: 37.5641, lng: 126.9979, zoom: 5, sido: "seoul" },
    "11170": { name: "용산구", slug: "yongsan", lat: 37.5326, lng: 126.9905, zoom: 5, sido: "seoul" },
    "11200": { name: "성동구", slug: "seongdong", lat: 37.5634, lng: 127.0367, zoom: 5, sido: "seoul" },
    "11215": { name: "광진구", slug: "gwangjin", lat: 37.5384, lng: 127.0822, zoom: 5, sido: "seoul" },
    "11230": { name: "동대문구", slug: "dongdaemun", lat: 37.5744, lng: 127.0396, zoom: 5, sido: "seoul" },
    "11260": { name: "중랑구", slug: "jungnang", lat: 37.6063, lng: 127.0925, zoom: 5, sido: "seoul" },
    "11290": { name: "성북구", slug: "seongbuk", lat: 37.5894, lng: 127.0167, zoom: 5, sido: "seoul" },
    "11305": { name: "강북구", slug: "gangbuk", lat: 37.6396, lng: 127.0257, zoom: 5, sido: "seoul" },
    "11320": { name: "도봉구", slug: "dobong", lat: 37.6688, lng: 127.0471, zoom: 5, sido: "seoul" },
    "11350": { name: "노원구", slug: "nowon", lat: 37.6543, lng: 127.0568, zoom: 5, sido: "seoul" },
    "11380": { name: "은평구", slug: "eunpyeong", lat: 37.6027, lng: 126.9291, zoom: 5, sido: "seoul" },
    "11410": { name: "서대문구", slug: "seodaemun", lat: 37.5791, lng: 126.9368, zoom: 5, sido: "seoul" },
    "11440": { name: "마포구", slug: "mapo", lat: 37.5663, lng: 126.9019, zoom: 5, sido: "seoul" },
    "11470": { name: "양천구", slug: "yangcheon", lat: 37.517, lng: 126.8665, zoom: 5, sido: "seoul" },
    "11500": { name: "강서구", slug: "gangseo", lat: 37.5509, lng: 126.8495, zoom: 5, sido: "seoul" },
    "11530": { name: "구로구", slug: "guro", lat: 37.4954, lng: 126.8874, zoom: 5, sido: "seoul" },
    "11545": { name: "금천구", slug: "geumcheon", lat: 37.4565, lng: 126.8955, zoom: 5, sido: "seoul" },
    "11560": { name: "영등포구", slug: "yeongdeungpo", lat: 37.5263, lng: 126.8962, zoom: 5, sido: "seoul" },
    "11590": { name: "동작구", slug: "dongjak", lat: 37.5124, lng: 126.9393, zoom: 5, sido: "seoul" },
    "11620": { name: "관악구", slug: "gwanak", lat: 37.4784, lng: 126.9516, zoom: 5, sido: "seoul" },
    "11740": { name: "강동구", slug: "gangdong", lat: 37.5301, lng: 127.1238, zoom: 5, sido: "seoul" },
  };

  const GYEONGGI_DISTRICTS = {
    "41111": { name: "수원시 장안구", slug: "suwon-jangan", lat: 37.31674994597005, lng: 126.99005748289224, zoom: 5, sido: "gyeonggi" },
    "41113": { name: "수원시 권선구", slug: "suwon-gwonseon", lat: 37.259690985743475, lng: 127.0045571013574, zoom: 5, sido: "gyeonggi" },
    "41115": { name: "수원시 팔달구", slug: "suwon-paldal", lat: 37.27969514670358, lng: 127.02673163998347, zoom: 5, sido: "gyeonggi" },
    "41117": { name: "수원시 영통구", slug: "suwon-yeongtong", lat: 37.27137841939929, lng: 127.03995725401143, zoom: 5, sido: "gyeonggi" },
    "41131": { name: "성남시 수정구", slug: "seongnam-sujeong", lat: 37.44029382992726, lng: 127.14063537945182, zoom: 5, sido: "gyeonggi" },
    "41133": { name: "성남시 중원구", slug: "seongnam-jungwon", lat: 37.43049564194357, lng: 127.132570725168, zoom: 5, sido: "gyeonggi" },
    "41135": { name: "성남시 분당구", slug: "seongnam-bundang", lat: 37.37108918486816, lng: 127.14570638411843, zoom: 5, sido: "gyeonggi" },
    "41150": { name: "의정부시", slug: "uijeongbu-si", lat: 37.74757233859925, lng: 127.04755487045469, zoom: 5, sido: "gyeonggi" },
    "41171": { name: "안양시 만안구", slug: "anyang-manan", lat: 37.39985749280954, lng: 126.9240626812296, zoom: 5, sido: "gyeonggi" },
    "41173": { name: "안양시 동안구", slug: "anyang-dongan", lat: 37.404509539889546, lng: 126.93564372024369, zoom: 5, sido: "gyeonggi" },
    "41192": { name: "부천시 원미구", slug: "bucheon-wonmi", lat: 37.5036, lng: 126.787, zoom: 5, sido: "gyeonggi" },
    "41194": { name: "부천시 소사구", slug: "bucheon-sosa", lat: 37.4759, lng: 126.7928, zoom: 5, sido: "gyeonggi" },
    "41196": { name: "부천시 오정구", slug: "bucheon-ojeong", lat: 37.5267, lng: 126.7894, zoom: 5, sido: "gyeonggi" },
    "41210": { name: "광명시", slug: "gwangmyeong-si", lat: 37.48816449749147, lng: 126.86226148363987, zoom: 5, sido: "gyeonggi" },
    "41220": { name: "평택시", slug: "pyeongtaek-si", lat: 36.967289017812824, lng: 127.0527510697506, zoom: 5, sido: "gyeonggi" },
    "41250": { name: "동두천시", slug: "dongducheon-si", lat: 37.909585326968816, lng: 127.06805922122362, zoom: 5, sido: "gyeonggi" },
    "41271": { name: "안산시 상록구", slug: "ansan-sangnok", lat: 37.31347148907666, lng: 126.87051953585146, zoom: 5, sido: "gyeonggi" },
    "41273": { name: "안산시 단원구", slug: "ansan-danwon", lat: 37.340527778933804, lng: 126.8296833547554, zoom: 5, sido: "gyeonggi" },
    "41281": { name: "고양시 덕양구", slug: "goyang-deogyang", lat: 37.659787355570565, lng: 126.82631253044268, zoom: 5, sido: "gyeonggi" },
    "41285": { name: "고양시 일산동구", slug: "goyang-ilsandong", lat: 37.678271136674795, lng: 126.81525459488473, zoom: 5, sido: "gyeonggi" },
    "41287": { name: "고양시 일산서구", slug: "goyang-ilsanseo", lat: 37.68958998931242, lng: 126.76717541115624, zoom: 5, sido: "gyeonggi" },
    "41290": { name: "과천시", slug: "gwacheon-si", lat: 37.43623574867206, lng: 126.97536823091565, zoom: 5, sido: "gyeonggi" },
    "41310": { name: "구리시", slug: "guri-si", lat: 37.62909745886601, lng: 127.1134768792304, zoom: 5, sido: "gyeonggi" },
    "41360": { name: "남양주시", slug: "namyangju-si", lat: 37.59386252133532, lng: 127.2568303278814, zoom: 5, sido: "gyeonggi" },
    "41370": { name: "오산시", slug: "osan-si", lat: 37.151677346516834, lng: 127.08465485080302, zoom: 5, sido: "gyeonggi" },
    "41390": { name: "시흥시", slug: "siheung-si", lat: 37.45345289785208, lng: 126.79704947484886, zoom: 5, sido: "gyeonggi" },
    "41410": { name: "군포시", slug: "gunpo-si", lat: 37.35378659147275, lng: 126.95109600226543, zoom: 5, sido: "gyeonggi" },
    "41430": { name: "의왕시", slug: "uiwang-si", lat: 37.343682196504574, lng: 126.99239391948787, zoom: 5, sido: "gyeonggi" },
    "41450": { name: "하남시", slug: "hanam-si", lat: 37.509178356869214, lng: 127.24399869439088, zoom: 5, sido: "gyeonggi" },
    "41461": { name: "용인시 처인구", slug: "yongin-cheoin", lat: 37.29231303960745, lng: 127.21640043939485, zoom: 5, sido: "gyeonggi" },
    "41463": { name: "용인시 기흥구", slug: "yongin-giheung", lat: 37.274562261930726, lng: 127.12190009537106, zoom: 5, sido: "gyeonggi" },
    "41465": { name: "용인시 수지구", slug: "yongin-suji", lat: 37.32834468501771, lng: 127.09250985891627, zoom: 5, sido: "gyeonggi" },
    "41480": { name: "파주시", slug: "paju-si", lat: 37.868010234262805, lng: 126.79143042896891, zoom: 5, sido: "gyeonggi" },
    "41500": { name: "이천시", slug: "icheon-si", lat: 37.140206277982884, lng: 127.59634152837083, zoom: 5, sido: "gyeonggi" },
    "41550": { name: "안성시", slug: "anseong-si", lat: 36.994357088486744, lng: 127.16956923799393, zoom: 5, sido: "gyeonggi" },
    "41570": { name: "김포시", slug: "gimpo-si", lat: 37.690781270629884, lng: 126.60124940821926, zoom: 5, sido: "gyeonggi" },
    "41590": { name: "화성시", slug: "hwaseong-si", lat: 37.200530615762155, lng: 126.94240050369204, zoom: 5, sido: "gyeonggi" },
    "41610": { name: "광주시", slug: "gwangju-si", lat: 37.35723855636358, lng: 127.21555254511546, zoom: 5, sido: "gyeonggi" },
    "41630": { name: "양주시", slug: "yangju-si", lat: 37.79102266487566, lng: 126.98423304640463, zoom: 5, sido: "gyeonggi" },
    "41650": { name: "포천시", slug: "pocheon-si", lat: 37.792218873296285, lng: 127.15427675517714, zoom: 5, sido: "gyeonggi" },
    "41670": { name: "여주시", slug: "yeoju-si", lat: 37.20658984759881, lng: 127.58289090225641, zoom: 5, sido: "gyeonggi" },
    "41800": { name: "연천군", slug: "yeoncheon-gun", lat: 38.101246461779276, lng: 127.10993204543787, zoom: 5, sido: "gyeonggi" },
    "41820": { name: "가평군", slug: "gapyeong-gun", lat: 37.822296646087146, lng: 127.52523226394275, zoom: 5, sido: "gyeonggi" },
    "41830": { name: "양평군", slug: "yangpyeong-gun", lat: 37.490005874248666, lng: 127.52028964796288, zoom: 5, sido: "gyeonggi" },
  };

  const BUSAN_DISTRICTS = {
    "26110": { name: "중구", slug: "busan-jung", lat: 35.1064, lng: 129.0324, zoom: 5, sido: "busan" },
    "26140": { name: "서구", slug: "busan-seo", lat: 35.0975, lng: 129.0244, zoom: 5, sido: "busan" },
    "26170": { name: "동구", slug: "busan-dong", lat: 35.1293, lng: 129.0454, zoom: 5, sido: "busan" },
    "26200": { name: "영도구", slug: "busan-yeongdo", lat: 35.0917, lng: 129.0678, zoom: 5, sido: "busan" },
    "26230": { name: "부산진구", slug: "busan-busanjin", lat: 35.1629, lng: 129.0532, zoom: 5, sido: "busan" },
    "26260": { name: "동래구", slug: "busan-dongnae", lat: 35.2045, lng: 129.0780, zoom: 5, sido: "busan" },
    "26290": { name: "남구", slug: "busan-nam", lat: 35.1366, lng: 129.0847, zoom: 5, sido: "busan" },
    "26320": { name: "북구", slug: "busan-buk", lat: 35.1972, lng: 128.9905, zoom: 5, sido: "busan" },
    "26350": { name: "해운대구", slug: "busan-haeundae", lat: 35.1631, lng: 129.1635, zoom: 5, sido: "busan" },
    "26380": { name: "사하구", slug: "busan-saha", lat: 35.1046, lng: 128.9743, zoom: 5, sido: "busan" },
    "26410": { name: "금정구", slug: "busan-geumjeong", lat: 35.2431, lng: 129.0921, zoom: 5, sido: "busan" },
    "26440": { name: "강서구", slug: "busan-gangseo", lat: 35.2122, lng: 128.9805, zoom: 5, sido: "busan" },
    "26470": { name: "연제구", slug: "busan-yeonje", lat: 35.1762, lng: 129.0799, zoom: 5, sido: "busan" },
    "26500": { name: "수영구", slug: "busan-suyeong", lat: 35.1456, lng: 129.1133, zoom: 5, sido: "busan" },
    "26530": { name: "사상구", slug: "busan-sasang", lat: 35.1527, lng: 128.9912, zoom: 5, sido: "busan" },
    "26710": { name: "기장군", slug: "busan-gijang", lat: 35.2446, lng: 129.2223, zoom: 5, sido: "busan" },
  };


  const JEONNAMGWANGJU_DISTRICTS = {
    "12110": { name: "목포시", slug: "lawd-12110", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12130": { name: "여수시", slug: "lawd-12130", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12150": { name: "순천시", slug: "lawd-12150", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12170": { name: "나주시", slug: "lawd-12170", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12190": { name: "광양시", slug: "lawd-12190", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12210": { name: "동구", slug: "lawd-12210", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12240": { name: "서구", slug: "lawd-12240", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12270": { name: "남구", slug: "lawd-12270", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12300": { name: "북구", slug: "lawd-12300", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12330": { name: "광산구", slug: "lawd-12330", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12710": { name: "담양군", slug: "lawd-12710", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12720": { name: "곡성군", slug: "lawd-12720", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12730": { name: "구례군", slug: "lawd-12730", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12740": { name: "고흥군", slug: "lawd-12740", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12750": { name: "보성군", slug: "lawd-12750", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12760": { name: "화순군", slug: "lawd-12760", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12770": { name: "장흥군", slug: "lawd-12770", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12780": { name: "강진군", slug: "lawd-12780", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12790": { name: "해남군", slug: "lawd-12790", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12800": { name: "영암군", slug: "lawd-12800", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12810": { name: "무안군", slug: "lawd-12810", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12820": { name: "함평군", slug: "lawd-12820", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12830": { name: "영광군", slug: "lawd-12830", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12840": { name: "장성군", slug: "lawd-12840", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12850": { name: "완도군", slug: "lawd-12850", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12860": { name: "진도군", slug: "lawd-12860", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
    "12870": { name: "신안군", slug: "lawd-12870", lat: 35.1595, lng: 126.8526, zoom: 5, sido: "jeonnamgwangju" },
  };

  const DAEGU_DISTRICTS = {
    "27110": { name: "중구", slug: "lawd-27110", lat: 35.8714, lng: 128.6014, zoom: 5, sido: "daegu" },
    "27140": { name: "동구", slug: "lawd-27140", lat: 35.8714, lng: 128.6014, zoom: 5, sido: "daegu" },
    "27170": { name: "서구", slug: "lawd-27170", lat: 35.8714, lng: 128.6014, zoom: 5, sido: "daegu" },
    "27200": { name: "남구", slug: "lawd-27200", lat: 35.8714, lng: 128.6014, zoom: 5, sido: "daegu" },
    "27230": { name: "북구", slug: "lawd-27230", lat: 35.8714, lng: 128.6014, zoom: 5, sido: "daegu" },
    "27260": { name: "수성구", slug: "lawd-27260", lat: 35.8714, lng: 128.6014, zoom: 5, sido: "daegu" },
    "27290": { name: "달서구", slug: "lawd-27290", lat: 35.8714, lng: 128.6014, zoom: 5, sido: "daegu" },
    "27710": { name: "달성군", slug: "lawd-27710", lat: 35.8714, lng: 128.6014, zoom: 5, sido: "daegu" },
    "27720": { name: "군위군", slug: "lawd-27720", lat: 35.8714, lng: 128.6014, zoom: 5, sido: "daegu" },
  };

  const INCHEON_DISTRICTS = {
    "28125": { name: "제물포구", slug: "lawd-28125", lat: 37.4563, lng: 126.7052, zoom: 5, sido: "incheon" },
    "28155": { name: "영종구", slug: "lawd-28155", lat: 37.4563, lng: 126.7052, zoom: 5, sido: "incheon" },
    "28177": { name: "미추홀구", slug: "lawd-28177", lat: 37.4563, lng: 126.7052, zoom: 5, sido: "incheon" },
    "28185": { name: "연수구", slug: "lawd-28185", lat: 37.4563, lng: 126.7052, zoom: 5, sido: "incheon" },
    "28200": { name: "남동구", slug: "lawd-28200", lat: 37.4563, lng: 126.7052, zoom: 5, sido: "incheon" },
    "28237": { name: "부평구", slug: "lawd-28237", lat: 37.4563, lng: 126.7052, zoom: 5, sido: "incheon" },
    "28245": { name: "계양구", slug: "lawd-28245", lat: 37.4563, lng: 126.7052, zoom: 5, sido: "incheon" },
    "28275": { name: "서해구", slug: "lawd-28275", lat: 37.4563, lng: 126.7052, zoom: 5, sido: "incheon" },
    "28290": { name: "검단구", slug: "lawd-28290", lat: 37.4563, lng: 126.7052, zoom: 5, sido: "incheon" },
    "28710": { name: "강화군", slug: "lawd-28710", lat: 37.4563, lng: 126.7052, zoom: 5, sido: "incheon" },
    "28720": { name: "옹진군", slug: "lawd-28720", lat: 37.4563, lng: 126.7052, zoom: 5, sido: "incheon", isReady: false },
  };

  const DAEJEON_DISTRICTS = {
    "30110": { name: "동구", slug: "lawd-30110", lat: 36.3504, lng: 127.3845, zoom: 5, sido: "daejeon" },
    "30140": { name: "중구", slug: "lawd-30140", lat: 36.3504, lng: 127.3845, zoom: 5, sido: "daejeon" },
    "30170": { name: "서구", slug: "lawd-30170", lat: 36.3504, lng: 127.3845, zoom: 5, sido: "daejeon" },
    "30200": { name: "유성구", slug: "lawd-30200", lat: 36.3504, lng: 127.3845, zoom: 5, sido: "daejeon" },
    "30230": { name: "대덕구", slug: "lawd-30230", lat: 36.3504, lng: 127.3845, zoom: 5, sido: "daejeon" },
  };

  const ULSAN_DISTRICTS = {
    "31110": { name: "중구", slug: "lawd-31110", lat: 35.5384, lng: 129.3114, zoom: 5, sido: "ulsan" },
    "31140": { name: "남구", slug: "lawd-31140", lat: 35.5384, lng: 129.3114, zoom: 5, sido: "ulsan" },
    "31170": { name: "동구", slug: "lawd-31170", lat: 35.5384, lng: 129.3114, zoom: 5, sido: "ulsan" },
    "31200": { name: "북구", slug: "lawd-31200", lat: 35.5384, lng: 129.3114, zoom: 5, sido: "ulsan" },
    "31710": { name: "울주군", slug: "lawd-31710", lat: 35.5384, lng: 129.3114, zoom: 5, sido: "ulsan" },
  };

  const SEJONG_DISTRICTS = {
    "36110": { name: "세종특별자치시", slug: "lawd-36110", lat: 36.4801, lng: 127.289, zoom: 5, sido: "sejong" },
  };

  const GANGWON_DISTRICTS = {
    "51110": { name: "춘천시", slug: "lawd-51110", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51130": { name: "원주시", slug: "lawd-51130", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51150": { name: "강릉시", slug: "lawd-51150", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51170": { name: "동해시", slug: "lawd-51170", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51190": { name: "태백시", slug: "lawd-51190", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51210": { name: "속초시", slug: "lawd-51210", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51230": { name: "삼척시", slug: "lawd-51230", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51720": { name: "홍천군", slug: "lawd-51720", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51730": { name: "횡성군", slug: "lawd-51730", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51750": { name: "영월군", slug: "lawd-51750", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51760": { name: "평창군", slug: "lawd-51760", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51770": { name: "정선군", slug: "lawd-51770", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51780": { name: "철원군", slug: "lawd-51780", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51790": { name: "화천군", slug: "lawd-51790", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51800": { name: "양구군", slug: "lawd-51800", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51810": { name: "인제군", slug: "lawd-51810", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51820": { name: "고성군", slug: "lawd-51820", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
    "51830": { name: "양양군", slug: "lawd-51830", lat: 37.8813, lng: 127.7298, zoom: 5, sido: "gangwon" },
  };

  const CHUNGBUK_DISTRICTS = {
    "43111": { name: "청주시 상당구", slug: "lawd-43111", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
    "43112": { name: "청주시 서원구", slug: "lawd-43112", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
    "43113": { name: "청주시 흥덕구", slug: "lawd-43113", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
    "43114": { name: "청주시 청원구", slug: "lawd-43114", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
    "43130": { name: "충주시", slug: "lawd-43130", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
    "43150": { name: "제천시", slug: "lawd-43150", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
    "43720": { name: "보은군", slug: "lawd-43720", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
    "43730": { name: "옥천군", slug: "lawd-43730", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
    "43740": { name: "영동군", slug: "lawd-43740", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
    "43745": { name: "증평군", slug: "lawd-43745", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
    "43750": { name: "진천군", slug: "lawd-43750", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
    "43760": { name: "괴산군", slug: "lawd-43760", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
    "43770": { name: "음성군", slug: "lawd-43770", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
    "43800": { name: "단양군", slug: "lawd-43800", lat: 36.8, lng: 127.7, zoom: 5, sido: "chungbuk" },
  };

  const CHUNGNAM_DISTRICTS = {
    "44131": { name: "천안시 동남구", slug: "lawd-44131", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44133": { name: "천안시 서북구", slug: "lawd-44133", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44150": { name: "공주시", slug: "lawd-44150", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44180": { name: "보령시", slug: "lawd-44180", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44200": { name: "아산시", slug: "lawd-44200", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44210": { name: "서산시", slug: "lawd-44210", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44230": { name: "논산시", slug: "lawd-44230", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44250": { name: "계룡시", slug: "lawd-44250", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44270": { name: "당진시", slug: "lawd-44270", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44710": { name: "금산군", slug: "lawd-44710", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44760": { name: "부여군", slug: "lawd-44760", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44770": { name: "서천군", slug: "lawd-44770", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44790": { name: "청양군", slug: "lawd-44790", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44800": { name: "홍성군", slug: "lawd-44800", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44810": { name: "예산군", slug: "lawd-44810", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
    "44825": { name: "태안군", slug: "lawd-44825", lat: 36.5184, lng: 126.8, zoom: 5, sido: "chungnam" },
  };

  const JEONBUK_DISTRICTS = {
    "52111": { name: "전주시 완산구", slug: "lawd-52111", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52113": { name: "전주시 덕진구", slug: "lawd-52113", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52130": { name: "군산시", slug: "lawd-52130", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52140": { name: "익산시", slug: "lawd-52140", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52180": { name: "정읍시", slug: "lawd-52180", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52190": { name: "남원시", slug: "lawd-52190", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52210": { name: "김제시", slug: "lawd-52210", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52710": { name: "완주군", slug: "lawd-52710", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52720": { name: "진안군", slug: "lawd-52720", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52730": { name: "무주군", slug: "lawd-52730", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52740": { name: "장수군", slug: "lawd-52740", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52750": { name: "임실군", slug: "lawd-52750", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52770": { name: "순창군", slug: "lawd-52770", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52790": { name: "고창군", slug: "lawd-52790", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
    "52800": { name: "부안군", slug: "lawd-52800", lat: 35.8242, lng: 127.148, zoom: 5, sido: "jeonbuk" },
  };

  const GYEONGBUK_DISTRICTS = {
    "47111": { name: "포항시 남구", slug: "lawd-47111", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47113": { name: "포항시 북구", slug: "lawd-47113", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47130": { name: "경주시", slug: "lawd-47130", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47150": { name: "김천시", slug: "lawd-47150", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47170": { name: "안동시", slug: "lawd-47170", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47190": { name: "구미시", slug: "lawd-47190", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47210": { name: "영주시", slug: "lawd-47210", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47230": { name: "영천시", slug: "lawd-47230", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47250": { name: "상주시", slug: "lawd-47250", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47280": { name: "문경시", slug: "lawd-47280", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47290": { name: "경산시", slug: "lawd-47290", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47730": { name: "의성군", slug: "lawd-47730", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47750": { name: "청송군", slug: "lawd-47750", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47760": { name: "영양군", slug: "lawd-47760", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47770": { name: "영덕군", slug: "lawd-47770", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47820": { name: "청도군", slug: "lawd-47820", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47830": { name: "고령군", slug: "lawd-47830", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47840": { name: "성주군", slug: "lawd-47840", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47850": { name: "칠곡군", slug: "lawd-47850", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47900": { name: "예천군", slug: "lawd-47900", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47920": { name: "봉화군", slug: "lawd-47920", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47930": { name: "울진군", slug: "lawd-47930", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
    "47940": { name: "울릉군", slug: "lawd-47940", lat: 36.4919, lng: 128.8889, zoom: 5, sido: "gyeongbuk" },
  };

  const GYEONGNAM_DISTRICTS = {
    "48121": { name: "창원시 의창구", slug: "lawd-48121", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48123": { name: "창원시 성산구", slug: "lawd-48123", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48125": { name: "창원시 마산합포구", slug: "lawd-48125", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48127": { name: "창원시 마산회원구", slug: "lawd-48127", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48129": { name: "창원시 진해구", slug: "lawd-48129", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48170": { name: "진주시", slug: "lawd-48170", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48220": { name: "통영시", slug: "lawd-48220", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48240": { name: "사천시", slug: "lawd-48240", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48250": { name: "김해시", slug: "lawd-48250", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48270": { name: "밀양시", slug: "lawd-48270", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48310": { name: "거제시", slug: "lawd-48310", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48330": { name: "양산시", slug: "lawd-48330", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48720": { name: "의령군", slug: "lawd-48720", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48730": { name: "함안군", slug: "lawd-48730", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48740": { name: "창녕군", slug: "lawd-48740", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48820": { name: "고성군", slug: "lawd-48820", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48840": { name: "남해군", slug: "lawd-48840", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48850": { name: "하동군", slug: "lawd-48850", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48860": { name: "산청군", slug: "lawd-48860", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48870": { name: "함양군", slug: "lawd-48870", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48880": { name: "거창군", slug: "lawd-48880", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
    "48890": { name: "합천군", slug: "lawd-48890", lat: 35.4606, lng: 128.2132, zoom: 5, sido: "gyeongnam" },
  };

  const JEJU_DISTRICTS = {
    "50110": { name: "제주시", slug: "lawd-50110", lat: 33.4996, lng: 126.5312, zoom: 5, sido: "jeju" },
    "50130": { name: "서귀포시", slug: "lawd-50130", lat: 33.4996, lng: 126.5312, zoom: 5, sido: "jeju" },
  };

  const SIDO_DISTRICT_MAP = {
    seoul: SEOUL_DISTRICTS,
    gyeonggi: GYEONGGI_DISTRICTS,
    busan: BUSAN_DISTRICTS,
    jeonnamgwangju: JEONNAMGWANGJU_DISTRICTS,
    daegu: DAEGU_DISTRICTS,
    incheon: INCHEON_DISTRICTS,
    daejeon: DAEJEON_DISTRICTS,
    ulsan: ULSAN_DISTRICTS,
    sejong: SEJONG_DISTRICTS,
    gangwon: GANGWON_DISTRICTS,
    chungbuk: CHUNGBUK_DISTRICTS,
    chungnam: CHUNGNAM_DISTRICTS,
    jeonbuk: JEONBUK_DISTRICTS,
    gyeongbuk: GYEONGBUK_DISTRICTS,
    gyeongnam: GYEONGNAM_DISTRICTS,
    jeju: JEJU_DISTRICTS,
  };

  function getDistrictsBySido(sidoId, options = {}) {
    const readyOnly = options.readyOnly !== false;
    const map = SIDO_DISTRICT_MAP[sidoId] || {};
    return readyOnly ? filterReadyDistricts(map) : map;
  }

  function getAllDistricts(options = {}) {
    const readyOnly = options.readyOnly !== false;
    const all = { ...SEOUL_DISTRICTS, ...GYEONGGI_DISTRICTS, ...BUSAN_DISTRICTS, ...JEONNAMGWANGJU_DISTRICTS, ...DAEGU_DISTRICTS, ...INCHEON_DISTRICTS, ...DAEJEON_DISTRICTS, ...ULSAN_DISTRICTS, ...SEJONG_DISTRICTS, ...GANGWON_DISTRICTS, ...CHUNGBUK_DISTRICTS, ...CHUNGNAM_DISTRICTS, ...JEONBUK_DISTRICTS, ...GYEONGBUK_DISTRICTS, ...GYEONGNAM_DISTRICTS, ...JEJU_DISTRICTS };
    return readyOnly ? filterReadyDistricts(all) : all;
  }

  function getSidoForCode(code) {
    return getAllDistricts()[code]?.sido || "seoul";
  }

  function getSidoName(sidoId) {
    return SIDO_OPTIONS.find((s) => s.id === sidoId)?.name || sidoId;
  }

  function getSortedDistrictEntries(sidoId, options = {}) {
    const map = sidoId
      ? getDistrictsBySido(sidoId, options)
      : getAllDistricts(options);
    return Object.entries(map).sort((a, b) =>
      a[1].name.localeCompare(b[1].name, "ko")
    );
  }

  function isDistrictCodeReady(code) {
    const d = getAllDistricts({ readyOnly: false })[code];
    return Boolean(d && isDistrictReady(d));
  }

  function getDistrictName(code) {
    return getAllDistricts()[code]?.name || code;
  }

  function getGeoUrls(slug, sido, code) {
    if (code) {
      return {
        dong: `geojson/dong/dong-${code}.geojson`,
        gu: `geojson/sigungu/sigungu-${code}.geojson`,
      };
    }
    const base =
      sido === "gyeonggi" ? "data/gyeonggi" : sido === "busan" ? "data/busan" : "data";
    return {
      dong: `${base}/${slug}-dong.geojson`,
      gu: `${base}/${slug}-gu.geojson`,
    };
  }

  global.RealEstateMapDistricts = {
    SIDO_OPTIONS,
    SEOUL_DISTRICTS,
    GYEONGGI_DISTRICTS,
    BUSAN_DISTRICTS,
    NOT_READY_CODES,
    DISTRICT_FLY_LEVEL,
    MAP_ZOOM,
    SIDO_VIEWS,
    getSidoView,
    isDistrictReady,
    isDistrictCodeReady,
    getDistrictsBySido,
    getAllDistricts,
    getSidoForCode,
    getSidoName,
    getSortedDistrictEntries,
    getDistrictName,
    getGeoUrls,
  };
})(window);
