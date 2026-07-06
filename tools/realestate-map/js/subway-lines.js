/**
 * 서울·수도권 지하철 노선 폴리라인 레이어
 */
(function (global) {
  "use strict";

  const GEO_URL = "data/subway-lines-seoul.geojson";

  const FALLBACK_LINES = [
    {
      name: "2호선",
      color: "#00A651",
      coords: [
        [37.566, 126.978], [37.517, 127.047], [37.484, 127.032], [37.556, 126.936], [37.566, 126.978],
      ],
    },
    {
      name: "3호선",
      color: "#EF7C1C",
      coords: [
        [37.638, 126.915], [37.556, 126.952], [37.484, 126.993], [37.402, 127.051],
      ],
    },
    {
      name: "9호선",
      color: "#BDB092",
      coords: [
        [37.558, 126.815], [37.524, 126.945], [37.512, 127.0], [37.499, 127.073],
      ],
    },
    {
      name: "신분당선",
      color: "#D4003B",
      coords: [
        [37.497, 127.028], [37.455, 127.05], [37.378, 127.088], [37.34, 127.108],
      ],
    },
  ];

  class SubwayLineLayer {
    constructor(map) {
      this.map = map;
      this.polylines = [];
      this.visible = false;
      this.loaded = false;
      this.features = [];
    }

    async load() {
      if (this.loaded) return;
      try {
        const res = await fetch(GEO_URL);
        if (res.ok) {
          const geo = await res.json();
          this.features = (geo.features || []).map((f) => ({
            name: f.properties?.name || "",
            color: f.properties?.color || "#00A651",
            coords: (f.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]),
          }));
        }
      } catch (err) {
        console.warn("[subway-lines] geojson load failed", err);
      }
      if (!this.features.length) {
        this.features = FALLBACK_LINES;
      }
      this.loaded = true;
    }

    show() {
      if (!this.map) return;
      this.hide();
      const draw = () => {
        for (const line of this.features) {
          if (!line.coords?.length) continue;
          const path = line.coords.map(([lat, lng]) => new kakao.maps.LatLng(lat, lng));
          const polyline = new kakao.maps.Polyline({
            path,
            strokeWeight: 3,
            strokeColor: line.color,
            strokeOpacity: 0.7,
            strokeStyle: "solid",
            zIndex: 2,
          });
          polyline.setMap(this.map);
          this.polylines.push(polyline);
        }
        this.visible = true;
      };
      if (this.loaded) draw();
      else this.load().then(draw);
    }

    hide() {
      for (const p of this.polylines) p.setMap(null);
      this.polylines = [];
      this.visible = false;
    }

    setVisible(on) {
      if (on) this.show();
      else this.hide();
    }

    destroy() {
      this.hide();
    }
  }

  global.RealEstateMapSubwayLines = { SubwayLineLayer };
})(window);
