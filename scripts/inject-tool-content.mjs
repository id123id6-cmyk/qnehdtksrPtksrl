/**
 * Inject unique static description sections into each tools page index.html
 * for AdSense thin-content remediation. Run: node scripts/inject-tool-content.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const LINK_CSS = '<link rel="stylesheet" href="/css/tool-content.css">';
const MARKER_START = '<!-- tool-content:start -->';
const MARKER_END = '<!-- tool-content:end -->';

function wrap(kicker, title, inner) {
  return `${MARKER_START}
    <section class="section tool-content-section" aria-label="${title} 상세 안내">
      <div class="container">
        <article class="card form-card tool-content-card">
          <p class="tool-content-kicker">${kicker}</p>
          <h2>이 도구는 무엇인가요?</h2>
${inner}
        </article>
      </div>
    </section>
${MARKER_END}`;
}

const pages = {
  'tools/realestate-map/index.html': {
    insertBefore: '<footer class="site-footer">',
    cssHref: '../../css/tool-content.css',
    meta: {
      title: '전국 아파트 실거래가 지도 | 매매·전세 시세 확인 | 승박',
      description:
        '전국 아파트 단지 실거래가(매매·전세)를 지도에서 확인하세요. 면적별 시세 그래프와 급매·호가 비교 관점까지 초보 눈높이로 안내합니다.',
      ogTitle: '전국 아파트 실거래가 지도 | 승박',
      ogDescription: '매매·전세 실거래가를 지도에서 보고, 면적별 시세를 해석하는 방법을 안내합니다.',
    },
    section: wrap(
      '실거래가 지도 가이드',
      '실거래가 지도',
      `          <p>허위 매물·과장 호가에 흔들리지 않으려면, 실제로 체결된 가격부터 보는 습관이 필요합니다. 이 지도는 단지별 실거래(매매·전세)를 지도 위에서 바로 찾아보고, 면적별 가격 흐름을 그래프로 확인할 수 있게 만든 도구입니다. “이 동네 시세가 어느 정도인지”를 빠르게 감 잡고 싶을 때, 중개사 말만 듣기 전에 스스로 교차검증할 때 쓰기 좋습니다.</p>
          <p>단, 표시 가격은 참고용이며 최신성·누락 여부는 국토교통부 실거래가 공개시스템 등 공식 자료와 대조하는 것이 안전합니다.</p>

          <h2>이렇게 사용하세요</h2>
          <ol>
            <li><strong>지역 선택</strong> — 상단에서 시도·시군구(필요하면 동)를 고릅니다. 구를 바꾸면 해당 지역 단지 마커가 지도에 표시됩니다.</li>
            <li><strong>필터·검색</strong> — 매매/전세 구분, 단지 검색, 인프라(지하철·학교 등) 토글을 상황에 맞게 켭니다. 관심 단지명을 검색하면 위치를 빨리 찾을 수 있습니다.</li>
            <li><strong>마커 클릭 → 상세</strong> — 단지 마커를 누르면 사이드바에 면적별 실거래와 추이 그래프가 열립니다. 같은 단지라도 전용면적대별로 가격대가 크게 다를 수 있으니 면적을 먼저 맞춰 보세요.</li>
            <li><strong>(선택) D-day 연결</strong> — 관심 단지의 목표가를 잡았다면 D-day 계산기로 넘어가 저축·대출 시나리오를 이어서 볼 수 있습니다.</li>
          </ol>

          <h2>결과를 이렇게 해석하세요</h2>
          <p>실거래가는 “최근에 실제로 계약된 가격”이고, 호가는 “지금 내놓은 희망 가격”입니다. 호가가 실거래보다 크게 높으면 협상 여지가 있을 수도 있고, 반대로 매물이 귀해 호가가 실거래를 끌어올리는 구간일 수도 있습니다. 한 건의 최고가·최저가만 보지 말고, <strong>비슷한 면적대의 최근 여러 건</strong>을 나란히 보는 편이 안전합니다.</p>
          <p>급매처럼 보이는 낮은 가격은 저층·향·수리 상태·권리관계 이슈가 반영된 경우도 있습니다. “싸니까 좋다”보다 “왜 싼가”를 먼저 질문하세요. 전세 실거래는 보증금 수준을 가늠하는 참고치이지, 매매 판단의 유일한 근거는 아닙니다. 전세가율(전세/매매)이 높은 구간은 갭 리스크도 함께 점검하는 습관이 필요합니다.</p>
          <p>면적 비교 시에는 공급면적·전용면적 표기가 섞이지 않았는지 확인하세요. 같은 “30평대”라도 전용㎡가 다르면 단가(3.3㎡당) 비교가 어긋납니다. 그래프가 단기 급등·급락을 보이면 거래 건수가 적은 구간인지, 특정 대형 평형의 이상치인지부터 걸러 보세요.</p>

          <h2>자주 하는 실수 / 주의할 점</h2>
          <ul>
            <li>한 건의 최고가만 보고 “이 단지 시세”라고 단정하기</li>
            <li>호가 앱 캡처만 모아 두고 실거래 교차검증을 생략하기</li>
            <li>전용면적 단위를 맞추지 않은 채 평당가를 비교하기</li>
          </ul>

          <h2>자주 묻는 질문 (FAQ)</h2>
          <div class="tool-content-faq">
            <details>
              <summary>Q. 지도에 없는 단지/거래는 없나요?</summary>
              <p>수집·표시 범위와 시점 때문에 일부 단지·최근 계약이 비어 보일 수 있습니다. 중요 결정 전에는 국토부 실거래가 공개시스템에서 동일 단지를 한 번 더 확인하세요.</p>
            </details>
            <details>
              <summary>Q. 매매와 전세를 같이 보면 뭐가 좋나요?</summary>
              <p>매매만 보면 “살 가격”, 전세만 보면 “보증금 수준”만 보입니다. 둘을 같이 보면 전세가율·월세 전환 압력 같은 흐름을 감으로라도 잡을 수 있습니다.</p>
            </details>
            <details>
              <summary>Q. 이 가격으로 바로 사도 되나요?</summary>
              <p>아니요. 실거래는 참고 시세입니다. 대출·세금·수리비·학군·교통·단지 관리 상태까지 본인 조건에 맞게 재확인해야 합니다.</p>
            </details>
          </div>

          <h2>함께 보면 좋은 글</h2>
          <ul class="tool-content-links">
            <li><a href="/blog/post-29.html">실거래가 지도 200% 활용법</a></li>
            <li><a href="/blog/post-30.html">2026 전세사기 예방 체크리스트</a></li>
            <li><a href="/blog/post-38.html">2026 하반기 전세 전망 정리</a></li>
          </ul>
          <p class="tool-content-note">본 안내는 정보 제공 목적이며 투자·법률 자문이 아닙니다. 정확한 실거래 내역은 국토교통부 등 공식 공개 자료를 확인하세요.</p>`
    ),
  },

  'tools/bunyang-alarm/index.html': {
    insertBefore: '</main>',
    cssHref: '../../css/tool-content.css',
    meta: {
      title: '분양 알리미 | 전국 청약·분양 공고 모아보기 | 승박',
      description:
        '전국 아파트 청약·분양 공고를 카드로 모아보고 지역·접수 상태로 걸러보세요. 공고를 어떻게 읽고, 자격·일정을 놓치지 않는지 초보 가이드를 제공합니다.',
      ogTitle: '분양 알리미 | 전국 청약 분양정보 | 승박',
      ogDescription: '접수중·예정·마감 공고를 카드로 보고, 공고 읽는 법까지 안내합니다.',
    },
    section: wrap(
      '분양 알리미 가이드',
      '분양 알리미',
      `          <p>청약 공고는 여러 사이트에 흩어져 있고, 관심 지역만 골라 보기도 번거롭습니다. 분양 알리미는 전국 아파트 청약·분양 정보를 카드 형태로 모아, 지역과 접수 상태(접수중·예정·마감)로 빠르게 훑어보게 만든 도구입니다. “이번 주 넣을 수 있는 공고가 있나?”를 매일 확인하는 무주택자에게 특히 유용합니다.</p>
          <p>카드에 보이는 일정·물량은 참고용이며, <strong>최종 기준은 항상 청약홈 공고문</strong>입니다.</p>

          <h2>이렇게 사용하세요</h2>
          <ol>
            <li><strong>지역 필터</strong> — 관심 시·도를 먼저 좁힙니다. 전국을 다 보면 피로만 커지고, 정작 자격 되는 공고를 놓치기 쉽습니다.</li>
            <li><strong>상태 필터</strong> — 지금 접수할 수 있는 건 ‘접수중’, 미리 준비할 건 ‘청약예정’, 기록용은 ‘마감’으로 나눕니다.</li>
            <li><strong>카드 클릭</strong> — 모달에서 단지명, 청약 기간, 문의·홈페이지 등 요약 정보를 확인합니다.</li>
            <li><strong>청약홈으로 이동</strong> — 관심 공고는 반드시 청약홈 원문에서 특별공급/일반공급 자격, 예치금, 일정, 공급물량을 재확인하세요.</li>
          </ol>

          <h2>결과를 이렇게 해석하세요</h2>
          <p>카드의 “접수중”은 신청 창이 열려 있다는 신호일 뿐, 내가 자격이 된다는 뜻은 아닙니다. 공고를 열면 먼저 <strong>주택 유형(국민/민영)</strong>, <strong>공급 유형(특공/일반)</strong>, <strong>거주·소득·자산 요건</strong>을 순서대로 체크하세요. 예치금·순위 요건을 못 맞추면 접수가 막히거나 부적격이 날 수 있습니다.</p>
          <p>“청약예정” 카드는 일정을 캘린더에 미리 적어 두는 용도로 쓰세요. 서류·통장 잔액·가점은 접수 당일이 아니라 며칠 전에 준비하는 편이 덜 허둥댑니다. 마감된 공고는 경쟁률·당첨 커트라인을 나중에 복기하는 학습 자료로 남기면 다음 전략이 선명해집니다.</p>
          <p>같은 지역이라도 단지마다 분양가·평면도·입지 조건이 다릅니다. 알리미는 “어떤 공고가 떴는지”를 알려 주는 레이더이고, “이 집이 나에게 맞는지”는 별도 판단입니다.</p>

          <h2>자주 하는 실수 / 주의할 점</h2>
          <ul>
            <li>카드 요약만 보고 자격 없이 접수부터 누르기</li>
            <li>예치금·납입 횟수를 공고 직전에야 확인하기</li>
            <li>알리미 일정과 청약홈 공고 일정이 다른데 알리미만 믿기</li>
          </ul>

          <h2>자주 묻는 질문 (FAQ)</h2>
          <div class="tool-content-faq">
            <details>
              <summary>Q. 데이터가 안 보이거나 적게 보여요</summary>
              <p>수집 주기·필터·일시적 오류 때문일 수 있습니다. 필터를 ‘전체’로 바꾸고 새로고침해 보세요. 그래도 비면 청약홈에서 해당 지역을 직접 검색하는 것이 안전합니다.</p>
            </details>
            <details>
              <summary>Q. 푸시 알림도 오나요?</summary>
              <p>현재 페이지는 브라우저에서 공고를 모아 보여주는 형태입니다. 관심 지역은 자주 열어보거나, 일정은 직접 캘린더에 등록해 두는 방식을 권합니다.</p>
            </details>
            <details>
              <summary>Q. 특공과 일반공급을 한꺼번에 넣어도 되나요?</summary>
              <p>단지·유형마다 규칙이 다릅니다. 중복 신청 가능 여부는 해당 공고문의 유의사항을 기준으로 판단하세요.</p>
            </details>
          </div>

          <h2>함께 보면 좋은 글</h2>
          <ul class="tool-content-links">
            <li><a href="/blog/post-42.html">청약 전에 꼭 알아야 할 필수 용어 10가지</a></li>
            <li><a href="/blog/post-44.html">청약통장, 매달 얼마씩 넣어야 유리할까</a></li>
            <li><a href="/blog/post-24.html">신혼특공 vs 신혼희망타운, 이렇게 골랐어요</a></li>
          </ul>
          <p class="tool-content-note">본 도구는 공공 분양정보를 참고용으로 정리합니다. 일정·자격·물량의 최종 기준은 청약홈 공고이며, 청약·투자 결정은 본인 책임입니다.</p>`
    ),
  },

  'tools/subscription-calculator/index.html': {
    insertBefore: '</main>',
    cssHref: '../../css/tool-content.css',
    meta: {
      title: '청약 가점 계산기 | 무주택·부양가족·통장 가점 | 승박',
      description:
        '무주택 기간·부양가족·청약통장 가입기간으로 청약 가점을 계산합니다. 점수대별 의미와 올릴 수 있는 항목을 초보 눈높이로 해석해 드립니다.',
      ogTitle: '청약 가점 계산기 | 승박',
      ogDescription: '무주택·부양가족·통장 가입기간 가점을 바로 확인하고 해석 가이드까지 제공합니다.',
    },
    section: wrap(
      '청약 가점 계산기 가이드',
      '청약 가점 계산기',
      `          <p>“가점이 몇 점인지”를 대략만 알고 청약을 넣으면, 경쟁이 센 단지에서 기대만 커지기 쉽습니다. 이 계산기는 무주택 기간, 부양가족 수, 청약통장 가입기간을 입력해 총점(일반공급 가점 구성)을 바로 보여 줍니다. 청약 전 자기 위치를 점검하거나, 앞으로 어떤 항목을 키울지 계획을 세울 때 쓰기 좋습니다.</p>
          <p>특별공급·지역 가점·공고별 세부 규정은 단지마다 다르므로, <strong>최종 확인은 청약홈 공고</strong>가 기준입니다.</p>

          <h2>이렇게 사용하세요</h2>
          <ol>
            <li><strong>무주택 기간 입력</strong> — 생년월일(또는 혼인일 관련 안내)을 기준으로 무주택 기간 점수가 산정됩니다. 조기 혼인 등 예외는 공고·제도 안내를 함께 보세요.</li>
            <li><strong>부양가족 수 선택</strong> — 배우자·직계존비속 등 인정 범위에 해당하는 인원만 넣습니다. “식구 수”와 “청약상 부양가족”은 다를 수 있습니다.</li>
            <li><strong>청약통장 가입기간</strong> — 가입일로부터의 기간을 반영합니다. 결과 화면에서 항목별 점수 바와 총점을 확인하세요.</li>
          </ol>

          <h2>결과를 이렇게 해석하세요</h2>
          <p>가점은 “높을수록 유리”하지만, 단지·지역·공급 물량에 따라 당첨 커트라인이 크게 달라집니다. 점수가 낮다고 포기하기보다, <strong>가점제 물량이 적은 단지</strong>나 추첨제 비중, 특별공급 자격 여부를 같이 보는 편이 현실적입니다.</p>
          <p>올릴 수 있는 항목도 성격이 다릅니다. 무주택 기간·통장 가입기간은 시간이 쌓여야 하고, 부양가족은 혼인·출산·동거 인정 요건 등 생애 이벤트와 연결됩니다. “한 달 만에 만점”은 불가능에 가깝고, <strong>지금 점수 + 1~2년 후 점수</strong>를 시나리오로 적어 두는 전략이 낫습니다.</p>
          <p>민영 일반공급에서는 예치금·1순위 요건을 먼저 충족해야 가점이 의미를 갖습니다. 가점만 보고 통장 잔액·납입 횟수를 놓치는 경우가 흔하니, 가점 계산 후에는 예치금·납입 전략도 함께 점검하세요.</p>

          <h2>자주 하는 실수 / 주의할 점</h2>
          <ul>
            <li>부양가족을 실제보다 많이 넣어 점수를 낙관하기</li>
            <li>가점만 보고 예치금·순위·특공 자격을 확인하지 않기</li>
            <li>과거 커트라인 하나를 내년에도 그대로라고 믿기</li>
          </ul>

          <h2>자주 묻는 질문 (FAQ)</h2>
          <div class="tool-content-faq">
            <details>
              <summary>Q. 만점이면 무조건 당첨되나요?</summary>
              <p>아닙니다. 물량이 적거나 동점자가 많으면 추첨·기타 규칙이 적용될 수 있습니다. 공고의 당첨자 선정 방식을 읽어야 합니다.</p>
            </details>
            <details>
              <summary>Q. 부모님과 살면 부양가족으로 넣어도 되나요?</summary>
              <p>동거·세대 분리·소득 요건 등 세부 조건이 있습니다. 계산기 결과는 참고이고, 인정 여부는 청약홈·공고 기준으로 확인하세요.</p>
            </details>
            <details>
              <summary>Q. 특공에도 이 가점이 쓰이나요?</summary>
              <p>특별공급은 유형별로 소득·자녀·혼인 기간 등 다른 기준이 중심인 경우가 많습니다. 이 도구는 주로 일반공급 가점 구성을 점검하는 용도입니다.</p>
            </details>
          </div>

          <h2>함께 보면 좋은 글</h2>
          <ul class="tool-content-links">
            <li><a href="/blog/post-42.html">청약 필수 용어 10가지</a></li>
            <li><a href="/blog/post-44.html">청약통장 납입금액 전략</a></li>
            <li><a href="/blog/post-22.html">무주택 기간, 이혼·상속·소형주택 계산</a></li>
          </ul>
          <p class="tool-content-note">본 계산기는 정보 제공용입니다. 가점·자격의 정확한 기준은 해당 단지 공고와 청약홈에서 확인하세요.</p>`
    ),
  },

  'tools/income-calculator/index.html': {
    insertBefore: '</main>',
    cssHref: '../../css/tool-content.css',
    meta: {
      title: '연봉 실수령액 계산기 2026 | 월급 실수령 확인 | 승박',
      description:
        '연봉을 입력하면 4대보험·소득세·지방세를 반영한 월·연 실수령액을 계산합니다. 세전·세후 차이가 나는 이유까지 초보 눈높이로 설명합니다.',
      ogTitle: '연봉 실수령액 계산기 2026 | 승박',
      ogDescription: '2026년 요율 기준으로 월급 실수령액을 계산하고, 공제 항목을 쉽게 해석합니다.',
    },
    section: wrap(
      '연봉 실수령액 가이드',
      '연봉 실수령액 계산기',
      `          <p>연봉 협상·이직·저축 계획을 세울 때 가장 먼저 필요한 숫자는 “통장에 찍히는 돈”입니다. 이 계산기는 연봉을 넣으면 4대보험과 소득세·지방소득세를 반영한 월/연 실수령액을 바로 보여 줍니다. 세전 연봉만 듣고 생활비를 짜다 중간에 빠듯해지는 실수를 줄이는 데 목적이 있습니다.</p>
          <p>회사마다 수당·상여·비과세 구성이 달라 실제 급여명세서와 정확히 같지 않을 수 있으니, <strong>참고용</strong>으로 쓰세요.</p>

          <h2>이렇게 사용하세요</h2>
          <ol>
            <li><strong>연봉 입력</strong> — 세전 연봉(계약 연봉)을 넣습니다. 월급만 알면 대략 ×12로 환산해 볼 수 있습니다.</li>
            <li><strong>비과세·부양가족</strong> — 식대 등 비과세 월액, 부양가족·자녀 수를 반영하면 세금 쪽 결과가 현실에 더 가까워집니다.</li>
            <li><strong>결과 확인</strong> — 월 실수령, 연 실수령, 공제 항목(연금·건강·고용·소득세 등) 비중을 나눠 봅니다.</li>
          </ol>

          <h2>결과를 이렇게 해석하세요</h2>
          <p>세전 월급과 실수령의 차이는 대부분 <strong>4대보험 + 소득세 + 지방소득세</strong>입니다. 국민연금·건강보험·장기요양·고용보험은 요율이 바뀌면 실수령도 같이 움직입니다. “연봉이 올랐는데 생각보다 적게 오른다”는 느낌이 드는 이유가 여기 있습니다.</p>
          <p>소득세는 단순 비율이 아니라 과세표준 구간에 따라 달라지고, 부양가족·자녀 공제가 있으면 세금이 줄어 실수령이 늘어날 수 있습니다. 반대로 비과세를 0으로 두면 실제보다 세금·보험료가 높게 나올 수 있으니, 급여명세서의 비과세 칸을 한 번 확인해 보세요.</p>
          <p>이 숫자로 아파트 예산을 짤 때는 “실수령 − 고정비 = 저축 가능액”을 먼저 적고, 그다음 LTV·DSR 계산으로 넘어가는 순서가 안전합니다. 세전 연봉만으로 대출 가능 금액을 낙관하면 월 상환이 버거울 수 있습니다.</p>

          <h2>자주 하는 실수 / 주의할 점</h2>
          <ul>
            <li>세전 연봉을 생활비·저축 기준으로 그대로 쓰기</li>
            <li>상여·야근수당을 무시하거나 반대로 과대 반영하기</li>
            <li>연말정산 환급/추납을 매월 실수령과 혼동하기</li>
          </ul>

          <h2>자주 묻는 질문 (FAQ)</h2>
          <div class="tool-content-faq">
            <details>
              <summary>Q. 회사 급여명세서랑 숫자가 달라요</summary>
              <p>비과세, 회사 지원 보험료, 학자금·기숙사 공제, 상여 지급월 등이 다르면 차이가 납니다. 큰 틀(보험+세금) 점검용으로 보시고, 정확한 금액은 명세서를 기준으로 하세요.</p>
            </details>
            <details>
              <summary>Q. 프리랜서·사업소득도 되나요?</summary>
              <p>이 도구는 주로 근로소득(직장인 연봉) 가정입니다. 사업·기타소득은 원천징수·경비 구조가 달라 별도 계산이 필요합니다.</p>
            </details>
            <details>
              <summary>Q. 실수령으로 아파트 예산을 어떻게 짜나요?</summary>
              <p>월 실수령에서 주거·생활 고정비를 뺀 뒤 저축액을 정하고, 내 연봉 아파트 계산기·필요 연봉 계산기로 구매력과 목표가를 맞춰 보세요.</p>
            </details>
          </div>

          <h2>함께 보면 좋은 글</h2>
          <ul class="tool-content-links">
            <li><a href="/blog/post-34.html">월급만으론 투자가 안 되겠더라고요</a></li>
            <li><a href="/blog/post-36.html">본업 하면서 부동산 공부까지, 시간 내는 법</a></li>
            <li><a href="/blog/post-21.html">보금자리론 vs 디딤돌, 월급쟁이는?</a></li>
          </ul>
          <p class="tool-content-note">요율·세법은 개정될 수 있습니다. 본 결과는 참고용이며 세무·노무 자문이 아닙니다.</p>`
    ),
  },

  'tools/salary-calculator/index.html': {
    insertBefore: '</main>',
    cssHref: '../../css/tool-content.css',
    meta: {
      title: '아파트 가격 필요 연봉 계산기 | DSR·LTV 역산 | 승박',
      description:
        '원하는 아파트 가격을 입력하면 DSR·LTV 관점에서 필요한 연봉·월상환을 역산합니다. 목표가 대비 소득이 얼마나 필요한지 초보도 이해할 수 있게 안내합니다.',
      ogTitle: '아파트 가격 필요 연봉 계산기 | 승박',
      ogDescription: '희망 매수가 기준으로 필요 연봉·월상환을 DSR 관점에서 역산합니다.',
    },
    section: wrap(
      '필요 연봉 계산기 가이드',
      '아파트 가격 필요 연봉 계산기',
      `          <p>“이 아파트 사려면 연봉이 얼마여야 하지?”는 월급쟁이가 가장 자주 하는 질문입니다. 이 도구는 희망 매수가와 자기자본·기존 대출·규제지역 여부 등을 넣고, DSR·LTV 틀에서 <strong>필요한 연봉과 월 상환 부담</strong>을 거꾸로 계산해 줍니다. 목표 단지는 정했는데 소득이 모자란지, 아니면 자기자본을 더 모아야 하는지 방향을 잡을 때 적합합니다.</p>
          <p>실제 대출 한도는 은행·상품·개인 신용에 따라 달라지므로 결과는 <strong>시뮬레이션</strong>입니다.</p>

          <h2>이렇게 사용하세요</h2>
          <ol>
            <li><strong>희망 아파트 가격 입력</strong> — 관심 단지의 목표 매수가(또는 최근 실거래 참고가)를 넣습니다.</li>
            <li><strong>자기자본·기존 대출</strong> — 가용 현금과 이미 갚고 있는 대출을 반영합니다. 기존 대출이 있으면 DSR 여유가 줄어듭니다.</li>
            <li><strong>지역·보유 상황</strong> — 규제/비규제, 주택 보유 여부 등 선택값을 맞춘 뒤 결과를 확인합니다.</li>
            <li><strong>필요 연봉·월상환 읽기</strong> — “지금 연봉으로 가능한가 / 얼마나 더 필요한가”를 비교해 보세요.</li>
          </ol>

          <h2>결과를 이렇게 해석하세요</h2>
          <p>필요 연봉이 높게 나오면 두 가지를 나눠 생각하세요. 하나는 <strong>가격 자체가 높은 경우</strong>, 다른 하나는 <strong>자기자본이 적어 대출 비중이 큰 경우</strong>입니다. 같은 10억이라도 현금 비중이 높으면 필요 소득이 달라질 수 있습니다.</p>
          <p>DSR은 “연간 원리금 상환액 ÷ 연소득” 관점의 규제입니다. 금리가 오르거나 스트레스 금리가 적용되면 같은 대출도 더 빡빡해질 수 있어, 결과 숫자보다 약간 보수적으로 보는 편이 안전합니다. LTV는 담보 대비 대출 한도 비율이라, 규제지역·주택 수에 따라 한도가 꺾이는 지점이 달라집니다.</p>
          <p>“연봉을 올려야 한다”는 결론만 내지 말고, <strong>목표가 조정·저축 기간 연장·지역 변경</strong> 시나리오도 같이 적어 보세요. 필요 연봉 계산기는 ‘포기/도전’ 이분법보다 ‘어떤 변수를 건드리면 가능한지’를 찾는 도구에 가깝습니다.</p>

          <h2>자주 하는 실수 / 주의할 점</h2>
          <ul>
            <li>취득세·중개수수료·이사비를 빠뜨린 채 매매가만으로 판단하기</li>
            <li>현재 초저금리 가정만으로 월상환을 낙관하기</li>
            <li>기존 신용대출·카드론을 빠진 채로 DSR을 계산하기</li>
          </ul>

          <h2>자주 묻는 질문 (FAQ)</h2>
          <div class="tool-content-faq">
            <details>
              <summary>Q. 내 연봉 아파트 계산기와 뭐가 다르나요?</summary>
              <p>내 연봉 아파트 계산기는 “소득 → 살 수 있는 가격”이고, 이 도구는 “가격 → 필요한 소득”입니다. 목표가 있으면 이쪽, 소득이 정해져 있으면 반대쪽을 쓰세요.</p>
            </details>
            <details>
              <summary>Q. 은행 예비심사와 숫자가 다르면?</summary>
              <p>정상입니다. 은행은 소득 증빙·상품 조건·내부 심사 기준이 더 세밀합니다. 여기서는 방향 점검용으로 보고, 실제는 금융기관 상담을 받으세요.</p>
            </details>
            <details>
              <summary>Q. 부부 합산 소득은 어떻게 보나요?</summary>
              <p>상품·규제에 따라 합산이 인정되는 경우가 있습니다. 계산 결과가 낙관적으로 나와도, 실제 신청 전 합산 가능 여부를 확인하세요.</p>
            </details>
          </div>

          <h2>함께 보면 좋은 글</h2>
          <ul class="tool-content-links">
            <li><a href="/blog/post-32.html">생애최초 주담대 한도 축소와 디딤돌</a></li>
            <li><a href="/blog/post-21.html">보금자리론 vs 디딤돌</a></li>
            <li><a href="/blog/post-23.html">2026년 7월 시행 부동산 정책 총정리</a></li>
          </ul>
          <p class="tool-content-note">LTV·DSR·금리 규정은 변경될 수 있습니다. 본 결과는 참고용이며 대출 심사를 대체하지 않습니다.</p>`
    ),
  },

  'tools/apt-calculator/index.html': {
    insertBefore: '</main>',
    cssHref: '../../css/tool-content.css',
    meta: {
      title: '내 연봉 아파트 계산기 | LTV·DSR 매수 한도 | 승박',
      description:
        '연봉·현금·기존 부채를 넣으면 LTV·DSR을 반영한 매수 가능 아파트 가격을 계산합니다. 병목이 대출인지 자기자본인지 해석하는 가이드를 제공합니다.',
      ogTitle: '내 연봉 아파트 계산기 | 승박',
      ogDescription: '연봉 기준으로 매수 가능 금액을 계산하고, LTV·DSR 병목을 쉽게 해석합니다.',
    },
    section: wrap(
      '내 연봉 아파트 계산기 가이드',
      '내 연봉 아파트 계산기',
      `          <p>연봉은 아는데 “그래서 얼마짜리까지 보지?”가 막막할 때 쓰는 도구입니다. 연소득과 보유 현금, 기존 부채, 무주택/다주택, 규제지역 여부를 넣으면 LTV·DSR을 반영한 <strong>매수 가능 가격대</strong>를 가늠해 줍니다. 집 구경 전에 예산 상한선을 그어 두면, 중개 현장에서 충동적으로 예산이 커지는 일을 줄일 수 있습니다.</p>
          <p>실제 승인 한도는 금융기관 심사에 따르며, 계산 결과는 계획 수립용입니다.</p>

          <h2>이렇게 사용하세요</h2>
          <ol>
            <li><strong>소득·현금 입력</strong> — 세전 연소득과 지금 가용한 계약금·중도금 여력을 넣습니다.</li>
            <li><strong>부채·주택 수·지역</strong> — 기존 대출, 무주택/다주택, 규제지역 여부를 맞춥니다. 값이 바뀌면 한도가 크게 달라질 수 있습니다.</li>
            <li><strong>시나리오 비교</strong> — 결과에서 가능한 가격, 필요 대출, 월 상환 부담을 확인합니다. 막히는 지점(LTV vs DSR) 안내가 있다면 그 이유를 읽고 변수를 조정해 보세요.</li>
          </ol>

          <h2>결과를 이렇게 해석하세요</h2>
          <p>매수 한도가 “현금 부족”으로 막히면 저축·가족 지원·목표가 하향이 해법에 가깝고, “DSR”로 막히면 소득·기존 부채·금리 가정이 핵심입니다. LTV로 막히면 규제지역·주택 수에 따른 담보대출 비율 한도를 의해야 합니다. <strong>무엇이 병목인지</strong>를 먼저 읽으면 다음 행동이 구체화됩니다.</p>
          <p>화면에 나오는 최대 금액은 “그 가격을 사라는 추천”이 아닙니다. 월 상환이 실수령의 과도한 비중을 차지하면 생활이 흔들립니다. 가능 한도의 70~80%만 실전 탐색 상한으로 두는 보수적 습관을 추천합니다.</p>
          <p>스트레스 DSR·금리 가정은 시기에 따라 달라질 수 있습니다. 결과가 아슬아슬하면 금리 상승 시나리오를 한 단계 더 빡빡하게 가정해 보세요.</p>

          <h2>자주 하는 실수 / 주의할 점</h2>
          <ul>
            <li>최대 한도 = 내 예산이라고 생각하고 바로 임장 가기</li>
            <li>취득세·이사·인테리어를 현금에서 빼지 않기</li>
            <li>배우자 소득·기존 대출을 빠뜨리거나 과대 입력하기</li>
          </ul>

          <h2>자주 묻는 질문 (FAQ)</h2>
          <div class="tool-content-faq">
            <details>
              <summary>Q. 필요 연봉 계산기와 함께 쓰려면?</summary>
              <p>먼저 이 도구로 “지금 소득으로 가능한 가격”을 보고, 원하는 단지가 더 비싸면 필요 연봉 계산기로 “얼마나 더 필요한지”를 역산하세요.</p>
            </details>
            <details>
              <summary>Q. 전세 끼고 사는 갭투자도 계산되나요?</summary>
              <p>기본 가정은 실거주 매수·주담대 중심입니다. 전세 승계·갭 구조는 별도 리스크(전세가 하락, 역전세)가 있어 이 결과만으로 판단하지 마세요.</p>
            </details>
            <details>
              <summary>Q. 정책대출(디딤돌 등)은 반영되나요?</summary>
              <p>상품별 소득·가격·면적 요건이 복잡해 일반 LTV·DSR 프레임으로 근사합니다. 정책대출을 노린다면 해당 상품 공식 요건을 따로 확인하세요.</p>
            </details>
          </div>

          <h2>함께 보면 좋은 글</h2>
          <ul class="tool-content-links">
            <li><a href="/blog/post-25.html">취득세 계산할 때 다들 실수하는 부분</a></li>
            <li><a href="/blog/post-26.html">생애최초 취득세 감면, 놓치기 쉬운 조건</a></li>
            <li><a href="/blog/post-32.html">생애최초 주담대 한도 변화</a></li>
          </ul>
          <p class="tool-content-note">대출 규제·금리는 변경될 수 있습니다. 본 계산은 참고용이며 금융·세무 자문이 아닙니다.</p>`
    ),
  },

  'tools/dday-calculator/index.html': {
    insertBefore: '</main>',
    cssHref: '../../css/tool-content.css',
    meta: {
      title: '아파트 D-day 계산기 | 매수 가능 시점 시뮬 | 승박',
      description:
        '목표가·현재 자산·월 저축·대출(LTV)로 아파트 매수 가능 시점을 계산합니다. 숫자를 어떻게 해석하고 저축 계획을 조정할지 가이드합니다.',
      ogTitle: '아파트 D-day 계산기 | 승박',
      ogDescription: '목표가까지 남은 기간을 자산·저축·대출 가정으로 시뮬레이션합니다.',
    },
    section: wrap(
      'D-day 계산기 가이드',
      '아파트 D-day 계산기',
      `          <p>“언제쯤 살 수 있을까?”는 막연한 희망이 아니라, 목표가와 저축 속도로 계산해 볼 수 있는 문제입니다. D-day 계산기는 목표 가격, 현재 자산, 월 저축, 수익률·LTV 가정을 넣어 <strong>매수 가능 시점</strong>을 가늠하게 해 줍니다. 실거래가 지도에서 본 단지 가격을 목표로 옮긴 뒤, 내 현금 흐름과 맞춰 보는 연결 고리로 쓰기 좋습니다.</p>
          <p>미래 시세·금리·소득은 확정할 수 없으므로 결과는 시나리오입니다.</p>

          <h2>이렇게 사용하세요</h2>
          <ol>
            <li><strong>목표가 설정</strong> — 관심 단지·면적의 목표 매수가를 넣습니다. 지도나 최근 실거래를 참고하되, 너무 낙관적인 최저가만 쓰지 마세요.</li>
            <li><strong>현재 자산·월 저축</strong> — 지금 모은 돈과 매달 실제로 넣을 수 있는 금액을 정직하게 입력합니다.</li>
            <li><strong>대출·수익 가정</strong> — LTV·자산 증식 가정을 조절해 보고, 결과로 나오는 기간·필요 자산 구성을 확인합니다.</li>
            <li><strong>저축 시뮬 조정</strong> — 월 저축을 조금 올려/내려 보며 D-day가 얼마나 앞당겨지거나 미뤄지는지 비교합니다.</li>
          </ol>

          <h2>결과를 이렇게 해석하세요</h2>
          <p>D-day가 멀게 나오면 실패가 아니라 <strong>계획이 구체화됐다</strong>는 뜻입니다. 기간을 줄이는 레버는 보통 세 가지입니다. 목표가 하향, 월 저축 상향, 자기자본 비중 조정(대출 활용). 시세가 오른다는 낙관만으로 기간을 줄이는 것은 위험합니다.</p>
          <p>차트나 증식 결과가 매력적으로 보여도, 수익률 가정이 과하면 현실이 따라가지 못합니다. “기본 / 보수 / 낙관” 세 요율을 적어 두고 구간으로 보는 습관을 권합니다. 또한 매수 시점의 월 상환이 그때의 실수령과 맞는지는 연봉·필요 연봉 계산기로 한 번 더 검증하세요.</p>
          <p>목표가에 도달한다는 것은 “계약금·취득세·이사비까지 준비된 상태”와는 다를 수 있습니다. D-day 숫자 옆에 부대비용 10% 안팎을 별도 버퍼로 두는 편이 실전적입니다.</p>

          <h2>자주 하는 실수 / 주의할 점</h2>
          <ul>
            <li>월 저축을 이상적인 금액으로 과대 입력하기</li>
            <li>집값 상승률만 높게 잡고 저축은 그대로 두기</li>
            <li>D-day만 보고 청약·전세 등 대안 전략을 아예 닫기</li>
          </ul>

          <h2>자주 묻는 질문 (FAQ)</h2>
          <div class="tool-content-faq">
            <details>
              <summary>Q. 지도에서 넘어오면 뭐가 달라지나요?</summary>
              <p>관심 단지의 가격 정보가 목표 입력에 연결될 수 있어, 시세 조사와 자금 계획을 한 흐름으로 이어갈 수 있습니다.</p>
            </details>
            <details>
              <summary>Q. 중간에 집값이 오르면요?</summary>
              <p>목표가도 같이 올라갈 수 있습니다. 주기적으로 목표가를 갱신하고 D-day를 다시 계산해 보세요. 필요하면 지역·면적 대안도 병렬로 둡니다.</p>
            </details>
            <details>
              <summary>Q. 청약과 병행해도 되나요?</summary>
              <p>오히려 권장합니다. 매수 D-day와 청약 일정을 같이 보면 “언제 현금이 필요한지”가 더 명확해집니다. 분양 알리미·가점 계산기를 함께 쓰세요.</p>
            </details>
          </div>

          <h2>함께 보면 좋은 글</h2>
          <ul class="tool-content-links">
            <li><a href="/blog/post-29.html">실거래가 지도 활용법</a></li>
            <li><a href="/blog/post-40.html">무주택 월급쟁이는 뭘 준비해야 할까</a></li>
            <li><a href="/blog/post-35.html">월급쟁이가 부동산 공부 시작할 때 삽질</a></li>
          </ul>
          <p class="tool-content-note">미래 시세·금리는 예측이 아닙니다. 본 시뮬레이션은 계획 참고용이며 투자 권유가 아닙니다.</p>`
    ),
  },

  'tools/severance-calculator/index.html': {
    insertBefore: '</main>',
    cssHref: '../../css/tool-content.css',
    meta: {
      title: '퇴직금 계산기 2026 | 평균임금·퇴직소득세 | 승박',
      description:
        '입사·퇴사일과 최근 급여로 퇴직금·퇴직소득세·실수령액을 계산합니다. 평균임금 개념과 결과를 해석하는 방법을 초보 눈높이로 안내합니다.',
      ogTitle: '퇴직금 계산기 2026 | 승박',
      ogDescription: '평균임금 기반 퇴직금과 세금·실수령을 계산하고 해석 포인트를 제공합니다.',
    },
    section: wrap(
      '퇴직금 계산기 가이드',
      '퇴직금 계산기',
      `          <p>이직·퇴직을 앞두면 “퇴직금이 얼마 남지?”가 가장 급한 계산입니다. 이 도구는 입사일·퇴사일과 최근 급여(상여·연차 포함 가능)를 넣어 평균임금 관점의 퇴직금, 퇴직소득세·지방세, 실수령 추정치를 보여 줍니다. 회사 인사팀에 묻기 전에 대략적인 규모를 파악하거나, 퇴사 시점을 앞당길지 미룰지 감을 잡을 때 도움이 됩니다.</p>
          <p>확정기여형(DC)·IRP 등 제도에 따라 산정 방식이 다를 수 있으니, <strong>최종 금액은 회사·제도 기준</strong>을 확인하세요.</p>

          <h2>이렇게 사용하세요</h2>
          <ol>
            <li><strong>근속 기간 입력</strong> — 입사일과 퇴사일(예정일)을 넣습니다. 하루 차이로 연차가 갈리면 결과가 달라질 수 있습니다.</li>
            <li><strong>최근 급여 입력</strong> — 최근 3개월 급여와 상여·연차수당 등 안내된 항목을 채웁니다. 비정기 수당 포함 여부는 회사 규정에 따릅니다.</li>
            <li><strong>결과 확인</strong> — 세전 퇴직금, 예상 세금, 실수령을 나눠 보고 상세 표가 있으면 구성 항목을 훑습니다.</li>
          </ol>

          <h2>결과를 이렇게 해석하세요</h2>
          <p>법정 퇴직금의 기본 아이디어는 “평균임금 × 근속연수”에 가깝습니다. 평균임금은 단순히 기본급만이 아니라, 산정 사유 발생 이전 일정 기간의 임금 총액을 그 기간 일수로 나눈 개념으로 이해하면 쉽습니다. 그래서 퇴사 직전 급여가 일시적으로 높거나 낮으면 체감과 계산이 어긋날 수 있습니다.</p>
          <p>실수령은 세전 퇴직금에서 퇴직소득세·지방소득세 등을 뺀 금액입니다. 근속연수·퇴직소득 공제 구조 때문에 “세전 대비 세금 비율”이 일반 월급과 다르게 느껴질 수 있습니다. 중간정산·이직 사이 공백·DC 적립금은 이 화면 가정과 다를 수 있으니, 결과가 의사결정의 전부가 되어서는 안 됩니다.</p>
          <p>퇴직금을 주거 자금으로 쓸 계획이라면, 실수령 기준으로 계약금·이사비 버퍼를 다시 짜고 연봉 실수령·아파트 계산기와 연결해 보세요.</p>

          <h2>자주 하는 실수 / 주의할 점</h2>
          <ul>
            <li>DC/IRP인데 법정 퇴직금 공식만 보고 기대하기</li>
            <li>상여·연차를 빼먹거나 반대로 중복 입력하기</li>
            <li>세금 전 금액을 통장에 들어온 돈으로 착각하기</li>
          </ul>

          <h2>자주 묻는 질문 (FAQ)</h2>
          <div class="tool-content-faq">
            <details>
              <summary>Q. 1년 미만인데도 나오나요?</summary>
              <p>법정 퇴직금은 계속근로 1년 이상 등 요건이 있습니다. 단기간·수습·계약 형태는 회사 규정과 법률 요건을 확인하세요.</p>
            </details>
            <details>
              <summary>Q. 회사 계산과 다르면 어떻게 하나요?</summary>
              <p>평균임금 산입 항목·지급일·중간정산 이력이 원인인 경우가 많습니다. 급여명세서와 퇴직금 산정내역서를 대조하고 인사·노무에 문의하세요.</p>
            </details>
            <details>
              <summary>Q. 퇴직금을 주택 계약금으로 써도 되나요?</summary>
              <p>개인 선택이지만, 퇴사 시점과 잔금 일정이 어긋나면 자금 공백이 생깁니다. D-day·실수령 기준으로 일정표를 먼저 그려 보세요.</p>
            </details>
          </div>

          <h2>함께 보면 좋은 글</h2>
          <ul class="tool-content-links">
            <li><a href="/blog/post-27.html">1가구 1주택 양도세 비과세, 헷갈리던 3가지</a></li>
            <li><a href="/blog/post-43.html">7월 세제개편 방향 총정리</a></li>
            <li><a href="/blog/post-34.html">월급만으론 투자가 안 되겠더라고요</a></li>
          </ul>
          <p class="tool-content-note">퇴직금·세액은 제도·회사 규정에 따라 달라집니다. 본 결과는 참고용이며 법률·세무 자문이 아닙니다.</p>`
    ),
  },
};

function ensureCssLink(html, cssHref) {
  const tag = `<link rel="stylesheet" href="${cssHref}">`;
  if (html.includes('tool-content.css')) return html;
  // insert after last stylesheet link in head if possible
  const re = /(<link rel="stylesheet"[^>]*>)/gi;
  let last = null;
  let m;
  while ((m = re.exec(html))) last = m;
  if (last) {
    const idx = last.index + last[0].length;
    return html.slice(0, idx) + '\n  ' + tag + html.slice(idx);
  }
  return html.replace('</head>', `  ${tag}\n</head>`);
}

function upsertMeta(html, meta) {
  if (!meta) return html;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);
  if (/name="description"/.test(html)) {
    html = html.replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${meta.description}">`
    );
  } else {
    html = html.replace(
      /<title>[^<]*<\/title>/,
      (t) => `${t}\n  <meta name="description" content="${meta.description}">`
    );
  }
  if (/property="og:title"/.test(html)) {
    html = html.replace(
      /<meta property="og:title" content="[^"]*">/,
      `<meta property="og:title" content="${meta.ogTitle}">`
    );
  }
  if (/property="og:description"/.test(html)) {
    html = html.replace(
      /<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${meta.ogDescription}">`
    );
  }
  return html;
}

function stripExisting(html) {
  const re = new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, 'g');
  return html.replace(re, '');
}

function countKoreanish(text) {
  // count characters excluding tags roughly from section body
  const plain = text
    .replace(/<[^>]+>/g, '')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, '');
  return plain.length;
}

const report = [];

for (const [rel, cfg] of Object.entries(pages)) {
  const file = path.join(root, rel);
  let html = fs.readFileSync(file, 'utf8');
  html = stripExisting(html);
  html = ensureCssLink(html, cfg.cssHref);
  html = upsertMeta(html, cfg.meta);
  if (!html.includes(cfg.insertBefore)) {
    throw new Error(`insertBefore not found in ${rel}: ${cfg.insertBefore}`);
  }
  html = html.replace(cfg.insertBefore, `${cfg.section}\n\n  ${cfg.insertBefore}`);
  fs.writeFileSync(file, html);
  const chars = countKoreanish(cfg.section);
  report.push({ file: rel, chars });
  console.log(`OK ${rel} (~${chars} chars)`);
}

console.log('\nSUMMARY');
for (const r of report) console.log(`${r.chars}\t${r.file}`);
