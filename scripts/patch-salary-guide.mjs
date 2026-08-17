import { readFileSync, writeFileSync } from "node:fs";

const p = "tools/salary-calculator/index.html";
let h = readFileSync(p, "utf8");

if (!h.includes("../dday-calculator/style.css")) {
  h = h.replace(
    '  <link rel="stylesheet" href="../../css/global-theme.css">\n</head>',
    '  <link rel="stylesheet" href="../../css/global-theme.css">\n  <link rel="stylesheet" href="../dday-calculator/style.css">\n</head>'
  );
}

const newGuide = `        <div class="card guide-card" id="guide-content" hidden>
          <h2 class="section-title">사용법 가이드</h2>
          <p class="guide-intro">
            아래 4단계만 따라가면 원하는 실수령액을 위한 필요 연봉을 약 30초 안에 확인할 수 있습니다.
          </p>

          <article class="guide-step">
            <div class="guide-step-header">
              <span class="step-badge" aria-hidden="true">1</span>
              <h3>목표 월 실수령액 입력</h3>
            </div>
            <p class="guide-desc">
              매달 손에 쥐고 싶은 금액을 만원 단위로 입력하세요.
            </p>
            <button type="button" class="guide-next-btn" data-scroll-to="#targetPrice">다음 →</button>
          </article>

          <article class="guide-step">
            <div class="guide-step-header">
              <span class="step-badge" aria-hidden="true">2</span>
              <h3>부양가족수 입력</h3>
            </div>
            <p class="guide-desc">
              본인 포함 부양가족 수를 입력합니다. 세금 공제에 영향을 줍니다.
            </p>
            <button type="button" class="guide-next-btn" data-scroll-to="#reverseCash">다음 →</button>
          </article>

          <article class="guide-step">
            <div class="guide-step-header">
              <span class="step-badge" aria-hidden="true">3</span>
              <h3>20세 이하 자녀수 입력</h3>
            </div>
            <p class="guide-desc">
              자녀 수에 따라 필요 연봉이 낮아질 수 있습니다.
            </p>
            <button type="button" class="guide-next-btn" data-scroll-to="#existingDebt">다음 →</button>
          </article>

          <article class="guide-step">
            <div class="guide-step-header">
              <span class="step-badge" aria-hidden="true">4</span>
              <h3>비과세액 입력 (선택)</h3>
            </div>
            <p class="guide-desc">
              식대 등 월 비과세 금액이 있다면 입력하세요.
            </p>
            <button type="button" class="guide-next-btn" data-scroll-to="#reverse-toggle-advanced">계산하기 →</button>
          </article>
        </div>`;

const start = h.indexOf('        <div class="card guide-card" id="guide-content" hidden>');
const end = h.indexOf('    <section class="section" id="calculator">');
if (start < 0 || end < 0) throw new Error("markers not found");

h = h.slice(0, start) + newGuide + "\n" + h.slice(end);
writeFileSync(p, h);
console.log("salary ok", readFileSync(p).length);
