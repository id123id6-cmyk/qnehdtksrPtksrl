/**
 * D-day 계산기 — 복리 + 대출(LTV) 기반 매수 시점 계산
 */
(function () {
  "use strict";

  const LOAN_RATE = 0.04;
  const LOAN_YEARS = 30;
  const MAX_MONTHS = 50 * 12;

  const params = new URLSearchParams(window.location.search);
  const aptName = params.get("apt") || "";
  const dong = params.get("dong") || "";
  const priceParam = parseInt(params.get("price") || "0", 10);
  const sigungu = params.get("sigungu") || "11680";
  const aptId = params.get("apt_id") || "";

  let chartInstance = null;
  let lastResult = null;

  const els = {
    aptHeader: document.getElementById("dday-apt-header"),
    aptEmpty: document.getElementById("dday-empty"),
    aptTitle: document.getElementById("apt-title"),
    aptLocation: document.getElementById("apt-location"),
    aptPriceDisplay: document.getElementById("apt-price-display"),
    backMap: document.getElementById("back-map"),
    targetPrice: document.getElementById("target-price"),
    currentAssets: document.getElementById("current-assets"),
    monthlySave: document.getElementById("monthly-save"),
    rateRadios: document.querySelectorAll('input[name="rate-type"]'),
    customRate: document.getElementById("custom-rate"),
    ltvSlider: document.getElementById("ltv-slider"),
    ltvValue: document.getElementById("ltv-value"),
    calcBtn: document.getElementById("calc-btn"),
    resultCard: document.getElementById("result-card"),
    resultDuration: document.getElementById("result-duration"),
    resultDate: document.getElementById("result-date"),
    resultAssets: document.getElementById("result-assets"),
    resultLoan: document.getElementById("result-loan"),
    simSlider: document.getElementById("sim-slider"),
    simValue: document.getElementById("sim-value"),
    simResult: document.getElementById("sim-result"),
    compareBox: document.getElementById("compare-box"),
    copyUrlBtn: document.getElementById("copy-url-btn"),
    layout: document.getElementById("dday-layout"),
    chartCanvas: document.getElementById("growth-chart"),
  };

  init();

  function init() {
    bindEvents();
    if (aptName && priceParam > 0) {
      showAptHeader();
      els.targetPrice.value = priceParam;
      els.aptEmpty.hidden = true;
      els.aptHeader.hidden = false;
    } else {
      els.aptEmpty.hidden = false;
      els.aptHeader.hidden = true;
    }
    updateLtvLabel();
  }

  function bindEvents() {
    els.ltvSlider?.addEventListener("input", updateLtvLabel);
    els.calcBtn?.addEventListener("click", onCalculate);
    els.simSlider?.addEventListener("input", onSimSlider);
    els.copyUrlBtn?.addEventListener("click", copyShareUrl);
    els.backMap.href = aptId
      ? `../realestate-map/?apt_id=${encodeURIComponent(aptId)}`
      : "../realestate-map/";

    els.rateRadios.forEach((r) => {
      r.addEventListener("change", () => {
        els.customRate.disabled = r.value !== "custom";
      });
    });
  }

  function showAptHeader() {
    els.aptTitle.textContent = aptName;
    els.aptLocation.textContent = `강남구 ${dong}`;
    els.aptPriceDisplay.textContent = formatAmount(priceParam);
  }

  function updateLtvLabel() {
    const v = els.ltvSlider.value;
    els.ltvValue.textContent = `${v}% (LTV)`;
  }

  function getAnnualRate() {
    const selected = document.querySelector('input[name="rate-type"]:checked');
    if (!selected) return 0.05;
    if (selected.value === "custom") {
      return (parseFloat(els.customRate.value) || 0) / 100;
    }
    return parseFloat(selected.value) / 100;
  }

  function readInputs() {
    const targetPrice = parseFloat(els.targetPrice.value) || 0;
    const currentAssets = parseFloat(els.currentAssets.value) || 0;
    const monthlySave = parseFloat(els.monthlySave.value) || 0;
    const annualRate = getAnnualRate();
    const ltv = parseInt(els.ltvSlider.value, 10) / 100;

    return { targetPrice, currentAssets, monthlySave, annualRate, ltv };
  }

  function futureValue(pv, pmt, monthlyRate, months) {
    if (months <= 0) return pv;
    if (monthlyRate === 0) return pv + pmt * months;
    const factor = Math.pow(1 + monthlyRate, months);
    return pv * factor + pmt * ((factor - 1) / monthlyRate);
  }

  function findMonthsToTarget(input) {
    const { targetPrice, currentAssets, monthlySave, annualRate, ltv } = input;
    const requiredEquity = targetPrice * (1 - ltv);
    const monthlyRate = annualRate / 12;

    if (currentAssets >= requiredEquity) {
      return { months: 0, requiredEquity, fv: currentAssets };
    }

    for (let n = 1; n <= MAX_MONTHS; n++) {
      const fv = futureValue(currentAssets, monthlySave, monthlyRate, n);
      if (fv >= requiredEquity) {
        return { months: n, requiredEquity, fv };
      }
    }

    return { months: null, requiredEquity, fv: null };
  }

  function monthlyLoanPayment(principalMan) {
    const principal = principalMan * 10000;
    const r = LOAN_RATE / 12;
    const n = LOAN_YEARS * 12;
    if (principal <= 0) return { monthly: 0, totalInterest: 0 };
    const monthly = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPaid = monthly * n;
    return {
      monthly: Math.round(monthly / 10000),
      totalInterest: Math.round((totalPaid - principal) / 10000),
    };
  }

  function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function formatDuration(months) {
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y && m) return `${y}년 ${m}개월`;
    if (y) return `${y}년`;
    return `${m}개월`;
  }

  function formatAmount(amountMan) {
    if (amountMan == null || isNaN(amountMan)) return "-";
    const n = Math.round(amountMan);
    if (n >= 10000) {
      const eok = Math.floor(n / 10000);
      const man = n % 10000;
      if (man) return `${eok}억 ${man.toLocaleString()}만원`;
      return `${eok}억원`;
    }
    return `${n.toLocaleString()}만원`;
  }

  function formatDateKR(date) {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  }

  function daysUntil(date) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  }

  function onCalculate() {
    const input = readInputs();

    if (input.targetPrice <= 0) {
      alert("목표 금액을 입력해 주세요.");
      return;
    }
    if (input.currentAssets <= 0) {
      alert("현재 자산을 입력해 주세요.");
      return;
    }
    if (input.monthlySave <= 0) {
      alert("월 저축액을 입력해 주세요.");
      return;
    }

    const { months, requiredEquity, fv } = findMonthsToTarget(input);

    if (months === null) {
      alert("입력하신 조건으로는 50년 내 매수가 어렵습니다. 월 저축액이나 수익률을 조정해 보세요.");
      return;
    }

    const targetDate = addMonths(new Date(), months);
    const loanAmount = Math.round(input.targetPrice * input.ltv);
    const loanInfo = monthlyLoanPayment(loanAmount);
    const totalBuyingPower = Math.round(fv + loanAmount);

    lastResult = { ...input, months, requiredEquity, fv, targetDate, loanAmount, loanInfo, totalBuyingPower };
    renderResult(lastResult);
    setupSimulation(lastResult);
    setupCompare(lastResult);
    renderChart(lastResult);

    els.resultCard.hidden = false;
    els.layout.classList.add("has-result");
    els.resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderResult(r) {
    const dday = daysUntil(r.targetDate);

    els.resultDuration.textContent =
      r.months === 0 ? "지금 바로 가능!" : `${formatDuration(r.months)} 후`;

    els.resultDate.textContent =
      r.months === 0
        ? "자기자본이 이미 충분합니다"
        : `${formatDateKR(r.targetDate)} (D-${dday.toLocaleString()}일)`;

    els.resultAssets.innerHTML = `
      <li>총 자산: <span class="highlight">${formatAmount(Math.round(r.fv))}</span></li>
      <li>자기자본: ${formatAmount(Math.round(r.fv))}</li>
      <li>추가 대출 (LTV ${Math.round(r.ltv * 100)}%): ${formatAmount(r.loanAmount)}</li>
      <li>= 총 매수 가능: <span class="highlight">${formatAmount(r.totalBuyingPower)}</span> ✅</li>
    `;

    els.resultLoan.innerHTML = `
      <li>대출 원금: ${formatAmount(r.loanAmount)}</li>
      <li>월 상환액 (${LOAN_YEARS}년, ${LOAN_RATE * 100}%): 약 ${r.loanInfo.monthly.toLocaleString()}만원</li>
      <li>총 이자: 약 ${formatAmount(r.loanInfo.totalInterest)}</li>
    `;
  }

  function setupSimulation(r) {
    els.simSlider.min = Math.max(10, Math.round(r.monthlySave * 0.5));
    els.simSlider.max = Math.round(r.monthlySave * 3) || 500;
    els.simSlider.value = r.monthlySave;
    els.simValue.textContent = `${r.monthlySave}만원`;
    onSimSlider();
  }

  function onSimSlider() {
    if (!lastResult) return;
    const newSave = parseInt(els.simSlider.value, 10);
    els.simValue.textContent = `${newSave}만원`;

    const trial = { ...lastResult, monthlySave: newSave };
    const { months } = findMonthsToTarget(trial);

    if (months === null) {
      els.simResult.textContent = "이 저축액으로는 50년 내 매수가 어렵습니다.";
      return;
    }

    const diff = lastResult.months - months;
    if (diff > 0) {
      els.simResult.textContent = `${formatDuration(diff)} 빨라져서 ${formatDuration(months)} 후!`;
    } else if (diff < 0) {
      els.simResult.textContent = `${formatDuration(-diff)} 늦어져서 ${formatDuration(months)} 후`;
    } else {
      els.simResult.textContent = `현재와 동일하게 ${formatDuration(months)} 후`;
    }
  }

  function setupCompare(r) {
    const scenarios = [
      {
        label: "💡 저축액 100만원 더 늘리면?",
        patch: { monthlySave: r.monthlySave + 100 },
      },
      {
        label: "💡 수익률 1% 더 높이면?",
        patch: { annualRate: r.annualRate + 0.01 },
      },
      {
        label: "💡 대출 70% 활용하면?",
        patch: { ltv: 0.7 },
      },
    ];

    els.compareBox.innerHTML = scenarios
      .map(
        (s, i) =>
          `<button type="button" class="dday-compare-btn" data-idx="${i}">${s.label}</button>`
      )
      .join("");

    els.compareBox.querySelectorAll(".dday-compare-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = scenarios[parseInt(btn.dataset.idx, 10)];
        const trial = { ...r, ...s.patch };
        const { months } = findMonthsToTarget(trial);
        if (months === null) {
          alert("이 조건으로는 50년 내 매수가 어렵습니다.");
          return;
        }
        const diff = r.months - months;
        let msg = `${formatDuration(months)} 후 매수 가능`;
        if (diff > 0) msg += ` (${formatDuration(diff)} 단축)`;
        else if (diff < 0) msg += ` (${formatDuration(-diff)} 증가)`;
        alert(msg);
      });
    });
  }

  function renderChart(r) {
    if (!els.chartCanvas || typeof Chart === "undefined") return;

    const monthlyRate = r.annualRate / 12;
    const labels = [];
    const data = [];
    const step = Math.max(1, Math.floor(r.months / 12)) || 1;

    for (let n = 0; n <= r.months; n += step) {
      const year = new Date().getFullYear() + Math.floor(n / 12);
      labels.push(n === 0 ? "현재" : `${year}`);
      data.push(Math.round(futureValue(r.currentAssets, r.monthlySave, monthlyRate, n)));
    }
    if (r.months > 0 && labels[labels.length - 1] !== formatDateKR(r.targetDate).slice(0, 5)) {
      labels.push(formatDateKR(r.targetDate));
      data.push(Math.round(r.fv));
    }

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(els.chartCanvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "자기자본 누적 (만원)",
            data,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: {
              callback: (v) => (v >= 10000 ? `${v / 10000}억` : v),
            },
          },
        },
      },
    });
  }

  function copyShareUrl() {
    const input = readInputs();
    const q = new URLSearchParams({
      apt: aptName,
      dong,
      price: String(input.targetPrice),
      sigungu,
      apt_id: aptId,
      assets: String(input.currentAssets),
      save: String(input.monthlySave),
      ltv: String(Math.round(input.ltv * 100)),
      rate: String(Math.round(input.annualRate * 100)),
    });
    const url = `${window.location.origin}${window.location.pathname}?${q.toString()}`;
    navigator.clipboard
      .writeText(url)
      .then(() => alert("URL이 복사되었습니다."))
      .catch(() => prompt("아래 URL을 복사하세요:", url));
  }

  // URL에서 추가 파라미터 복원
  const assets = params.get("assets");
  const save = params.get("save");
  const ltv = params.get("ltv");
  const rate = params.get("rate");
  if (assets) els.currentAssets.value = assets;
  if (save) els.monthlySave.value = save;
  if (ltv) els.ltvSlider.value = ltv;
  if (rate) {
    const custom = document.querySelector('input[name="rate-type"][value="custom"]');
    if (custom) {
      custom.checked = true;
      els.customRate.disabled = false;
      els.customRate.value = rate;
    }
  }
  updateLtvLabel();
})();
