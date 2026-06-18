/**

 * 강남구 부동산 지도 — 카카오맵 + Supabase 마커

 */

(function () {

  "use strict";



  const GANGNAM_CENTER = { lat: 37.5172, lng: 127.0473 };

  const ZOOM_LEVEL = 6;

  const SIGUNGU_CODE = "11680";



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

    ddayBtn: document.getElementById("dday-btn"),

  };



  let map;

  let markerLayer;

  let filterBar;

  let regionSelector;

  let selectedDong = "all";

  let supabase;

  let apartments = [];

  let selectedApt = null;



  init();



  async function init() {

    loadKakaoSdk()

      .then(initMap)

      .then(initSupabase)

      .then(loadApartments)

      .then(renderMarkers)

      .catch((err) => {

        console.error(err);

        showError(err.message || "지도를 불러오지 못했습니다.");

      })

      .finally(hideLoading);

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

    map = new kakao.maps.Map(els.map, {

      center: new kakao.maps.LatLng(GANGNAM_CENTER.lat, GANGNAM_CENTER.lng),

      level: ZOOM_LEVEL,

    });

    map.setLevel(ZOOM_LEVEL);

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



  async function loadApartments() {

    if (!window.RealEstateMapData) {

      throw new Error("데이터 모듈 로드 실패 (js/data.js)");

    }



    apartments = await window.RealEstateMapData.loadApartmentsWithPrices(

      supabase,

      SIGUNGU_CODE

    );



    console.log("apartments 수:", apartments.length);

    console.log("첫 번째 단지:", apartments[0]);

    console.log(

      "좌표 있는 단지:",

      apartments.filter((a) => a.latitude && a.longitude).length

    );

    console.log(

      "avgPrice1Y 있는 단지:",

      apartments.filter((a) => a.avgPrice1Y).length

    );



    const withCoord = apartments.filter(

      (a) => a.latitude != null && a.longitude != null

    ).length;

    const withPrice = apartments.filter((a) => a.avgPrice1Y != null).length;

    const stats = window.RealEstateMapData.getCategoryStats(apartments);



    console.log("[지도] 데이터 로드", {

      apartments: apartments.length,

      좌표있음: withCoord,

      avgPrice1Y계산됨: withPrice,

      가격대분포: stats,

    });



    if (els.count) {

      els.count.textContent = `${apartments.length}개 단지`;

    }

  }



  function renderMarkers() {

    if (!window.RealEstateMapMarker?.ApartmentMarkerLayer) {

      throw new Error("마커 모듈 로드 실패 (js/marker.js)");

    }



    if (!window.kakao?.maps) {

      throw new Error("카카오맵 SDK 미로드");

    }



    console.log("[지도] 마커 생성 시작", {

      map: !!map,

      zoom: map.getLevel(),

      kakao: !!window.kakao?.maps,

    });



    markerLayer = new window.RealEstateMapMarker.ApartmentMarkerLayer(

      map,

      apartments,

      (apt) => selectApartment(apt),

      els.map

    );

    markerLayer.init();

    initMapRegion();

    initMapFilter();

    setTimeout(() => {

      const s = markerLayer.getStats();

      console.log("[지도] 마커 최종 상태", s);

      console.log(

        "DOM .marker-pill:",

        document.querySelectorAll(".marker-pill").length

      );

    }, 2000);



    bindSearch();

    bindDdayButton();

    bindLegendToggle();

    initSidebarModule();

    showEmptySidebar();

    requestAnimationFrame(() => relayoutMap());

    setTimeout(relayoutMap, 300);

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

    const filtered = getDisplayApartments();

    const baseCount = getDongApartments().length;

    if (markerLayer) {

      markerLayer.setFilteredApartments(filtered);

    }

    if (window.RealEstateMapFilter?.updateResultCount) {

      window.RealEstateMapFilter.updateResultCount(filtered.length, baseCount);

    }

  }



  async function initMapRegion() {

    if (!window.RealEstateMapRegion?.GangnamRegionSelector) {

      console.warn("지역 모듈 로드 실패 (js/region.js)");

      return;

    }



    const dongList = [

      ...new Set(apartments.map((a) => a.dong).filter(Boolean)),

    ].sort((a, b) => a.localeCompare(b, "ko"));



    regionSelector = new window.RealEstateMapRegion.GangnamRegionSelector({

      map,

      dongList,

      onDongChange: (dong) => {

        selectedDong = dong;

        refreshMapMarkers();

      },

    });

    await regionSelector.init();

  }



  function initMapFilter() {

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

    filterBar.init();

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



  function bindSearch() {

    const runSearch = (query) => {

      if (!query) {

        closeSearchResults();

        return;

      }

      const matches = apartments

        .filter((apt) => {

          const label = `${apt.dong || ""} ${apt.name}`.toLowerCase();

          return label.includes(query) || apt.name.toLowerCase().includes(query);

        })

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

        return `

        <button type="button" class="search-result-item" data-id="${apt.id}">

          ${escapeHtml(apt.name)}

          <small>${escapeHtml(formatAddress(apt))}${price ? ` · ${price}` : ""}</small>

        </button>`;

      })

      .join("");



    results.classList.add("is-open");



    results.querySelectorAll(".search-result-item").forEach((btn) => {

      btn.addEventListener("click", () => {

        const apt = apartments.find((a) => a.id === btn.dataset.id);

        if (apt) {

          focusApartment(apt);

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



  function renderSidebar(apt, transactions, priceStats) {

    const buildYear = apt.build_year ? `${apt.build_year}년` : "-";

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

            <strong>${apt.latitude.toFixed(4)}, ${apt.longitude.toFixed(4)}</strong>

          </div>

        </div>

      </div>



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

      const q = new URLSearchParams({

        apt: selectedApt.name,

        dong: selectedApt.dong || "",

        price: String(selectedApt.medianPrice),

        sigungu: SIGUNGU_CODE,

        apt_id: selectedApt.id,

      });

      window.location.href = `../dday-calculator/?${q.toString()}`;

    });

  }



  function formatAddress(apt) {

    const parts = ["서울 강남구"];

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

})();


