/**
 * Add short tool-top intros and ensure related blog links use full titles.
 * Does NOT modify the detailed tool-content guide body beyond the related-links list.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const posts = JSON.parse(fs.readFileSync(path.join(root, 'blog/posts.json'), 'utf8')).posts;
const byId = Object.fromEntries(posts.map((p) => [p.id, p]));

const INTRO_START = '<!-- tool-top-intro:start -->';
const INTRO_END = '<!-- tool-top-intro:end -->';

function introBlock(text) {
  return `${INTRO_START}
    <section class="section tool-top-intro-section" aria-label="도구 한줄 소개">
      <div class="container">
        <p class="tool-top-intro">${text}</p>
      </div>
    </section>
${INTRO_END}`;
}

function linksHtml(ids) {
  const items = ids.map((id) => {
    const p = byId[id];
    if (!p) throw new Error(`Missing post ${id}`);
    return `            <li><a href="${p.href}">${p.title}</a></li>`;
  });
  return `          <ul class="tool-content-links">
${items.join('\n')}
          </ul>`;
}

const pages = [
  {
    file: 'tools/bunyang-alarm/index.html',
    insertBefore: '<section class="section" id="list">',
    intro:
      '전국 아파트 청약·분양 공고를 지역과 접수 상태별로 모아 보여드립니다. 매일 열어보며 지금 넣을 수 있는 공고를 놓치지 마세요. 자세한 사용법은 아래 가이드를 참고하세요.',
    linkIds: [42, 44, 24],
  },
  {
    file: 'tools/subscription-calculator/index.html',
    insertBefore: '<section class="section" id="calculator">',
    intro:
      '무주택 기간·부양가족·청약통장 가입기간을 넣으면 청약 가점을 바로 계산합니다. 청약 넣기 전에 내 점수가 어느 정도인지 먼저 확인해 보세요. 점수 해석 방법은 아래 가이드에 정리해 두었습니다.',
    linkIds: [42, 44, 22],
  },
  {
    file: 'tools/income-calculator/index.html',
    insertBefore: '<section class="section" id="calculator">',
    intro:
      '연봉만 입력하면 4대보험과 세금을 반영한 월·연 실수령액을 바로 보여 줍니다. 세전 연봉만 보고 생활비를 짜다 빠듯해지는 실수를 줄일 때 쓰세요. 공제 항목 설명은 아래 가이드를 보시면 됩니다.',
    linkIds: [34, 36, 21],
  },
  {
    file: 'tools/salary-calculator/index.html',
    insertBefore: '<section class="section" id="calculator">',
    intro:
      '원하는 아파트 가격을 넣으면 DSR·LTV 관점에서 필요한 연봉과 월 상환을 역산합니다. “이 집 사려면 연봉이 얼마여야 하지?”가 궁금할 때 먼저 돌려 보세요. 결과 읽는 법은 아래 가이드에 있습니다.',
    linkIds: [32, 21, 23],
  },
  {
    file: 'tools/apt-calculator/index.html',
    insertBefore: '<!-- 입력 폼 섹션 -->',
    intro:
      '내 연봉·현금·기존 대출을 넣으면 매수 가능한 아파트 가격대를 가늠해 줍니다. 임장 가기 전에 예산 상한선을 그어 두는 용도로 쓰기 좋습니다. 병목이 LTV인지 DSR인지는 아래 가이드에서 풀어 두었습니다.',
    linkIds: [25, 26, 32],
  },
  {
    file: 'tools/dday-calculator/index.html',
    insertBefore: '<section class="section" id="calculator">',
    intro:
      '목표가·현재 자산·월 저축으로 아파트 매수까지 남은 기간을 시뮬레이션합니다. “언제쯤 살 수 있을까?”를 감이 아닌 숫자로 보고 싶을 때 사용하세요. 가정값을 바꾸는 팁은 아래 가이드를 참고하세요.',
    linkIds: [29, 40, 35],
  },
  {
    file: 'tools/severance-calculator/index.html',
    insertBefore: '<section class="section" id="calculator">',
    intro:
      '입사일·퇴사일과 최근 급여를 넣으면 퇴직금과 예상 세금·실수령을 계산합니다. 이직·퇴사 전 대략적인 규모를 먼저 파악할 때 도움이 됩니다. 평균임금 개념은 아래 가이드에서 확인하세요.',
    linkIds: [27, 43, 34],
  },
  {
    file: 'tools/realestate-map/index.html',
    insertBefore: '<div class="map-page-shell">',
    intro:
      '전국 아파트 단지 실거래가(매매·전세)를 지도에서 바로 확인할 수 있습니다. 호가만 보지 말고, 실제로 체결된 가격으로 시세를 가늠해 보세요. 면적별 해석 방법은 페이지 아래 가이드에 모아 두었습니다.',
    linkIds: [29, 30, 38],
  },
];

const report = [];

for (const cfg of pages) {
  const file = path.join(root, cfg.file);
  let html = fs.readFileSync(file, 'utf8');

  // strip previous intro if re-run
  html = html.replace(new RegExp(`${INTRO_START}[\\s\\S]*?${INTRO_END}\\n?`, 'g'), '');

  if (!html.includes(cfg.insertBefore)) {
    throw new Error(`insertBefore not found: ${cfg.file} :: ${cfg.insertBefore.slice(0, 60)}`);
  }
  html = html.replace(cfg.insertBefore, `${introBlock(cfg.intro)}\n\n    ${cfg.insertBefore}`);

  // Replace related links block after "함께 보면 좋은 글"
  const linksRe = /(<h2>함께 보면 좋은 글<\/h2>\s*)<ul class="tool-content-links">[\s\S]*?<\/ul>/;
  if (!linksRe.test(html)) {
    throw new Error(`related links block not found: ${cfg.file}`);
  }
  html = html.replace(linksRe, `$1${linksHtml(cfg.linkIds)}`);

  fs.writeFileSync(file, html);
  report.push({
    file: cfg.file,
    intro: true,
    links: cfg.linkIds.length,
    titles: cfg.linkIds.map((id) => byId[id].title),
  });
  console.log('OK', cfg.file, 'links=', cfg.linkIds.length);
}

console.log(JSON.stringify(report, null, 2));
