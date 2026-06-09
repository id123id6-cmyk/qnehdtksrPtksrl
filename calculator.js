// 계산 관련 핵심 로직 및 UI 제어 스크립트

// 사이트 공유 URL (배포 도메인)
const SITE_URL = "https://myaptcalc.com";
const OG_IMAGE_URL = `${SITE_URL}/images/og-image.png`;

// 4대보험 요율 (근로자 부담분 합산 근사치)
const SOCIAL_INSURANCE_RATE = 0.0932;

// 실수령 기반 상환 여력 시나리오 (여유 → 적정 → 빠듯, 부담 낮음→높음)
const AFFORD_SCENARIOS = [
  {
    key: "stable",
    label: "🟢 여유",
    shortLabel: "여유",
    ratio: 0.3,
    badge: null,
    description: "💎 저축과 투자 여력도 확보 가능한 수준",
    levelClass: "level-comfort",
  },
  {
    key: "moderate",
    label: "🟡 적정",
    shortLabel: "적정",
    ratio: 0.4,
    badge: "⭐ 추천",
    description: "✅ 일반적으로 권장되는 무난한 수준입니다",
    levelClass: "level-moderate",
  },
  {
    key: "aggressive",
    label: "🔴 빠듯",
    shortLabel: "빠듯",
    ratio: 0.5,
    badge: null,
    description: "⚠️ 금리 인상이나 비상지출 시 위험할 수 있어요",
    levelClass: "level-tight",
  },
];

// 마지막 계산 입력값 (시나리오 변경 시 재계산용)
let lastCalculationInput = null;

// LTV 오개념 교정 박스 · 생애최초 모달용 컨텍스트
let lastLtvMisconceptionContext = null;

// 교정 박스 → reverse 자동 이동 중 (탭 클릭 핸들러가 안내 배지를 지우지 않도록)
let pendingAutoJump = false;

// LTV 디버그 모드: URL에 ?debug=ltv 추가 시 콘솔 로그·통합 테스트 실행
const DEBUG_LTV =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debug") === "ltv";

// ── 금액 입력 공통 유틸 (만원 단위) ──

function formatToKorean(manwon) {
  const num = Math.abs(parseInt(manwon, 10));
  if (!num || num === 0) return "";

  const eok = Math.floor(num / 10000);
  const restMan = num % 10000;
  let result = "";

  if (eok > 0) {
    result += `${eok.toLocaleString("ko-KR")}억`;
  }

  if (restMan > 0) {
    if (eok > 0) result += " ";
    result += `${restMan.toLocaleString("ko-KR")}만원`;
  } else if (eok > 0) {
    result += "원";
  }

  return result;
}

function addComma(value) {
  const numStr = value.toString().replace(/[^\d]/g, "");
  if (!numStr) return "";
  return parseInt(numStr, 10).toLocaleString("ko-KR");
}

function removeComma(value) {
  return parseInt(value.toString().replace(/[^\d]/g, ""), 10) || 0;
}

function getAmountValue(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return 0;
  return removeComma(input.value);
}

function updateAmountHint(inputId, hintId, numValue, options = {}) {
  const hint = document.getElementById(hintId);
  if (!hint) return;

  if (options.max && numValue > options.max) {
    hint.textContent = `⚠️ 최대 ${formatToKorean(options.max)}까지 입력 가능합니다`;
    hint.classList.add("error");
    hint.classList.remove("empty");
    return;
  }

  if (numValue > 0) {
    hint.textContent = `💡 ${formatToKorean(numValue)}`;
    hint.classList.remove("empty", "error");
    return;
  }

  if (options.zeroError && numValue === 0 && options.hasInput) {
    hint.textContent = "⚠️ 0보다 큰 금액을 입력해주세요";
    hint.classList.add("error");
    hint.classList.remove("empty");
    return;
  }

  hint.textContent = options.placeholder || "금액을 입력해주세요";
  hint.classList.add("empty");
  hint.classList.remove("error");
}

function setAmountValue(inputId, value, hintId, options = {}) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const num = Number(value) || 0;
  input.value = num > 0 ? num.toLocaleString("ko-KR") : "";

  const resolvedHintId =
    hintId || (inputId === "quickReversePrice" ? "quickReverseHint" : `${inputId}Hint`);
  updateAmountHint(inputId, resolvedHintId, num, options);
  updateFormButtonStates();
}

function updateFormButtonStates() {
  const calcBtn = document.getElementById("calculate-btn");
  const reverseBtn = document.getElementById("reverseCalculateBtn");
  const income = getAmountValue("annualIncome");
  const cash = getAmountValue("cash");
  const target = getAmountValue("targetPrice");

  if (calcBtn) calcBtn.disabled = income <= 0 || cash <= 0;
  if (reverseBtn) reverseBtn.disabled = target <= 0;
}

function setupAmountInput(inputId, hintId, options = {}) {
  const input = document.getElementById(inputId);
  const hint = document.getElementById(hintId);
  if (!input || !hint) return;

  if (input.dataset.amountInitialized === "true") return;
  input.dataset.amountInitialized = "true";

  hint.textContent = options.placeholder || "금액을 입력해주세요";
  hint.classList.add("empty");

  input.addEventListener("input", (e) => {
    const el = e.target;
    const selectionStart = el.selectionStart;
    const digitsBefore = el.value
      .slice(0, selectionStart)
      .replace(/[^\d]/g, "").length;

    const formatted = addComma(el.value);
    el.value = formatted;

    let newPos = 0;
    let digitCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) digitCount++;
      if (digitCount >= digitsBefore) {
        newPos = i + 1;
        break;
      }
    }
    el.setSelectionRange(newPos, newPos);

    const numValue = removeComma(formatted);
    const hintOptions = {
      ...options,
      zeroError: options.zeroError !== false && options.required,
      hasInput: formatted.length > 0,
    };
    updateAmountHint(inputId, hintId, numValue, hintOptions);
    updateFormButtonStates();
  });

  input.addEventListener("blur", () => {
    const numValue = removeComma(input.value);
    if (numValue > 0) {
      input.value = numValue.toLocaleString("ko-KR");
    }
  });
}

function setupAllAmountInputs() {
  setupAmountInput("annualIncome", "annualIncomeHint", {
    placeholder: "예: 4,800 (= 4,800만원)",
    max: 100000,
    required: true,
    zeroError: true,
  });
  setupAmountInput("cash", "cashHint", {
    placeholder: "예: 8,000 (= 8,000만원)",
    max: 500000,
    required: true,
    zeroError: true,
  });
  setupAmountInput("existingDebt", "existingDebtHint", {
    placeholder: "없으면 0 또는 비워두세요",
    max: 10000,
  });
  setupAmountInput("targetPrice", "targetPriceHint", {
    placeholder: "예: 50,000 (= 5억)",
    max: 1000000,
    required: true,
    zeroError: true,
  });
  setupAmountInput("reverseCash", "reverseCashHint", {
    placeholder: "보유 현금 (선택)",
    max: 500000,
  });

  updateFormButtonStates();
}

// LTV 단일 진실 소스 (Single Source of Truth)
const LTV_RATES = {
  regulated: {
    noHouse: 0.5,
    multiHouse: 0,
    firstTime: 0.8,
  },
  normal: {
    noHouse: 0.7,
    multiHouse: 0.6,
    firstTime: 0.8,
  },
};

const REGION_LABELS = {
  regulated: "규제지역",
  normal: "비규제지역",
};

// 라디오 value → regionKey 변환 (non_regulated → normal)
function parseRegionKey(radioValue) {
  return radioValue === "regulated" ? "regulated" : "normal";
}

function getHomeStatusKey(homeStatus) {
  return homeStatus === "multi" ? "multiHouse" : "noHouse";
}

function getHomeStatusLabel(homeStatus) {
  if (homeStatus === "multi") return "다주택자";
  if (homeStatus === "one_dispose") return "1주택 처분조건";
  return "무주택";
}

// 2026년 LTV 한도 — regionKey: "regulated" | "normal"
function getLTV(homeStatus, regionKey) {
  const statusKey = getHomeStatusKey(homeStatus);
  const rates = LTV_RATES[regionKey];
  const ltv = rates ? rates[statusKey] : 0;

  if (DEBUG_LTV) {
    console.log(
      "[DEBUG getLTV] homeStatus:",
      homeStatus,
      "regionKey:",
      regionKey,
      "statusKey:",
      statusKey,
      "returned LTV:",
      ltv
    );
  }

  return ltv;
}

// LTV 한도 병목 안내 문구 (지역명·비율 모두 동일 소스에서 파생)
function generateLTVLimitMessage(
  regionKey,
  homeStatus,
  maxLoanByLTV,
  maxLoanByDSR
) {
  const ltv = getLTV(homeStatus, regionKey);
  const regionLabel = REGION_LABELS[regionKey];

  if (DEBUG_LTV) {
    console.log(
      "[DEBUG generateLTVLimitMessage] regionKey:",
      regionKey,
      "ltv:",
      ltv,
      "regionLabel:",
      regionLabel,
      "maxLoanByLTV:",
      maxLoanByLTV,
      "maxLoanByDSR:",
      maxLoanByDSR
    );
  }

  if (ltv === 0) {
    if (regionKey === "regulated" && homeStatus === "multi") {
      return `${regionLabel} 다주택자 LTV 0% 한도에 막혀 매수가가 제한됩니다.`;
    }
    return `${regionLabel} LTV 0% 한도에 막혀 자기자본만으로 매수 가능합니다.`;
  }

  if (maxLoanByLTV <= maxLoanByDSR) {
    return `${regionLabel} LTV ${Math.round(ltv * 100)}% 한도에 막혀 매수가가 제한됩니다.`;
  }

  return "DSR(스트레스 DSR) 한도에 막혀 매수가가 제한됩니다.";
}

// 결과 하단 적용 기준 안내
function getAppliedCriteriaText(regionKey, homeStatus) {
  const ltv = getLTV(homeStatus, regionKey);
  return `💡 적용 기준: ${REGION_LABELS[regionKey]} LTV ${Math.round(ltv * 100)}% (${getHomeStatusLabel(homeStatus)} 기준)`;
}

// regionKey → 라디오 value (regulated | non_regulated)
function regionKeyToRadioValue(regionKey) {
  return regionKey === "regulated" ? "regulated" : "non_regulated";
}

// URL 파라미터 region → 라디오 value
function parseRegionParam(param) {
  if (!param) return "regulated";
  if (param === "normal" || param === "non_regulated") return "non_regulated";
  return "regulated";
}

// 빠른 선택 프리셋 라벨 (만원 → "3억", "3.3억")
function formatPresetLabel(priceMan) {
  const eok = priceMan / 10000;
  if (Number.isInteger(eok)) return `${eok}억`;
  return `${parseFloat(eok.toFixed(1))}억`;
}

// LTV 한도 ~ 빠듯형 감당한도 사이 추천 가격 (만원)
function generateQuickReversePresets(minPriceWon, maxPriceWon, count = 5) {
  let minMan = Math.ceil(minPriceWon / 10000 / 1000) * 1000;
  let maxMan = Math.floor(maxPriceWon / 10000 / 1000) * 1000;

  if (minMan < 1000) minMan = 1000;
  if (maxMan < minMan) maxMan = minMan;

  if (maxMan - minMan < 2000) {
    const mid = Math.round((minMan + maxMan) / 2 / 1000) * 1000;
    return [...new Set([minMan, mid, maxMan].filter((p) => p >= 1000))];
  }

  const presets = [];
  for (let i = 0; i < count; i++) {
    const ratio = count === 1 ? 0 : i / (count - 1);
    const man = Math.round((minMan + (maxMan - minMan) * ratio) / 1000) * 1000;
    presets.push(man);
  }

  return [...new Set(presets)].slice(0, count);
}

function fillReverseForm({
  priceMan,
  regionValue,
  homeStatus,
  cashMan,
  loanYears,
  baseRate,
}) {
  setAmountValue("targetPrice", priceMan, "targetPriceHint", {
    placeholder: "예: 50,000 (= 5억)",
    max: 1000000,
    required: true,
  });

  const reverseForm = document.getElementById("reverse-calculator-form");
  const regionRadio = reverseForm?.querySelector(
    `input[name="reverseRegion"][value="${regionValue}"]`
  );
  if (regionRadio) regionRadio.checked = true;

  const homeRadio = reverseForm?.querySelector(
    `input[name="reverseHomeStatus"][value="${homeStatus}"]`
  );
  if (homeRadio) homeRadio.checked = true;

  if (cashMan !== undefined && cashMan !== "") {
    setAmountValue("reverseCash", cashMan, "reverseCashHint", {
      placeholder: "보유 현금 (선택)",
      max: 500000,
    });
  }

  if (loanYears) {
    const yearsSelect = document.getElementById("reverseLoanYears");
    if (yearsSelect) yearsSelect.value = String(loanYears);
  }

  if (baseRate) {
    const rateInput = document.getElementById("reverseInterestRate");
    if (rateInput) rateInput.value = baseRate;
  }
}

function showAutoJumpNotice(priceMan) {
  const notice = document.getElementById("autoJumpNotice");
  const priceEl = document.getElementById("autoJumpPrice");
  if (priceEl) {
    priceEl.textContent = priceMan.toLocaleString("ko-KR");
  }
  if (notice) notice.hidden = false;
}

function hideAutoJumpNotice() {
  const notice = document.getElementById("autoJumpNotice");
  if (notice) notice.hidden = true;
}

// 교정 박스·프리셋 → reverse 탭 자연스러운 이동 (탭 버튼 click과 동일)
function jumpToReverseTab(priceMan, options = {}) {
  if (!priceMan || priceMan < 1000) {
    alert("아파트 금액을 정확히 입력해주세요. (만원 단위)");
    return;
  }

  const forwardForm = document.getElementById("calculator-form");
  const region =
    options.regionValue ??
    forwardForm?.querySelector("input[name='region']:checked")?.value;
  const homeStatus =
    options.homeStatus ??
    forwardForm?.querySelector("input[name='homeStatus']:checked")?.value;
  const cash = options.cashMan ?? getAmountValue("cash") ?? "";
  const loanYears =
    options.loanYears ?? document.getElementById("loanYears")?.value;
  const baseRate =
    options.baseRate ?? document.getElementById("interestRate")?.value;
  const showNotice = options.fromForward !== false;

  pendingAutoJump = true;

  const reverseTabBtn =
    document.querySelector('[data-tab="reverse"]') ||
    document.getElementById("tab-reverse");
  reverseTabBtn?.click();

  window.setTimeout(() => {
    fillReverseForm({
      priceMan,
      regionValue: region || "regulated",
      homeStatus: homeStatus || "none",
      cashMan: cash,
      loanYears,
      baseRate,
    });

    const calcBtn = document.getElementById("reverseCalculateBtn");
    if (calcBtn) {
      calcBtn.click();
    } else {
      runReverseCalculation(collectReverseInput());
    }

    if (showNotice) {
      showAutoJumpNotice(priceMan);
    }

    window.setTimeout(() => {
      const resultEl =
        document.querySelector(".reverse-result") ||
        document.getElementById("reverse-result-section");
      resultEl?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);

    pendingAutoJump = false;
  }, 100);
}

function goBackToForward() {
  hideAutoJumpNotice();

  const forwardTabBtn =
    document.querySelector('[data-tab="forward"]') ||
    document.getElementById("tab-forward");
  forwardTabBtn?.click();

  window.setTimeout(() => {
    const resultEl =
      document.querySelector(".forward-result") ||
      document.getElementById("ltv-misconception-box") ||
      document.getElementById("result-section");
    resultEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

function handleReverseDeepLink() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") !== "reverse") return;

  const priceMan = parseInt(params.get("price"), 10);
  if (!priceMan || priceMan < 1000) return;

  jumpToReverseTab(priceMan, {
    regionValue: parseRegionParam(params.get("region")),
    homeStatus: params.get("house") || "none",
    cashMan: params.get("cash") || "",
    loanYears: params.get("years") || undefined,
    baseRate: params.get("rate") || undefined,
    fromForward: params.get("from") === "forward",
  });
}

function setupQuickReverseBox() {
  const box = document.getElementById("ltv-misconception-box");
  if (!box) return;

  box.addEventListener("click", (event) => {
    const presetBtn = event.target.closest(".quick-preset-btn");
    if (presetBtn) {
      const price = parseInt(presetBtn.dataset.price, 10);
      jumpToReverseTab(price);
      return;
    }

    if (event.target.id === "quickReverseBtn") {
      jumpToReverseTab(getAmountValue("quickReversePrice"));
    }
  });

  box.addEventListener("keydown", (event) => {
    if (event.target.id === "quickReversePrice" && event.key === "Enter") {
      event.preventDefault();
      jumpToReverseTab(getAmountValue("quickReversePrice"));
    }
  });
}

function setupBackToForwardLink() {
  const link = document.getElementById("back-to-forward");
  if (!link) return;

  link.addEventListener("click", (event) => {
    event.preventDefault();
    goBackToForward();
  });
}

// LTV 오개념 교정 박스 표시 여부
function shouldShowLtvMisconceptionBox(
  tightScenario,
  maxPriceByLTV,
  maxLoanByLTV,
  maxLoanByDSRWon,
  ltvRatio,
  bottleneckType
) {
  if (!tightScenario || ltvRatio <= 0) return false;
  if (tightScenario.maxPrice <= maxPriceByLTV) return false;
  if (maxLoanByLTV > maxLoanByDSRWon) return false;
  return bottleneckType === "ltv" || bottleneckType === "ltv_zero";
}

// LTV 오개념 교정 박스 렌더
function renderLtvMisconceptionBox(ctx) {
  const box = document.getElementById("ltv-misconception-box");
  const body = document.getElementById("ltv-misconception-body");
  if (!box || !body) return;

  const {
    tightScenario,
    maxPriceByLTV,
    maxLoanByLTV,
    maxLoanByDSRWon,
    ltvRatio,
    bottleneckType,
    cashWon,
    regionKey,
  } = ctx;

  if (
    !shouldShowLtvMisconceptionBox(
      tightScenario,
      maxPriceByLTV,
      maxLoanByLTV,
      maxLoanByDSRWon,
      ltvRatio,
      bottleneckType
    )
  ) {
    box.hidden = true;
    lastLtvMisconceptionContext = null;
    return;
  }

  const ltvPercent = Math.round(ltvRatio * 100);
  const selfFundPercent = Math.round((1 - ltvRatio) * 100);
  const tightPriceWon = tightScenario.maxPrice;
  const requiredSelfFundWon = tightPriceWon * (1 - ltvRatio);
  const savingsGapWon = Math.max(0, requiredSelfFundWon - cashWon);
  const savingsMonths =
    savingsGapWon > 0 ? Math.ceil(savingsGapWon / 1000000) : 0;
  const firstTimePercent = Math.round(LTV_RATES.regulated.firstTime * 100);
  const firstTimeSelfFundWon = tightPriceWon * (1 - LTV_RATES.regulated.firstTime);

  lastLtvMisconceptionContext = {
    targetPriceWon: tightPriceWon,
    regionKey,
    maxPriceByLTV,
  };

  const defaultPriceMan = Math.round(tightPriceWon / 10000);
  const presets = generateQuickReversePresets(maxPriceByLTV, tightPriceWon);
  const presetButtonsHtml = presets
    .map(
      (p) =>
        `<button type="button" class="quick-preset-btn" data-price="${p}">${formatPresetLabel(p)}</button>`
    )
    .join("");

  const savingsTip =
    savingsMonths > 0
      ? `자기자금 추가 저축 (월 100만원씩 저축 시 약 <strong>${savingsMonths.toLocaleString("ko-KR")}개월</strong> 소요)`
      : "자기자금 추가 저축으로 LTV 한도 내 매수가를 단계적으로 높일 수 있어요";

  body.innerHTML = `
    <p class="ltv-misconception-question">
      월 <strong>${formatMonthly(tightScenario.monthlyPayment)}</strong> 갚을 수 있으면
      <strong>${formatKoreanPrice(tightScenario.maxLoan)}</strong> 빌려서
      <strong>${formatKoreanPrice(tightPriceWon)}</strong> 아파트 가능?
    </p>
    <p class="ltv-misconception-no">❌ NO!</p>
    <p class="ltv-misconception-explain">
      LTV <strong>${ltvPercent}%</strong>는 「대출이 ${ltvPercent}% 나온다」가 아니라
      「매수가의 <strong>${selfFundPercent}%</strong>는 내 돈이어야 한다」예요.
    </p>
    <p class="ltv-misconception-arrow">
      → <strong>${formatKoreanPrice(tightPriceWon)}</strong> 아파트는
      자기자금 <strong>${formatKoreanPrice(requiredSelfFundWon)}</strong> 필요
    </p>
    <p class="ltv-misconception-arrow">
      → 현재 <strong>${formatKoreanPrice(cashWon)}</strong>으론
      <strong>${formatKoreanPrice(maxPriceByLTV)}</strong>가 최대
    </p>
    <div class="ltv-misconception-tips">
      <h4>💡 더 비싼 집을 원한다면:</h4>
      <ul>
        <li>
          생애최초 자격이면 LTV ${firstTimePercent}% 적용 가능
          (이 경우 자기자금 <strong>${formatKoreanPrice(firstTimeSelfFundWon)}</strong>만 있으면 OK)
          <button type="button" class="btn-first-time-check" id="btn-first-time-check">생애최초 자격 체크하기</button>
        </li>
        <li>${savingsTip}</li>
        <li>정책대출(디딤돌/보금자리) 활용 검토</li>
      </ul>
    </div>
    <div class="quick-reverse-box">
      <p class="quick-reverse-header">🎯 직접 확인해보세요!</p>
      <p class="quick-reverse-desc">
        특정 아파트 가격으로 <strong>필요한 자기자금과 연봉</strong>을
        바로 계산해보세요.
      </p>
      <div class="quick-input-group">
        <div class="amount-input-wrapper quick-reverse-amount-wrap">
          <input
            type="text"
            id="quickReversePrice"
            class="amount-input"
            inputmode="numeric"
            placeholder="예: 40,000"
            autocomplete="off"
          >
          <span class="unit-suffix">만원</span>
        </div>
        <button type="button" id="quickReverseBtn">계산하기 →</button>
      </div>
      <div class="amount-hint" id="quickReverseHint"></div>
      <div class="quick-preset">
        <span class="preset-label">💡 또는 빠른 선택 (LTV 한도 ~ 빠듯형 감당한도):</span>
        <div class="preset-buttons">${presetButtonsHtml}</div>
      </div>
    </div>
  `;

  const checkBtn = document.getElementById("btn-first-time-check");
  if (checkBtn) {
    checkBtn.addEventListener("click", openFirstTimeBuyerModal);
  }

  const quickInput = document.getElementById("quickReversePrice");
  if (quickInput) quickInput.dataset.amountInitialized = "false";

  setupAmountInput("quickReversePrice", "quickReverseHint", {
    placeholder: "예: 40,000 (= 4억)",
    max: 1000000,
    required: true,
    zeroError: true,
  });
  setAmountValue("quickReversePrice", defaultPriceMan, "quickReverseHint", {
    placeholder: "예: 40,000 (= 4억)",
    max: 1000000,
    required: true,
  });

  box.hidden = false;
}

// 생애최초 자격 체크 모달 열기
function openFirstTimeBuyerModal() {
  const overlay = document.getElementById("first-time-modal-overlay");
  const priceCheck = document.getElementById("first-time-price-check");
  const result = document.getElementById("first-time-modal-result");
  if (!overlay) return;

  const targetPriceWon =
    lastLtvMisconceptionContext?.targetPriceWon || 0;
  const underNineOk = targetPriceWon > 0 && targetPriceWon <= 900000000;

  if (priceCheck) {
    priceCheck.innerHTML = underNineOk
      ? `✅ 기준 주택가 <strong>${formatKoreanPrice(targetPriceWon)}</strong> — 9억 원 이하입니다.`
      : `❌ 기준 주택가 <strong>${formatKoreanPrice(targetPriceWon)}</strong> — 9억 원을 초과합니다.`;
  }

  if (result) {
    result.hidden = true;
    result.textContent = "";
    result.className = "first-time-modal-result";
  }

  const noRadio = document.querySelector(
    "input[name='firstTimeBoth'][value='no']"
  );
  if (noRadio) noRadio.checked = true;

  overlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeFirstTimeBuyerModal() {
  const overlay = document.getElementById("first-time-modal-overlay");
  if (!overlay) return;
  overlay.hidden = true;
  document.body.style.overflow = "";
}

function runFirstTimeBuyerCheck() {
  const result = document.getElementById("first-time-modal-result");
  if (!result) return;

  const bothFirst = document.querySelector(
    "input[name='firstTimeBoth'][value='yes']"
  )?.checked;
  const targetPriceWon =
    lastLtvMisconceptionContext?.targetPriceWon || 0;
  const underNineOk = targetPriceWon > 0 && targetPriceWon <= 900000000;
  const firstTimePercent = Math.round(LTV_RATES.regulated.firstTime * 100);

  if (bothFirst && underNineOk) {
    result.textContent = `✅ 생애최초 LTV ${firstTimePercent}% 적용 가능 (참고)`;
    result.className = "first-time-modal-result eligible";
  } else {
    const reasons = [];
    if (!bothFirst) reasons.push("본인·배우자 모두 생애 첫 주택 구입 요건 미충족");
    if (!underNineOk) reasons.push("주택가 9억 원 초과");
    result.textContent = `❌ 자격 불가 — ${reasons.join(", ")}`;
    result.className = "first-time-modal-result ineligible";
  }

  result.hidden = false;
}

function setupFirstTimeBuyerModal() {
  const overlay = document.getElementById("first-time-modal-overlay");
  const closeBtn = document.getElementById("first-time-modal-close");
  const checkBtn = document.getElementById("first-time-check-btn");
  if (!overlay) return;

  closeBtn?.addEventListener("click", closeFirstTimeBuyerModal);
  checkBtn?.addEventListener("click", runFirstTimeBuyerCheck);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeFirstTimeBuyerModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) {
      closeFirstTimeBuyerModal();
    }
  });
}

// LTV 통합 테스트 (debug=ltv 시 자동 실행)
function runLtvIntegrationTests() {
  const cases = [
    {
      name: "케이스 A: 비규제 + 무주택 + 현금 1억",
      regionKey: "normal",
      homeStatus: "none",
      cashMan: 10000,
      expectedLtv: 0.7,
      expectedPriceMan: 33333,
    },
    {
      name: "케이스 B: 규제 + 무주택 + 현금 1억",
      regionKey: "regulated",
      homeStatus: "none",
      cashMan: 10000,
      expectedLtv: 0.5,
      expectedPriceMan: 20000,
    },
    {
      name: "케이스 C: 비규제 + 다주택 + 현금 1억",
      regionKey: "normal",
      homeStatus: "multi",
      cashMan: 10000,
      expectedLtv: 0.6,
      expectedPriceMan: 25000,
    },
  ];

  console.group("[LTV 통합 테스트]");
  cases.forEach((c) => {
    const ltv = getLTV(c.homeStatus, c.regionKey);
    const priceMan = Math.round(c.cashMan / (1 - ltv));
    const ltvOk = ltv === c.expectedLtv;
    const priceOk = priceMan === c.expectedPriceMan;
    console.log(
      c.name,
      "| LTV:",
      ltv,
      ltvOk ? "✅" : `❌ (기대 ${c.expectedLtv})`,
      "| 매수가(만원):",
      priceMan,
      priceOk ? "✅" : `❌ (기대 ${c.expectedPriceMan})`,
      "| 안내:",
      generateLTVLimitMessage(c.regionKey, c.homeStatus, 1, 2)
    );
  });
  console.groupEnd();
}

// 스트레스 DSR 적용 금리 계산
function getStressRate(baseRate) {
  return baseRate + 1.5; // 2026년 스트레스 가산 1.5%
}

// 원리금균등 월 상환액 계산
function monthlyPayment(principal, annualRate, years) {
  if (principal <= 0 || years <= 0) return 0;

  const r = annualRate / 100 / 12;
  const n = years * 12;

  if (r === 0) {
    // 무이자 가정 (이자율 0%) 보호 로직
    return principal / n;
  }

  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

// DSR 한도 내 최대 대출금액 역산
// annualIncome: 연소득 (만원 단위)
// existingMonthly: 기존 부채 월 상환액 (만원 단위)
// stressRate: 연이율 (%)
// years: 만기 (년)
function maxLoanByDSR(annualIncome, existingMonthly, stressRate, years) {
  const dsrLimitMonthly = (annualIncome * 10000 * 0.4) / 12; // 월 상환 한도 (원)
  const usedByExisting = existingMonthly * 10000; // 기존 부채 상환액 (원)
  const available = dsrLimitMonthly - usedByExisting; // 남은 여력 (원)

  if (available <= 0) return 0;

  const r = stressRate / 100 / 12;
  const n = years * 12;

  if (r === 0) {
    return available * n; // 무이자 방어
  }

  return (available * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));
}

// 월 상환액으로부터 최대 대출 원금 역산 (원리금균등)
function maxLoanFromMonthlyPayment(payment, annualRate, years) {
  if (payment <= 0 || years <= 0) return 0;

  const r = annualRate / 100 / 12;
  const n = years * 12;

  if (r === 0) {
    return payment * n;
  }

  return (payment * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));
}

// 간이세액표 근사 — 연봉 구간별 근로소득세 (지방세 제외)
// annualGrossWon: 연간 총급여 (원)
function getSimplifiedAnnualTax(annualGrossWon) {
  const man = annualGrossWon / 10000;

  if (man <= 1500) return annualGrossWon * 0.005;
  if (man <= 2000) return annualGrossWon * 0.015;
  if (man <= 3000) return annualGrossWon * 0.03;
  if (man <= 4000) return annualGrossWon * 0.05;
  if (man <= 5000) return annualGrossWon * 0.065;
  if (man <= 6000) return annualGrossWon * 0.08;
  if (man <= 8000) return annualGrossWon * 0.1;
  if (man <= 10000) return annualGrossWon * 0.13;
  if (man <= 15000) return annualGrossWon * 0.16;
  if (man <= 20000) return annualGrossWon * 0.19;
  return annualGrossWon * 0.22;
}

// 연봉(만원) → 월 실수령액(원) 변환
function getMonthlyNet(annualGrossMan) {
  if (!annualGrossMan || annualGrossMan <= 0) return 0;

  const annualGrossWon = annualGrossMan * 10000;
  const socialInsurance = annualGrossWon * SOCIAL_INSURANCE_RATE;
  const incomeTax = getSimplifiedAnnualTax(annualGrossWon);
  const localTax = incomeTax * 0.1; // 지방소득세 10%
  const annualNet = annualGrossWon - socialInsurance - incomeTax - localTax;

  return Math.max(0, annualNet / 12);
}

// 실수령 기반 상환 여력 시나리오 1건 계산
function computeAffordabilityScenario(
  monthlyNet,
  existingMonthlyMan,
  ratio,
  baseRate,
  loanYears,
  cashWon
) {
  const existingWon = existingMonthlyMan * 10000;
  const maxHousingPayment = monthlyNet * ratio;
  const availableForMortgage = Math.max(0, maxHousingPayment - existingWon);
  const maxLoan = maxLoanFromMonthlyPayment(
    availableForMortgage,
    baseRate,
    loanYears
  );

  return {
    ratio,
    maxHousingPayment,
    monthlyPayment: availableForMortgage,
    maxLoan,
    maxPrice: cashWon + maxLoan,
  };
}

// 최종 병목 유형 판별
function getBottleneckType(
  regulatoryLoanWon,
  affordabilityLoanWon,
  maxLoanByLTV,
  maxLoanByDSRWon,
  ltvRatio
) {
  if (affordabilityLoanWon < regulatoryLoanWon) {
    return "affordability";
  }

  if (regulatoryLoanWon < affordabilityLoanWon) {
    if (ltvRatio === 0) return "ltv_zero";
    if (maxLoanByLTV <= maxLoanByDSRWon) return "ltv";
    return "dsr";
  }

  if (ltvRatio === 0) return "ltv_zero";
  if (maxLoanByLTV <= maxLoanByDSRWon) return "ltv";
  return "dsr";
}

// 자기자금 확보 방법 안내 (공통)
function renderFundTipsHtml() {
  return `
    <div class="why-blocked-tips">
      <h4>자기자금을 늘리는 방법</h4>
      <ul>
        <li><strong>추가 저축</strong> — 목표 매수 시점까지 매달 일정 금액을 모으면 LTV 한도 내 매수가가 단계적으로 올라갑니다.</li>
        <li><strong>가족 증여</strong> — 부모·배우자 등으로부터 자금 지원 시 증여세 신고 의무와 공제 한도를 반드시 확인하세요.</li>
        <li><strong>신용대출 활용</strong> — 보유현금을 늘리는 방법이지만, 월 상환액이 DSR에 합산되므로 오히려 주담대 한도가 줄어들 수 있습니다.</li>
      </ul>
    </div>
  `;
}

// 더 비싼 집 매수 시 추가 자기자금 표 (LTV 병목용)
function buildLtvCashIncrementRows(
  currentPriceWon,
  cashWon,
  ltvRatio,
  incrementsWon
) {
  return incrementsWon
    .map((inc) => {
      const targetPrice = currentPriceWon + inc;
      const requiredCash = targetPrice * (1 - ltvRatio);
      const additionalCash = Math.max(0, requiredCash - cashWon);

      return `
        <tr>
          <td>${formatKoreanPrice(targetPrice)}</td>
          <td>+${formatKoreanPrice(inc)}</td>
          <td>${formatKoreanPrice(requiredCash)}</td>
          <td><strong>${formatKoreanPrice(additionalCash)}</strong></td>
        </tr>
      `;
    })
    .join("");
}

// DSR 병목 시 상위 매수가별 필요 상환 여력 표
function buildDsrIncrementRows(
  currentPriceWon,
  cashWon,
  ltvRatio,
  baseRate,
  loanYears,
  annualIncomeMan,
  existingMonthlyMan,
  stressRate,
  incrementsWon
) {
  const dsrLimitMonthly =
    (annualIncomeMan * 10000 * 0.4) / 12 - existingMonthlyMan * 10000;

  return incrementsWon
    .map((inc) => {
      const targetPrice = currentPriceWon + inc;
      const loanByPrice = Math.max(0, targetPrice - cashWon);
      const loanByLtv = targetPrice * ltvRatio;
      const loanNeeded = ltvRatio > 0 ? Math.min(loanByPrice, loanByLtv) : 0;
      const monthlyNeeded = monthlyPayment(loanNeeded, stressRate, loanYears);
      const gap = monthlyNeeded - dsrLimitMonthly;
      const fits = gap <= 0;

      return `
        <tr>
          <td>${formatKoreanPrice(targetPrice)}</td>
          <td>${formatKoreanPrice(loanNeeded)}</td>
          <td>${formatMonthly(monthlyNeeded)}</td>
          <td>${fits ? "✅ 가능" : `❌ ${formatMonthly(gap)} 부족`}</td>
        </tr>
      `;
    })
    .join("");
}

// 감당여력 병목 시 상위 매수가별 필요 월 상환액 표
function buildAffordIncrementRows(
  currentPriceWon,
  cashWon,
  baseRate,
  loanYears,
  allowedMonthly,
  incrementsWon
) {
  return incrementsWon
    .map((inc) => {
      const targetPrice = currentPriceWon + inc;
      const loanNeeded = Math.max(0, targetPrice - cashWon);
      const monthlyNeeded = monthlyPayment(loanNeeded, baseRate, loanYears);
      const gap = monthlyNeeded - allowedMonthly;
      const fits = gap <= 0;

      return `
        <tr>
          <td>${formatKoreanPrice(targetPrice)}</td>
          <td>${formatKoreanPrice(loanNeeded)}</td>
          <td>${formatMonthly(monthlyNeeded)}</td>
          <td>${fits ? "✅ 여유" : `❌ ${formatMonthly(gap)} 초과`}</td>
        </tr>
      `;
    })
    .join("");
}

// 병목 유형별 상세 설명 HTML 생성
function renderWhyBlockedExplanation(ctx) {
  const body = document.getElementById("why-blocked-body");
  if (!body) return;

  const incrementsWon = [50000000, 100000000, 150000000];
  const {
    bottleneckType,
    cashWon,
    cashMan,
    ltvRatio,
    regionKey,
    homeStatus,
    totalPriceWon,
    maxPriceByLTV,
    maxLoanByLTV,
    maxLoanByDSRWon,
    annualIncomeMan,
    existingMonthlyMan,
    loanYears,
    baseRate,
    stressRate,
    monthlyNet,
    selectedScenario,
  } = ctx;

  const regionLabel = REGION_LABELS[regionKey];
  const ltvPercent = Math.round(ltvRatio * 100);
  const homeStatusLabel = getHomeStatusLabel(homeStatus);

  let html = "";

  if (bottleneckType === "ltv" || bottleneckType === "ltv_zero") {
    const ltvExplain =
      bottleneckType === "ltv_zero"
        ? `${regionLabel} ${homeStatusLabel}은(는) 주담대 LTV가 <strong>0%</strong>라 대출 없이 자기자본만으로 매수할 수 있습니다.`
        : `${regionLabel} ${homeStatusLabel} 기준 LTV는 <strong>${ltvPercent}%</strong>입니다. 즉, 아파트 가격의 ${ltvPercent}%까지만 대출받을 수 있고, 나머지 ${100 - ltvPercent}%는 자기자금이어야 합니다.`;

    html = `
      <div class="why-blocked-section">
        <h4>LTV(주택담보대출비율)란?</h4>
        <p>${ltvExplain}</p>
        <p class="why-formula">매수 가능 가격 = 보유현금 ÷ (1 − LTV)</p>
      </div>
      <div class="why-blocked-section">
        <h4>내 경우 실제 계산</h4>
        <ul class="why-calc-steps">
          <li>보유 현금: <strong>${formatKoreanPrice(cashWon)}</strong> (${cashMan.toLocaleString("ko-KR")}만원)</li>
          <li>적용 LTV: <strong>${ltvPercent}%</strong> (${regionLabel}, ${homeStatusLabel})</li>
          ${
            ltvRatio > 0
              ? `<li>계산: ${formatKoreanPrice(cashWon)} ÷ (1 − ${ltvPercent}%) = ${formatKoreanPrice(cashWon)} ÷ ${(1 - ltvRatio).toFixed(2)} = <strong>${formatKoreanPrice(maxPriceByLTV)}</strong></li>
          <li>대출 가능액: ${formatKoreanPrice(maxPriceByLTV)} − ${formatKoreanPrice(cashWon)} = <strong>${formatKoreanPrice(maxLoanByLTV)}</strong></li>`
              : `<li>대출 불가 → 매수 가능 가격 = 보유 현금 <strong>${formatKoreanPrice(cashWon)}</strong></li>`
          }
          <li>DSR 한도 대출: ${formatKoreanPrice(maxLoanByDSRWon)} → LTV가 더 작아 <strong>LTV 기준</strong>이 최종 한도</li>
        </ul>
      </div>
    `;

    if (ltvRatio > 0) {
      html += `
        <div class="why-blocked-section">
          <h4>더 비싼 집을 사려면 자기자금이 얼마나 더 필요할까요?</h4>
          <p class="why-blocked-note">아래는 현재 매수가(${formatKoreanPrice(totalPriceWon)})에서 단계적으로 올렸을 때, LTV 규제만 고려한 추가 자기자금입니다.</p>
          <div class="table-wrapper">
            <table class="why-blocked-table">
              <thead>
                <tr>
                  <th>목표 매수가</th>
                  <th>현재 대비</th>
                  <th>필요 자기자금</th>
                  <th>추가 필요액</th>
                </tr>
              </thead>
              <tbody>
                ${buildLtvCashIncrementRows(totalPriceWon, cashWon, ltvRatio, incrementsWon)}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    html += renderFundTipsHtml();
  } else if (bottleneckType === "dsr") {
    const dsrLimitMonthly = (annualIncomeMan * 10000 * 0.4) / 12;
    const existingWon = existingMonthlyMan * 10000;
    const availableMonthly = Math.max(0, dsrLimitMonthly - existingWon);

    html = `
      <div class="why-blocked-section">
        <h4>DSR(총부채원리금상환비율)이란?</h4>
        <p>연소득의 <strong>40%</strong>를 모든 대출 월 상환액의 상한으로 봅니다. 2026년 스트레스 DSR 규제에 따라 심사 시 금리 <strong>${baseRate}% + 1.5%p = ${stressRate.toFixed(1)}%</strong>로 상환 능력을 평가합니다.</p>
      </div>
      <div class="why-blocked-section">
        <h4>내 경우 실제 계산</h4>
        <ul class="why-calc-steps">
          <li>연소득: <strong>${annualIncomeMan.toLocaleString("ko-KR")}만원</strong> → 월 DSR 한도: ${formatMonthly(dsrLimitMonthly)} (연소득×40%÷12)</li>
          <li>기존 부채 월 상환: <strong>${formatMonthly(existingWon)}</strong></li>
          <li>주담대에 쓸 수 있는 월 상환 여력: ${formatMonthly(dsrLimitMonthly)} − ${formatMonthly(existingWon)} = <strong>${formatMonthly(availableMonthly)}</strong></li>
          <li>스트레스 금리 ${stressRate.toFixed(1)}%, ${loanYears}년 만기 역산 → 최대 대출 <strong>${formatKoreanPrice(maxLoanByDSRWon)}</strong></li>
          <li>LTV 한도 대출: ${formatKoreanPrice(maxLoanByLTV)} → <strong>DSR이 더 작아</strong> DSR 기준이 최종 한도</li>
        </ul>
      </div>
      <div class="why-blocked-section">
        <h4>더 비싼 집을 사려면?</h4>
        <p class="why-blocked-note">매수가를 올리면 필요 대출·월 상환이 늘어납니다. 스트레스 DSR 기준 월 한도(${formatMonthly(availableMonthly)})를 넘으면 대출이 어렵습니다.</p>
        <div class="table-wrapper">
          <table class="why-blocked-table">
            <thead>
              <tr>
                <th>목표 매수가</th>
                <th>필요 대출</th>
                <th>월 상환(스트레스)</th>
                <th>DSR 여력</th>
              </tr>
            </thead>
            <tbody>
              ${buildDsrIncrementRows(
                totalPriceWon,
                cashWon,
                ltvRatio,
                baseRate,
                loanYears,
                annualIncomeMan,
                existingMonthlyMan,
                stressRate,
                incrementsWon
              )}
            </tbody>
          </table>
        </div>
        <p class="why-blocked-note">💡 기존 신용대출을 줄이거나, 공동명의·배우자 소득 합산(은행 심사 기준) 등으로 DSR 여력을 늘릴 수 있습니다.</p>
      </div>
      ${renderFundTipsHtml()}
    `;
  } else {
    const existingWon = existingMonthlyMan * 10000;
    const allowedMonthly = Math.max(
      0,
      monthlyNet * selectedScenario.ratio - existingWon
    );

    html = `
      <div class="why-blocked-section">
        <h4>실수령 기반 감당 여력이란?</h4>
        <p>금융 규제 한도와 별개로, 매달 실제 통장에 들어오는 돈(실수령액) 대비 주거비 비율로 상환 가능 범위를 봅니다. 선택하신 <strong>${selectedScenario.shortLabel || selectedScenario.label}(${Math.round(selectedScenario.ratio * 100)}%)</strong> 기준입니다.</p>
      </div>
      <div class="why-blocked-section">
        <h4>내 경우 실제 계산</h4>
        <ul class="why-calc-steps">
          <li>월 실수령액(추정): <strong>${formatMonthly(monthlyNet)}</strong></li>
          <li>${selectedScenario.shortLabel || selectedScenario.label} 주거비 한도: ${formatMonthly(monthlyNet)} × ${Math.round(selectedScenario.ratio * 100)}% = <strong>${formatMonthly(monthlyNet * selectedScenario.ratio)}</strong></li>
          <li>기존 부채 월 상환 차감: <strong>${formatMonthly(existingWon)}</strong></li>
          <li>주담대에 쓸 수 있는 월 상환: <strong>${formatMonthly(allowedMonthly)}</strong></li>
          <li>금리 ${baseRate}%, ${loanYears}년 만기 역산 → 최대 대출 <strong>${formatKoreanPrice(selectedScenario.maxLoan)}</strong></li>
          <li>규제 한도 대출: ${formatKoreanPrice(Math.min(maxLoanByLTV, maxLoanByDSRWon))} → <strong>감당 여력이 더 작아</strong> 실수령 기준이 최종 한도</li>
        </ul>
      </div>
      <div class="why-blocked-section">
        <h4>더 비싼 집을 사려면?</h4>
        <p class="why-blocked-note">${selectedScenario.shortLabel || selectedScenario.label} 기준 월 상환 한도는 ${formatMonthly(allowedMonthly)}입니다. 매수가를 올리면 아래처럼 월 부담이 커집니다.</p>
        <div class="table-wrapper">
          <table class="why-blocked-table">
            <thead>
              <tr>
                <th>목표 매수가</th>
                <th>필요 대출</th>
                <th>월 상환액</th>
                <th>감당 여력</th>
              </tr>
            </thead>
            <tbody>
              ${buildAffordIncrementRows(
                totalPriceWon,
                cashWon,
                baseRate,
                loanYears,
                allowedMonthly,
                incrementsWon
              )}
            </tbody>
          </table>
        </div>
        <p class="why-blocked-note">💡 시나리오를 빠듯(50%)으로 바꾸면 한도는 늘지만 부담이 커집니다. 연봉 상승·부채 상환으로 여력을 넓히거나, 은행 DSR 규제도 함께 고려하세요.</p>
      </div>
      ${renderFundTipsHtml()}
    `;
  }

  body.innerHTML = html;

  // 새 계산 시 접힌 상태로 초기화
  const toggle = document.getElementById("why-blocked-toggle");
  const content = document.getElementById("why-blocked-content");
  if (toggle && content) {
    toggle.setAttribute("aria-expanded", "false");
    content.hidden = true;
    const icon = toggle.querySelector(".toggle-icon");
    if (icon) icon.textContent = "▼";
  }
}

// 최종 병목 메시지 (규제 vs 감당여력)
function getFinalBottleneckMessage(
  loanLimitWon,
  regulatoryLoanWon,
  affordabilityLoanWon,
  regulatoryMessage,
  selectedScenarioLabel
) {
  if (affordabilityLoanWon < regulatoryLoanWon) {
    return `실수령 기준 「${selectedScenarioLabel}」 상환 여력에 막혀 매수가가 제한됩니다.`;
  }

  if (regulatoryLoanWon < affordabilityLoanWon) {
    return regulatoryMessage;
  }

  return "규제 한도와 감당 여력이 동일한 수준입니다.";
}

// 부담 수준별 시나리오 카드 UI 렌더링 (여유 → 적정 → 빠듯 순)
function renderAffordScenarioCards(scenarios, selectedKey) {
  const container = document.getElementById("scenario-cards-container");
  if (!container) return;

  container.innerHTML = "";

  const ordered = [...scenarios].sort((a, b) => a.ratio - b.ratio);

  ordered.forEach((scenario) => {
    const isSelected = scenario.key === selectedKey;
    const levelClass = scenario.levelClass || "";
    const card = document.createElement("article");
    card.className = `scenario-card ${levelClass}${isSelected ? " selected" : ""}`;

    const header = document.createElement("div");
    header.className = "scenario-card-header";

    const title = document.createElement("h3");
    title.textContent = `${scenario.label} (실수령 ${Math.round(scenario.ratio * 100)}% 상환)`;
    header.appendChild(title);

    if (scenario.badge) {
      const badge = document.createElement("span");
      badge.className = "scenario-recommend-badge";
      badge.textContent = scenario.badge;
      header.appendChild(badge);
    }

    const descText = document.createElement("p");
    descText.className = "scenario-desc";
    descText.textContent = scenario.description || "";

    const monthlyRow = document.createElement("p");
    monthlyRow.innerHTML = `<span>월 상환액</span><strong>${formatMonthly(
      scenario.monthlyPayment
    )}</strong>`;

    const loanRow = document.createElement("p");
    loanRow.innerHTML = `<span>대출액</span><strong>${formatKoreanPrice(
      scenario.maxLoan
    )}</strong>`;

    const priceRow = document.createElement("p");
    priceRow.innerHTML = `<span>매수가능 금액</span><strong>${formatKoreanPrice(
      scenario.maxPrice
    )}</strong>`;

    card.appendChild(header);
    card.appendChild(descText);
    card.appendChild(monthlyRow);
    card.appendChild(loanRow);
    card.appendChild(priceRow);

    container.appendChild(card);
  });
}

// 금액(원)을 "X억 Y천만원" 형식의 문자열로 변환
function formatKoreanPrice(amountWon) {
  if (!isFinite(amountWon) || amountWon <= 0) return "0원";

  const man = Math.round(amountWon / 10000); // 만원 단위
  const uk = Math.floor(man / 10000); // 억
  const chun = Math.floor((man % 10000) / 1000); // 천만 단위

  if (uk <= 0 && chun <= 0) {
    return `${man.toLocaleString("ko-KR")}만원`;
  }

  if (uk > 0 && chun > 0) {
    return `${uk.toLocaleString("ko-KR")}억 ${chun}천만원`;
  }

  if (uk > 0) {
    return `${uk.toLocaleString("ko-KR")}억`;
  }

  return `${chun}천만원`;
}

// 금액(원)을 "○○○만원" 텍스트로 표시
function formatMonthly(amountWon) {
  const man = Math.round(amountWon / 10000);
  return `${man.toLocaleString("ko-KR")}만원`;
}

// DSR 비율에 따른 신호등 텍스트 및 클래스 결정
function getStressBadge(ratio) {
  if (!isFinite(ratio) || ratio <= 0) {
    return { text: "계산값 없음", className: "" };
  }

  const percent = ratio * 100;

  if (percent <= 25) {
    return { text: "🟢 안정 (연소득 대비 25% 이하)", className: "safe" };
  }

  if (percent <= 35) {
    return { text: "🟡 보통 (25~35%)", className: "normal" };
  }

  if (percent <= 40) {
    return { text: "🟠 빠듯 (35~40%)", className: "tight" };
  }

  return { text: "🔴 위험 (40% 초과)", className: "danger" };
}

// 시나리오 테이블 행 생성
function buildScenarioRows(options) {
  const {
    annualIncomeMan,
    existingMonthlyMan,
    baseRate,
    loanLimitWon,
    years30 = 30,
    years40 = 40,
  } = options;

  const tbody = document.getElementById("scenario-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const annualIncomeWon = annualIncomeMan * 10000;
  const monthlyIncome = annualIncomeWon / 12;
  const existingMonthlyWon = existingMonthlyMan * 10000;

  const candidatesMan = [30000, 40000]; // 3억, 4억 (만원 단위)
  const loanLimitMan = Math.round(loanLimitWon / 10000);
  if (loanLimitMan > 0) {
    candidatesMan.push(loanLimitMan);
  }

  const uniqueCandidates = [...new Set(candidatesMan)]
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  const terms = [years30, years40];

  uniqueCandidates.forEach((loanMan) => {
    const principal = loanMan * 10000; // 원
    terms.forEach((termYears) => {
      const monthly = monthlyPayment(principal, baseRate, termYears);
      const totalPayment = monthly * termYears * 12;
      const interest = totalPayment - principal;
      const dsrRatio = (monthly + existingMonthlyWon) / monthlyIncome;

      const tr = document.createElement("tr");

      const loanTd = document.createElement("td");
      loanTd.textContent = formatKoreanPrice(principal);

      const termTd = document.createElement("td");
      termTd.textContent = `${termYears}년`;

      const monthlyTd = document.createElement("td");
      monthlyTd.textContent = formatMonthly(monthly);

      const interestTd = document.createElement("td");
      interestTd.textContent = `${Math.round(interest / 10000).toLocaleString(
        "ko-KR"
      )}만원`;

      const ratioTd = document.createElement("td");
      ratioTd.textContent = `${(dsrRatio * 100).toFixed(1)}%`;

      tr.appendChild(loanTd);
      tr.appendChild(termTd);
      tr.appendChild(monthlyTd);
      tr.appendChild(interestTd);
      tr.appendChild(ratioTd);

      tbody.appendChild(tr);
    });
  });
}

// Forward 탭 친구 공유 텍스트 생성
function generateForwardShareText(maxPrice, monthlyPayment) {
  return `🏠 내 연봉으로 ${maxPrice} 아파트 살 수 있대!
월 상환 ${monthlyPayment}이면 충분히 가능하네 👀

너도 한 번 계산해봐 👉 ${SITE_URL}`;
}

// Reverse 탭 친구 공유 텍스트 생성
function generateReverseShareText(targetPrice, requiredCash, requiredIncome) {
  return `🎯 ${targetPrice} 아파트 사려면?
- 자기자금 ${requiredCash} 필요
- 연봉 ${requiredIncome} 이상이면 OK

내 상황도 5초만에 확인 👉 ${SITE_URL}`;
}

// 공유 텍스트 박스 업데이트
function updateShareText(mode, data) {
  if (mode === "forward") {
    const container = document.getElementById("shareTextContent-forward");
    const box = document.getElementById("share-text-box-forward");
    if (!container || !box) return;

    container.textContent = generateForwardShareText(
      data.maxPrice,
      data.monthlyPayment
    );
    box.hidden = false;
    return;
  }

  if (mode === "reverse") {
    const container = document.getElementById("shareTextContent-reverse");
    const box = document.getElementById("share-text-box-reverse");
    const shareButtons = document.getElementById("reverse-share-buttons");
    if (!container || !box) return;

    container.textContent = generateReverseShareText(
      data.targetPrice,
      data.requiredCash,
      data.requiredIncome
    );
    box.hidden = false;
    if (shareButtons) shareButtons.hidden = false;
  }
}

// 공유 텍스트 복사 버튼 설정
function setupShareTextCopyButtons() {
  const bindings = [
    {
      btnId: "copyShareTextBtn-forward",
      contentId: "shareTextContent-forward",
    },
    {
      btnId: "copyShareTextBtn-reverse",
      contentId: "shareTextContent-reverse",
    },
  ];

  bindings.forEach(({ btnId, contentId }) => {
    const btn = document.getElementById(btnId);
    const content = document.getElementById(contentId);
    if (!btn || !content) return;

    btn.addEventListener("click", async () => {
      const text = content.textContent || "";

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const tempInput = document.createElement("textarea");
          tempInput.value = text;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand("copy");
          document.body.removeChild(tempInput);
        }

        btn.textContent = "✅ 복사 완료!";
        btn.classList.add("copied");

        setTimeout(() => {
          btn.textContent = "📋 복사하기";
          btn.classList.remove("copied");
        }, 2000);
      } catch (err) {
        alert("복사에 실패했어요. 직접 선택해서 복사해주세요.");
      }
    });
  });
}

// 링크 복사 공통 처리
function copyPageLink(onSuccess, onFail) {
  const url = window.location.href;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(onSuccess, onFail);
    return;
  }

  const tempInput = document.createElement("input");
  tempInput.value = url;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
  onSuccess();
}

// 카카오 공유 공통 처리
function shareViaKakao() {
  if (window.Kakao && window.Kakao.isInitialized && window.Kakao.isInitialized()) {
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: "내 연봉 아파트 계산기 | 5초 만에 확인",
        description:
          "2026년 LTV·DSR 최신 규제 반영. 내 연봉으로 살 수 있는 아파트와 필요 자금을 양방향으로 계산해보세요.",
        imageUrl: OG_IMAGE_URL,
        link: {
          mobileWebUrl: SITE_URL,
          webUrl: SITE_URL,
        },
      },
    });
    return;
  }

  alert(
    "카카오톡 공유를 이용하려면 Kakao JavaScript SDK와 앱 키 설정이 필요합니다.\n개발자 모드에서 SDK를 초기화한 뒤 다시 시도해 주세요."
  );
}

// 결과 섹션을 보여주는 함수
function showResultSection() {
  const section = document.getElementById("result-section");
  if (!section) return;
  section.classList.add("visible");
}

// 공유 기능: 링크 복사·카카오·이미지 저장
function setupShareButtons() {
  const copyBtn = document.getElementById("copy-link-btn");
  const kakaoBtn = document.getElementById("kakao-share-btn");
  const saveImageBtn = document.getElementById("save-image-btn");
  const resultWrapper = document.getElementById("result-wrapper");

  const reverseCopyBtn = document.getElementById("reverse-copy-link-btn");
  const reverseKakaoBtn = document.getElementById("reverse-kakao-share-btn");
  const reverseSaveImageBtn = document.getElementById("reverse-save-image-btn");
  const reverseResultWrapper = document.getElementById("reverse-result-wrapper");

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      copyPageLink(
        () => alert("현재 페이지 링크가 클립보드에 복사되었습니다."),
        () => alert("복사에 실패했습니다. 주소창의 URL을 직접 복사해 주세요.")
      );
    });
  }

  if (kakaoBtn) {
    kakaoBtn.addEventListener("click", shareViaKakao);
  }

  if (saveImageBtn && resultWrapper && window.html2canvas) {
    saveImageBtn.addEventListener("click", () => {
      html2canvas(resultWrapper, {
        backgroundColor: "#f3f4f6",
      }).then((canvas) => {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "내연봉-아파트-계산기-결과.png";
        link.click();
      });
    });
  } else if (saveImageBtn) {
    saveImageBtn.addEventListener("click", () => {
      alert("이미지 저장 기능을 사용하려면 html2canvas 스크립트가 필요합니다.");
    });
  }

  if (reverseCopyBtn) {
    reverseCopyBtn.addEventListener("click", () => {
      copyPageLink(
        () => alert("현재 페이지 링크가 클립보드에 복사되었습니다."),
        () => alert("복사에 실패했습니다. 주소창의 URL을 직접 복사해 주세요.")
      );
    });
  }

  if (reverseKakaoBtn) {
    reverseKakaoBtn.addEventListener("click", shareViaKakao);
  }

  if (reverseSaveImageBtn && reverseResultWrapper && window.html2canvas) {
    reverseSaveImageBtn.addEventListener("click", () => {
      html2canvas(reverseResultWrapper, {
        backgroundColor: "#f3f4f6",
      }).then((canvas) => {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "아파트가격-계산-결과.png";
        link.click();
      });
    });
  } else if (reverseSaveImageBtn) {
    reverseSaveImageBtn.addEventListener("click", () => {
      alert("이미지 저장 기능을 사용하려면 html2canvas 스크립트가 필요합니다.");
    });
  }
}

// 폼 입력값 수집 (정방향 — 폼 스코프 내에서만 라디오 조회)
function collectCalculationInput() {
  const form = document.getElementById("calculator-form");

  const annualIncomeMan = getAmountValue("annualIncome");
  const cashMan = getAmountValue("cash");
  const existingMonthlyMan = getAmountValue("existingDebt");
  const loanYears = Number(
    document.getElementById("loanYears")?.value || 30
  );
  const baseRate = Number(
    document.getElementById("interestRate")?.value || 4.5
  );

  const homeStatusRadio = form?.querySelector(
    "input[name='homeStatus']:checked"
  );
  const homeStatus = homeStatusRadio ? homeStatusRadio.value : "none";

  const regionRadio = form?.querySelector("input[name='region']:checked");
  const regionKey = regionRadio
    ? parseRegionKey(regionRadio.value)
    : "regulated";

  const affordRadio = form?.querySelector(
    "input[name='affordScenario']:checked"
  );
  const affordScenarioKey = affordRadio ? affordRadio.value : "moderate";

  if (DEBUG_LTV) {
    console.log(
      "[DEBUG collectCalculationInput] region radio:",
      regionRadio?.value,
      "regionKey:",
      regionKey,
      "homeStatus:",
      homeStatus
    );
  }

  return {
    annualIncomeMan,
    cashMan,
    existingMonthlyMan,
    loanYears,
    baseRate,
    homeStatus,
    regionKey,
    affordScenarioKey,
  };
}

// 핵심 계산 및 결과 UI 반영
function runCalculation(input) {
  const {
    annualIncomeMan,
    cashMan,
    existingMonthlyMan,
    loanYears,
    baseRate,
    homeStatus,
    regionKey,
    affordScenarioKey,
  } = input;

  if (annualIncomeMan <= 0 || cashMan < 0) {
    alert("연소득과 보유 현금을 올바르게 입력해 주세요.");
    return false;
  }

  const ltvRatio = getLTV(homeStatus, regionKey);

  if (DEBUG_LTV) {
    console.log("[DEBUG runCalculation] using LTV:", ltvRatio, "regionKey:", regionKey);
  }
  const cashWon = cashMan * 10000;
  let maxPriceByLTV = 0;
  let maxLoanByLTV = 0;

  if (ltvRatio > 0) {
    maxPriceByLTV = cashWon / (1 - ltvRatio);
    maxLoanByLTV = maxPriceByLTV - cashWon;
  } else {
    maxPriceByLTV = cashWon;
    maxLoanByLTV = 0;
  }

  const stressRate = getStressRate(baseRate);
  const maxLoanByDSRWon = maxLoanByDSR(
    annualIncomeMan,
    existingMonthlyMan,
    stressRate,
    loanYears
  );

  // 규제 한도 (LTV vs DSR)
  const regulatoryLoanWon = Math.max(
    0,
    Math.min(maxLoanByLTV, maxLoanByDSRWon || 0)
  );
  const regulatoryPriceWon = cashWon + regulatoryLoanWon;

  // 실수령 기반 감당 여력
  const monthlyNet = getMonthlyNet(annualIncomeMan);
  const affordScenarioResults = AFFORD_SCENARIOS.map((scenario) => ({
    ...scenario,
    ...computeAffordabilityScenario(
      monthlyNet,
      existingMonthlyMan,
      scenario.ratio,
      baseRate,
      loanYears,
      cashWon
    ),
  }));

  const selectedScenario =
    affordScenarioResults.find((s) => s.key === affordScenarioKey) ||
    affordScenarioResults[1];
  const affordabilityLoanWon = selectedScenario.maxLoan;
  const affordabilityPriceWon = selectedScenario.maxPrice;

  // 최종: min(LTV, DSR, 감당여력) + 보유현금
  const loanLimitWon = Math.max(
    0,
    Math.min(regulatoryLoanWon, affordabilityLoanWon)
  );
  const totalPriceWon = cashWon + loanLimitWon;

  const regulatoryMessage = generateLTVLimitMessage(
    regionKey,
    homeStatus,
    maxLoanByLTV,
    maxLoanByDSRWon
  );
  const bottleneckMessage = getFinalBottleneckMessage(
    loanLimitWon,
    regulatoryLoanWon,
    affordabilityLoanWon,
    regulatoryMessage,
    selectedScenario.shortLabel || selectedScenario.label
  );

  const bottleneckType = getBottleneckType(
    regulatoryLoanWon,
    affordabilityLoanWon,
    maxLoanByLTV,
    maxLoanByDSRWon,
    ltvRatio
  );

  renderWhyBlockedExplanation({
    bottleneckType,
    cashWon,
    cashMan,
    ltvRatio,
    regionKey,
    homeStatus,
    totalPriceWon,
    maxPriceByLTV,
    maxLoanByLTV,
    maxLoanByDSRWon,
    annualIncomeMan,
    existingMonthlyMan,
    loanYears,
    baseRate,
    stressRate,
    monthlyNet,
    selectedScenario,
  });

  if (DEBUG_LTV) {
    affordScenarioResults.forEach((s) => {
      console.log(
        "[DEBUG scenario]",
        s.shortLabel,
        "| ratio:",
        s.ratio,
        "| maxLoan:",
        s.maxLoan,
        "| maxPrice:",
        s.maxPrice,
        "(감당여력 기준, LTV 무관)"
      );
    });
  }

  const appliedCriteria = document.getElementById("applied-criteria-text");
  if (appliedCriteria) {
    appliedCriteria.textContent = getAppliedCriteriaText(regionKey, homeStatus);
  }

  const tightScenario =
    affordScenarioResults.find((s) => s.key === "aggressive") ||
    affordScenarioResults[affordScenarioResults.length - 1];

  renderLtvMisconceptionBox({
    tightScenario,
    maxPriceByLTV,
    maxLoanByLTV,
    maxLoanByDSRWon,
    ltvRatio,
    bottleneckType,
    cashWon,
    regionKey,
  });

  // (A) 상환 여력 분석 카드
  const monthlyNetText = document.getElementById("monthly-net-text");
  const housing30Text = document.getElementById("housing-30-text");
  const housing40Text = document.getElementById("housing-40-text");
  const housing50Text = document.getElementById("housing-50-text");

  if (monthlyNetText) monthlyNetText.textContent = formatMonthly(monthlyNet);
  if (housing30Text) {
    housing30Text.textContent = formatMonthly(monthlyNet * 0.3);
  }
  if (housing40Text) {
    housing40Text.textContent = formatMonthly(monthlyNet * 0.4);
  }
  if (housing50Text) {
    housing50Text.textContent = formatMonthly(monthlyNet * 0.5);
  }

  // (B) 3가지 시나리오 카드
  renderAffordScenarioCards(affordScenarioResults, affordScenarioKey);

  // (C) 최종 매수 가능 가격
  const maxPriceText = document.getElementById("max-price-text");
  const regulatoryLimitText = document.getElementById("regulatory-limit-text");
  const affordabilityLimitText = document.getElementById(
    "affordability-limit-text"
  );
  const limitBottleneckText = document.getElementById("limit-bottleneck-text");
  const compositionText = document.getElementById("composition-text");
  const monthlyPaymentText = document.getElementById("monthly-payment-text");
  const incomeRatioText = document.getElementById("income-ratio-text");
  const stressBadge = document.getElementById("stress-badge");
  const stressMessage = document.getElementById("stress-message");

  if (maxPriceText) maxPriceText.textContent = formatKoreanPrice(totalPriceWon);
  if (regulatoryLimitText) {
    regulatoryLimitText.textContent = `규제 한도 기준: ${formatKoreanPrice(
      regulatoryPriceWon
    )} (대출 ${formatKoreanPrice(regulatoryLoanWon)})`;
  }
  if (affordabilityLimitText) {
    affordabilityLimitText.textContent = `감당 여력 기준 (${selectedScenario.shortLabel || selectedScenario.label}): ${formatKoreanPrice(
      affordabilityPriceWon
    )} (대출 ${formatKoreanPrice(affordabilityLoanWon)})`;
  }
  if (limitBottleneckText) limitBottleneckText.textContent = bottleneckMessage;
  if (compositionText) {
    compositionText.textContent = `내 자금 ${formatKoreanPrice(
      cashWon
    )} + 주담대 ${formatKoreanPrice(loanLimitWon)}`;
  }

  const monthly = monthlyPayment(loanLimitWon, baseRate, loanYears);
  if (monthlyPaymentText) {
    monthlyPaymentText.textContent = formatMonthly(monthly);
  }

  const annualIncomeWon = annualIncomeMan * 10000;
  const monthlyIncome = annualIncomeWon / 12;
  const existingMonthlyWon = existingMonthlyMan * 10000;
  const dsrRatio = (monthly + existingMonthlyWon) / monthlyIncome;
  const netPayRatio = monthlyNet > 0 ? monthly / monthlyNet : 0;

  if (incomeRatioText) {
    incomeRatioText.textContent = `연소득 대비 ${(dsrRatio * 100).toFixed(
      1
    )}% · 실수령 대비 ${(netPayRatio * 100).toFixed(1)}% (기존 부채 제외)`;
  }

  const badgeInfo = getStressBadge(dsrRatio);
  if (stressBadge) {
    stressBadge.textContent = badgeInfo.text;
    stressBadge.className = `result-badge ${badgeInfo.className}`;
  }

  const monthlyStress = monthlyPayment(loanLimitWon, baseRate + 1, loanYears);
  const diff = monthlyStress - monthly;
  if (stressMessage) {
    stressMessage.textContent = `금리가 1%p 오르면 월 상환액이 약 ${formatMonthly(
      diff
    )} 증가합니다. (약 ${formatMonthly(monthlyStress)} 수준)`;
  }

  buildScenarioRows({
    annualIncomeMan,
    existingMonthlyMan,
    baseRate,
    loanLimitWon,
    years30: 30,
    years40: 40,
  });

  updateShareText("forward", {
    maxPrice: formatKoreanPrice(totalPriceWon),
    monthlyPayment: formatMonthly(monthly),
  });

  showResultSection();
  return true;
}

// 폼 제출 핸들러
function setupCalculatorForm() {
  const form = document.getElementById("calculator-form");
  if (!form) return;

  const advancedToggle = document.getElementById("toggle-advanced");
  const advancedOptions = document.getElementById("advanced-options");

  // 고급 옵션 토글
  if (advancedToggle && advancedOptions) {
    advancedToggle.addEventListener("click", () => {
      const isHidden = advancedOptions.hasAttribute("hidden");
      if (isHidden) {
        advancedOptions.removeAttribute("hidden");
        advancedToggle.querySelector(".toggle-icon").textContent = "▲";
        advancedToggle.textContent = "고급 옵션 접기";
        const span = document.createElement("span");
        span.className = "toggle-icon";
        span.textContent = "▲";
        advancedToggle.appendChild(span);
      } else {
        advancedOptions.setAttribute("hidden", "true");
        advancedToggle.querySelector(".toggle-icon").textContent = "▼";
        advancedToggle.textContent = "고급 옵션 펼치기";
        const span = document.createElement("span");
        span.className = "toggle-icon";
        span.textContent = "▼";
        advancedToggle.appendChild(span);
      }
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = collectCalculationInput();
    if (runCalculation(input)) {
      lastCalculationInput = { ...input };
    }
  });

  // 시나리오 라디오 변경 시 결과가 있으면 즉시 재계산
  document.querySelectorAll("input[name='affordScenario']").forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!lastCalculationInput) return;
      const input = collectCalculationInput();
      runCalculation(input);
      lastCalculationInput = { ...input };
    });
  });
}

// 사용법 가이드: 아코디언 토글 및 다음 단계 스크롤
function setupGuide() {
  const toggle = document.getElementById("guide-toggle");
  const content = document.getElementById("guide-content");

  if (toggle && content) {
    toggle.addEventListener("click", () => {
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      const nextExpanded = !isExpanded;

      toggle.setAttribute("aria-expanded", String(nextExpanded));
      content.hidden = !nextExpanded;

      const icon = toggle.querySelector(".toggle-icon");
      if (icon) {
        icon.textContent = nextExpanded ? "▲" : "▼";
      }
    });
  }

  document.querySelectorAll(".guide-next-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const selector = btn.getAttribute("data-scroll-to");
      if (!selector) return;

      const target = document.querySelector(selector);
      if (!target) return;

      // 고급 옵션 스크롤 시 패널 자동 펼침
      if (selector === "#toggle-advanced") {
        const advancedOptions = document.getElementById("advanced-options");
        if (advancedOptions && advancedOptions.hasAttribute("hidden")) {
          target.click();
        }
      }

      target.scrollIntoView({ behavior: "smooth", block: "center" });

      if (typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    });
  });
}

// 현재 연도 푸터 표시
function setCurrentYear() {
  const span = document.getElementById("current-year");
  if (!span) return;
  const year = new Date().getFullYear();
  span.textContent = String(year);
}

// ========== 역방향 계산기 ==========

const NET_INCOME_FACTOR = 0.85;
const SAVINGS_YEARS_DEFAULT = 3;

// LTV 비교표에 표시할 비율 목록
const LTV_COMPARE_RATIOS = [0.4, 0.5, 0.6, 0.7, 0.8];

// 탭 전환 함수 (역방향 → 정방향 버튼용)
let switchCalculatorTab = null;

// 부대비용 계산 (만원 단위 입력·반환)
function calculateFees(priceMan) {
  const acquisitionTax = priceMan * 0.011;
  const brokerFee = priceMan * 0.004;
  const movingCost = 500;
  return acquisitionTax + brokerFee + movingCost;
}

function calculateFeesBreakdown(priceMan) {
  return {
    acquisitionTax: priceMan * 0.011,
    brokerFee: priceMan * 0.004,
    movingCost: 500,
    total: calculateFees(priceMan),
  };
}

// 월 상환액 절대금액 기준 부담수준
function getMonthlyBurdenLevel(monthlyWon) {
  const man = monthlyWon / 10000;

  if (man < 150) {
    return { text: "🟢 낮음", className: "burden-low" };
  }
  if (man < 200) {
    return { text: "🟡 보통", className: "burden-normal" };
  }
  if (man < 250) {
    return { text: "🟠 높음", className: "burden-high" };
  }
  return { text: "🔴 매우 높음", className: "burden-very-high" };
}

function getHomeStatusLabel(homeStatus) {
  if (homeStatus === "multi") return "다주택자";
  if (homeStatus === "one_dispose") return "1주택 처분조건";
  return "무주택";
}

function buildLtvRowData(priceWon, ltv, baseRate, loanYears) {
  const loanWon = priceWon * ltv;
  const selfFundWon = priceWon * (1 - ltv);
  const monthly = monthlyPayment(loanWon, baseRate, loanYears);
  const totalInterest = Math.max(0, monthly * loanYears * 12 - loanWon);
  const burden = getMonthlyBurdenLevel(monthly);

  return {
    ltv,
    ltvPercent: Math.round(ltv * 100),
    selfFundWon,
    loanWon,
    monthly,
    totalInterest,
    burden,
  };
}

function renderLtvCompareTable(rows, applicableLtv, showLifeFirstBadge) {
  const tbody = document.getElementById("reverse-ltv-tbody");
  const cardsContainer = document.getElementById("reverse-ltv-cards");
  if (!tbody || !cardsContainer) return;

  tbody.innerHTML = "";
  cardsContainer.innerHTML = "";

  rows.forEach((row) => {
    const isApplicable =
      applicableLtv > 0 && Math.abs(row.ltv - applicableLtv) < 0.001;
    const isLifeFirst = showLifeFirstBadge && row.ltv === 0.8;
    const rowClass = isApplicable ? "ltv-row-highlight" : "";
    const badges = [];
    if (isApplicable) badges.push('<span class="ltv-badge star">⭐ 내 조건</span>');
    if (isLifeFirst) badges.push('<span class="ltv-badge gift">🎁 생애최초</span>');
    const badgeHtml = badges.join(" ");

    const tr = document.createElement("tr");
    if (rowClass) tr.className = rowClass;
    tr.innerHTML = `
      <td><strong>${row.ltvPercent}%</strong> ${badgeHtml}</td>
      <td>${formatKoreanPrice(row.selfFundWon)}</td>
      <td>${formatKoreanPrice(row.loanWon)}</td>
      <td>${formatMonthly(row.monthly)}</td>
      <td>${Math.round(row.totalInterest / 10000).toLocaleString("ko-KR")}만원</td>
      <td><span class="burden-badge ${row.burden.className}">${row.burden.text}</span></td>
    `;
    tbody.appendChild(tr);

    const card = document.createElement("article");
    card.className = `ltv-mobile-card${isApplicable ? " ltv-row-highlight" : ""}`;
    card.innerHTML = `
      <div class="ltv-mobile-header">
        <strong>LTV ${row.ltvPercent}%</strong>
        <div class="ltv-mobile-badges">${badgeHtml}</div>
      </div>
      <dl class="ltv-mobile-dl">
        <div><dt>자기자금</dt><dd>${formatKoreanPrice(row.selfFundWon)}</dd></div>
        <div><dt>대출액</dt><dd>${formatKoreanPrice(row.loanWon)}</dd></div>
        <div><dt>월 상환액</dt><dd>${formatMonthly(row.monthly)}</dd></div>
        <div><dt>총 이자</dt><dd>${Math.round(row.totalInterest / 10000).toLocaleString("ko-KR")}만원</dd></div>
        <div><dt>부담수준</dt><dd><span class="burden-badge ${row.burden.className}">${row.burden.text}</span></dd></div>
      </dl>
    `;
    cardsContainer.appendChild(card);
  });
}

function renderReverseMatchCard(homeStatus, regionKey, applicableLtv) {
  const container = document.getElementById("reverse-match-content");
  if (!container) return;

  const regionLabel = REGION_LABELS[regionKey];
  const homeLabel = getHomeStatusLabel(homeStatus);
  const applicablePercent = Math.round(applicableLtv * 100);
  const altRegionKey = regionKey === "regulated" ? "normal" : "regulated";
  const altLtv = getLTV(homeStatus, altRegionKey);
  const altPercent = Math.round(altLtv * 100);
  const lines = [];

  if (applicableLtv > 0) {
    lines.push(
      `<p class="match-line match-positive">✅ <strong>${regionLabel} + ${homeLabel}</strong> → LTV <strong>${applicablePercent}%</strong> 행이 내 조건에 해당합니다.</p>`
    );
  } else {
    lines.push(
      `<p class="match-line match-warn">⚠️ <strong>${regionLabel} + ${homeLabel}</strong> → 주담대 LTV <strong>0%</strong> (대출 불가, 전액 자기자금 필요)</p>`
    );
  }

  if (
    regionKey === "normal" &&
    (homeStatus === "none" || homeStatus === "one_dispose")
  ) {
    const firstTimePercent = Math.round(LTV_RATES.normal.firstTime * 100);
    lines.push(
      `<p class="match-line">🎁 <strong>생애최초 구입자</strong>라면 일부 조건에서 LTV ${firstTimePercent}% 우대가 가능할 수 있습니다. (별도 심사)</p>`
    );
    lines.push(
      `<p class="match-line match-warn">⚠️ 만약 <strong>${REGION_LABELS.regulated}</strong>이라면 LTV <strong>${altPercent}%</strong>가 적용됩니다.</p>`
    );
  } else if (regionKey === "regulated" && applicableLtv > 0) {
    lines.push(
      `<p class="match-line">💡 <strong>${REGION_LABELS.normal}</strong>이라면 동일 조건에서 LTV <strong>${altPercent}%</strong>까지 가능할 수 있습니다.</p>`
    );
  }

  container.innerHTML = lines.join("");
}

function buildCashAnalysisText(priceWon, cashWon, applicableLtv) {
  if (cashWon <= 0) return "";

  let maxAffordableLtv = null;
  [...LTV_COMPARE_RATIOS].reverse().forEach((ltv) => {
    const required = priceWon * (1 - ltv);
    if (cashWon >= required) {
      maxAffordableLtv = ltv;
    }
  });

  const cashLabel = formatKoreanPrice(cashWon);

  if (maxAffordableLtv === null) {
    const minRequired = priceWon * (1 - 0.8);
    const gap = minRequired - cashWon;
    return `보유 현금 ${cashLabel}으로는 LTV 80% 기준 자기자금(${formatKoreanPrice(minRequired)})도 부족합니다. 약 ${formatKoreanPrice(gap)} 추가가 필요해요.`;
  }

  const maxPercent = Math.round(maxAffordableLtv * 100);
  let text = `보유 현금 ${cashLabel}으로는 LTV <strong>${maxPercent}%</strong> 기준 자기자금 요건을 충족합니다.`;

  if (applicableLtv > 0 && applicableLtv < maxAffordableLtv) {
    const applicableRequired = priceWon * (1 - applicableLtv);
    const gap = Math.max(0, applicableRequired - cashWon);
    const applicablePercent = Math.round(applicableLtv * 100);
    if (gap > 0) {
      text += ` 다만 내 조건(LTV ${applicablePercent}%) 적용 시 자기자금 <strong>${formatKoreanPrice(gap)}</strong>이 추가로 필요합니다.`;
    } else {
      text += ` 내 조건(LTV ${applicablePercent}%)도 충족합니다.`;
    }
  } else if (applicableLtv > maxAffordableLtv) {
    const applicableRequired = priceWon * (1 - applicableLtv);
    const gap = applicableRequired - cashWon;
    const applicablePercent = Math.round(applicableLtv * 100);
    text += ` LTV ${applicablePercent}% 적용 시 자기자금 <strong>${formatKoreanPrice(gap)}</strong>이 추가로 필요합니다.`;
  }

  return text;
}

function renderReverseAdvancedContent(
  monthly,
  loanWon,
  loanYears,
  baseRate,
  stressRate,
  monthlyStress,
  monthlyRateUp,
  totalInterest
) {
  const body = document.getElementById("reverse-advanced-body");
  if (!body) return;

  let scenariosHtml = "";
  [...AFFORD_SCENARIOS]
    .sort((a, b) => a.ratio - b.ratio)
    .forEach((scenario) => {
      const incomeMan = recommendedIncome(monthly, scenario.ratio);
      scenariosHtml += `
        <div class="reverse-advanced-scenario ${scenario.levelClass}">
          <div class="reverse-income-header">
            <strong>${scenario.label} (실수령 ${Math.round(scenario.ratio * 100)}% 상환)</strong>
            ${scenario.badge ? `<span class="scenario-recommend-badge">${scenario.badge}</span>` : ""}
          </div>
          <p class="scenario-desc">${scenario.description}</p>
          <p class="reverse-income-amount">최소 연봉 약 ${Math.round(incomeMan).toLocaleString("ko-KR")}만원</p>
        </div>
      `;
    });

  body.innerHTML = `
    <div class="why-blocked-section">
      <h4>월 상환 상세</h4>
      <ul class="why-calc-steps">
        <li>필요 대출액: <strong>${formatKoreanPrice(loanWon)}</strong></li>
        <li>월 원리금 (${loanYears}년 · ${baseRate}%): <strong>${formatMonthly(monthly)}</strong></li>
        <li>${loanYears}년 총 이자: <strong>${Math.round(totalInterest / 10000).toLocaleString("ko-KR")}만원</strong></li>
        <li>금리 +1%p 시 월 상환: <strong>${formatMonthly(monthlyRateUp)}</strong> (+${formatMonthly(monthlyRateUp - monthly)})</li>
        <li>스트레스 DSR (${stressRate.toFixed(1)}%) 월 상환: <strong>${formatMonthly(monthlyStress)}</strong></li>
      </ul>
    </div>
    <div class="why-blocked-section">
      <h4>💡 부담 수준별 최소 연봉 가이드</h4>
      <p class="scenario-guide-intro">여기 표시된 연봉은 '이 아파트를 사려면 최소 얼마 벌어야 하는지'의 기준선입니다. 숫자가 낮을수록 그만큼 부담이 크다는 의미예요.</p>
      ${scenariosHtml}
    </div>
  `;
}

// 연봉(만원) → 월 실수령액(원) 간이 변환
function grossToNetMonthly(annualGrossMan) {
  return (annualGrossMan * 10000 * NET_INCOME_FACTOR) / 12;
}

// DSR 40% 기준 최소 연봉(만원) 역산
function minRequiredIncome(monthlyPaymentWon) {
  return (monthlyPaymentWon * 12) / 0.4 / 10000;
}

// 실수령 비율 기준 권장 연봉(만원) 역산
function recommendedIncome(monthlyPaymentWon, ratio) {
  const requiredNetMonthly = monthlyPaymentWon / ratio;
  const requiredGrossAnnualWon = (requiredNetMonthly * 12) / NET_INCOME_FACTOR;
  return requiredGrossAnnualWon / 10000;
}

// 실수령 대비 부담 비율 신호등
function getNetPayBadge(ratio) {
  const percent = ratio * 100;
  if (percent <= 30) return { text: "🟢 안정", className: "safe" };
  if (percent <= 40) return { text: "🟡 적정", className: "normal" };
  if (percent <= 50) return { text: "🟠 공격", className: "tight" };
  return { text: "🔴 부담 큼", className: "danger" };
}

function formatFeesMan(feesMan) {
  return `${Math.round(feesMan).toLocaleString("ko-KR")}만원`;
}

function showReverseResultSection() {
  const section = document.getElementById("reverse-result-section");
  if (section) section.classList.add("visible");
}

function collectReverseInput() {
  const form = document.getElementById("reverse-calculator-form");

  const targetPriceMan = getAmountValue("targetPrice");
  const cashMan = getAmountValue("reverseCash");
  const loanYears = Number(
    document.getElementById("reverseLoanYears")?.value || 30
  );
  const baseRate = Number(
    document.getElementById("reverseInterestRate")?.value || 4.5
  );

  const homeStatusRadio = form?.querySelector(
    "input[name='reverseHomeStatus']:checked"
  );
  const homeStatus = homeStatusRadio ? homeStatusRadio.value : "none";

  const regionRadio = form?.querySelector(
    "input[name='reverseRegion']:checked"
  );
  const regionKey = regionRadio
    ? parseRegionKey(regionRadio.value)
    : "regulated";

  if (DEBUG_LTV) {
    console.log(
      "[DEBUG collectReverseInput] region radio:",
      regionRadio?.value,
      "regionKey:",
      regionKey,
      "homeStatus:",
      homeStatus
    );
  }

  return {
    targetPriceMan,
    cashMan,
    loanYears,
    baseRate,
    homeStatus,
    regionKey,
  };
}

function runReverseCalculation(input) {
  const {
    targetPriceMan,
    cashMan,
    loanYears,
    baseRate,
    homeStatus,
    regionKey,
  } = input;

  if (targetPriceMan <= 0) {
    alert("매수 희망 가격을 올바르게 입력해 주세요.");
    return false;
  }

  const applicableLtv = getLTV(homeStatus, regionKey);

  if (DEBUG_LTV) {
    console.log(
      "[DEBUG runReverseCalculation] using LTV:",
      applicableLtv,
      "regionKey:",
      regionKey
    );
  }

  const priceWon = targetPriceMan * 10000;
  const cashWon = cashMan > 0 ? cashMan * 10000 : 0;
  const feesBreakdown = calculateFeesBreakdown(targetPriceMan);
  const showLifeFirstBadge =
    regionKey === "normal" &&
    (homeStatus === "none" || homeStatus === "one_dispose");

  const ltvRows = LTV_COMPARE_RATIOS.map((ltv) =>
    buildLtvRowData(priceWon, ltv, baseRate, loanYears)
  );

  const applicableLoanWon = priceWon * applicableLtv;
  const stressRate = getStressRate(baseRate);
  const monthlyApplicable = monthlyPayment(
    applicableLoanWon,
    baseRate,
    loanYears
  );
  const monthlyStress = monthlyPayment(
    applicableLoanWon,
    stressRate,
    loanYears
  );
  const monthlyRateUp = monthlyPayment(
    applicableLoanWon,
    baseRate + 1,
    loanYears
  );
  const totalInterest = Math.max(
    0,
    monthlyApplicable * loanYears * 12 - applicableLoanWon
  );
  const minIncomeMan = minRequiredIncome(monthlyStress);

  const headerTitle = document.getElementById("reverse-header-title");
  if (headerTitle) {
    headerTitle.textContent = `🎯 ${formatKoreanPrice(priceWon)} 아파트 매수 시뮬레이션`;
  }

  const conditionLabel = document.getElementById("reverse-loan-condition-label");
  if (conditionLabel) {
    conditionLabel.textContent = `${loanYears}년 · ${baseRate}%`;
  }

  renderLtvCompareTable(ltvRows, applicableLtv, showLifeFirstBadge);
  renderReverseMatchCard(homeStatus, regionKey, applicableLtv);

  const reverseAppliedCriteria = document.getElementById(
    "reverse-applied-criteria-text"
  );
  if (reverseAppliedCriteria) {
    reverseAppliedCriteria.textContent = getAppliedCriteriaText(
      regionKey,
      homeStatus
    );
  }

  const feeTax = document.getElementById("reverse-fee-tax");
  const feeBroker = document.getElementById("reverse-fee-broker");
  const feeTotal = document.getElementById("reverse-fee-total");
  if (feeTax) {
    feeTax.textContent = `약 ${Math.round(feesBreakdown.acquisitionTax).toLocaleString("ko-KR")}만원`;
  }
  if (feeBroker) {
    feeBroker.textContent = `약 ${Math.round(feesBreakdown.brokerFee).toLocaleString("ko-KR")}만원`;
  }
  if (feeTotal) {
    feeTotal.textContent = formatFeesMan(feesBreakdown.total);
  }

  const cashAnalysis = document.getElementById("reverse-cash-analysis");
  const cashAnalysisText = document.getElementById("reverse-cash-analysis-text");
  if (cashAnalysis && cashAnalysisText) {
    const analysisHtml = buildCashAnalysisText(
      priceWon,
      cashWon,
      applicableLtv
    );
    if (analysisHtml) {
      cashAnalysis.hidden = false;
      cashAnalysisText.innerHTML = analysisHtml;
    } else {
      cashAnalysis.hidden = true;
    }
  }

  const dsrOneline = document.getElementById("reverse-dsr-oneline");
  if (dsrOneline) {
    if (applicableLtv > 0) {
      dsrOneline.textContent = `이 대출액(${formatKoreanPrice(applicableLoanWon)})을 DSR 40% 이내로 받으려면 최소 연봉 ${Math.round(minIncomeMan).toLocaleString("ko-KR")}만원이 필요해요. (스트레스 금리 ${stressRate.toFixed(1)}% 기준)`;
    } else {
      dsrOneline.textContent =
        "내 조건에서는 주담대가 불가하여 DSR 역산 대상 대출이 없습니다. 전액 자기자금으로 매수해야 합니다.";
    }
  }

  renderReverseAdvancedContent(
    monthlyApplicable,
    applicableLoanWon,
    loanYears,
    baseRate,
    stressRate,
    monthlyStress,
    monthlyRateUp,
    totalInterest
  );

  const advancedContent = document.getElementById("reverse-advanced-content");
  const advancedToggle = document.getElementById("reverse-advanced-toggle");
  if (advancedContent && advancedToggle) {
    advancedContent.hidden = true;
    advancedToggle.setAttribute("aria-expanded", "false");
    const icon = advancedToggle.querySelector(".toggle-icon");
    if (icon) icon.textContent = "▼";
  }

  const totalCashWon =
    priceWon * (1 - applicableLtv) + feesBreakdown.total * 10000;

  updateShareText("reverse", {
    targetPrice: formatKoreanPrice(priceWon),
    requiredCash: formatKoreanPrice(totalCashWon),
    requiredIncome: `${Math.round(minIncomeMan).toLocaleString("ko-KR")}만원`,
  });

  showReverseResultSection();
  return true;
}

function setupReverseCalculatorForm() {
  const form = document.getElementById("reverse-calculator-form");
  if (!form) return;

  const advancedToggle = document.getElementById("reverse-toggle-advanced");
  const advancedOptions = document.getElementById("reverse-advanced-options");

  if (advancedToggle && advancedOptions) {
    advancedToggle.addEventListener("click", () => {
      const isHidden = advancedOptions.hasAttribute("hidden");
      if (isHidden) {
        advancedOptions.removeAttribute("hidden");
        advancedToggle.innerHTML =
          '고급 옵션 접기 <span class="toggle-icon" aria-hidden="true">▲</span>';
      } else {
        advancedOptions.setAttribute("hidden", "true");
        advancedToggle.innerHTML =
          '고급 옵션 펼치기 <span class="toggle-icon" aria-hidden="true">▼</span>';
      }
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    hideAutoJumpNotice();
    runReverseCalculation(collectReverseInput());
  });
}

function setupCalculatorTabs() {
  const tabForward = document.getElementById("tab-forward");
  const tabReverse = document.getElementById("tab-reverse");
  const panelForward = document.getElementById("panel-forward");
  const panelReverse = document.getElementById("panel-reverse");
  const heroSubtitle = document.getElementById("hero-subtitle");

  if (!tabForward || !tabReverse || !panelForward || !panelReverse) return;

  function switchTab(mode) {
    const isForward = mode === "forward";

    tabForward.classList.toggle("active", isForward);
    tabReverse.classList.toggle("active", !isForward);
    tabForward.setAttribute("aria-selected", String(isForward));
    tabReverse.setAttribute("aria-selected", String(!isForward));

    panelForward.hidden = !isForward;
    panelReverse.hidden = isForward;
    panelForward.classList.toggle("active", isForward);
    panelReverse.classList.toggle("active", !isForward);

    if (heroSubtitle) {
      heroSubtitle.textContent = isForward
        ? "2026년 최신 LTV·DSR 규제 반영 · 연봉→매수가 / 아파트가→필요연봉"
        : "아파트 가격 기준 LTV별 자기자금·월 상환액을 한눈에 비교합니다";
    }
  }

  switchCalculatorTab = switchTab;

  tabForward.addEventListener("click", () => {
    hideAutoJumpNotice();
    switchTab("forward");
  });
  tabReverse.addEventListener("click", () => {
    if (!pendingAutoJump) {
      hideAutoJumpNotice();
    }
    switchTab("reverse");
  });

  const gotoForwardBtn = document.getElementById("goto-forward-btn");
  if (gotoForwardBtn) {
    gotoForwardBtn.addEventListener("click", () => {
      switchTab("forward");
      const reverseCashVal = getAmountValue("reverseCash");
      if (reverseCashVal > 0) {
        setAmountValue("cash", reverseCashVal, "cashHint", {
          placeholder: "예: 8,000 (= 8,000만원)",
          max: 500000,
          required: true,
        });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

function setupReverseAdvancedToggle() {
  const toggle = document.getElementById("reverse-advanced-toggle");
  const content = document.getElementById("reverse-advanced-content");
  if (!toggle || !content) return;

  toggle.addEventListener("click", () => {
    const isExpanded = toggle.getAttribute("aria-expanded") === "true";
    const nextExpanded = !isExpanded;

    toggle.setAttribute("aria-expanded", String(nextExpanded));
    content.hidden = !nextExpanded;

    const icon = toggle.querySelector(".toggle-icon");
    if (icon) {
      icon.textContent = nextExpanded ? "▲" : "▼";
    }
  });
}

// "왜 막히나요?" 펼침 카드 토글
function setupWhyBlockedAccordion() {
  const toggle = document.getElementById("why-blocked-toggle");
  const content = document.getElementById("why-blocked-content");
  if (!toggle || !content) return;

  toggle.addEventListener("click", () => {
    const isExpanded = toggle.getAttribute("aria-expanded") === "true";
    const nextExpanded = !isExpanded;

    toggle.setAttribute("aria-expanded", String(nextExpanded));
    content.hidden = !nextExpanded;

    const icon = toggle.querySelector(".toggle-icon");
    if (icon) {
      icon.textContent = nextExpanded ? "▲" : "▼";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupAllAmountInputs();
  setupCalculatorTabs();
  setupCalculatorForm();
  setupReverseCalculatorForm();
  setupReverseAdvancedToggle();
  setupShareTextCopyButtons();
  setupShareButtons();
  setupGuide();
  setupWhyBlockedAccordion();
  setupFirstTimeBuyerModal();
  setupQuickReverseBox();
  setupBackToForwardLink();
  setCurrentYear();
  handleReverseDeepLink();

  if (DEBUG_LTV) {
    runLtvIntegrationTests();
  }
});

