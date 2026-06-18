/**
 * 강남구 동 단위 지역 선택 + 경계 폴리곤
 */
(function (global) {
  "use strict";

  const GANGNAM_CENTER = { lat: 37.5172, lng: 127.0473 };
  const GEOJSON_URL = "data/gangnam-dong.geojson";
  const GU_GEOJSON_URL = "data/gangnam-gu.geojson";

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

  function toLegalDong(emdName) {
    if (!emdName) return "";
    if (emdName === "일원본동" || emdName.startsWith("일원")) return "일원동";
    return emdName.replace(/\d+동$/, "동");
  }

  function ringsFromGeometry(geometry) {
    if (!geometry) return [];
    if (geometry.type === "Polygon") {
      return [geometry.coordinates[0]];
    }
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

  function createPolygonFromPaths(map, paths, style) {
    const kakaoPaths = pathsToKakaoLatLng(paths);
    const polygon = new kakao.maps.Polygon({
      path: kakaoPaths.length === 1 ? kakaoPaths[0] : kakaoPaths,
      ...style,
    });
    polygon.setMap(map);
    return polygon;
  }

  function extendBoundsFromPaths(bounds, paths) {
    const kakaoPaths = pathsToKakaoLatLng(paths);
    for (const ring of kakaoPaths) {
      for (const ll of ring) bounds.extend(ll);
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
        index.get(legal).push(
          ring.map(([lng, lat]) => ({ lat, lng }))
        );
      }
    }
    return index;
  }

  class GangnamRegionSelector {
    constructor(options) {
      this.map = options.map;
      this.onDongChange = options.onDongChange || (() => {});
      this.dongList = options.dongList || [];
      this.selectedDong = "all";
      this.dongIndex = new Map();
      this.geojson = null;
      this.guGeojson = null;
      this.guPaths = null;
      this.guPolygon = null;
      this.dongPolygon = null;
      this.dongCircle = null;
      this.menuOpen = false;
    }

    async init() {
      this.renderUI();
      this.bindEvents();
      await Promise.all([this.loadGeoJson(), this.loadGuBoundary()]);
      if (this.guPaths?.length) {
        this.fitGuBounds();
      }
    }

    async loadGuBoundary() {
      try {
        const res = await fetch(GU_GEOJSON_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.guGeojson = await res.json();
        const feature = this.guGeojson.features?.[0];
        if (!feature) throw new Error("강남구 feature 없음");

        this.guPaths = pathsFromGeoFeature(feature);
        const coordCount = this.guPaths.reduce((n, ring) => n + ring.length, 0);
        console.log("[강남구 경계] 폴리곤 좌표 수:", coordCount);

        this.guPolygon = createPolygonFromPaths(
          this.map,
          this.guPaths,
          GU_POLYGON_STYLE
        );
        console.log("[강남구 경계] 지도에 추가 완료", {
          source: feature.properties?.source || "gangnam-gu.geojson",
        });
      } catch (err) {
        console.warn("[강남구 경계] 로드 실패", err.message);
      }
    }

    async loadGeoJson() {
      try {
        const res = await fetch(GEOJSON_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.geojson = await res.json();
        this.dongIndex = buildDongIndex(this.geojson);
        console.log("[지역] GeoJSON 로드", {
          features: this.geojson.features?.length,
          legalDongs: [...this.dongIndex.keys()],
        });
      } catch (err) {
        console.warn("[지역] GeoJSON 로드 실패, 원형 폴백 사용", err.message);
      }
    }

    renderUI() {
      const root = document.getElementById("region-selector");
      if (!root) return;

      const dongItems = [
        `<button type="button" class="dong-item active" data-dong="all">전체 보기</button>`,
        ...this.dongList.map(
          (dong) =>
            `<button type="button" class="dong-item" data-dong="${dong}">${dong}</button>`
        ),
      ].join("");

      root.innerHTML = `
        <span class="region-pin" aria-hidden="true">📍</span>
        <span class="region-item">서울특별시</span>
        <span class="region-divider">›</span>
        <button type="button" class="region-item region-item--gu" id="regionGuBtn" title="강남구 전체 보기">강남구</button>
        <span class="region-divider">›</span>
        <div class="region-dropdown-wrap">
          <button type="button" class="region-dropdown-btn" id="dongDropdownBtn" aria-expanded="false">
            <span id="selectedDong">동 선택</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="region-dropdown-menu" id="dongDropdownMenu" hidden>
            ${dongItems}
          </div>
        </div>`;
    }

    bindEvents() {
      const btn = document.getElementById("dongDropdownBtn");
      const menu = document.getElementById("dongDropdownMenu");
      if (!btn || !menu) return;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleMenu();
      });

      menu.querySelectorAll(".dong-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          const dong = item.dataset.dong;
          this.selectDong(dong, item.textContent.trim());
        });
      });

      document.addEventListener("click", (e) => {
        if (
          !e.target.closest("#region-selector") &&
          !e.target.closest(".region-dropdown-menu")
        ) {
          this.closeMenu();
        }
      });

      window.addEventListener("resize", () => {
        if (this.menuOpen) this.logMenuPosition();
      });

      const guBtn = document.getElementById("regionGuBtn");
      if (guBtn) {
        guBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.resetToGuView();
        });
      }
    }

    resetToGuView() {
      this.selectedDong = "all";
      const labelEl = document.getElementById("selectedDong");
      if (labelEl) labelEl.textContent = "동 선택";

      document.querySelectorAll(".dong-item").forEach((el) => {
        el.classList.toggle("active", el.dataset.dong === "all");
      });

      this.clearDongOverlay();
      this.fitGuBounds();
      this.closeMenu();
      this.onDongChange("all");
    }

    fitGuBounds() {
      if (this.guPaths?.length) {
        const bounds = new kakao.maps.LatLngBounds();
        extendBoundsFromPaths(bounds, this.guPaths);
        this.map.setBounds(bounds, 40, 40, 40, 40);
        return;
      }

      this.map.setCenter(
        new kakao.maps.LatLng(GANGNAM_CENTER.lat, GANGNAM_CENTER.lng)
      );
      this.map.setLevel(6);
    }

    toggleMenu() {
      const menu = document.getElementById("dongDropdownMenu");
      const btn = document.getElementById("dongDropdownBtn");
      if (!menu) return;
      if (this.menuOpen) {
        this.closeMenu();
        return;
      }
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
      console.log("[드롭다운] 부모:", dropdown.parentElement?.className);
    }

    closeMenu() {
      const menu = document.getElementById("dongDropdownMenu");
      const btn = document.getElementById("dongDropdownBtn");
      if (menu) {
        menu.hidden = true;
      }
      if (btn) btn.setAttribute("aria-expanded", "false");
      this.menuOpen = false;
    }

    selectDong(dong, label) {
      this.selectedDong = dong;
      const labelEl = document.getElementById("selectedDong");
      if (labelEl) {
        labelEl.textContent = dong === "all" ? "동 선택" : label;
      }

      document.querySelectorAll(".dong-item").forEach((el) => {
        el.classList.toggle("active", el.dataset.dong === dong);
      });

      this.highlightDong(dong);
      this.closeMenu();
      this.onDongChange(dong);
    }

    clearDongOverlay() {
      if (this.dongPolygon) {
        this.dongPolygon.setMap(null);
        this.dongPolygon = null;
      }
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
      if (paths?.length) {
        this.dongPolygon = createPolygonFromPaths(
          this.map,
          paths,
          DONG_POLYGON_STYLE
        );

        const bounds = new kakao.maps.LatLngBounds();
        extendBoundsFromPaths(bounds, paths);
        this.map.setBounds(bounds, 40, 40, 40, 40);
        return;
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
  }

  global.RealEstateMapRegion = {
    GangnamRegionSelector,
    toLegalDong,
    DONG_CENTERS,
    GANGNAM_CENTER,
  };
})(window);
