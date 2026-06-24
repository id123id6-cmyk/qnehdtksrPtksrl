/**
 * 서울 강남3구 지역 선택 + 경계 폴리곤
 */
(function (global) {
  "use strict";

  const DISTRICTS =
    global.RealEstateMapDistricts?.getAllDistricts?.() ||
    global.RealEstateMapDistricts?.SEOUL_DISTRICTS || {
      "11680": { name: "강남구", slug: "gangnam", lat: 37.5172, lng: 127.0473, zoom: 5, sido: "seoul" },
      "11650": { name: "서초구", slug: "seocho", lat: 37.4837, lng: 127.0324, zoom: 5, sido: "seoul" },
      "11710": { name: "송파구", slug: "songpa", lat: 37.5145, lng: 127.1059, zoom: 5, sido: "seoul" },
    };

  const SIDO_OPTIONS = global.RealEstateMapDistricts?.SIDO_OPTIONS || [
    { id: "seoul", name: "서울특별시" },
    { id: "gyeonggi", name: "경기도" },
  ];

  const GU_POLYGON_STYLE = {
    strokeWeight: 3,
    strokeColor: "#2563eb",
    strokeOpacity: 0.7,
    strokeStyle: "solid",
    fillColor: "#2563eb",
    fillOpacity: 0.05,
  };

  const DONG_POLYGON_STYLE = {
    strokeWeight: 3,
    strokeColor: "#ef4444",
    strokeOpacity: 0.8,
    strokeStyle: "solid",
    fillColor: "#ef4444",
    fillOpacity: 0.15,
  };

  const DONG_CENTERS = {
    역삼동: { lat: 37.5005, lng: 127.0364 },
    삼성동: { lat: 37.5145, lng: 127.0563 },
    대치동: { lat: 37.4946, lng: 127.0625 },
    청담동: { lat: 37.5197, lng: 127.047 },
    압구정동: { lat: 37.5274, lng: 127.0286 },
    논현동: { lat: 37.5111, lng: 127.022 },
    신사동: { lat: 37.5169, lng: 127.0203 },
    개포동: { lat: 37.4789, lng: 127.0568 },
    일원동: { lat: 37.49, lng: 127.086 },
    수서동: { lat: 37.4866, lng: 127.1029 },
    세곡동: { lat: 37.4669, lng: 127.1027 },
    도곡동: { lat: 37.4863, lng: 127.0469 },
    율현동: { lat: 37.4735, lng: 127.108 },
    자곡동: { lat: 37.476, lng: 127.098 },
  };

  function getDistrictName(sigunguCode) {
    return (
      global.RealEstateMapDistricts?.getDistrictName?.(sigunguCode) ||
      DISTRICTS[sigunguCode]?.name ||
      sigunguCode
    );
  }

  function getSidoName(sidoId) {
    return global.RealEstateMapDistricts?.getSidoName?.(sidoId) || sidoId;
  }

  function trackDistrictSelect(sigunguCode) {
    if (typeof gtag === "undefined") return;
    gtag("event", "district_select", {
      district_name: getDistrictName(sigunguCode),
      lawd_code: sigunguCode,
    });
  }

  function trackDongSelect(dong, label, sigunguCode) {
    if (typeof gtag === "undefined") return;
    gtag("event", "dong_select", {
      dong_name: dong === "all" ? "전체" : label || dong,
      district_name: getDistrictName(sigunguCode),
    });
  }

  function geoUrls(slug, sido) {
    return global.RealEstateMapDistricts?.getGeoUrls?.(slug, sido) || {
      dong: `data/${slug}-dong.geojson`,
      gu: `data/${slug}-gu.geojson`,
    };
  }

  function toLegalDong(emdName) {
    if (!emdName) return "";
    if (emdName === "일원본동" || emdName.startsWith("일원")) return "일원동";
    if (emdName.endsWith("본동")) return emdName.replace(/본동$/, "동");
    return emdName.replace(/\d+동$/, "동");
  }

  function ringsFromGeometry(geometry) {
    if (!geometry) return [];
    if (geometry.type === "Polygon") return [geometry.coordinates[0]];
    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.map((poly) => poly[0]);
    }
    return [];
  }

  function pathsToKakaoLatLng(paths) {
    return paths.map((ring) =>
      ring.map((c) => new kakao.maps.LatLng(c.lat, c.lng))
    );
  }

  function ringToLatLngObjects(ring) {
    return ring.map(([lng, lat]) => ({ lat, lng }));
  }

  function pathsFromGeoFeature(feature) {
    const rings = ringsFromGeometry(feature.geometry);
    return rings.map(ringToLatLngObjects);
  }

  function isValidPaths(paths) {
    if (!paths?.length) return false;
    for (const ring of paths) {
      if (!ring?.length) return false;
      for (const pt of ring) {
        if (!Number.isFinite(pt.lat) || !Number.isFinite(pt.lng)) return false;
      }
    }
    return true;
  }

  function createSinglePolygon(map, ring, style) {
    if (!ring?.length) return null;
    const kakaoPath = ring.map((c) => new kakao.maps.LatLng(c.lat, c.lng));
    const polygon = new kakao.maps.Polygon({
      path: kakaoPath,
      ...style,
    });
    polygon.setMap(map);
    return polygon;
  }

  function createPolygonFromPaths(map, paths, style) {
    if (!isValidPaths(paths)) return null;
    if (paths.length === 1) {
      return createSinglePolygon(map, paths[0], style);
    }
    return paths
      .map((ring) => createSinglePolygon(map, ring, style))
      .filter(Boolean);
  }

  function clearPolygonOverlay(polygonOrList) {
    if (!polygonOrList) return;
    const list = Array.isArray(polygonOrList) ? polygonOrList : [polygonOrList];
    for (const poly of list) {
      if (poly) poly.setMap(null);
    }
  }

  function extendBoundsFromPaths(bounds, paths) {
    const kakaoPaths = pathsToKakaoLatLng(paths);
    for (const ring of kakaoPaths) {
      for (const ll of ring) {
        const lat = ll.getLat();
        const lng = ll.getLng();
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        bounds.extend(ll);
      }
    }
  }

  function buildDongIndex(geojson) {
    const index = new Map();
    for (const feature of geojson.features || []) {
      const legal = toLegalDong(feature.properties?.dong_nm);
      if (!legal) continue;
      if (!index.has(legal)) index.set(legal, []);
      const rings = ringsFromGeometry(feature.geometry);
      for (const ring of rings) {
        index.get(legal).push(ring.map(([lng, lat]) => ({ lat, lng })));
      }
    }
    return index;
  }

  class DistrictRegionSelector {
    constructor(options) {
      this.map = options.map;
      this.onDongChange = options.onDongChange || (() => {});
      this.onDistrictChange = options.onDistrictChange || (() => {});
      this.sigunguCode =
        options.sigunguCode === undefined ? "11680" : options.sigunguCode;
      this.sidoId =
        options.sidoId ||
        global.RealEstateMapDistricts?.getSidoForCode?.(this.sigunguCode) ||
        "seoul";
      this.dongList = options.dongList || [];
      this.selectedDong = "all";
      this.dongIndex = new Map();
      this.geojson = null;
      this.guPaths = null;
      this.guPolygon = null;
      this.guPolygons = [];
      this.dongPolygon = null;
      this.dongPolygons = [];
      this.dongCircle = null;
      this.menuOpen = false;
      this.guMenuOpen = false;
      this.sidoMenuOpen = false;
      this._changingDistrict = false;
      this._boundaryGen = 0;
    }

    init() {
      this.renderUI();
      this.bindEvents();
      if (this.hasDistrictSelected()) {
        this.deferLoadBoundaries();
      }
    }

    deferLoadBoundaries() {
      const code = this.sigunguCode;
      this.loadBoundaries()
        .then((fresh) => {
          if (!fresh || this._changingDistrict || this.sigunguCode !== code) return;
          this.fitGuBounds();
        })
        .catch((err) => {
          console.warn("[지역] 경계 로드 실패", err?.message || err);
        });
    }

    getDistrictConfig() {
      if (!this.sigunguCode) {
        return { name: "구 선택", slug: null, lat: 36.35, lng: 127.77, zoom: 12 };
      }
      return DISTRICTS[this.sigunguCode] || DISTRICTS["11680"];
    }

    hasDistrictSelected() {
      return Boolean(
        this.sigunguCode &&
          DISTRICTS[this.sigunguCode] &&
          global.RealEstateMapDistricts?.isDistrictReady?.(DISTRICTS[this.sigunguCode]) !== false
      );
    }

    updateSelectionHint() {
      const guBtn = document.getElementById("guDropdownBtn");
      const guLabel = document.getElementById("selectedGu");
      if (!guBtn || !guLabel) return;

      if (this.hasDistrictSelected()) {
        guBtn.classList.remove("region-btn-hint");
        guLabel.textContent = this.getDistrictConfig().name;
        return;
      }

      guBtn.classList.add("region-btn-hint");
      guLabel.textContent = "👆 여기서 지역을 선택해주세요";
    }

    async loadBoundaries() {
      const gen = ++this._boundaryGen;
      const cfg = this.getDistrictConfig();
      const { slug, name, sido } = cfg;
      const urls = geoUrls(slug, sido);

      // 이전 구 dong GeoJSON이 gu 경계·fitGuBounds에 섞이지 않도록 즉시 초기화
      this.geojson = null;
      this.dongIndex = new Map();
      this.clearGuPolygon();
      this.guPaths = null;

      await this.loadGeoJson(urls.dong, name, gen);
      if (gen !== this._boundaryGen) return false;
      await this.loadGuBoundary(urls.gu, name, gen);
      return gen === this._boundaryGen;
    }

    async loadGuBoundary(guUrl, districtName, gen) {
      if (gen !== this._boundaryGen) return;
      this.clearGuPolygon();
      try {
        const res = await fetch(guUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (gen !== this._boundaryGen) return;
        const guGeojson = await res.json();

        let allPaths = [];
        for (const feature of guGeojson.features || []) {
          allPaths.push(...pathsFromGeoFeature(feature));
        }

        if (this.geojson?.features?.length) {
          const dongPaths = [];
          for (const feature of this.geojson.features) {
            dongPaths.push(...pathsFromGeoFeature(feature));
          }
          if (dongPaths.length > allPaths.length) {
            allPaths = dongPaths;
          }
        }

        if (gen !== this._boundaryGen) return;
        if (!isValidPaths(allPaths)) throw new Error(`${districtName} 경계 좌표 무효`);

        this.guPaths = allPaths;
        this.guPolygon = createPolygonFromPaths(
          this.map,
          this.guPaths,
          GU_POLYGON_STYLE
        );
        this.guPolygons = Array.isArray(this.guPolygon)
          ? this.guPolygon
          : this.guPolygon
            ? [this.guPolygon]
            : [];

        const bounds = new kakao.maps.LatLngBounds();
        extendBoundsFromPaths(bounds, this.guPaths);
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        if (ne && sw) {
          console.log(`[${districtName} 경계] polygon ${this.guPaths.length}개`, {
            bounds: {
              minLat: sw.getLat(),
              maxLat: ne.getLat(),
              minLng: sw.getLng(),
              maxLng: ne.getLng(),
            },
          });
        }
      } catch (err) {
        if (gen !== this._boundaryGen) return;
        console.warn(`[${districtName} 경계] 로드 실패`, err.message);
        this.guPaths = null;
        this.guPolygons = [];
      }
    }

    async loadGeoJson(dongUrl, districtName, gen) {
      try {
        const res = await fetch(dongUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (gen !== this._boundaryGen) return;
        const geojson = await res.json();
        if (gen !== this._boundaryGen) return;
        this.geojson = geojson;
        this.dongIndex = buildDongIndex(this.geojson);
        console.log(`[${districtName}] GeoJSON 로드`, {
          features: this.geojson.features?.length,
          legalDongs: [...this.dongIndex.keys()],
        });
      } catch (err) {
        if (gen !== this._boundaryGen) return;
        console.warn(`[${districtName}] GeoJSON 로드 실패`, err.message);
        this.geojson = null;
        this.dongIndex = new Map();
      }
    }

    renderDongMenu() {
      const menu = document.getElementById("dongDropdownMenu");
      if (!menu) return;

      const dongItems = [
        `<button type="button" class="dong-item active" data-dong="all">전체 보기</button>`,
        ...this.dongList.map(
          (dong) =>
            `<button type="button" class="dong-item" data-dong="${dong}">${dong}</button>`
        ),
      ].join("");

      menu.innerHTML = dongItems;
      menu.querySelectorAll(".dong-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectDong(item.dataset.dong, item.textContent.trim());
        });
      });
    }

    updateGuLabel() {
      const labelEl = document.getElementById("selectedGu");
      if (labelEl) {
        labelEl.textContent = this.hasDistrictSelected()
          ? this.getDistrictConfig().name
          : "구 선택";
      }

      document.querySelectorAll(".gu-item").forEach((el) => {
        el.classList.toggle(
          "active",
          this.hasDistrictSelected() && el.dataset.sigungu === this.sigunguCode
        );
      });
    }

    renderUI() {
      const root = document.getElementById("region-selector");
      if (!root) return;

      const sorted =
        global.RealEstateMapDistricts?.getSortedDistrictEntries?.(this.sidoId) ||
        Object.entries(
          global.RealEstateMapDistricts?.getDistrictsBySido?.(this.sidoId) ||
            DISTRICTS
        );

      const guItems = sorted
        .map(
          ([code, d]) =>
            `<button type="button" class="gu-item dong-item${this.sigunguCode === code ? " active" : ""}" data-sigungu="${code}">${d.name}</button>`
        )
        .join("");

      const guLabel = this.hasDistrictSelected()
        ? this.getDistrictConfig().name
        : "구 선택";

      const sidoItems = SIDO_OPTIONS.map(
        (s) =>
          `<button type="button" class="sido-item gu-item dong-item${this.sidoId === s.id ? " active" : ""}" data-sido="${s.id}">${s.name}</button>`
      ).join("");

      root.innerHTML = `
        <span class="region-pin" aria-hidden="true">📍</span>
        <div class="region-dropdown-wrap region-sido-wrap">
          <button type="button" class="region-dropdown-btn region-gu-btn" id="sidoDropdownBtn" aria-expanded="false">
            <span id="selectedSido">${getSidoName(this.sidoId)}</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="region-dropdown-menu" id="sidoDropdownMenu" hidden>
            ${sidoItems}
          </div>
        </div>
        <span class="region-divider">›</span>
        <div class="region-dropdown-wrap region-gu-wrap">
          <button type="button" class="region-dropdown-btn region-gu-btn" id="guDropdownBtn" aria-expanded="false">
            <span id="selectedGu">${guLabel}</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="region-dropdown-menu" id="guDropdownMenu" hidden>
            ${guItems}
          </div>
        </div>
        <span class="region-divider">›</span>
        <div class="region-dropdown-wrap">
          <button type="button" class="region-dropdown-btn region-gu-btn" id="dongDropdownBtn" aria-expanded="false">
            <span id="selectedDong">동 선택</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="region-dropdown-menu" id="dongDropdownMenu" hidden>
          </div>
        </div>`;

      this.renderDongMenu();
      this.updateSelectionHint();
    }

    bindEvents() {
      const sidoBtn = document.getElementById("sidoDropdownBtn");
      const sidoMenu = document.getElementById("sidoDropdownMenu");
      const guBtn = document.getElementById("guDropdownBtn");
      const guMenu = document.getElementById("guDropdownMenu");
      const dongBtn = document.getElementById("dongDropdownBtn");

      sidoBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleSidoMenu();
      });

      sidoMenu?.querySelectorAll("[data-sido]").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectSido(item.dataset.sido);
        });
      });

      guBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleGuMenu();
      });

      guMenu?.querySelectorAll("[data-sigungu]").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          const code = item.dataset.sigungu;
          this.selectDistrict(code);
        });
      });

      dongBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleDongMenu();
      });

      document.addEventListener("click", (e) => {
        if (!e.target.closest("#region-selector")) {
          this.closeAllMenus();
        }
      });

      window.addEventListener("resize", () => {
        if (this.menuOpen || this.guMenuOpen || this.sidoMenuOpen) {
          this.logMenuPosition();
        }
      });
    }

    selectSido(sidoId) {
      if (!SIDO_OPTIONS.some((s) => s.id === sidoId)) return;
      if (sidoId === this.sidoId) {
        this.closeAllMenus();
        return;
      }
      this.closeAllMenus();
      this.sidoId = sidoId;
      this.renderUI();
      this.bindEvents();
      if (typeof gtag !== "undefined") {
        gtag("event", "sido_select", { sido_name: getSidoName(sidoId) });
      }
    }

    selectDistrict(sigunguCode) {
      if (!DISTRICTS[sigunguCode]) {
        this.closeAllMenus();
        return;
      }
      const districtSido = DISTRICTS[sigunguCode]?.sido;
      if (districtSido && districtSido !== this.sidoId) {
        this.sidoId = districtSido;
        this.renderUI();
        this.bindEvents();
      }
      if (sigunguCode === this.sigunguCode) {
        this.closeAllMenus();
        return;
      }
      this.closeAllMenus();
      trackDistrictSelect(sigunguCode);
      this.onDistrictChange(sigunguCode);
    }

    pulseGuButton() {
      this.updateSelectionHint();
    }

    async changeDistrict(sigunguCode, dongList) {
      if (!DISTRICTS[sigunguCode]) return;

      this._changingDistrict = true;
      this.sigunguCode = sigunguCode;
      this.dongList = dongList || [];
      this.selectedDong = "all";

      const labelEl = document.getElementById("selectedDong");
      if (labelEl) labelEl.textContent = "동 선택";

      this.updateGuLabel();
      this.updateSelectionHint();
      this.renderDongMenu();
      this.clearDongOverlay();
      await this.loadBoundaries();
      this._changingDistrict = false;
    }

    resetToGuView() {
      this.selectedDong = "all";
      const labelEl = document.getElementById("selectedDong");
      if (labelEl) labelEl.textContent = "동 선택";

      document.querySelectorAll("#dongDropdownMenu .dong-item").forEach((el) => {
        el.classList.toggle("active", el.dataset.dong === "all");
      });

      this.clearDongOverlay();
      this.fitGuBounds({ animate: true, duration: 1500 });
      this.closeAllMenus();
      this.onDongChange("all");
      trackDongSelect("all", "전체", this.sigunguCode);
    }

    fitGuBounds(options = {}) {
      if (options.animate) {
        this.flyToDistrict(options);
        return;
      }
      const cfg = this.getDistrictConfig();
      if (this.guPaths?.length) {
        const bounds = new kakao.maps.LatLngBounds();
        extendBoundsFromPaths(bounds, this.guPaths);
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        if (
          ne &&
          sw &&
          Number.isFinite(ne.getLat()) &&
          Number.isFinite(ne.getLng())
        ) {
          this.map.setBounds(bounds, 40, 40, 40, 40);
          return;
        }
      }

      this.map.setCenter(new kakao.maps.LatLng(cfg.lat, cfg.lng));
      this.map.setLevel(
        global.RealEstateMapDistricts?.DISTRICT_FLY_LEVEL ?? 3
      );
    }

    /** 구·시·군 선택 시 부드럽게 확대 */
    flyToDistrict(options = {}) {
      const duration = options.duration ?? 1500;
      const cfg = this.getDistrictConfig();
      if (!cfg?.lat || !cfg?.lng) return;

      const targetLevel =
        global.RealEstateMapDistricts?.DISTRICT_FLY_LEVEL ?? 3;
      const center = new kakao.maps.LatLng(cfg.lat, cfg.lng);
      const levelOpts = { animate: true, duration };

      // panTo + setLevel 동시 실행 시 한국 전체 뷰 중심(산간)에서 먼저 확대되는 버그 방지
      this.map.setCenter(center);
      this.map.setLevel(targetLevel, levelOpts);
    }

    toggleGuMenu() {
      const menu = document.getElementById("guDropdownMenu");
      const btn = document.getElementById("guDropdownBtn");
      if (!menu) return;
      if (this.guMenuOpen) {
        this.closeGuMenu();
        return;
      }
      this.closeSidoMenu();
      this.closeDongMenu();
      menu.hidden = false;
      this.guMenuOpen = true;
      if (btn) btn.setAttribute("aria-expanded", "true");
    }

    toggleSidoMenu() {
      const menu = document.getElementById("sidoDropdownMenu");
      const btn = document.getElementById("sidoDropdownBtn");
      if (!menu) return;
      if (this.sidoMenuOpen) {
        this.closeSidoMenu();
        return;
      }
      this.closeGuMenu();
      this.closeDongMenu();
      menu.hidden = false;
      this.sidoMenuOpen = true;
      if (btn) btn.setAttribute("aria-expanded", "true");
    }

    toggleDongMenu() {
      const menu = document.getElementById("dongDropdownMenu");
      const btn = document.getElementById("dongDropdownBtn");
      if (!menu) return;
      if (this.menuOpen) {
        this.closeDongMenu();
        return;
      }
      this.closeGuMenu();
      this.closeSidoMenu();
      menu.hidden = false;
      this.menuOpen = true;
      if (btn) btn.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => this.logMenuPosition(btn, menu));
    }

    logMenuPosition(btn, menu) {
      const button = btn || document.getElementById("dongDropdownBtn");
      const dropdown = menu || document.getElementById("dongDropdownMenu");
      if (!button || !dropdown || dropdown.hidden) return;
      console.log("[드롭다운] 버튼 위치:", button.getBoundingClientRect());
      console.log("[드롭다운] 메뉴 위치:", dropdown.getBoundingClientRect());
    }

    closeGuMenu() {
      const menu = document.getElementById("guDropdownMenu");
      const btn = document.getElementById("guDropdownBtn");
      if (menu) menu.hidden = true;
      if (btn) btn.setAttribute("aria-expanded", "false");
      this.guMenuOpen = false;
    }

    closeDongMenu() {
      const menu = document.getElementById("dongDropdownMenu");
      const btn = document.getElementById("dongDropdownBtn");
      if (menu) menu.hidden = true;
      if (btn) btn.setAttribute("aria-expanded", "false");
      this.menuOpen = false;
    }

    closeSidoMenu() {
      const menu = document.getElementById("sidoDropdownMenu");
      const btn = document.getElementById("sidoDropdownBtn");
      if (menu) menu.hidden = true;
      if (btn) btn.setAttribute("aria-expanded", "false");
      this.sidoMenuOpen = false;
    }

    closeAllMenus() {
      this.closeSidoMenu();
      this.closeGuMenu();
      this.closeDongMenu();
    }

    selectDong(dong, label) {
      this.selectedDong = dong;
      const labelEl = document.getElementById("selectedDong");
      if (labelEl) {
        labelEl.textContent = dong === "all" ? "동 선택" : label;
      }

      document.querySelectorAll("#dongDropdownMenu .dong-item").forEach((el) => {
        el.classList.toggle("active", el.dataset.dong === dong);
      });

      this.highlightDong(dong);
      this.closeAllMenus();
      this.onDongChange(dong);
      trackDongSelect(dong, label, this.sigunguCode);
    }

    clearGuPolygon() {
      clearPolygonOverlay(this.guPolygons);
      if (this.guPolygon && !Array.isArray(this.guPolygon)) {
        this.guPolygon.setMap(null);
      }
      this.guPolygon = null;
      this.guPolygons = [];
    }

    clearDongOverlay() {
      clearPolygonOverlay(this.dongPolygons);
      if (this.dongPolygon && !Array.isArray(this.dongPolygon)) {
        this.dongPolygon.setMap(null);
      }
      this.dongPolygon = null;
      this.dongPolygons = [];
      if (this.dongCircle) {
        this.dongCircle.setMap(null);
        this.dongCircle = null;
      }
    }

    highlightDong(dongName) {
      this.clearDongOverlay();

      if (dongName === "all") {
        this.fitGuBounds();
        return;
      }

      const paths = this.dongIndex.get(dongName);
      if (paths?.length && isValidPaths(paths)) {
        this.dongPolygon = createPolygonFromPaths(
          this.map,
          paths,
          DONG_POLYGON_STYLE
        );
        this.dongPolygons = Array.isArray(this.dongPolygon)
          ? this.dongPolygon
          : this.dongPolygon
            ? [this.dongPolygon]
            : [];

        const bounds = new kakao.maps.LatLngBounds();
        extendBoundsFromPaths(bounds, paths);
        const ne = bounds.getNorthEast();
        if (ne && Number.isFinite(ne.getLat())) {
          this.map.setBounds(bounds, 40, 40, 40, 40);
          return;
        }
      }

      const center = DONG_CENTERS[dongName];
      if (center) {
        console.warn(`[지역] ${dongName} GeoJSON 없음 → 원형 폴백`);
        const pos = new kakao.maps.LatLng(center.lat, center.lng);
        this.dongCircle = new kakao.maps.Circle({
          center: pos,
          radius: 600,
          ...DONG_POLYGON_STYLE,
        });
        this.dongCircle.setMap(this.map);
        this.map.setCenter(pos);
        this.map.setLevel(5);
        return;
      }

      console.warn(`[지역] ${dongName} 경계 데이터 없음`);
    }

    getSelectedDong() {
      return this.selectedDong;
    }

    getSigunguCode() {
      return this.sigunguCode;
    }
  }

  global.RealEstateMapRegion = {
    DISTRICTS,
    DistrictRegionSelector,
    GangnamRegionSelector: DistrictRegionSelector,
    toLegalDong,
    DONG_CENTERS,
    getDistrictName,
  };
})(window);
