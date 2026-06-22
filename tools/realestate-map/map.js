/**

 * 강남구 부동산 지도 — 카카오맵 + Supabase 마커

 */

(function () {

  "use strict";



  const DISTRICTS = window.RealEstateMapDistricts?.SEOUL_DISTRICTS || {
    "11680": { name: "강남구", lat: 37.5172, lng: 127.0473, zoom: 5 },
    "11650": { name: "서초구", lat: 37.4837, lng: 127.0324, zoom: 5 },
    "11710": { name: "송파구", lat: 37.5145, lng: 127.1059, zoom: 5 },
  };

  const KOREA_VIEW = { lat: 36.35, lng: 127.77, zoom: 12 };

  const POPULAR_REGIONS = [
    { name: "강남구", code: "11680", available: true },
    { name: "송파구", code: "11710", available: true },
    { name: "마포구", code: "11440", available: true },
    { name: "용산구", code: "11170", available: true },
    { name: "성동구", code: "11200", available: true },
    { name: "영등포구", code: "11560", available: true },
  ];

  let sigunguCode = null;
  let districtSelected = false;



  const config = window.REALESTATE_MAP_CONFIG;

  if (!config?.supabaseUrl || !config?.supabaseKey || !config?.kakaoJsKey) {

    showError(

      "설정 파일이 없습니다. config.example.js 를 config.js 로 복사하거나 " +

        "node scripts/generate-frontend-config.mjs 를 실행하세요."

    );

    return;

  }



  const els = {

    map: document.getElementById("map"),

    loading: document.getElementById("map-loading"),

    error: document.getElementById("map-error"),

    count: document.getElementById("marker-count"),

    searchInput: document.getElementById("search-input"),

    searchResults: document.getElementById("search-results"),

    mobileSearchInput: document.getElementById("mobile-search-input"),

    mobileSearchResults: document.getElementById("mobile-search-results"),

    sidebarContent: document.getElementById("sidebar-content"),

    searchIndexHint: document.getElementById("search-index-hint"),

    ddayBtn: document.getElementById("dday-btn"),

    emptyState: document.getElementById("map-empty-state"),

    popularGrid: document.getElementById("popular-regions-grid"),

    helpBtn: document.getElementById("map-help-btn"),

    regionHint: document.getElementById("region-select-hint"),

    filterBar: document.getElementById("map-filter-bar"),

    legend: document.getElementById("map-legend"),

    mobileFab: document.getElementById("mobileSearchFab"),

  };



  let map;

  let markerLayer;

  let filterBar;

  let regionSelector;

  let selectedDong = "all";

  let supabase;

  let apartments = [];

  let allApartments = [];

  let districtCache = {};

  let searchIndex = [];

  let searchIndexReady = false;

  let selectedApt = null;

  let refreshMarkersTimer = null;

  let uiBound = false;



  init();



  async function init() {

    try {

      initSupabase();

      await loadKakaoSdk();

      initMap();

      setupMapUi();

      bindEmptyStateUi();

      if (districtSelected) {

        await loadInitialDistrict();

        initMarkerLayer();

      } else {

        showMapEmptyState();

        showRegionSelectHint();

        hideMapControls();

        showInitialEmptySidebar();

      }

      startSearchIndexBackground();

      startAreaCategoriesBackground();

    } catch (err) {

      console.error(err);

      showError(err.message || "지도를 불러오지 못했습니다.");

    } finally {

      hideLoading();

    }

  }



  function showError(message) {

    if (els.error) {

      els.error.hidden = false;

      els.error.textContent = message;

    }

  }



  function hideLoading() {

    if (els.loading) els.loading.hidden = true;

    scheduleMapRelayout();

  }



  function loadKakaoSdk() {

    return new Promise((resolve, reject) => {

      const deadline = Date.now() + 15000;



      const wait = () => {

        if (window.kakao?.maps) {

          window.kakao.maps.load(resolve);

          return;

        }

        if (Date.now() > deadline) {

          reject(

            new Error(

              "카카오맵 SDK 로드 실패. 카카오 개발자 콘솔에 " +

                "http://localhost (또는 사용 중인 도메인)을 Web 플랫폼에 등록했는지 확인하세요."

            )

          );

          return;

        }

        setTimeout(wait, 100);

      };



      wait();

    });

  }



  function initMap() {

    const cfg = districtSelected && DISTRICTS[sigunguCode]
      ? DISTRICTS[sigunguCode]
      : KOREA_VIEW;

    map = new kakao.maps.Map(els.map, {

      center: new kakao.maps.LatLng(cfg.lat, cfg.lng),

      level: cfg.zoom,

    });

    map.setLevel(cfg.zoom);

    initMapResizeHandler();

    requestAnimationFrame(() => relayoutMap());

  }



  let mapResizeTimer = null;

  function relayoutMap() {

    if (!map || !els.map) return;

    const center = map.getCenter();

    const level = map.getLevel();

    map.relayout();

    if (center) map.setCenter(center);

    if (level != null) map.setLevel(level);

  }



  function scheduleMapRelayout() {

    clearTimeout(mapResizeTimer);

    mapResizeTimer = setTimeout(relayoutMap, 120);

  }



  function initMapResizeHandler() {

    if (initMapResizeHandler._bound) return;

    initMapResizeHandler._bound = true;

    window.addEventListener("resize", scheduleMapRelayout);

    if (typeof ResizeObserver !== "undefined") {

      const panel = els.map?.closest(".map-panel");

      const ro = new ResizeObserver(scheduleMapRelayout);

      if (els.map) ro.observe(els.map);

      if (panel) ro.observe(panel);

    }

  }



  function initSupabase() {

    if (!window.supabase?.createClient) {

      throw new Error("Supabase 라이브러리 로드 실패");

    }

    supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);

  }



  async function loadInitialDistrict() {

    if (!sigunguCode) return;

    if (!window.RealEstateMapData) {

      throw new Error("데이터 모듈 로드 실패 (js/data.js)");

    }



    console.time("initial_district_load");

    const t0 = performance.now();



    apartments = await window.RealEstateMapData.loadDistrictForMap(

      supabase,

      sigunguCode

    );

    districtCache[sigunguCode] = apartments;

    allApartments = apartments;



    const elapsed = performance.now() - t0;

    console.timeEnd("initial_district_load");

    emitTiming("initial_load", elapsed);



    console.log(`[${sigunguCode}] apartments 수:`, apartments.length);



    if (els.count) {

      els.count.textContent = `${apartments.length}개 단지`;

    }

  }



  function startAreaCategoriesBackground() {
    if (!districtSelected || !sigunguCode) return;
    if (!window.RealEstateMapData?.attachAreaCategories) return;

    window.RealEstateMapData.attachAreaCategories(supabase, apartments)
      .then(() => {
        districtCache[sigunguCode] = apartments;
        if (filterBar) filterBar.updateApartments(apartments, { silent: true });
      })
      .catch((err) => console.warn("[평형] 백그라운드 로드 실패:", err));
  }

  function startSearchIndexBackground() {

    if (!window.RealEstateMapData?.loadSearchIndex) return;



    updateSearchIndexHint(true);

    console.time("search_index_load");

    const t0 = performance.now();



    window.RealEstateMapData.loadSearchIndex(supabase)

      .then((index) => {

        const elapsed = performance.now() - t0;

        searchIndex = index;

        searchIndexReady = true;

        window.searchIndexReady = true;

        console.timeEnd("search_index_load");

        console.log("[검색] 인덱스 준비 완료:", index.length, "개");

        emitTiming("search_index_load", elapsed);

        updateSearchIndexHint(false);

      })

      .catch((err) => {

        console.error("[검색] 인덱스 로드 실패:", err);

        updateSearchIndexHint(false);

      });

  }



  function updateSearchIndexHint(loading) {

    if (els.searchIndexHint) els.searchIndexHint.hidden = !loading;

  }



  function getSearchPool() {

    return searchIndexReady ? searchIndex : apartments;

  }



  function emitTiming(name, valueMs) {

    console.log(`[timing] ${name}: ${Math.round(valueMs)}ms`);

    if (typeof gtag !== "undefined") {

      gtag("event", "timing_complete", {

        name,

        value: Math.round(valueMs),

      });

    }

  }



  function setupMapUi() {

    initMapRegion();

    initMapFilter(true);

    if (!uiBound) {

      bindSearch();

      bindDdayButton();

      bindLegendToggle();

      initSidebarModule();

      uiBound = true;

    }

    showEmptySidebar();

    if (!districtSelected) {

      showInitialEmptySidebar();

    }

  }



  function bindEmptyStateUi() {

    if (els.popularGrid) {

      els.popularGrid.innerHTML = POPULAR_REGIONS.map((region) => {

        const note = region.note
          ? `<small>${region.note}</small>`
          : "";

        return `<button type="button" class="map-empty-popular-btn${region.available ? "" : " is-coming-soon"}" data-code="${region.code || ""}" data-available="${region.available}" ${region.available ? "" : "disabled"}>${region.name}${note}</button>`;

      }).join("");

      els.popularGrid.querySelectorAll(".map-empty-popular-btn").forEach((btn) => {

        btn.addEventListener("click", () => {

          const code = btn.dataset.code;

          const available = btn.dataset.available === "true";

          if (!available || !code) {

            if (typeof gtag !== "undefined") {

              gtag("event", "popular_region_click", {

                region_name: btn.textContent.trim(),

                available: false,

              });

            }

            return;

          }

          if (typeof gtag !== "undefined") {

            gtag("event", "popular_region_click", {

              region_name: btn.textContent.trim(),

              lawd_code: code,

              available: true,

            });

          }

          selectPopularRegion(code);

        });

      });

    }

    els.helpBtn?.addEventListener("click", () => {

      if (typeof gtag !== "undefined") {

        gtag("event", "map_help_click", { district_selected: districtSelected });

      }

      showMapEmptyState({ force: true });

    });

  }



  function selectPopularRegion(code) {

    if (!DISTRICTS[code]) return;

    if (regionSelector) {

      regionSelector.selectDistrict(code);

      return;

    }

    changeDistrict(code);

  }



  function showMapEmptyState(options = {}) {

    if (!els.emptyState) return;

    if (districtSelected && !options.force) return;

    els.emptyState.hidden = false;

    els.emptyState.classList.remove("is-hiding");

    if (els.helpBtn) els.helpBtn.hidden = false;

    if (typeof gtag !== "undefined" && !options.silent) {

      gtag("event", "empty_state_view", { district_selected: districtSelected });

    }

  }



  function hideMapEmptyState() {

    if (!els.emptyState || els.emptyState.hidden) return;

    els.emptyState.classList.add("is-hiding");

    window.setTimeout(() => {

      if (!els.emptyState) return;

      els.emptyState.hidden = true;

      els.emptyState.classList.remove("is-hiding");

    }, 400);

    if (els.helpBtn) els.helpBtn.hidden = false;

  }



  function showRegionSelectHint() {

    if (!els.regionHint || districtSelected) return;

    els.regionHint.classList.remove("is-hiding");

    els.regionHint.hidden = false;

    regionSelector?.pulseGuButton?.();

  }



  function hideRegionSelectHint() {

    if (!els.regionHint || els.regionHint.hidden) return;

    els.regionHint.classList.add("is-hiding");

    window.setTimeout(() => {

      if (!els.regionHint) return;

      els.regionHint.hidden = true;

      els.regionHint.classList.remove("is-hiding");

    }, 300);

  }



  function hideMapControls() {

    els.filterBar?.classList.add("map-controls-hidden");

    els.legend?.classList.add("map-controls-hidden");

    if (els.mobileFab) els.mobileFab.hidden = true;

    if (els.count) els.count.classList.add("map-controls-hidden");

    if (els.searchInput) els.searchInput.disabled = true;

    if (els.mobileSearchInput) els.mobileSearchInput.disabled = true;

  }



  function showMapControls() {

    els.filterBar?.classList.remove("map-controls-hidden");

    els.legend?.classList.remove("map-controls-hidden");

    if (els.mobileFab) els.mobileFab.hidden = false;

    if (els.count) els.count.classList.remove("map-controls-hidden");

    if (els.searchInput) els.searchInput.disabled = false;

    if (els.mobileSearchInput) els.mobileSearchInput.disabled = false;

  }



  function showInitialEmptySidebar() {

    selectedApt = null;

    updateDdayButton();

    if (!els.sidebarContent) return;

    els.sidebarContent.innerHTML = `

      <div class="sidebar-empty">

        <p>상단에서 구를 선택하면<br>단지 정보를 확인할 수 있어요.</p>

      </div>

    `;

  }



  function initMarkerLayer() {

    if (!window.RealEstateMapMarker?.ApartmentMarkerLayer) {

      throw new Error("마커 모듈 로드 실패 (js/marker.js)");

    }

    if (!window.kakao?.maps) {

      throw new Error("카카오맵 SDK 미로드");

    }



    markerLayer = new window.RealEstateMapMarker.ApartmentMarkerLayer(

      map,

      getDisplayApartments(),

      (apt) => selectApartment(apt),

      els.map

    );

    markerLayer.init();

    if (filterBar) {

      const filtered = getDisplayApartments();

      window.RealEstateMapFilter?.updateResultCount?.(

        filtered.length,

        apartments.length

      );

    }

    markerLayer.endBootstrap();

    requestAnimationFrame(() => relayoutMap());

  }



  function renderMarkers() {

    initMarkerLayer();

  }



  function getDongApartments() {

    if (selectedDong === "all") return apartments;

    return apartments.filter((apt) => apt.dong === selectedDong);

  }



  function getDisplayApartments() {

    const base = getDongApartments();

    if (window.RealEstateMapFilter?.applyFilters) {

      return window.RealEstateMapFilter.applyFilters(base);

    }

    return base;

  }



  function refreshMapMarkers() {

    clearTimeout(refreshMarkersTimer);

    refreshMarkersTimer = setTimeout(() => {

      refreshMarkersTimer = null;

      const filtered = getDisplayApartments();

      const baseCount = getDongApartments().length;

      if (markerLayer) {

        markerLayer.setFilteredApartments(filtered);

      }

      if (window.RealEstateMapFilter?.updateResultCount) {

        window.RealEstateMapFilter.updateResultCount(filtered.length, baseCount);

      }

    }, 50);

  }



  function getDongList() {

    return [

      ...new Set(apartments.map((a) => a.dong).filter(Boolean)),

    ].sort((a, b) => a.localeCompare(b, "ko"));

  }



  async function changeDistrict(lawdCode) {

    if (!DISTRICTS[lawdCode]) return;

    if (lawdCode === sigunguCode) return;



    const isFirstSelection = !districtSelected;

    const cacheHit = Array.isArray(districtCache[lawdCode]);

    const timerName = cacheHit ? "district_switch_cached" : "district_switch_first";

    console.time(timerName);

    const t0 = performance.now();



    if (els.loading) {

      els.loading.hidden = false;

      els.loading.textContent = cacheHit

        ? "구 데이터 불러오는 중..."

        : "구 데이터 로딩 중...";

    }



    try {

      sigunguCode = lawdCode;

      districtSelected = true;

      selectedDong = "all";

      selectedApt = null;

      hideMapEmptyState();

      hideRegionSelectHint();

      showMapControls();



      if (cacheHit) {

        apartments = districtCache[lawdCode];

      } else {

        apartments = await window.RealEstateMapData.loadDistrictForMap(

          supabase,

          lawdCode

        );

        districtCache[lawdCode] = apartments;

        window.RealEstateMapData.attachAreaCategories(supabase, apartments)
          .then(() => {
            districtCache[lawdCode] = apartments;
            if (lawdCode === sigunguCode && filterBar) {
              filterBar.updateApartments(apartments, { silent: true });
            }
          })
          .catch((err) => console.warn("[평형] 로드 실패:", err));

      }



      if (els.count) {

        els.count.textContent = `${apartments.length}개 단지`;

        els.count.classList.remove("map-controls-hidden");

      }



      if (window.RealEstateMapFilter?.resetFilters) {

        window.RealEstateMapFilter.resetFilters();

      }



      if (filterBar) {

        filterBar.syncUI();

        filterBar.updateApartments(apartments, { silent: true });

      }



      if (regionSelector) {

        if (markerLayer) markerLayer.beginBootstrap();

        await regionSelector.changeDistrict(lawdCode, getDongList());

        regionSelector.flyToDistrict({ duration: 1500 });

      }



      if (isFirstSelection && !markerLayer) {

        initMarkerLayer();

      } else {

        refreshMapMarkers();

        if (markerLayer) markerLayer.endBootstrap();

      }

      showEmptySidebar();

      closeSearchResults();



      if (window.RealEstatePriceChart?.destroyChart) {

        window.RealEstatePriceChart.destroyChart();

      }



      if (window.RealEstateMapSidebar?.closeBottomSheet) {

        window.RealEstateMapSidebar.closeBottomSheet();

      }



      scheduleMapRelayout();

    } catch (err) {

      console.error(err);

      showError(err.message || "구 데이터를 불러오지 못했습니다.");

    } finally {

      const elapsed = performance.now() - t0;

      console.timeEnd(timerName);

      emitTiming(timerName, elapsed);

      if (els.loading) {

        els.loading.hidden = true;

        els.loading.textContent = "지도 데이터를 불러오는 중...";

      }

    }

  }



  function initMapRegion() {

    if (!window.RealEstateMapRegion?.DistrictRegionSelector) {

      console.warn("지역 모듈 로드 실패 (js/region.js)");

      return;

    }



    const dongList = getDongList();



    regionSelector = new window.RealEstateMapRegion.DistrictRegionSelector({

      map,

      dongList,

      sigunguCode,

      onDongChange: (dong) => {

        selectedDong = dong;

        refreshMapMarkers();

      },

      onDistrictChange: (code) => {

        changeDistrict(code);

      },

    });

    regionSelector.init();

  }



  function initMapFilter(silent = false) {

    if (!window.RealEstateMapFilter?.MapFilterBar) {

      console.warn("필터 모듈 로드 실패 (js/filter.js)");

      return;

    }



    filterBar = new window.RealEstateMapFilter.MapFilterBar({

      apartments,

      onChange: () => {

        refreshMapMarkers();

      },

    });

    filterBar.init({ silent });

  }



  function bindLegendToggle() {

    const toggle = document.querySelector(".map-legend-toggle");

    const legend = document.querySelector(".map-legend");

    if (!toggle || !legend) return;



    toggle.addEventListener("click", () => {

      legend.classList.toggle("is-collapsed");

      toggle.setAttribute(

        "aria-expanded",

        legend.classList.contains("is-collapsed") ? "false" : "true"

      );

    });

  }



  function getActiveSearch() {

    if (window.RealEstateMapSidebar?.isMobile?.()) {

      return {

        input: els.mobileSearchInput,

        results: els.mobileSearchResults,

      };

    }

    return {

      input: els.searchInput,

      results: els.searchResults,

    };

  }



  function initSidebarModule() {

    if (!window.RealEstateMapSidebar?.init) return;

    window.RealEstateMapSidebar.init({

      onRelayout: scheduleMapRelayout,

    });

  }



  function aptMatchesSearchQuery(apt, query) {

    const compactQuery = query.replace(/\s+/g, "");

    const name = (apt.name || "").toLowerCase();

    const compactName = name.replace(/\s+/g, "");

    const label = `${apt.dong || ""}${apt.name}`.toLowerCase().replace(/\s+/g, "");



    if (compactQuery && (label.includes(compactQuery) || compactName.includes(compactQuery))) {

      return true;

    }



    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

    if (tokens.length > 1) {

      const hay = `${apt.dong || ""} ${apt.name}`.toLowerCase();

      return tokens.every((token) => hay.includes(token));

    }



    return name.includes(query);

  }



  function bindSearch() {

    const runSearch = (query) => {

      if (!query) {

        closeSearchResults();

        return;

      }

      const matches = getSearchPool()

        .filter((apt) => aptMatchesSearchQuery(apt, query))

        .slice(0, 8);

      renderSearchResults(matches);

    };



    const inputs = [els.searchInput, els.mobileSearchInput].filter(Boolean);

    if (!inputs.length) return;



    inputs.forEach((input) => {

      input.addEventListener("input", () => {

        runSearch(input.value.trim().toLowerCase());

      });

    });



    document.addEventListener("click", (e) => {

      const { input, results } = getActiveSearch();

      if (

        !results?.contains(e.target) &&

        e.target !== input &&

        e.target !== els.mobileSearchInput

      ) {

        closeSearchResults();

      }

    });

  }



  function formatSearchLocation(apt) {

    const district =

      DISTRICTS[apt.sigungu_code]?.name ||

      window.RealEstateMapRegion?.getDistrictName?.(apt.sigungu_code) ||

      "";

    const dong = apt.dong || "";

    return `(${district} ${dong})`;

  }



  function renderSearchResults(matches) {

    const { results } = getActiveSearch();

    if (!results) return;



    if (!matches.length) {

      results.innerHTML =

        '<p class="transactions-empty" style="padding:0.75rem;">검색 결과가 없습니다.</p>';

      results.classList.add("is-open");

      return;

    }



    const fmt = window.RealEstateMapMarker?.formatPrice;



    results.innerHTML = matches

      .map((apt) => {

        const price = fmt && apt.avgPrice1Y ? fmt(apt.avgPrice1Y) : "";

        const isCurrent = apt.sigungu_code === sigunguCode;

        const currentClass = isCurrent ? " is-current-district" : "";

        const badge = isCurrent

          ? '<span class="search-result-badge">현재</span>'

          : "";



        return `

        <button type="button" class="search-result-item${currentClass}" data-id="${apt.id}">

          <span class="search-result-name">${escapeHtml(apt.name)}${badge}</span>

          <small>${escapeHtml(formatSearchLocation(apt))}${price ? ` · ${price}` : ""}</small>

        </button>`;

      })

      .join("");



    results.classList.add("is-open");



    results.querySelectorAll(".search-result-item").forEach((btn) => {

      btn.addEventListener("click", async () => {

        const id = btn.dataset.id;

        let apt = apartments.find((a) => a.id === id);

        if (!apt) apt = getSearchPool().find((a) => a.id === id);

        if (apt) {

          await focusApartmentFromSearch(apt);

          const { input } = getActiveSearch();

          if (input) input.value = apt.name;

          if (els.searchInput) els.searchInput.value = apt.name;

          if (els.mobileSearchInput) els.mobileSearchInput.value = apt.name;

          closeSearchResults();

          window.RealEstateMapSidebar?.closeSearchFloat?.();

        }

      });

    });

  }



  function closeSearchResults() {

    [els.searchResults, els.mobileSearchResults].forEach((el) => {

      if (!el) return;

      el.classList.remove("is-open");

      el.innerHTML = "";

    });

  }



  async function focusApartmentFromSearch(apt) {

    if (!apt) return;



    const targetCode = apt.sigungu_code || sigunguCode;

    const crossDistrict = targetCode !== sigunguCode;



    if (typeof gtag !== "undefined") {

      gtag("event", "search_result_click", {

        apartment_name: apt.name || "",

        target_district: DISTRICTS[targetCode]?.name || targetCode,

        cross_district: crossDistrict,

      });

    }



    if (crossDistrict) {

      await changeDistrict(targetCode);

    }



    const fullApt =

      apartments.find((a) => a.id === apt.id) ||

      districtCache[targetCode]?.find((a) => a.id === apt.id) ||

      apt;



    focusApartment(fullApt);

  }



  function focusApartment(apt) {

    if (markerLayer) {

      markerLayer.panToApartment(apt);

    }

    map.setLevel(3);

    selectApartment(apt);

  }



  async function selectApartment(apt) {

    if (window.RealEstateMapSidebar?.isMobile?.()) {

      window.RealEstateMapSidebar.openBottomSheet();

    }

    if (markerLayer) {

      markerLayer.panToApartment(apt);

    }



    els.sidebarContent.innerHTML =

      '<p class="transactions-empty">실거래 정보를 불러오는 중...</p>';



    const transactions = await fetchRecentTransactions(apt.id);

    const priceStats = await fetchPriceStats(apt.id);

    selectedApt = {

      ...apt,

      medianPrice: priceStats.price,

      priceSource: priceStats.source,

    };

    updateDdayButton();

    renderSidebar(apt, transactions, priceStats);

    if (window.RealEstatePriceChart) {

      window.RealEstatePriceChart.initChart(supabase, apt.id, "all", {

        onFilterChange: (filtered) => {

          updateRecentTransactionsTable(filtered.slice(0, 3));

        },

      });

    }

    if (typeof gtag !== "undefined") {
      gtag("event", "marker_click", {
        complex_name: apt.name || "",
        dong: apt.dong || "",
        deal_type:
          window.RealEstatePriceChart?.getCurrentDealType?.() || "매매",
      });
    }

  }



  async function fetchPriceStats(apartmentId) {

    const cutoff = new Date();

    cutoff.setFullYear(cutoff.getFullYear() - 1);

    const cutoffStr = cutoff.toISOString().slice(0, 10);



    const { data: recent12, error } = await supabase

      .from("transactions")

      .select("deal_amount, deal_date")

      .eq("apartment_id", apartmentId)

      .eq("deal_type", "매매")

      .gte("deal_date", cutoffStr)

      .order("deal_date", { ascending: false });



    if (error) {

      console.error(error);

      return { price: null, source: "none" };

    }



    if (recent12?.length) {

      const amounts = recent12.map((t) => t.deal_amount).sort((a, b) => a - b);

      const mid = Math.floor(amounts.length / 2);

      const price =

        amounts.length % 2

          ? amounts[mid]

          : Math.round((amounts[mid - 1] + amounts[mid]) / 2);

      return { price, source: "median12", count: recent12.length };

    }



    const { data: latest } = await supabase

      .from("transactions")

      .select("deal_amount")

      .eq("apartment_id", apartmentId)

      .eq("deal_type", "매매")

      .order("deal_date", { ascending: false })

      .limit(1);



    if (latest?.[0]) {

      return { price: latest[0].deal_amount, source: "latest", count: 1 };

    }



    return { price: null, source: "none" };

  }



  async function fetchRecentTransactions(apartmentId) {

    const { data, error } = await supabase

      .from("transactions")

      .select(
        "deal_amount, deal_year, deal_month, deal_day, exclu_use_ar, floor, deal_type, rent_deposit, monthly_rent"
      )

      .eq("apartment_id", apartmentId)

      .order("deal_date", { ascending: false })

      .limit(3);



    if (error) {

      console.error(error);

      return [];

    }

    return data || [];

  }



  function formatAreaCell(tx) {

    if (!tx.exclu_use_ar) return "-";

    const pyeong = window.RealEstatePriceChart?.toPyeong(tx.exclu_use_ar);

    return pyeong

      ? `${tx.exclu_use_ar}㎡ (${pyeong}평)`

      : `${tx.exclu_use_ar}㎡`;

  }



  function updateRecentTransactionsTable(transactions) {

    const tbody = document.getElementById("recent-transactions-body");

    if (!tbody) return;



    if (!transactions.length) {

      tbody.innerHTML =

        '<tr><td colspan="4" class="transactions-empty">해당 평형의 최근 거래가 없습니다.</td></tr>';

      return;

    }



    tbody.innerHTML = transactions
      .map((tx) => {
        const dateText = `${tx.deal_year}.${String(tx.deal_month).padStart(
          2,
          "0"
        )}.${String(tx.deal_day).padStart(2, "0")}`;
        const areaText = formatAreaCell(tx);
        const floorText = tx.floor != null ? `${tx.floor}층` : "-";

        let amountText;
        if (tx.deal_type === "월세") {
          const deposit = tx.rent_deposit ?? tx.deal_amount;
          const rent = tx.monthly_rent;
          const depositStr =
            deposit != null ? formatAmount(deposit) : "보증금 정보 없음";
          const rentStr =
            rent != null ? `${rent.toLocaleString()}만` : "월세 정보 없음";
          amountText = `보증금 ${depositStr} / 월 ${rentStr}`;
        } else {
          amountText = formatAmount(tx.deal_amount);
        }

        return `
          <tr>
            <td>${dateText}</td>
            <td>${areaText}</td>
            <td>${floorText}</td>
            <td class="amount">${amountText}</td>
          </tr>`;
      })
      .join("");

  }



  function getDdayPriceMan(apt, priceStats) {
    const fromStats = priceStats?.price;
    const fromApt = apt.avgPrice1Y;
    const price = fromStats ?? fromApt;
    return price != null && price > 0 ? price : null;
  }

  function buildDdayCalculatorUrl(apt, priceMan) {
    const q = new URLSearchParams({
      apt: apt.name,
      dong: apt.dong || "",
      price: String(priceMan),
      target: String(priceMan * 10000),
      sigungu: apt.sigungu_code || sigunguCode,
      apt_id: apt.id,
    });
    return `../dday-calculator/?${q.toString()}`;
  }

  function renderDdayPromptHtml(apt, priceMan) {
    if (!priceMan) return "";
    const url = buildDdayCalculatorUrl(apt, priceMan);
    return `
      <div class="dday-link-box">
        <div class="dday-link-text">💡 이 단지까지 얼마나 걸릴까?</div>
        <a href="${url}" class="dday-link-btn">D-Day 계산기로 확인하기 →</a>
      </div>`;
  }

  function renderSidebar(apt, transactions, priceStats) {

    const buildYear = apt.build_year ? `${apt.build_year}년` : "-";
    const ddayPriceMan = getDdayPriceMan(apt, priceStats);

    const avgLabel =

      apt.avgPrice1Y != null && window.RealEstateMapMarker

        ? `1년 평균: ${window.RealEstateMapMarker.formatPrice(apt.avgPrice1Y)}`

        : null;

    const priceLabel =

      priceStats?.price != null

        ? priceStats.source === "median12"

          ? `최근 1년 중간값: ${formatAmount(priceStats.price)} (${priceStats.count}건)`

          : `최근 거래가: ${formatAmount(priceStats.price)}`

        : "거래 데이터 없음";



    const txRows = transactions.length

      ? transactions

          .map(

            (tx) => `

          <tr>

            <td>${tx.deal_year}.${String(tx.deal_month).padStart(2, "0")}.${String(tx.deal_day).padStart(2, "0")}</td>

            <td>${formatAreaCell(tx)}</td>

            <td>${tx.floor != null ? `${tx.floor}층` : "-"}</td>

            <td class="amount">${formatAmount(tx.deal_amount)}</td>

          </tr>`

          )

          .join("")

      : "";



    els.sidebarContent.innerHTML = `

      <div class="apt-info-card">

        <h2>${escapeHtml(apt.name)}</h2>

        <p class="apt-address">${escapeHtml(formatAddress(apt))}</p>

        <div class="apt-meta-grid">

          <div class="apt-meta-item">

            <span>평균 거래가</span>

            <strong>${escapeHtml(avgLabel || priceLabel)}</strong>

          </div>

          <div class="apt-meta-item">

            <span>준공년도</span>

            <strong>${escapeHtml(buildYear)}</strong>

          </div>

          <div class="apt-meta-item">

            <span>좌표</span>

            <strong>${apt.latitude != null && apt.longitude != null ? `${apt.latitude.toFixed(4)}, ${apt.longitude.toFixed(4)}` : "-"}</strong>

          </div>

        </div>

      </div>

      ${renderDdayPromptHtml(apt, ddayPriceMan)}

      ${window.RealEstatePriceChart ? window.RealEstatePriceChart.getChartSectionHtml() : ""}



      <section class="transactions-section">

        <h3>최근 실거래 3건</h3>

        ${

          transactions.length

            ? `<table class="transactions-table">

                <thead>

                  <tr>

                    <th>거래일</th>

                    <th>면적</th>

                    <th>층</th>

                    <th>금액</th>

                  </tr>

                </thead>

                <tbody id="recent-transactions-body">${txRows}</tbody>

              </table>`

            : '<p class="transactions-empty">등록된 실거래 내역이 없습니다.</p>'

        }

      </section>

    `;

  }



  function showEmptySidebar() {

    selectedApt = null;

    updateDdayButton();

    if (window.RealEstatePriceChart) {

      window.RealEstatePriceChart.destroyChart();

    }

    if (!districtSelected) {

      showInitialEmptySidebar();

      return;

    }

    els.sidebarContent.innerHTML = `

      <div class="sidebar-empty">

        <p>지도에서 마커를 클릭하거나<br>단지명을 검색해 보세요.</p>

        <p style="margin-top:0.75rem;font-size:0.8rem;">총 ${apartments.length}개 단지</p>

      </div>

    `;

  }



  function updateDdayButton() {

    if (!els.ddayBtn) return;

    const ready = selectedApt?.medianPrice > 0;

    els.ddayBtn.disabled = !ready;

    els.ddayBtn.textContent = "D-day 계산하기";

    els.ddayBtn.title = ready

      ? "선택한 단지로 D-day 계산"

      : "먼저 단지를 선택해 주세요";

  }



  function bindDdayButton() {

    if (!els.ddayBtn) return;

    updateDdayButton();

    els.ddayBtn.addEventListener("click", () => {

      if (!selectedApt?.medianPrice) {

        alert("먼저 지도에서 단지를 선택해 주세요. (거래 데이터가 있는 단지)");

        return;

      }

      window.location.href = buildDdayCalculatorUrl(
        selectedApt,
        selectedApt.medianPrice
      );

    });

  }



  function formatAddress(apt) {

    const districtName =

      DISTRICTS[apt.sigungu_code]?.name ||

      window.RealEstateMapRegion?.getDistrictName?.(apt.sigungu_code || sigunguCode) ||

      "강남구";

    const parts = [`서울 ${districtName}`];

    if (apt.dong) parts.push(apt.dong);

    if (apt.jibun) parts.push(apt.jibun);

    return parts.join(" ");

  }



  function formatAmount(amountMan) {

    if (amountMan == null) return "-";

    if (amountMan >= 10000) {

      const eok = Math.floor(amountMan / 10000);

      const man = amountMan % 10000;

      return man ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;

    }

    return `${Number(amountMan).toLocaleString()}만`;

  }



  function escapeHtml(str) {

    return String(str)

      .replace(/&/g, "&amp;")

      .replace(/</g, "&lt;")

      .replace(/>/g, "&gt;")

      .replace(/"/g, "&quot;");

  }



  window.RealEstateMap = {

    changeDistrict,

    getSigunguCode: () => sigunguCode,

    isDistrictSelected: () => districtSelected,

    selectDistrict: (code) => changeDistrict(code),

    getAllApartments: () => (searchIndexReady ? searchIndex : apartments),

    isSearchIndexReady: () => searchIndexReady,

    getDistrictCache: () => districtCache,

    getMapLevel: () => map?.getLevel?.() ?? null,

    getMapCenter: () => {
      const c = map?.getCenter?.();
      return c ? { lat: c.getLat(), lng: c.getLng() } : null;
    },

    focusApartment,

    DISTRICTS,

  };

})();


