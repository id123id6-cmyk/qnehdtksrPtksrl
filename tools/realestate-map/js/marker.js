/**
 * 가격대별 마커 — CustomOverlay + 뷰포트 컬링 + 줌 레벨별 표시
 */
(function (global) {
  "use strict";

  const DEBUG = false;
  const CATEGORIES = {
    low: { color: "#10b981", label: "low" },
    mid: { color: "#ea580c", label: "mid" },
    high: { color: "#ef4444", label: "high" },
    jeonse: { color: "#FFC107", label: "jeonse" },
    none: { color: "#9ca3af", label: "none" },
  };

  const BRAND_KEYWORDS = [
    "래미안", "푸르지오", "자이", "롯데캐슬", "힐스테이트",
    "e편한세상", "SK뷰", "아이파크", "더샵", "센트럴",
    "캐슬", "센텀", "리치몬드", "브라운스톤", "데시앙",
    "한신", "현대", "쌍용", "삼성", "대우", "한양",
    "미도", "한보", "효성", "대치", "도곡", "압구정",
    "개포", "은마", "경남", "청실", "우성",
  ];

  const CLUSTER_LEVEL = 10;
  const DEBOUNCE_MS = 250;
  const dotImageCache = new Map();

  function log(...args) {
    if (DEBUG) console.log("[마커]", ...args);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function hasMaemae1Y(apt) {
    return apt.avgPrice1Y != null && apt.avgPrice1Y > 0;
  }

  function hasJeonse1Y(apt) {
    return (apt.jeonseCount1Y ?? 0) > 0 || (apt.avgJeonseDeposit1Y != null && apt.avgJeonseDeposit1Y > 0);
  }

  function getPriceCategory(avgPrice1Y) {
    if (avgPrice1Y == null || avgPrice1Y <= 0) return CATEGORIES.none;
    if (avgPrice1Y < 100000) return CATEGORIES.low;
    if (avgPrice1Y < 200000) return CATEGORIES.mid;
    return CATEGORIES.high;
  }

  function getMarkerCategory(apt) {
    if (hasMaemae1Y(apt)) return getPriceCategory(apt.avgPrice1Y);
    if (hasJeonse1Y(apt)) return CATEGORIES.jeonse;
    return CATEGORIES.none;
  }

  function getAreaLabel(apt) {
    const AT = global.RealEstateMapAreaTypes;
    const activeBand = global.RealEstateMapFilter?.getActiveAreaFilter?.();
    if (AT?.formatMarkerAreaLabel) {
      const label = AT.formatMarkerAreaLabel(apt, activeBand);
      if (label) return label;
    }
    const excl = apt.dominantArea ?? apt.dominantAreaGroup;
    if (excl != null) {
      const sqm = AT?.formatAreaSqm?.(excl, 2);
      return sqm ? `${sqm}㎡` : "";
    }
    return "";
  }

  function getMarkerPriceText(apt) {
    if (hasMaemae1Y(apt)) {
      return formatPrice(apt.avgPrice1Y) || "거래없음";
    }
    if (hasJeonse1Y(apt)) {
      const deposit = formatPrice(apt.avgJeonseDeposit1Y);
      return deposit ? `전세 ${deposit}` : "전세";
    }
    return "거래없음";
  }

  function formatPrice(amountMan) {
    if (amountMan == null || amountMan <= 0) return null;
    const eok = amountMan / 10000;
    const rounded = Math.round(eok * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}억` : `${rounded}억`;
  }

  function shortenAptName(fullName) {
    if (!fullName) return "";
    for (const brand of BRAND_KEYWORDS) {
      if (fullName.includes(brand)) return brand;
    }
    return fullName.substring(0, 4);
  }

  function countBrandMatches(apartments) {
    let matched = 0;
    for (const apt of apartments) {
      const short = shortenAptName(apt.name);
      if (BRAND_KEYWORDS.includes(short)) matched++;
    }
    return { matched, total: apartments.length };
  }

  const CURRENT_YEAR = new Date().getFullYear();

  /** 줌 10+: 클러스터, 7~9: 도트, 4~6: 단지명+시세, 1~3: 3줄 풀카드 */
  function getMarkerMode(zoomLevel) {
    if (zoomLevel >= CLUSTER_LEVEL) return "cluster";
    if (zoomLevel >= 7) return "dot";
    if (zoomLevel >= 4) return "compact";
    return "full";
  }

  function getBuildingAgeShort(apt) {
    if (!apt?.build_year) return "";
    const age = CURRENT_YEAR - apt.build_year;
    if (age < 0) return "";
    return `${age}y`;
  }

  function getHouseholdShort(apt) {
    const n = apt.household_count ?? apt.households;
    if (n == null || n <= 0) return "";
    return `${Number(n).toLocaleString("ko-KR")}세대`;
  }

  function getMarkerMetaLine(apt) {
    const age = getBuildingAgeShort(apt);
    const hh = getHouseholdShort(apt);
    if (age && hh) return `${age} · ${hh}`;
    return age || hh || "";
  }

  function getMarkerDisplayName(apt, mode) {
    if (mode === "full") {
      const name = apt.name || "";
      return name.length > 12 ? `${name.slice(0, 11)}…` : name;
    }
    return shortenAptName(apt.name);
  }

  function isValidCoord(apt) {
    const lat = apt.latitude;
    const lng = apt.longitude;
    return (
      lat != null &&
      lng != null &&
      lat >= 33 &&
      lat <= 38 &&
      lng >= 124 &&
      lng <= 132
    );
  }

  function getMarkerLabel(apt, zoomLevel) {
    const price = getMarkerPriceText(apt);
    const mode = getMarkerMode(zoomLevel);
    if (mode === "full") {
      return [getMarkerDisplayName(apt, mode), getMarkerMetaLine(apt), price]
        .filter(Boolean)
        .join(" ");
    }
    if (mode === "compact") {
      return `${getMarkerDisplayName(apt, mode)} ${price}`.trim();
    }
    return "";
  }

  function getMarkerTooltip(apt) {
    const AT = global.RealEstateMapAreaTypes;
    if (AT?.formatMarkerTooltip && (apt.avgPrice1Y > 0 || (apt.jeonseCount1Y ?? 0) > 0)) {
      return AT.formatMarkerTooltip(apt);
    }
    const name = apt.name || "";
    if (hasMaemae1Y(apt)) return name;

    const jeonse1y = apt.jeonseCount1Y ?? 0;
    if (jeonse1y > 0 || hasJeonse1Y(apt)) {
      return `${name} — 매매 없음 · 전세 ${jeonse1y || "?"}건`;
    }

    const wolse = apt.wolseCount ?? 0;
    if (wolse > 0) {
      return `${name} — 매매 없음 · 월세 ${wolse}건`;
    }
    return `${name} — 최근 1년 거래 없음`;
  }

  function createMarkerContent(apt, zoomLevel, selectedId) {
    const category = getMarkerCategory(apt);
    const catLabel = category.label;
    const price = escapeHtml(getMarkerPriceText(apt));
    const mode = getMarkerMode(zoomLevel);
    const id = escapeHtml(apt.id);
    const tooltip = escapeHtml(getMarkerTooltip(apt));
    const isSelected =
      selectedId != null && String(apt.id) === String(selectedId);
    const selectedCls = isSelected ? " marker-selected" : "";
    const name = escapeHtml(getMarkerDisplayName(apt, mode));
    const meta = escapeHtml(getMarkerMetaLine(apt));

    if (mode === "dot") {
      return `<div class="marker-dot marker-${catLabel}${selectedCls}" data-apt-id="${id}" title="${tooltip}"></div>`;
    }

    if (mode === "compact") {
      return `<div class="marker-card marker-card--compact marker-${catLabel}${selectedCls}" data-apt-id="${id}" role="button" tabindex="0" title="${tooltip}">
        <div class="marker-card-accent marker-accent-${catLabel}"></div>
        <div class="marker-card-body">
          <div class="marker-card-line1">${name}</div>
          <div class="marker-card-line3">${price}</div>
        </div>
      </div>`;
    }

    return `<div class="marker-card marker-card--full marker-${catLabel}${selectedCls}" data-apt-id="${id}" role="button" tabindex="0" title="${tooltip}">
      <div class="marker-card-accent marker-accent-${catLabel}"></div>
      <div class="marker-card-body">
        <div class="marker-card-line1">${name}</div>
        ${meta ? `<div class="marker-card-line2">${meta}</div>` : ""}
        <div class="marker-card-line3">${price}</div>
      </div>
    </div>`;
  }

  function htmlToElement(html) {
    const wrap = document.createElement("div");
    wrap.innerHTML = html.trim();
    return wrap.firstElementChild;
  }

  function createMarkerElement(apt, zoomLevel, selectedId) {
    return htmlToElement(createMarkerContent(apt, zoomLevel, selectedId));
  }

  function createDotMarkerImage(color) {
    if (dotImageCache.has(color)) return dotImageCache.get(color);

    const canvas = document.createElement("canvas");
    canvas.width = 18;
    canvas.height = 18;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(9, 9, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    const imageSrc = canvas.toDataURL();
    const size = new kakao.maps.Size(18, 18);
    const option = { offset: new kakao.maps.Point(9, 9) };
    const image = new kakao.maps.MarkerImage(imageSrc, size, option);
    dotImageCache.set(color, image);
    return image;
  }

  class ApartmentMarkerLayer {
    constructor(map, apartments, onSelect, mapContainer) {
      this.map = map;
      this.mapContainer = mapContainer || document.getElementById("map");
      this.apartments = apartments.filter(isValidCoord);
      this.aptById = new Map(
        this.apartments.map((a) => [String(a.id), a])
      );
      this.onSelect = onSelect;
      this.overlays = [];
      this.clusterMarkers = [];
      this.clusterer = null;
      this.clusterBuilt = false;
      this.zoomTimer = null;
      this.panTimer = null;
      this.rafId = null;
      this.renderTimer = null;
      this.pendingLevel = null;
      this.idleTimer = null;
      this._bootstrapping = false;
      this.selectedId = null;
      this.currentLevel = map.getLevel();
      this._hidden = false;
      this.stats = {
        visibleCount: 0,
        totalCount: this.apartments.length,
        lastRenderMs: 0,
      };
    }

    beginBootstrap() {
      this._bootstrapping = true;
    }

    endBootstrap() {
      this._bootstrapping = false;
    }

    scheduleRender(level, immediate = false) {
      this.pendingLevel = level;
      clearTimeout(this.renderTimer);
      if (immediate) {
        this.renderTimer = null;
        const lvl = this.pendingLevel;
        this.pendingLevel = null;
        this.renderVisibleMarkers(lvl);
        return;
      }
      this.renderTimer = setTimeout(() => {
        this.renderTimer = null;
        const lvl = this.pendingLevel ?? this.map.getLevel();
        this.pendingLevel = null;
        this.renderVisibleMarkers(lvl);
      }, 80);
    }

    init() {
      const brandStats = countBrandMatches(this.apartments);
      log("초기화", {
        단지수: this.apartments.length,
        줌: this.currentLevel,
        모드: getMarkerMode(this.currentLevel),
        브랜드매칭: `${brandStats.matched}/${brandStats.total}`,
      });

      this.bindDelegation();
      this.beginBootstrap();
      this.renderVisibleMarkers(this.currentLevel);

      kakao.maps.event.addListener(this.map, "zoom_changed", () => {
        if (this._bootstrapping) return;
        clearTimeout(this.zoomTimer);
        this.zoomTimer = setTimeout(() => {
          this.scheduleRender(this.map.getLevel());
        }, DEBOUNCE_MS);
      });

      kakao.maps.event.addListener(this.map, "center_changed", () => {
        if (this._bootstrapping) return;
        clearTimeout(this.panTimer);
        this.panTimer = setTimeout(() => {
          this.scheduleRender(this.map.getLevel());
        }, DEBOUNCE_MS);
      });

      kakao.maps.event.addListener(this.map, "idle", () => {
        if (this._bootstrapping) return;
        clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
          this.scheduleRender(this.map.getLevel(), true);
        }, 120);
      });
    }

    bindDelegation() {
      if (!this.mapContainer || this.mapContainer._markerDelegated) return;
      this.mapContainer._markerDelegated = true;

      this.mapContainer.addEventListener("click", (e) => {
        const marker = e.target.closest("[data-apt-id]");
        if (!marker) return;
        e.preventDefault();
        e.stopPropagation();
        const apt = this.aptById.get(marker.dataset.aptId);
        if (apt) this.onSelect(apt);
      });

      this.mapContainer.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const marker = e.target.closest("[data-apt-id]");
        if (!marker) return;
        e.preventDefault();
        const apt = this.aptById.get(marker.dataset.aptId);
        if (apt) this.onSelect(apt);
      });
    }

    getVisibleApartments(level) {
      const bounds = this.map.getBounds();
      if (!bounds) return this.apartments;

      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const degenerate =
        !sw ||
        !ne ||
        (Math.abs(sw.getLat() - ne.getLat()) < 1e-8 &&
          Math.abs(sw.getLng() - ne.getLng()) < 1e-8);

      if (degenerate && level != null && level < 7) {
        return this.apartments;
      }

      const visible = this.apartments.filter((apt) =>
        bounds.contain(
          new kakao.maps.LatLng(apt.latitude, apt.longitude)
        )
      );

      if (visible.length === 0 && this.apartments.length > 0 && level != null && level < 7) {
        return this.apartments;
      }

      return visible;
    }

    clearOverlays() {
      for (const overlay of this.overlays) {
        overlay.setMap(null);
      }
      this.overlays = [];
      if (this.clusterer) this.clusterer.setMap(null);
    }

    buildClusterMarkers() {
      if (this.clusterBuilt) return;

      if (DEBUG) console.time("클러스터 마커 생성");
      this.clusterMarkers = this.apartments.map((apt) => {
        const category = getMarkerCategory(apt);
        const position = new kakao.maps.LatLng(apt.latitude, apt.longitude);
        const marker = new kakao.maps.Marker({
          position,
          image: createDotMarkerImage(category.color),
          title: getMarkerTooltip(apt),
        });
        kakao.maps.event.addListener(marker, "click", () => {
          this.onSelect(apt);
        });
        return marker;
      });

      this.clusterer = new kakao.maps.MarkerClusterer({
        map: null,
        markers: this.clusterMarkers,
        averageCenter: true,
        minLevel: CLUSTER_LEVEL,
        gridSize: 60,
        styles: [
          {
            width: "44px",
            height: "44px",
            background: "rgba(239, 68, 68, 0.88)",
            borderRadius: "22px",
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
            lineHeight: "44px",
          },
          {
            width: "52px",
            height: "52px",
            background: "rgba(220, 38, 38, 0.9)",
            borderRadius: "26px",
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
            lineHeight: "52px",
          },
          {
            width: "60px",
            height: "60px",
            background: "rgba(185, 28, 28, 0.92)",
            borderRadius: "30px",
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
            lineHeight: "60px",
          },
        ],
      });
      this.clusterBuilt = true;
      if (DEBUG) console.timeEnd("클러스터 마커 생성");
    }

    renderClusterMode() {
      this.buildClusterMarkers();
      this.clusterer.setMap(this.map);
      this.stats.visibleCount = this.apartments.length;
    }

    renderOverlayMode(level, visibleApts) {
      const mode = getMarkerMode(level);
      const positions = [];
      const elements = [];

      for (const apt of visibleApts) {
        elements.push(createMarkerElement(apt, level, this.selectedId));
        positions.push(
          new kakao.maps.LatLng(apt.latitude, apt.longitude)
        );
      }

      const attachOverlays = () => {
        for (let i = 0; i < elements.length; i++) {
          const overlay = new kakao.maps.CustomOverlay({
            position: positions[i],
            content: elements[i],
            yAnchor: 1,
            xAnchor: 0.5,
            zIndex: 10,
            clickable: true,
          });
          overlay.setMap(this.map);
          this.overlays.push(overlay);
        }
      };

      if (this._bootstrapping) {
        attachOverlays();
      } else {
        cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(attachOverlays);
      }

      this.stats.visibleCount = visibleApts.length;
    }

    renderVisibleMarkers(level) {
      const t0 = performance.now();
      if (DEBUG) console.time("마커 렌더링");

      this.currentLevel = level;
      this.clearOverlays();

      if (this._hidden) {
        this.stats.visibleCount = 0;
        return;
      }

      const mode = getMarkerMode(level);

      if (mode === "cluster") {
        this.renderClusterMode();
        log(`클러스터 모드: ${this.apartments.length}/${this.apartments.length}`);
      } else {
        const visibleApts = this.getVisibleApartments(level);
        log(
          `화면 내 단지: ${visibleApts.length}/${this.apartments.length} (줌 ${level}, ${mode})`
        );
        this.renderOverlayMode(level, visibleApts);
      }

      if (DEBUG) console.timeEnd("마커 렌더링");
      this.stats.lastRenderMs = Math.round(performance.now() - t0);

      log("렌더 완료", {
        줌: level,
        모드: mode,
        visible: this.stats.visibleCount,
        DOM카드: document.querySelectorAll(".marker-card").length,
        DOM점: document.querySelectorAll(".marker-dot").length,
      });
    }

    panToApartment(apt) {
      this.map.panTo(new kakao.maps.LatLng(apt.latitude, apt.longitude));
    }

    setSelectedApartment(aptId) {
      this.selectedId = aptId != null ? String(aptId) : null;
      this.scheduleRender(this.currentLevel);
    }

    updateApartment(apt) {
      if (!apt?.id) return;
      const id = String(apt.id);
      const prev = this.aptById.get(id);
      if (!prev) return;
      const merged = { ...prev, ...apt };
      this.aptById.set(id, merged);
      const idx = this.apartments.findIndex((a) => String(a.id) === id);
      if (idx >= 0) this.apartments[idx] = merged;
      if (this.selectedId === id) {
        this.scheduleRender(this.currentLevel);
      }
    }

    setFilteredApartments(filteredList) {
      this.apartments = (filteredList || []).filter(isValidCoord);
      this.aptById = new Map(
        this.apartments.map((a) => [String(a.id), a])
      );
      this.clusterBuilt = false;
      this.clusterMarkers = [];
      if (this.clusterer) {
        this.clusterer.setMap(null);
        this.clusterer = null;
      }
      this.stats.totalCount = this.apartments.length;
      this.scheduleRender(this.currentLevel, this._bootstrapping);
    }

    setVisible(visible) {
      this._hidden = !visible;
      this.scheduleRender(this.currentLevel, true);
    }

    getStats() {
      const brand = countBrandMatches(this.apartments);
      return {
        ...this.stats,
        total: this.apartments.length,
        brandMatchRate: ((brand.matched / brand.total) * 100).toFixed(1) + "%",
        mode: getMarkerMode(this.currentLevel),
      };
    }

    destroy() {
      clearTimeout(this.zoomTimer);
      clearTimeout(this.panTimer);
      clearTimeout(this.idleTimer);
      clearTimeout(this.renderTimer);
      cancelAnimationFrame(this.rafId);
      this.clearOverlays();
    }
  }

  global.RealEstateMapMarker = {
    getPriceCategory,
    getMarkerCategory,
    formatPrice,
    shortenAptName,
    getMarkerMode,
    getMarkerLabel,
    getMarkerTooltip,
    getMarkerPriceText,
    getBuildingAgeShort,
    getHouseholdShort,
    getMarkerMetaLine,
    createMarkerElement,
    createMarkerContent,
    countBrandMatches,
    ApartmentMarkerLayer,
    CLUSTER_LEVEL,
  };
})(window);
