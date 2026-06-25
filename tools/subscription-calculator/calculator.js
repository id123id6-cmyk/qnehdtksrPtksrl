import {
  calculateSubscriptionScore,
  parseDate,
} from "./scoring.js";

const els = {
  birthDate: document.getElementById("birth-date"),
  modeBirth: document.getElementById("mode-birth"),
  modeMarriage: document.getElementById("mode-marriage"),
  marriageWrap: document.getElementById("marriage-wrap"),
  marriageDate: document.getElementById("marriage-date"),
  homelessPreview: document.getElementById("homeless-preview"),
  spouse: document.getElementById("spouse"),
  children: document.getElementById("children"),
  parents: document.getElementById("parents"),
  dependentsPreview: document.getElementById("dependents-preview"),
  hasSubscription: document.getElementById("has-subscription"),
  subscriptionWrap: document.getElementById("subscription-wrap"),
  subscriptionJoin: document.getElementById("subscription-join"),
  subscriptionPreview: document.getElementById("subscription-preview"),
  totalScore: document.getElementById("total-score"),
  totalMax: document.getElementById("total-max"),
  scoreHomeless: document.getElementById("score-homeless"),
  scoreDependents: document.getElementById("score-dependents"),
  scoreSubscription: document.getElementById("score-subscription"),
  barHomeless: document.getElementById("bar-homeless"),
  barDependents: document.getElementById("bar-dependents"),
  barSubscription: document.getElementById("bar-subscription"),
  analysisBox: document.getElementById("analysis-box"),
  resultRegion: document.getElementById("result-region"),
  homelessDetail: document.getElementById("homeless-detail"),
  subscriptionDetail: document.getElementById("subscription-detail"),
};

let useMarriage = false;

function getInput() {
  return {
    birthDate: els.birthDate.value,
    useMarriage,
    marriageDate: els.marriageDate.value,
    spouse: els.spouse.checked,
    children: parseInt(els.children.value, 10) || 0,
    parentsCohabiting: els.parents.checked,
    hasSubscription: els.hasSubscription.checked,
    subscriptionJoinDate: els.subscriptionJoin.value,
  };
}

function setMode(marriage) {
  useMarriage = marriage;
  els.modeBirth.classList.toggle("active", !marriage);
  els.modeMarriage.classList.toggle("active", marriage);
  els.modeBirth.setAttribute("aria-pressed", String(!marriage));
  els.modeMarriage.setAttribute("aria-pressed", String(marriage));
  els.marriageWrap.hidden = !marriage;
  recalculate();
}

function recalculate() {
  const input = getInput();
  const result = calculateSubscriptionScore(input);

  els.totalScore.textContent = String(result.total).padStart(2, "0");
  els.totalMax.textContent = String(result.maxTotal);
  els.scoreHomeless.textContent = `${result.homeless.points}점`;
  els.scoreDependents.textContent = `${result.dependents.points}점`;
  els.scoreSubscription.textContent = `${result.subscription.points}점`;

  els.barHomeless.style.width = `${(result.homeless.points / 32) * 100}%`;
  els.barDependents.style.width = `${(result.dependents.points / 35) * 100}%`;
  els.barSubscription.style.width = `${(result.subscription.points / 17) * 100}%`;

  els.barHomeless.setAttribute("aria-valuenow", result.homeless.points);
  els.barDependents.setAttribute("aria-valuenow", result.dependents.points);
  els.barSubscription.setAttribute("aria-valuenow", result.subscription.points);

  if (input.birthDate) {
    els.homelessPreview.textContent = `${result.homeless.label} → ${result.homeless.points}점`;
    els.homelessDetail.textContent = result.homeless.startDate
      ? `산정 시작: ${formatDateKo(result.homeless.startDate)}`
      : "";
  } else {
    els.homelessPreview.textContent = "생년월일을 입력하면 자동 계산됩니다";
    els.homelessDetail.textContent = "";
  }

  const depParts = [];
  if (input.spouse) depParts.push("배우자");
  if (input.children > 0) depParts.push(`자녀 ${input.children}명`);
  if (input.parentsCohabiting) depParts.push("부모 동거");
  els.dependentsPreview.textContent =
    depParts.length > 0
      ? `부양가족 ${result.dependents.count}명 → ${result.dependents.points}점`
      : `부양가족 0명 → ${result.dependents.points}점`;

  if (input.hasSubscription && input.subscriptionJoinDate) {
    els.subscriptionPreview.textContent = `가입 ${result.subscription.label} → ${result.subscription.points}점`;
    els.subscriptionDetail.textContent = `가입일: ${formatDateKo(parseDate(input.subscriptionJoinDate))}`;
  } else if (input.hasSubscription) {
    els.subscriptionPreview.textContent = "가입일을 선택하세요";
    els.subscriptionDetail.textContent = "";
  } else {
    els.subscriptionPreview.textContent = "미가입 → 0점";
    els.subscriptionDetail.textContent = "";
  }

  els.analysisBox.className = `analysis-box analysis-box--${result.analysis.tier}`;
  els.analysisBox.innerHTML = `
    <p class="analysis-title">${result.analysis.title}</p>
    <p class="analysis-desc">${result.analysis.desc}</p>
  `;

  els.resultRegion.setAttribute(
    "aria-label",
    `총 청약 가점 ${result.total}점 만점 ${result.maxTotal}점`
  );
}

function formatDateKo(date) {
  if (!date) return "";
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function bindEvents() {
  els.modeBirth.addEventListener("click", () => setMode(false));
  els.modeMarriage.addEventListener("click", () => setMode(true));

  [
    els.birthDate,
    els.marriageDate,
    els.spouse,
    els.children,
    els.parents,
    els.subscriptionJoin,
  ].forEach((el) => el.addEventListener("input", recalculate));

  els.hasSubscription.addEventListener("change", () => {
    els.subscriptionWrap.hidden = !els.hasSubscription.checked;
    if (!els.hasSubscription.checked) els.subscriptionJoin.value = "";
    recalculate();
  });
}

bindEvents();
setMode(false);
recalculate();
