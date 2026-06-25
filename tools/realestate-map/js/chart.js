/**
 * 단지별 매매 가격 변화 차트 (Chart.js) — 면적대 필터 + 5년 X축
 */
(function (global) {
  "use strict";

  const Pyeong = () => global.RealEstateMapPyeong;
  const AT = () => global.RealEstateMapAreaTypes;

  let supabaseClient = null;
  let chartInstance = null;
  let currentApartmentId = null;
  let cachedTransactions = [];
  let currentAreaGroups = [];
  let currentPeriod = "all";
  let currentArea = "all";
  let currentDealType = "매매";
  let lastLoadedApartmentId = null;
  let onFilterChange = null;
  let onAreaTabChange = null;

  function toPyeong(sqm) {
    return Pyeong()?.toPyeong(sqm) ?? null;
  }

  function filterByArea(transactions, areaTab) {
    return (
      AT()?.filterTransactionsByAreaGroup(
        transactions,
        areaTab,
        currentAreaGroups
      ) ?? transactions
    );
  }

  function formatAmount(amountMan) {
    if (amountMan == null || Number.isNaN(amountMan)) return "-";
    const n = Math.round(amountMan);
    if (n >= 10000) {
      const eok = Math.floor(n / 10000);
      const man = n % 10000;
      return man ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
    }
    return `${n.toLocaleString()}만`;
  }

  function parseDealDate(tx) {
    if (tx.deal_date) return new Date(tx.deal_date);
    return new Date(tx.deal_year, tx.deal_month - 1, tx.deal_day || 1);
  }

  function getPeriodRange(period) {
    const max = new Date();
    const min = new Date();

    if (period === "1y") {
      min.setFullYear(min.getFullYear() - 1);
    } else if (period === "3y") {
      min.setFullYear(min.getFullYear() - 3);
    } else {
      min.setFullYear(min.getFullYear() - 5);
      min.setMonth(0);
      min.setDate(1);
    }

    return { min, max };
  }

  function filterByPeriod(transactions, period) {
    const { min } = getPeriodRange(period);
    return transactions.filter((tx) => parseDealDate(tx) >= min);
  }

  function applyFilters(period, area, transactions) {
    return filterByArea(filterByPeriod(transactions, period), area);
  }

  async function loadApartmentTransactions(apartmentId) {
    if (lastLoadedApartmentId !== apartmentId) {
      const cutoffStr = AT()?.getCutoffDateStr?.();
      const { data, error } = await supabaseClient
        .from("transactions")
        .select(
          "deal_amount, deal_year, deal_month, deal_day, deal_date, exclu_use_ar, floor, deal_type, rent_deposit, monthly_rent"
        )
        .eq("apartment_id", apartmentId)
        .in("deal_type", ["매매", "전세"])
        .gte("deal_date", cutoffStr)
        .order("deal_year", { ascending: true })
        .order("deal_month", { ascending: true });

      if (error) throw new Error(error.message);
      cachedTransactions = data || [];
      lastLoadedApartmentId = apartmentId;
      currentApartmentId = apartmentId;
      currentAreaGroups = AT()?.buildAreaTypesFromTransactions(cachedTransactions)?.groups || [];

      console.log("[차트] 거래 로드", {
        apartmentId,
        총건수: cachedTransactions.length,
        면적그룹: currentAreaGroups.map((g) => g.areaGroup),
      });
    }

    const byDeal = cachedTransactions.filter((tx) => tx.deal_type === currentDealType);
    return applyFilters(currentPeriod, currentArea, byDeal);
  }

  function aggregateByMonth(transactions) {
    const buckets = new Map();

    for (const tx of transactions) {
      const key = `${tx.deal_year}-${String(tx.deal_month).padStart(2, "0")}`;
      if (!buckets.has(key)) {
        buckets.set(key, { sum: 0, count: 0, sampleExcl: tx.exclu_use_ar });
      }
      const bucket = buckets.get(key);
      bucket.sum += tx.deal_amount;
      bucket.count += 1;
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, { sum, count, sampleExcl }]) => {
        const [year, month] = ym.split("-");
        const avg = Math.round(sum / count);
        return {
          x: new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1),
          y: avg,
          label: ym,
          sampleExcl,
          tooltip: Pyeong()?.formatChartTooltip(sampleExcl, formatAmount(avg)) || formatAmount(avg),
        };
      });
  }

  function calculateStats(transactions) {
    if (!transactions.length) {
      return { max: null, min: null, avg: null };
    }
    const amounts = transactions.map((t) => t.deal_amount);
    const sum = amounts.reduce((a, b) => a + b, 0);
    return {
      max: Math.max(...amounts),
      min: Math.min(...amounts),
      avg: Math.round(sum / amounts.length),
    };
  }

  function setStats(stats) {
    const maxEl = document.getElementById("maxPrice");
    const minEl = document.getElementById("minPrice");
    const avgEl = document.getElementById("avgPrice");
    if (maxEl) maxEl.textContent = stats.max != null ? formatAmount(stats.max) : "-";
    if (minEl) minEl.textContent = stats.min != null ? formatAmount(stats.min) : "-";
    if (avgEl) avgEl.textContent = stats.avg != null ? formatAmount(stats.avg) : "-";
  }

  function showChartMessage(message, hint) {
    const wrapper = document.querySelector(".chart-wrapper");
    const stats = document.querySelector(".chart-stats");
    if (!wrapper) return;

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    wrapper.innerHTML = `
      <div class="chart-message">
        <p>${message}</p>
        ${hint ? `<small>${hint}</small>` : ""}
      </div>
    `;
    if (stats) stats.hidden = true;
  }

  function showChartLoading() {
    const wrapper = document.querySelector(".chart-wrapper");
    const stats = document.querySelector(".chart-stats");
    if (!wrapper) return;

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    wrapper.innerHTML =
      '<div class="chart-loading"><span class="chart-spinner"></span> 불러오는 중...</div>';
    if (stats) stats.hidden = true;
  }

  function ensureCanvas() {
    const wrapper = document.querySelector(".chart-wrapper");
    const stats = document.querySelector(".chart-stats");
    if (!wrapper) return null;

    if (!wrapper.querySelector("canvas")) {
      wrapper.innerHTML = '<canvas id="priceChart"></canvas>';
    }
    if (stats) stats.hidden = false;
    return document.getElementById("priceChart");
  }

  function buildChartOptions(period, monthlyData) {
    const { min, max } = getPeriodRange(period);
    const unit = period === "1y" ? "month" : period === "3y" ? "quarter" : "year";

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title(items) {
              if (!items.length) return "";
              const d = new Date(items[0].parsed.x);
              return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
            },
            label(ctx) {
              const point = monthlyData[ctx.dataIndex];
              return point?.tooltip || formatAmount(ctx.parsed.y);
            },
          },
        },
      },
      scales: {
        x: {
          type: "time",
          min,
          max,
          time: {
            unit,
            displayFormats: {
              month: "yy.MM",
              quarter: "yy.MM",
              year: "yyyy",
            },
          },
          grid: { color: "rgba(0,0,0,0.06)" },
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: period === "1y" ? 12 : 10,
            font: { size: 11 },
          },
        },
        y: {
          beginAtZero: false,
          title: { display: true, text: "거래가 (만원)", font: { size: 11 } },
          grid: { color: "rgba(0,0,0,0.06)" },
          ticks: {
            font: { size: 11 },
            callback(value) {
              return formatAmount(value);
            },
          },
        },
      },
    };
  }

  function renderPriceChart(monthlyData, transactions, period) {
    const canvas = ensureCanvas();
    if (!canvas || !global.Chart) return;

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    const stats = calculateStats(transactions);
    setStats(stats);

    const hint = document.querySelector(".chart-hint");

    if (!transactions.length) {
      const areaLabel =
        currentArea === "all"
          ? ""
          : ` (${AT()?.formatAreaTabLabel?.(Number(currentArea)) || currentArea})`;
      showChartMessage(
        `선택한 조건의 거래가 없습니다${areaLabel}`,
        "다른 면적 또는 기간을 선택해 보세요."
      );
      if (hint) hint.hidden = true;
      return;
    }

    if (transactions.length <= 3 && hint) {
      hint.textContent =
        "거래가 적어 일부 시점만 표시됩니다. X축은 선택 기간 전체를 보여줍니다.";
      hint.hidden = false;
    } else if (hint) {
      hint.hidden = true;
    }

    const pointRadius = transactions.length <= 3 ? 6 : 3;

    chartInstance = new Chart(canvas, {
      type: "line",
      data: {
        datasets: [
          {
            label: "월평균 거래가",
            data: monthlyData,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.08)",
            pointRadius,
            pointHoverRadius: pointRadius + 2,
            borderWidth: 2,
            tension: 0.25,
            fill: true,
            spanGaps: true,
          },
        ],
      },
      options: buildChartOptions(period, monthlyData),
    });
  }

  function renderAreaTabs() {
    const selector = document.getElementById("area-selector");
    const tabsEl = document.getElementById("area-tabs");
    if (!selector || !tabsEl) return;

    selector.hidden = true;
    const buttons = [
      `<button type="button" class="area-tab${currentArea === "all" ? " active" : ""}" data-area="all">전체</button>`,
    ];

    for (const group of currentAreaGroups) {
      const key = String(group.areaGroup);
      const label = AT()?.formatAreaTabLabel(group.areaGroup) || `${key}㎡`;
      const active = key === String(currentArea) ? " active" : "";
      buttons.push(
        `<button type="button" class="area-tab${active}" data-area="${key}">${label}</button>`
      );
    }

    tabsEl.innerHTML = buttons.join("");
    bindAreaTabs();
  }

  function setAreaGroups(groups) {
    if (Array.isArray(groups) && groups.length) {
      currentAreaGroups = groups;
      renderAreaTabs();
    }
  }

  function setActiveAreaTab(area) {
    document.querySelectorAll(".area-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.area === String(area));
    });
  }

  function bindAreaTabs() {
    document.querySelectorAll(".area-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const area = btn.dataset.area;
        if (area) updateChartArea(area);
      });
    });
  }

  function setSidebarAreaTabs(groups, activeArea, onSelect) {
    onAreaTabChange = onSelect || null;
    if (Array.isArray(groups)) currentAreaGroups = groups;
    if (activeArea != null) currentArea = String(activeArea);
    renderSidebarAreaTabs();
  }

  function renderSidebarAreaTabs() {
    const wrap = document.getElementById("sidebar-area-tabs");
    if (!wrap) return;

    const buttons = [
      `<button type="button" class="sidebar-area-tab${currentArea === "all" ? " active" : ""}" data-area="all">전체</button>`,
    ];

    for (const group of currentAreaGroups) {
      const key = String(group.areaGroup);
      const label = AT()?.formatAreaTabLabel(group.areaGroup) || `${key}㎡`;
      const active = key === String(currentArea) ? " active" : "";
      buttons.push(
        `<button type="button" class="sidebar-area-tab${active}" data-area="${key}">${label}</button>`
      );
    }

    wrap.innerHTML = buttons.join("");
    wrap.querySelectorAll(".sidebar-area-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const area = btn.dataset.area;
        if (!area) return;
        updateChartArea(area);
        if (typeof onAreaTabChange === "function") onAreaTabChange(area);
      });
    });
  }

  function bindPeriodButtons() {
    document.querySelectorAll(".period-btn").forEach((btn) => {
      btn.replaceWith(btn.cloneNode(true));
    });
    document.querySelectorAll(".period-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const period = btn.dataset.period;
        if (period) updateChartPeriod(period);
      });
    });
  }

  function setActiveDealTab(type) {
    document.querySelectorAll(".deal-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.deal === type);
    });
  }

  function bindDealTypeTabs() {
    document.querySelectorAll(".deal-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.deal;
        if (type) updateChartDealType(type);
      });
    });
  }

  function setActivePeriodButton(period) {
    document.querySelectorAll(".period-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.period === period);
    });
  }

  function notifyFilterChange(transactions) {
    if (typeof onFilterChange === "function") {
      const sorted = [...transactions].sort(
        (a, b) => parseDealDate(b) - parseDealDate(a)
      );
      onFilterChange(sorted);
    }
  }

  async function refreshChart() {
    const transactions = await loadApartmentTransactions(currentApartmentId);
    const monthlyData = aggregateByMonth(transactions);
    renderPriceChart(monthlyData, transactions, currentPeriod);
    notifyFilterChange(transactions);
  }

  async function updateChartPeriod(period) {
    if (!currentApartmentId) return;
    currentPeriod = period;
    setActivePeriodButton(period);
    showChartLoading();
    try {
      await refreshChart();
    } catch (err) {
      console.error(err);
      showChartMessage("차트를 불러오지 못했습니다", err.message);
    }
  }

  async function updateChartArea(area) {
    if (!currentApartmentId) return;
    currentArea = area;
    setActiveAreaTab(area);
    const sidebarTabs = document.getElementById("sidebar-area-tabs");
    if (sidebarTabs) {
      sidebarTabs.querySelectorAll(".sidebar-area-tab").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.area === String(area));
      });
    }
    showChartLoading();
    try {
      await refreshChart();
    } catch (err) {
      console.error(err);
      showChartMessage("차트를 불러오지 못했습니다", err.message);
    }
  }

  async function updateChartDealType(type) {
    if (!currentApartmentId) return;
    if (type === "월세") return;
    if (currentDealType === type) return;
    currentDealType = type;
    setActiveDealTab(type);
    showChartLoading();
    try {
      await refreshChart();
      renderAreaTabs();

      if (typeof gtag !== "undefined") {
        gtag("event", "deal_type_toggle", {
          deal_type: type,
        });
      }
    } catch (err) {
      console.error(err);
      showChartMessage("차트를 불러오지 못했습니다", err.message);
    }
  }

  function getCurrentDealType() {
    return currentDealType;
  }

  async function initChart(supabase, apartmentId, period, options) {
    if (!supabase) return;
    supabaseClient = supabase;
    onFilterChange = options?.onFilterChange || null;
    onAreaTabChange = options?.onAreaTabChange || null;
    currentDealType = options?.dealType || "매매";
    currentPeriod = period || "all";
    currentArea = options?.areaGroup != null ? String(options.areaGroup) : "all";
    currentApartmentId = null;
    lastLoadedApartmentId = null;
    cachedTransactions = [];
    currentAreaGroups = options?.areaGroups || [];

    setActivePeriodButton(currentPeriod);
    showChartLoading();

    try {
      await loadApartmentTransactions(apartmentId);
      if (!currentAreaGroups.length) {
        currentAreaGroups = AT()?.buildAreaTypesFromTransactions(cachedTransactions)?.groups || [];
      }
      renderAreaTabs();
      renderSidebarAreaTabs();
      await refreshChart();
      bindPeriodButtons();
      bindDealTypeTabs();
    } catch (err) {
      console.error(err);
      showChartMessage("차트를 불러오지 못했습니다", err.message);
    }
  }

  function destroyChart() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    currentApartmentId = null;
    lastLoadedApartmentId = null;
    cachedTransactions = [];
    currentAreaGroups = [];
    currentArea = "all";
    onFilterChange = null;
    onAreaTabChange = null;
  }

  function getChartSectionHtml() {
    return `
      <section class="chart-section">
        <h3>📈 5년 가격 변화</h3>
        <div class="deal-type-tabs">
          <button type="button" class="deal-tab active" data-deal="매매">매매</button>
          <button type="button" class="deal-tab" data-deal="전세">전세</button>
        </div>
        <div class="area-selector" id="area-selector" hidden>
          <h4>면적 선택</h4>
          <div class="area-tabs area-tabs-scroll" id="area-tabs"></div>
        </div>
        <div class="chart-controls">
          <button type="button" class="period-btn active" data-period="all">전체</button>
          <button type="button" class="period-btn" data-period="3y">3년</button>
          <button type="button" class="period-btn" data-period="1y">1년</button>
        </div>
        <p class="chart-hint" hidden></p>
        <div class="chart-wrapper">
          <canvas id="priceChart"></canvas>
        </div>
        <div class="chart-stats">
          <div class="stat-item stat-max">
            <span class="stat-label">최고가</span>
            <span class="stat-value" id="maxPrice">-</span>
          </div>
          <div class="stat-item stat-min">
            <span class="stat-label">최저가</span>
            <span class="stat-value" id="minPrice">-</span>
          </div>
          <div class="stat-item stat-avg">
            <span class="stat-label">평균가</span>
            <span class="stat-value" id="avgPrice">-</span>
          </div>
        </div>
      </section>
    `;
  }

  global.RealEstatePriceChart = {
    getChartSectionHtml,
    initChart,
    updateChartPeriod,
    updateChartArea,
    updateChartDealType,
    getCurrentDealType,
    getCurrentArea: () => currentArea,
    getCurrentAreaGroups: () => currentAreaGroups,
    setAreaGroups,
    setSidebarAreaTabs,
    destroyChart,
    formatAmount,
    toPyeong,
    filterByArea,
  };
})(window);
