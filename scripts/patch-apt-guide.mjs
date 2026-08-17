import { readFileSync, writeFileSync } from "node:fs";

const p = "tools/apt-calculator/index.html";
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
            아래 5단계만 따라가면 아파트 매수·전세 총비용을 약 30초 안에 확인할 수 있습니다.
          </p>

          <article class="guide-step">
            <div class="guide-step-header">
              <span class="step-badge" aria-hidden="true">1</span>
              <h3>매수·전세 선택</h3>
            </div>
            <p class="guide-desc">
              매매인지 전세인지 먼저 선택하세요. 계산 항목이 달라집니다.
            </p>
            <button type="button" class="guide-next-btn" data-scroll-to="#field-homeStatus">다음 →</button>
          </article>

          <article class="guide-step">
            <div class="guide-step-header">
              <span class="step-badge" aria-hidden="true">2</span>
              <h3>아파트 가격 입력</h3>
            </div>
            <p class="guide-desc">
              매매가 또는 전세금을 만원 단위로 입력합니다. 실거래가 지도에서 시세 확인 후 입력하는 것을 권장합니다.
            </p>
            <button type="button" class="guide-next-btn" data-scroll-to="#annualIncome">다음 →</button>
          </article>

          <article class="guide-step">
            <div class="guide-step-header">
              <span class="step-badge" aria-hidden="true">3</span>
              <h3>대출 조건 입력</h3>
            </div>
            <p class="guide-desc">
              LTV(대출 비율), 금리, 대출 기간을 입력하세요. 월 상환액이 자동 계산됩니다.
            </p>
            <button type="button" class="guide-next-btn" data-scroll-to="#toggle-advanced">다음 →</button>
          </article>

          <article class="guide-step">
            <div class="guide-step-header">
              <span class="step-badge" aria-hidden="true">4</span>
              <h3>부대비용 확인</h3>
            </div>
            <p class="guide-desc">
              취득세·중개수수료·법무비 등이 자동 반영됩니다. 생애최초라면 감면 옵션을 체크하세요.
            </p>
            <button type="button" class="guide-next-btn" data-scroll-to="#cash">다음 →</button>
          </article>

          <article class="guide-step">
            <div class="guide-step-header">
              <span class="step-badge" aria-hidden="true">5</span>
              <h3>총비용 결과 확인</h3>
            </div>
            <p class="guide-desc">
              초기 자금(계약금+중도금+잔금+세금) 합계와 월 상환액이 표시됩니다. 실제 금액은 은행 심사 후 확정됩니다.
            </p>
            <button type="button" class="guide-next-btn" data-scroll-to="#calculate-btn">계산하기 →</button>
          </article>
        </div>`;

const start = h.indexOf('        <div class="card guide-card" id="guide-content" hidden>');
const end = h.indexOf("    <!-- 입력 폼 섹션 -->");
if (start < 0 || end < 0) throw new Error("markers not found");

h = h.slice(0, start) + newGuide + "\n" + h.slice(end);
writeFileSync(p, h);
console.log("apt ok", readFileSync(p).length);
