/**
 * 전국 경계 스타일 + 구·동 라벨 CustomOverlay
 */
(function (global) {
  "use strict";

  const SIGUNGU_STYLE = {
    strokeColor: "#1A1A1A",
    strokeWeight: 2.5,
    strokeOpacity: 0.65,
    fillColor: "transparent",
    fillOpacity: 0,
    strokeStyle: "solid",
  };

  const DONG_STYLE = {
    strokeColor: "#333333",
    strokeWeight: 1.2,
    strokeOpacity: 0.4,
    fillColor: "transparent",
    fillOpacity: 0,
    strokeStyle: "dashed",
  };

  const SIGUNGU_HOVER = {
    fillColor: "#F5EFE0",
    fillOpacity: 0.2,
    strokeOpacity: 0.85,
  };

  const CACHE_KEY = "realestate-map-geojson";
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  function labelHtml(text, kind, small) {
    if (kind === "gu") {
      const size = small ? 18 : 26;
      const weight = 800;
      return `<div class="map-region-label map-region-label--gu${small ? " map-region-label--small" : ""}" style="font-family:Pretendard,-apple-system,sans-serif;font-size:${size}px;font-weight:${weight};color:#1A1A1A;background:rgba(255,255,255,0.88);padding:4px 12px;border-radius:6px;border:1px solid rgba(26,26,26,0.3);box-shadow:0 2px 6px rgba(0,0,0,0.15);pointer-events:none;white-space:nowrap;z-index:150;">${text}</div>`;
    }
    return `<div class="map-region-label map-region-label--dong" style="font-family:Pretendard,sans-serif;font-size:14px;font-weight:600;color:rgba(26,26,26,0.9);background:rgba(255,255,255,0.78);padding:2px 7px;border-radius:4px;pointer-events:none;white-space:nowrap;z-index:120;">${text}</div>`;
  }

  async function fetchGeoJsonCached(url) {
    try {
      const raw = localStorage.getItem(`${CACHE_KEY}:${url}`);
      if (raw) {
        const hit = JSON.parse(raw);
        if (Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;
      }
    } catch (_) {
      /* ignore */
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    try {
      localStorage.setItem(
        `${CACHE_KEY}:${url}`,
        JSON.stringify({ ts: Date.now(), data })
      );
    } catch (_) {
      /* quota */
    }
    return data;
  }

  class BoundaryLabelManager {
    constructor(map) {
      this.map = map;
      this.overlays = [];
      this.dongBoundaryPolys = [];
      this.labels = null;
      this.sigunguCode = null;
      this._debounce = null;
      this._bound = false;
      this._geojson = null;
      this._polygonFactory = null;
    }

    async ensureLabels() {
      if (this.labels) return this.labels;
      const res = await fetch("data/region-labels.json");
      if (!res.ok) throw new Error("region-labels.json 로드 실패");
      this.labels = await res.json();
      return this.labels;
    }

    bindMap() {
      if (this._bound || !this.map) return;
      this._bound = true;
      kakao.maps.event.addListener(this.map, "zoom_changed", () => {
        clearTimeout(this._debounce);
        this._debounce = setTimeout(() => this.refresh(), 200);
      });
      kakao.maps.event.addListener(this.map, "dragend", () => {
        clearTimeout(this._debounce);
        this._debounce = setTimeout(() => this.refresh(), 200);
      });
    }

    setSigunguCode(code) {
      this.sigunguCode = code;
      this.refresh();
    }

    inViewport(lat, lng) {
      if (!this.map) return true;
      const bounds = this.map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      return lat >= sw.getLat() && lat <= ne.getLat() && lng >= sw.getLng() && lng <= ne.getLng();
    }

    clearLabels() {
      for (const o of this.overlays) o.setMap(null);
      this.overlays = [];
    }

    clearDongBoundaries() {
      for (const p of this.dongBoundaryPolys) p.setMap(null);
      this.dongBoundaryPolys = [];
    }

    clearAll() {
      this.clearLabels();
      this.clearDongBoundaries();
    }

    addLabel(text, lat, lng, kind, small) {
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(lat, lng),
        content: labelHtml(text, kind, small),
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: kind === "gu" ? 150 : 120,
      });
      overlay.setMap(this.map);
      this.overlays.push(overlay);
    }

    renderDongBoundaries(geojson, polygonFactory) {
      this.clearDongBoundaries();
      if (!geojson?.features?.length || !polygonFactory) return;
      const level = this.map.getLevel();
      if (level > 7 || level < 6) return;

      for (const feature of geojson.features) {
        const polys = polygonFactory(feature);
        if (Array.isArray(polys)) this.dongBoundaryPolys.push(...polys);
        else if (polys) this.dongBoundaryPolys.push(polys);
      }
    }

    async refresh(geojson, polygonFactory) {
      if (geojson) this._geojson = geojson;
      if (polygonFactory) this._polygonFactory = polygonFactory;

      this.clearLabels();
      this.clearDongBoundaries();
      if (!this.map || !this.sigunguCode) return;

      try {
        await this.ensureLabels();
      } catch {
        return;
      }

      const level = this.map.getLevel();
      const sig = this.labels.sigungu[this.sigunguCode];
      const geo = geojson || this._geojson;
      const factory = polygonFactory || this._polygonFactory;

      if (sig && this.inViewport(sig.lat, sig.lng)) {
        if (level >= 6 && level <= 10) {
          this.addLabel(sig.name, sig.lat, sig.lng, "gu", false);
        } else if (level <= 5) {
          this.addLabel(sig.name, sig.lat, sig.lng, "gu", true);
        }
      }

      if (level >= 6 && level <= 7 && geo && factory) {
        this.renderDongBoundaries(geo, factory);
      }

      if (level <= 5) {
        for (const d of Object.values(this.labels.dong)) {
          if (d.sigungu !== this.sigunguCode) continue;
          if (!this.inViewport(d.lat, d.lng)) continue;
          this.addLabel(d.name, d.lat, d.lng, "dong", false);
        }
      }
    }

    destroy() {
      clearTimeout(this._debounce);
      this.clearAll();
      this.labels = null;
      this._bound = false;
    }
  }

  global.RealEstateMapBoundary = {
    SIGUNGU_STYLE,
    DONG_STYLE,
    SIGUNGU_HOVER,
    BoundaryLabelManager,
    fetchGeoJsonCached,
  };
})(window);
