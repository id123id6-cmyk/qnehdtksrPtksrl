/**
 * 반경 재기 (줄자) — 두 점 클릭으로 거리 측정
 */
(function (global) {
  "use strict";

  const DEBOUNCE_HINT =
    "초등학교 배정 반경 확인 (통상 800m)\n지하철역 도보 반경 확인 (통상 500m)";

  function haversineMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistance(m) {
    if (m >= 1000) return `${(m / 1000).toFixed(2)}km`;
    return `${Math.round(m)}m`;
  }

  class RadiusTool {
    constructor(map) {
      this.map = map;
      this.active = false;
      this.center = null;
      this.circle = null;
      this.centerMarker = null;
      this.labelOverlay = null;
      this.clickHandler = null;
      this.keyHandler = null;
      this.btn = null;
    }

    bindButton(btn) {
      this.btn = btn;
      if (!btn) return;
      btn.addEventListener("click", () => this.toggle());
      btn.title = DEBOUNCE_HINT;
    }

    toggle() {
      if (this.active) this.deactivate();
      else this.activate();
    }

    activate() {
      if (!this.map) return;
      this.active = true;
      this.center = null;
      this.clearOverlays();
      if (this.btn) {
        this.btn.classList.add("active");
        this.btn.setAttribute("aria-pressed", "true");
      }
      this.map.setCursor("crosshair");

      this.clickHandler = (mouseEvent) => {
        const latlng = mouseEvent.latLng;
        if (!this.center) {
          this.center = latlng;
          this.centerMarker = new kakao.maps.Marker({ position: latlng, map: this.map });
          return;
        }
        this.drawCircle(this.center, latlng);
        this.center = null;
        if (this.centerMarker) {
          this.centerMarker.setMap(null);
          this.centerMarker = null;
        }
      };
      kakao.maps.event.addListener(this.map, "click", this.clickHandler);

      this.keyHandler = (e) => {
        if (e.key === "Escape") this.deactivate();
      };
      document.addEventListener("keydown", this.keyHandler);
    }

    drawCircle(center, edge) {
      if (!center?.getLat || !edge?.getLat) return;
      const lat1 = center.getLat();
      const lng1 = center.getLng();
      const lat2 = edge.getLat();
      const lng2 = edge.getLng();
      if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return;

      const radius = haversineMeters(lat1, lng1, lat2, lng2);
      if (!Number.isFinite(radius) || radius <= 0) return;
      if (this.circle) this.circle.setMap(null);
      this.circle = new kakao.maps.Circle({
        center,
        radius,
        strokeWeight: 2,
        strokeColor: "#1A1A1A",
        strokeOpacity: 0.9,
        strokeStyle: "solid",
        fillColor: "#F5EFE0",
        fillOpacity: 0.25,
      });
      this.circle.setMap(this.map);

      const label = formatDistance(radius);
      const el = document.createElement("div");
      el.className = "radius-distance-label";
      el.textContent = label;
      if (this.labelOverlay) this.labelOverlay.setMap(null);
      this.labelOverlay = new kakao.maps.CustomOverlay({
        position: center,
        content: el,
        yAnchor: 1.4,
        xAnchor: 0.5,
        zIndex: 30,
      });
      this.labelOverlay.setMap(this.map);
    }

    clearOverlays() {
      if (this.circle) {
        this.circle.setMap(null);
        this.circle = null;
      }
      if (this.centerMarker) {
        this.centerMarker.setMap(null);
        this.centerMarker = null;
      }
      if (this.labelOverlay) {
        this.labelOverlay.setMap(null);
        this.labelOverlay = null;
      }
    }

    deactivate() {
      this.active = false;
      this.center = null;
      this.clearOverlays();
      if (this.clickHandler) {
        kakao.maps.event.removeListener(this.map, "click", this.clickHandler);
        this.clickHandler = null;
      }
      if (this.keyHandler) {
        document.removeEventListener("keydown", this.keyHandler);
        this.keyHandler = null;
      }
      if (this.btn) {
        this.btn.classList.remove("active");
        this.btn.setAttribute("aria-pressed", "false");
      }
      this.map.setCursor(null);
    }

    destroy() {
      this.deactivate();
    }
  }

  global.RealEstateMapRadius = {
    RadiusTool,
    haversineMeters,
    formatDistance,
  };
})(window);
