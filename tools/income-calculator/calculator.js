// 연봉 실수령액 계산기 (2026년 기준)

const RATES = {
  pension: 0.0475,
  health: 0.03595,
  longTermCare: 0.1295,
  employment: 0.009,
};

const PENSION_MAX_BASE = 6370000;
const PENSION_MIN_BASE = 400000;

function floor10(amount) {
  return Math.floor(amount / 10) * 10;
}

function calculate() {
  const salaryMan = Number(document.getElementById("salary").value);
  if (!salaryMan || salaryMan <= 0) {
    alert("연봉을 입력해주세요!");
    return;
  }

  const salary = salaryMan * 10000;
  const nontax = Number(document.getElementById("nontax").value) || 0;
  const family = Number(document.getElementById("family").value);
  const children = Number(document.getElementById("children").value);

  const monthlyGross = Math.floor(salary / 12);
  const taxable = Math.max(0, monthlyGross - nontax);

  const pensionBase = Math.min(PENSION_MAX_BASE, Math.max(PENSION_MIN_BASE, taxable));
  const pension = floor10(pensionBase * RATES.pension);
  const health = floor10(taxable * RATES.health);
  const healthRaw = taxable * RATES.health;
  const longTerm = floor10(healthRaw * RATES.longTermCare);
  const employment = floor10(taxable * RATES.employment);

  const incomeTax = calculateIncomeTax(taxable, family, children);
  const localTax = Math.floor(incomeTax * 0.1);

  const totalDeduction = pension + health + longTerm + employment + incomeTax + localTax;
  const monthlyNet = monthlyGross - totalDeduction;
  const yearlyNet = monthlyNet * 12;
  const netRate = ((monthlyNet / monthlyGross) * 100).toFixed(1);

  displayResults({
    salaryMan,
    monthlyGross,
    pension,
    health,
    longTerm,
    employment,
    incomeTax,
    localTax,
    totalDeduction,
    monthlyNet,
    yearlyNet,
    netRate,
  });
}

function calculateIncomeTax(taxable, family, children) {
  let tax = 0;

  if (taxable <= 1060000) {
    tax = 0;
  } else if (taxable <= 1500000) {
    tax = (taxable - 1060000) * 0.06;
  } else if (taxable <= 3000000) {
    tax = 26400 + (taxable - 1500000) * 0.15;
  } else if (taxable <= 4500000) {
    tax = 88230 + (taxable - 3000000) * 0.11;
  } else if (taxable <= 7000000) {
    tax = 242640 + (taxable - 4500000) * 0.17;
  } else if (taxable <= 10000000) {
    tax = 667640 + (taxable - 7000000) * 0.23;
  } else {
    tax = 1357640 + (taxable - 10000000) * 0.3;
  }

  tax -= (family - 1) * 12500;
  tax -= children * 12500;

  return Math.max(0, Math.floor(tax));
}

function displayResults(r) {
  document.getElementById("yearly-net").textContent = r.yearlyNet.toLocaleString("ko-KR");
  document.getElementById("monthly-net").textContent = r.monthlyNet.toLocaleString("ko-KR");
  document.getElementById("result-summary").textContent =
    `연봉 ${r.salaryMan.toLocaleString("ko-KR")}만원 기준`;

  document.getElementById("monthly-gross").textContent = r.monthlyGross.toLocaleString("ko-KR") + "원";
  document.getElementById("pension").textContent = "-" + r.pension.toLocaleString("ko-KR") + "원";
  document.getElementById("health").textContent = "-" + r.health.toLocaleString("ko-KR") + "원";
  document.getElementById("long-term").textContent = "-" + r.longTerm.toLocaleString("ko-KR") + "원";
  document.getElementById("employment").textContent = "-" + r.employment.toLocaleString("ko-KR") + "원";
  document.getElementById("income-tax").textContent = "-" + r.incomeTax.toLocaleString("ko-KR") + "원";
  document.getElementById("local-tax").textContent = "-" + r.localTax.toLocaleString("ko-KR") + "원";
  document.getElementById("total-deduction").innerHTML =
    "<strong>-" + r.totalDeduction.toLocaleString("ko-KR") + "원</strong>";

  document.getElementById("net-rate").textContent = r.netRate + "%";

  let signal = "";
  if (Number(r.netRate) >= 85) signal = "🟢 실수령률 양호";
  else if (Number(r.netRate) >= 80) signal = "🟡 실수령률 보통";
  else signal = "🔴 실수령률 낮음 (공제 많음)";
  document.getElementById("signal-light").textContent = signal;

  const resultBox = document.getElementById("result-box");
  resultBox.style.display = "block";
  setTimeout(function () {
    resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

function resetForm() {
  document.getElementById("salary").value = "";
  document.getElementById("nontax").value = "0";
  document.getElementById("family").value = "1";
  document.getElementById("children").value = "0";
  document.getElementById("result-box").style.display = "none";
}

function toggleGuide() {
  const guide = document.getElementById("guide-section");
  const toggle = document.getElementById("guide-toggle");
  const icon = toggle ? toggle.querySelector(".toggle-icon") : null;
  if (!guide) return;

  const isHidden = guide.style.display === "none" || guide.hidden;
  if (isHidden) {
    guide.style.display = "block";
    guide.hidden = false;
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    if (icon) icon.textContent = "▲";
  } else {
    guide.style.display = "none";
    guide.hidden = true;
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (icon) icon.textContent = "▼";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const yearEl = document.getElementById("current-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const guideToggle = document.getElementById("guide-toggle");
  if (guideToggle) {
    guideToggle.addEventListener("click", toggleGuide);
  }

  document.querySelectorAll(".guide-next-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const selector = btn.getAttribute("data-scroll-to");
      if (!selector) return;
      const target = document.querySelector(selector);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    });
  });
});
