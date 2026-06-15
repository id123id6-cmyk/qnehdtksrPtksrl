// 2026년 퇴직금 계산기

document.getElementById("calculate-btn").addEventListener("click", calculateSeverance);

function calculateSeverance() {
  try {
    const joinDate = new Date(document.getElementById("join-date").value);
    const leaveDate = new Date(document.getElementById("leave-date").value);
    const salary1 = (parseFloat(document.getElementById("salary-1").value) || 0) * 10000;
    const salary2 = (parseFloat(document.getElementById("salary-2").value) || 0) * 10000;
    const salary3 = (parseFloat(document.getElementById("salary-3").value) || 0) * 10000;
    const bonus = (parseFloat(document.getElementById("bonus").value) || 0) * 10000;
    const annualLeave = (parseFloat(document.getElementById("annual-leave").value) || 0) * 10000;

    if (!joinDate.getTime() || !leaveDate.getTime()) {
      alert("입사일과 퇴사일을 입력해주세요.");
      return;
    }
    if (leaveDate <= joinDate) {
      alert("퇴사일은 입사일보다 이후여야 합니다.");
      return;
    }
    if (salary1 === 0 && salary2 === 0 && salary3 === 0) {
      alert("최근 3개월 급여를 입력해주세요.");
      return;
    }

    const totalDays = Math.floor((leaveDate - joinDate) / (1000 * 60 * 60 * 24));

    if (totalDays < 365) {
      alert("재직일수가 1년 미만입니다. 법정 퇴직금 대상이 아닙니다.");
      return;
    }

    const years = totalDays / 365;
    const yearsInt = Math.floor(years);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays - yearsInt * 365 - months * 30;

    const threeMonthsAgo = new Date(leaveDate);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthDays = Math.floor((leaveDate - threeMonthsAgo) / (1000 * 60 * 60 * 24));

    const totalSalary3Months = salary1 + salary2 + salary3;
    const bonusAdjusted = bonus * (3 / 12);
    const annualLeaveAdjusted = annualLeave * (3 / 12);
    const totalForAverage = totalSalary3Months + bonusAdjusted + annualLeaveAdjusted;
    const avgDailyWage = totalForAverage / threeMonthDays;
    const avg30DayWage = avgDailyWage * 30;

    const severancePay = Math.floor(avgDailyWage * 30 * (totalDays / 365));

    let serviceDeduction = 0;
    if (yearsInt <= 5) {
      serviceDeduction = 1000000 * yearsInt;
    } else if (yearsInt <= 10) {
      serviceDeduction = 5000000 + 2000000 * (yearsInt - 5);
    } else if (yearsInt <= 20) {
      serviceDeduction = 15000000 + 2500000 * (yearsInt - 10);
    } else {
      serviceDeduction = 40000000 + 3000000 * (yearsInt - 20);
    }

    const convertedSalary = Math.max(0, ((severancePay - serviceDeduction) * 12) / yearsInt);

    let convertedDeduction = 0;
    if (convertedSalary <= 8000000) {
      convertedDeduction = convertedSalary;
    } else if (convertedSalary <= 70000000) {
      convertedDeduction = 8000000 + (convertedSalary - 8000000) * 0.6;
    } else if (convertedSalary <= 100000000) {
      convertedDeduction = 45200000 + (convertedSalary - 70000000) * 0.55;
    } else if (convertedSalary <= 300000000) {
      convertedDeduction = 61700000 + (convertedSalary - 100000000) * 0.45;
    } else {
      convertedDeduction = 151700000 + (convertedSalary - 300000000) * 0.35;
    }

    const taxBase = Math.max(0, convertedSalary - convertedDeduction);

    let convertedTax = 0;
    if (taxBase <= 14000000) {
      convertedTax = taxBase * 0.06;
    } else if (taxBase <= 50000000) {
      convertedTax = 840000 + (taxBase - 14000000) * 0.15;
    } else if (taxBase <= 88000000) {
      convertedTax = 6240000 + (taxBase - 50000000) * 0.24;
    } else if (taxBase <= 150000000) {
      convertedTax = 15360000 + (taxBase - 88000000) * 0.35;
    } else if (taxBase <= 300000000) {
      convertedTax = 37060000 + (taxBase - 150000000) * 0.38;
    } else if (taxBase <= 500000000) {
      convertedTax = 94060000 + (taxBase - 300000000) * 0.4;
    } else if (taxBase <= 1000000000) {
      convertedTax = 174060000 + (taxBase - 500000000) * 0.42;
    } else {
      convertedTax = 384060000 + (taxBase - 1000000000) * 0.45;
    }

    const incomeTax = Math.floor((convertedTax * yearsInt) / 12);
    const localTax = Math.floor(incomeTax * 0.1);
    const netAmount = severancePay - incomeTax - localTax;

    const formatNumber = function (num) {
      return num.toLocaleString("ko-KR");
    };

    document.getElementById("result-period").textContent = yearsInt + "년 " + months + "개월 " + days + "일";
    document.getElementById("result-avg-daily").textContent = formatNumber(Math.floor(avgDailyWage)) + "원";
    document.getElementById("result-severance").textContent = formatNumber(severancePay) + "원";
    document.getElementById("result-income-tax").textContent = "-" + formatNumber(incomeTax) + "원";
    document.getElementById("result-local-tax").textContent = "-" + formatNumber(localTax) + "원";
    document.getElementById("result-net").textContent = formatNumber(netAmount) + "원";

    document.getElementById("detail-total-3m").textContent = formatNumber(Math.floor(totalForAverage)) + "원";
    document.getElementById("detail-3m-days").textContent = threeMonthDays + "일";
    document.getElementById("detail-avg-daily").textContent = formatNumber(Math.floor(avgDailyWage)) + "원";
    document.getElementById("detail-avg-30").textContent = formatNumber(Math.floor(avg30DayWage)) + "원";
    document.getElementById("detail-total-days").textContent = totalDays + "일";
    document.getElementById("detail-years").textContent = years.toFixed(2) + "년";
    document.getElementById("detail-severance").textContent = formatNumber(severancePay) + "원";
    document.getElementById("detail-service-deduction").textContent = formatNumber(serviceDeduction) + "원";
    document.getElementById("detail-converted").textContent = formatNumber(Math.floor(convertedSalary)) + "원";
    document.getElementById("detail-converted-deduction").textContent = formatNumber(Math.floor(convertedDeduction)) + "원";
    document.getElementById("detail-tax-base").textContent = formatNumber(Math.floor(taxBase)) + "원";
    document.getElementById("detail-converted-tax").textContent = formatNumber(Math.floor(convertedTax)) + "원";
    document.getElementById("detail-income-tax").textContent = formatNumber(incomeTax) + "원";
    document.getElementById("detail-local-tax").textContent = formatNumber(localTax) + "원";
    document.getElementById("detail-net").textContent = formatNumber(netAmount) + "원";

    const resultBox = document.getElementById("result-box");
    resultBox.style.display = "block";
    resultBox.removeAttribute("hidden");
    setTimeout(function () {
      resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  } catch (error) {
    console.error("계산 오류:", error);
    alert("계산 중 오류가 발생했습니다. 입력값을 확인해주세요.");
  }
}

function resetForm() {
  document.getElementById("join-date").value = "";
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("leave-date").value = today;
  document.getElementById("salary-1").value = "";
  document.getElementById("salary-2").value = "";
  document.getElementById("salary-3").value = "";
  document.getElementById("bonus").value = "";
  document.getElementById("annual-leave").value = "";
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

window.addEventListener("DOMContentLoaded", function () {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("leave-date").value = today;

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
