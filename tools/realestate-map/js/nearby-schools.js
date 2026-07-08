/**
 * 사이드바 — 가까운 초등학교 (카카오 로컬 API, 1km, 30분 캐시)
 */
(function (global) {
  "use strict";

  const CACHE_TTL_MS = 30 * 60 * 1000;
  const SEARCH_DIST_M = 1000;
  const MAX_SCHOOLS = 3;
  const WALK_M_PER_MIN = 80;

  const cache = new Map();
  let highlightOverlay = null;
  let apiCallCount = 0;

  function getRestKey() {
    const cfg = global.REALESTATE_MAP_CONFIG || {};
    return cfg.kakaoRestKey || cfg.kakaoJsKey || "";
  }

  function cacheKey(lat, lng) {
    return `elem:${lat.toFixed(5)}:${lng.toFixed(5)}`;
  }

  function getCached(key) {
    const hit = cache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.ts > CACHE_TTL_MS) {
      cache.delete(key);
      return null;
    }
    return hit.data;
  }

  function setCache(key, data) {
    cache.set(key, { ts: Date.now(), data });
  }

  function formatWalkLabel(distanceM) {
    const meters = Math.max(0, Number(distanceM) || 0);
    const minutes = Math.max(1, Math.round(meters / WALK_M_PER_MIN));
    return `도보 ${minutes}분 · ${meters.toLocaleString()}m`;
  }

  function isElementarySchool(doc) {
    const name = doc.place_name || "";
    const category = doc.category_name || "";
    return name.includes("초등") || category.includes("초등");
  }

  async function kakaoKeywordSearch(lat, lng) {
    const key = getRestKey();
    if (!key) return [];

    apiCallCount += 1;
    const qs = new URLSearchParams({
      query: "초등학교",
      x: String(lng),
      y: String(lat),
      radius: String(SEARCH_DIST_M),
      size: "15",
    });

    const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${qs}`, {
      headers: { Authorization: `KakaoAK ${key}` },
    });

    if (!res.ok) {
      console.warn("[nearby-schools] Kakao API", res.status);
      return [];
    }

    const json = await res.json();
    return json.documents || [];
  }

  async function fetchNearbyElementarySchools(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

    const key = cacheKey(lat, lng);
    const cached = getCached(key);
    if (cached) return cached;

    const docs = await kakaoKeywordSearch(lat, lng);
    const schools = docs
      .filter(isElementarySchool)
      .map((d) => ({
        id: d.id,
        name: d.place_name,
        lat: parseFloat(d.y),
        lng: parseFloat(d.x),
        distance: parseInt(d.distance, 10) || 0,
        address: d.road_address_name || d.address_name || "",
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_SCHOOLS);

    setCache(key, schools);
    return schools;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function getSectionShellHtml() {
    return `
      <section class="nearby-schools-section" id="nearby-schools-section" aria-labelledby="nearby-schools-title">
        <h3 class="nearby-schools-title" id="nearby-schools-title">🏫 가까운 초등학교</h3>
        <div class="nearby-schools-list" id="nearby-schools-list">
          <p class="nearby-schools-status">검색 중...</p>
        </div>
        <p class="nearby-schools-disclaimer">※ 실제 학군 배정은 관할 교육청에 문의하세요</p>
      </section>`;
  }

  function renderSchoolListHtml(schools) {
    if (!schools.length) {
      return '<p class="nearby-schools-status">주변 1km 내 초등학교를 찾지 못했습니다.</p>';
    }

    return schools
      .map(
        (school, index) => `
      <button
        type="button"
        class="nearby-school-card"
        data-school-index="${index}"
        data-school-lat="${school.lat}"
        data-school-lng="${school.lng}"
        data-school-name="${escapeHtml(school.name)}"
      >
        <span class="nearby-school-name">${escapeHtml(school.name)}</span>
        <span class="nearby-school-distance">${formatWalkLabel(school.distance)}</span>
      </button>`
      )
      .join("");
  }

  function clearSchoolHighlight() {
    if (highlightOverlay) {
      highlightOverlay.setMap(null);
      highlightOverlay = null;
    }
  }

  function focusSchoolOnMap(map, school) {
    if (!map || !school || !global.kakao?.maps) return;

    clearSchoolHighlight();
    const pos = new kakao.maps.LatLng(school.lat, school.lng);
    map.panTo(pos);
    if (map.getLevel() > 5) map.setLevel(5);

    const el = document.createElement("div");
    el.className = "school-highlight-marker";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", school.name);
    el.textContent = "🏫";

    highlightOverlay = new kakao.maps.CustomOverlay({
      position: pos,
      content: el,
      yAnchor: 1.1,
      zIndex: 12,
    });
    highlightOverlay.setMap(map);
  }

  function bindSchoolCards(listEl, schools, map) {
    if (!listEl) return;
    listEl.querySelectorAll(".nearby-school-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.dataset.schoolIndex, 10);
        const school = schools[index];
        if (!school) return;
        focusSchoolOnMap(map, school);
      });
    });
  }

  async function loadIntoSidebar(apt, map) {
    const listEl = document.getElementById("nearby-schools-list");
    if (!listEl) return;

    const lat = parseFloat(apt?.latitude);
    const lng = parseFloat(apt?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      listEl.innerHTML =
        '<p class="nearby-schools-status">단지 좌표가 없어 학교를 검색할 수 없습니다.</p>';
      return;
    }

    listEl.innerHTML = '<p class="nearby-schools-status">검색 중...</p>';

    try {
      const schools = await fetchNearbyElementarySchools(lat, lng);
      listEl.innerHTML = renderSchoolListHtml(schools);
      bindSchoolCards(listEl, schools, map);
    } catch (err) {
      console.warn("[nearby-schools] load failed", err);
      listEl.innerHTML =
        '<p class="nearby-schools-status">학교 정보를 불러오지 못했습니다.</p>';
    }
  }

  global.RealEstateMapNearbySchools = {
    CACHE_TTL_MS,
    fetchNearbyElementarySchools,
    getSectionShellHtml,
    loadIntoSidebar,
    focusSchoolOnMap,
    clearSchoolHighlight,
    getApiCallCount: () => apiCallCount,
    resetApiCallCount: () => {
      apiCallCount = 0;
    },
  };
})(window);
