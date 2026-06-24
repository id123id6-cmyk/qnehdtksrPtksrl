/**
 * 지도 마커 필터 바 (가격/평형/연식/거래량)
 */
(function (global) {
  "use strict";

  const SQM_PER_PYEONG = 3.3058;
  const CURRENT_YEAR = new Date().getFullYear();

  const filterState = {
    price: "all",
    area: "all",
    age: "all",
    volume: "all",
  };

  const FILTER_OPTIONS = {
    price: [
      { value: "all", label: "전체" },
      { value: "under5", label: "5억 미만" },
      { value: "5to10", label: "5억 ~ 10억" },
      { value: "10to20", label: "10억 ~ 20억" },
      { value: "20to30", label: "20억 ~ 30억" },
      { value: "over30", label: "30억 이상" },
    ],
    area: [
      { value: "all", label: "전체" },
      { value: "under40", label: "40㎡ 미만" },
      { value: "40_60", label: "40-60㎡" },
      { value: "60_85", label: "60-85㎡" },
      { value: "85_102", label: "85-102㎡" },
      { value: "102plus", label: "102㎡ 이상" },
    ],
    age: [
      { value: "all", label: "전체" },
      { value: "new", label: "신축 (5년 이내)" },
      { value: "semi_new", label: "준신축 (10년 이내)" },
      { value: "normal", label: "일반 (20년 이내)" },
      { value: "old", label: "구축 (20년 이상)" },
    ],
    volume: [
      { value: "all", label: "전체" },
      { value: "active", label: "활발 (1년 10건+)" },
      { value: "normal", label: "보통 (1년 3~9건)" },
      { value: "low", label: "적음 (1년 1~2건)" },
      { value: "none", label: "거래 없음" },
    ],
  };

  function sqmToCategory(sqm) {
    if (global.RealEstateMapPyeong?.sqmToCategory) {
      return global.RealEstateMapPyeong.sqmToCategory(sqm);
    }
    const pyeong = Number(sqm) / SQM_PER_PYEONG;
    if (pyeong < 20) return "small";
    if (pyeong < 30) return "mid_small";
    if (pyeong < 40) return "mid";
    if (pyeong < 50) return "large";
    return "xlarge";
  }

  function matchPriceFilter(apt, filter) {
    if (filter === "all") return true;
    const price = apt.avgPrice1Y;
    if (price == null || price <= 0) return false;

    switch (filter) {
      case "under5":
        return price < 50000;
      case "5to10":
        return price >= 50000 && price < 100000;
      case "10to20":
        return price >= 100000 && price < 200000;
      case "20to30":
        return price >= 200000 && price < 300000;
      case "over30":
        return price >= 300000;
      default:
        return true;
    }
  }

  function matchAreaFilter(apt, filter) {
    if (filter === "all") return true;
    const bands = apt.areaSqmBands || apt.areaCategories || [];
    return bands.includes(filter);
  }

  function matchAgeFilter(apt, filter) {
    if (filter === "all") return true;
    const year = apt.build_year;
    if (!year) return false;

    const age = CURRENT_YEAR - year;
    switch (filter) {
      case "new":
        return age <= 5;
      case "semi_new":
        return age <= 10;
      case "normal":
        return age <= 20;
      case "old":
        return age > 20;
      default:
        return true;
    }
  }

  function matchVolumeFilter(apt, filter) {
    if (filter === "all") return true;
    const count = apt.tradeCount1Y ?? 0;

    switch (filter) {
      case "active":
        return count >= 10;
      case "normal":
        return count >= 3 && count <= 9;
      case "low":
        return count >= 1 && count <= 2;
      case "none":
        return count === 0;
      default:
        return true;
    }
  }

  function applyFilters(apartments) {
    return apartments.filter((apt) => {
      if (!matchPriceFilter(apt, filterState.price)) return false;
      if (!matchAreaFilter(apt, filterState.area)) return false;
      if (!matchAgeFilter(apt, filterState.age)) return false;
      if (!matchVolumeFilter(apt, filterState.volume)) return false;
      return true;
    });
  }

  function getOptionLabel(filterType, value) {
    const opt = FILTER_OPTIONS[filterType]?.find((o) => o.value === value);
    return opt ? opt.label : "전체";
  }

  const FILTER_TYPE_NAMES = {
    price: "가격",
    area: "평형",
    age: "연식",
    volume: "거래량",
  };

  const VALUE_SHORT_LABELS = {
    price: {
      under5: "5억 미만",
      "5to10": "5~10억",
      "10to20": "10~20억",
      "20to30": "20~30억",
      over30: "30억+",
    },
    area: {
      under40: "40㎡ 미만",
      "40_60": "40-60㎡",
      "60_85": "60-85㎡",
      "85_102": "85-102㎡",
      "102plus": "102㎡+",
    },
    age: {
      new: "신축",
      semi_new: "준신축",
      normal: "일반",
      old: "구축",
    },
    volume: {
      active: "활발",
      normal: "보통",
      low: "적음",
      none: "없음",
    },
  };

  function getButtonDisplayLabel(filterType, value) {
    const name = FILTER_TYPE_NAMES[filterType] || filterType;
    if (value === "all") return name;
    const short = VALUE_SHORT_LABELS[filterType]?.[value];
    return short ? `${name}: ${short}` : name;
  }

  function isFilterActive() {
    return (
      filterState.price !== "all" ||
      filterState.area !== "all" ||
      filterState.age !== "all" ||
      filterState.volume !== "all"
    );
  }

  function resetFilters() {
    filterState.price = "all";
    filterState.area = "all";
    filterState.age = "all";
    filterState.volume = "all";
  }

  class MapFilterBar {
    constructor(options) {
      this.allApartments = options.apartments || [];
      this.onChange = options.onChange || (() => {});
      this.barEl = document.getElementById("map-filter-bar");
      this.openDropdown = null;
    }

    init(options = {}) {
      if (!this.barEl) return;
      this.renderBar();
      this.bindEvents();
      this.syncUI();
      if (!options.silent) this.emitChange();
    }

    renderBar() {
      const chipButtons = ["price", "area", "age", "volume"]
        .map(
          (type) => `
        <div class="filter-chip-wrap" data-filter-wrap="${type}">
          <button type="button" class="filter-btn default" data-filter="${type}" aria-expanded="false" id="filter-btn-${type}">
            <span class="filter-btn-label" id="filter-${type}-label">${this.getTypeName(type)}</span>
            <span class="filter-arrow">▼</span>
          </button>
        </div>`
        )
        .join("");

      const dropdowns = ["price", "area", "age", "volume"]
        .map(
          (type) => `
        <div class="filter-dropdown" id="filter-dropdown-${type}" hidden>
          ${FILTER_OPTIONS[type]
            .map(
              (opt) => `
            <button type="button" class="filter-option" data-filter-type="${type}" data-filter-value="${opt.value}">
              ${opt.label}
            </button>`
            )
            .join("")}
        </div>`
        )
        .join("");

      this.barEl.innerHTML = `
        <div class="filter-group">
          ${chipButtons}
          <button type="button" class="filter-reset-btn" id="filterReset">초기화</button>
          <div class="filter-result-count" aria-live="polite">
            <strong id="filtered-count">0</strong> / <span id="total-count">0</span> 단지
          </div>
        </div>
        <div class="filter-dropdown-layer" aria-hidden="true">${dropdowns}</div>`;
    }

    getTypeName(type) {
      return FILTER_TYPE_NAMES[type] || type;
    }

    bindEvents() {
      this.barEl.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const type = btn.dataset.filter;
          this.toggleDropdown(type);
        });
      });

      this.barEl.querySelectorAll(".filter-option").forEach((opt) => {
        opt.addEventListener("click", (e) => {
          e.stopPropagation();
          const type = opt.dataset.filterType;
          const value = opt.dataset.filterValue;
          this.setFilter(type, value);
        });
      });

      const resetBtn = this.barEl.querySelector(".filter-reset-btn");
      if (resetBtn) {
        resetBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          resetFilters();
          this.syncUI();
          this.closeAllDropdowns();
          this.emitChange();
        });
      }

      document.addEventListener("click", (e) => {
        if (
          !e.target.closest(".filter-chip-wrap") &&
          !e.target.closest(".filter-dropdown")
        ) {
          this.closeAllDropdowns();
        }
      });

      window.addEventListener("resize", () => {
        if (this.openDropdown) {
          this.positionDropdown(this.openDropdown);
        }
      });
    }

    toggleDropdown(type) {
      const dropdown = document.getElementById(`filter-dropdown-${type}`);
      if (!dropdown) return;

      if (this.openDropdown === type) {
        this.closeAllDropdowns();
        return;
      }

      this.closeAllDropdowns();
      dropdown.hidden = false;
      this.openDropdown = type;

      const chip = this.barEl.querySelector(`[data-filter="${type}"]`);
      if (chip) {
        chip.classList.add("is-open");
        chip.setAttribute("aria-expanded", "true");
      }

      requestAnimationFrame(() => this.positionDropdown(type));
    }

    positionDropdown(type) {
      const dropdown = document.getElementById(`filter-dropdown-${type}`);
      const chip = this.barEl.querySelector(`[data-filter="${type}"]`);
      if (!dropdown || !chip || dropdown.hidden) return;

      dropdown.style.position = "fixed";
      dropdown.style.left = "";
      dropdown.style.right = "";
      dropdown.style.top = "";
      dropdown.classList.remove("align-right");

      const padding = 12;
      const chipRect = chip.getBoundingClientRect();

      dropdown.style.top = `${chipRect.bottom + 4}px`;
      dropdown.style.left = `${chipRect.left}px`;

      let rect = dropdown.getBoundingClientRect();

      if (rect.right > window.innerWidth - padding) {
        dropdown.style.left = `${window.innerWidth - rect.width - padding}px`;
      }

      rect = dropdown.getBoundingClientRect();
      if (rect.left < padding) {
        dropdown.style.left = `${padding}px`;
      }

      rect = dropdown.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - padding) {
        dropdown.style.top = `${chipRect.top - rect.height - 4}px`;
      }
    }

    closeAllDropdowns() {
      this.barEl.querySelectorAll(".filter-dropdown").forEach((el) => {
        el.hidden = true;
        el.style.position = "";
        el.style.top = "";
        el.style.left = "";
        el.style.right = "";
        el.classList.remove("align-right");
      });
      this.barEl.querySelectorAll(".filter-btn").forEach((chip) => {
        chip.classList.remove("is-open");
        chip.setAttribute("aria-expanded", "false");
      });
      this.openDropdown = null;
    }

    setFilter(type, value) {
      if (!filterState.hasOwnProperty(type)) return;
      filterState[type] = value;
      this.syncUI();
      this.closeAllDropdowns();
      this.emitChange();

      if (typeof gtag !== "undefined") {
        gtag("event", "filter_change", {
          filter_type: FILTER_TYPE_NAMES[type] || type,
          filter_value: String(value),
        });
      }
    }

    syncUI() {
      for (const type of ["price", "area", "age", "volume"]) {
        const labelEl = document.getElementById(`filter-${type}-label`);
        const btn = this.barEl.querySelector(`[data-filter="${type}"]`);
        const value = filterState[type];

        if (labelEl) {
          labelEl.textContent = getButtonDisplayLabel(type, value);
        }
        if (btn) {
          const isDefault = value === "all";
          btn.classList.toggle("default", isDefault);
          btn.classList.toggle("active", !isDefault);
        }

        this.barEl
          .querySelectorAll(`[data-filter-type="${type}"]`)
          .forEach((opt) => {
            opt.classList.toggle("selected", opt.dataset.filterValue === value);
          });
      }
    }

    emitChange() {
      const filtered = applyFilters(this.allApartments);
      this.onChange(filtered, {
        filteredCount: filtered.length,
        totalCount: this.allApartments.length,
        isActive: isFilterActive(),
      });
    }

    updateApartments(apartments, options = {}) {
      this.allApartments = apartments;
      if (options.silent) {
        updateResultCount(apartments.length, apartments.length);
        return;
      }
      this.emitChange();
    }
  }

  function updateResultCount(filteredCount, totalCount) {
    const filteredEl = document.getElementById("filtered-count");
    const totalEl = document.getElementById("total-count");
    if (filteredEl) filteredEl.textContent = String(filteredCount);
    if (totalEl) totalEl.textContent = String(totalCount);
  }

  global.RealEstateMapFilter = {
    filterState,
    FILTER_OPTIONS,
    applyFilters,
    matchPriceFilter,
    matchAreaFilter,
    matchAgeFilter,
    matchVolumeFilter,
    sqmToCategory,
    resetFilters,
    isFilterActive,
    getOptionLabel,
    getButtonDisplayLabel,
    getActiveAreaFilter: () => filterState.area,
    MapFilterBar,
    updateResultCount,
  };
})(window);
