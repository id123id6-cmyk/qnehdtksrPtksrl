/**
 * 주변 인프라 아이콘 (지하철·초등·중등) — 카카오 로컬 API
 */
(function (global) {
  "use strict";

  const CACHE_TTL_MS = 5 * 60 * 1000;
  const DEBOUNCE_MS = 500;
  const SEARCH_DIST_M = 3000;
  const cache = new Map();

  function getRestKey() {
    const cfg = global.REALESTATE_MAP_CONFIG || {};
    return cfg.kakaoRestKey || cfg.kakaoJsKey || "";
  }

  function cacheKey(type, lat, lng, dist) {
    return `${type}:${lat.toFixed(3)}:${lng.toFixed(3)}:${dist}`;
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

  async function kakaoFetch(path, params) {
    const key = getRestKey();
    if (!key) return [];

    const qs = new URLSearchParams(params);
    const res = await fetch(`https://dapi.kakao.com${path}?${qs}`, {
      headers: { Authorization: `KakaoAK ${key}` },
    });
    if (!res.ok) {
      console.warn("[infra] Kakao API", res.status, path);
      return [];
    }
    const json = await res.json();
    return json.documents || [];
  }

  async function fetchSubwayStations(center, distM = SEARCH_DIST_M) {
    const lat = center.getLat();
    const lng = center.getLng();
    const key = cacheKey("subway", lat, lng, distM);
    const cached = getCached(key);
    if (cached) return cached;

    const docs = await kakaoFetch("/v2/local/search/category.json", {
      category_group_code: "SW8",
      x: String(lng),
      y: String(lat),
      radius: String(distM),
      size: "15",
    });

    const data = docs.map((d) => ({
      id: d.id,
      name: d.place_name,
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      distance: parseInt(d.distance, 10) || 0,
      type: "subway",
      line: d.category_name || "",
    }));
    setCache(key, data);
    return data;
  }

  async function fetchSchools(center, schoolType, distM = SEARCH_DIST_M) {
    const lat = center.getLat();
    const lng = center.getLng();
    const query = schoolType === "elementary" ? "초등학교" : "중학교";
    const key = cacheKey(schoolType, lat, lng, distM);
    const cached = getCached(key);
    if (cached) return cached;

    const docs = await kakaoFetch("/v2/local/search/keyword.json", {
      query,
      x: String(lng),
      y: String(lat),
      radius: String(distM),
      size: "15",
    });

    const data = docs
      .filter((d) => d.place_name.includes(query.replace("교", "")))
      .map((d) => ({
        id: d.id,
        name: d.place_name,
        lat: parseFloat(d.y),
        lng: parseFloat(d.x),
        distance: parseInt(d.distance, 10) || 0,
        type: schoolType,
      }));
    setCache(key, data);
    return data;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function getSubwayLineColor(name, categoryName) {
    const text = `${name || ""} ${categoryName || ""}`;
    const lineMatch = text.match(/(\d+)\s*호선/);
    const colors = {
      1: "#0052A4",
      2: "#00A84D",
      3: "#EF7C1C",
      4: "#00A5DE",
      5: "#996CAC",
      6: "#CD7C2F",
      7: "#747F00",
      8: "#E6186C",
      9: "#BDB092",
      수인분당: "#FABE00",
      경의중앙: "#77C4A3",
      경춘: "#0C9674",
      공항: "#0090D2",
      신분당: "#D4003B",
      경강: "#003DA5",
      우이신설: "#B0CE18",
      서해: "#8BC53F",
      김포: "#A17800",
      GTX: "#0054A6",
    };
    if (lineMatch) return colors[lineMatch[1]] || "#00A84D";
    for (const [key, color] of Object.entries(colors)) {
      if (text.includes(key)) return color;
    }
    return "#00A84D";
  }

  function createInfraElement(item) {
    const el = document.createElement("div");
    el.className = `infra-pin infra-pin--${item.type}`;
    el.title = `${item.name} · ${item.distance}m`;
    el.dataset.infraId = item.id;
    if (item.type === "subway") {
      const lineColor = getSubwayLineColor(item.name, item.line);
      el.style.setProperty("--line-color", lineColor);
      el.innerHTML = `<span class="infra-pin-icon" aria-hidden="true"></span>`;
    } else {
      el.innerHTML = `<span class="infra-pin-icon" aria-hidden="true"></span>`;
    }
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      showInfraPopup(item, el);
    });
    return el;
  }

  function showInfraPopup(item, anchor) {
    document.querySelectorAll(".infra-popup").forEach((p) => p.remove());
    const pop = document.createElement("div");
    pop.className = "infra-popup";
    pop.innerHTML = `<strong>${escapeHtml(item.name)}</strong><span>${item.distance}m</span>`;
    anchor.appendChild(pop);
    setTimeout(() => {
      document.addEventListener(
        "click",
        () => pop.remove(),
        { once: true }
      );
    }, 0);
  }

  class InfraIconLayer {
    constructor(map, options = {}) {
      this.map = map;
      this.onApartmentToggle = options.onApartmentToggle || null;
      this.subwayLineLayer = options.subwayLineLayer || null;
      this.toggles = { apartment: true, subway: false, elementary: false, middle: false };
      this.overlays = [];
      this.debounceTimer = null;
      this.barEl = null;
    }

    init(barEl) {
      this.barEl = barEl;
      if (!barEl) return;
      this.renderBar();
      this.bindMapEvents();
    }

    renderBar() {
      this.barEl.innerHTML = `
        <div class="layer-toggle-group" role="group" aria-label="지도 레이어">
          <button type="button" class="map-pill layer-toggle active" data-infra="apartment" aria-pressed="true">
            <span class="layer-icon" aria-hidden="true">🏢</span><span class="layer-label">아파트</span>
          </button>
          <button type="button" class="map-pill layer-toggle" data-infra="elementary" aria-pressed="false">
            <span class="layer-icon" aria-hidden="true">🏫</span><span class="layer-label">초등</span>
          </button>
          <button type="button" class="map-pill layer-toggle" data-infra="middle" aria-pressed="false">
            <span class="layer-icon" aria-hidden="true">🏫</span><span class="layer-label">중등</span>
          </button>
          <button type="button" class="map-pill layer-toggle" data-infra="subway" aria-pressed="false">
            <span class="layer-icon" aria-hidden="true">🚇</span><span class="layer-label">지하철</span>
          </button>
        </div>`;

      this.barEl.querySelectorAll(".layer-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
          const type = btn.dataset.infra;
          if (type === "apartment") {
            this.toggles.apartment = !this.toggles.apartment;
            btn.classList.toggle("active", this.toggles.apartment);
            btn.setAttribute("aria-pressed", this.toggles.apartment ? "true" : "false");
            if (this.onApartmentToggle) this.onApartmentToggle(this.toggles.apartment);
            return;
          }
          this.toggles[type] = !this.toggles[type];
          btn.classList.toggle("active", this.toggles[type]);
          btn.setAttribute("aria-pressed", this.toggles[type] ? "true" : "false");
          if (type === "subway" && this.subwayLineLayer) {
            this.subwayLineLayer.setVisible(this.toggles.subway);
          }
          this.refresh();
        });
      });
    }

    bindMapEvents() {
      if (!this.map) return;
      kakao.maps.event.addListener(this.map, "idle", () => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.refresh(), DEBOUNCE_MS);
      });
    }

    clearOverlays() {
      for (const o of this.overlays) o.setMap(null);
      this.overlays = [];
    }

    async refresh() {
      this.clearOverlays();
      if (!this.map) return;

      const center = this.map.getCenter();
      const tasks = [];
      if (this.toggles.subway) tasks.push(fetchSubwayStations(center));
      if (this.toggles.elementary) tasks.push(fetchSchools(center, "elementary"));
      if (this.toggles.middle) tasks.push(fetchSchools(center, "middle"));

      if (!tasks.length) return;

      const results = (await Promise.all(tasks)).flat();
      const isMobile = window.innerWidth < 768;
      const size = isMobile ? 20 : 24;

      for (const item of results) {
        const el = createInfraElement(item);
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(item.lat, item.lng),
          content: el,
          yAnchor: 0.5,
          xAnchor: 0.5,
          zIndex: 5,
        });
        overlay.setMap(this.map);
        this.overlays.push(overlay);
      }
    }

    setApartmentLayerVisible(visible) {
      this.toggles.apartment = visible;
      const btn = this.barEl?.querySelector('[data-infra="apartment"]');
      if (btn) {
        btn.classList.toggle("active", visible);
        btn.setAttribute("aria-pressed", visible ? "true" : "false");
      }
    }

    destroy() {
      clearTimeout(this.debounceTimer);
      this.clearOverlays();
      if (this.subwayLineLayer) this.subwayLineLayer.hide();
    }
  }

  global.RealEstateMapInfra = {
    InfraIconLayer,
    fetchSubwayStations,
    fetchSchools,
  };
})(window);
