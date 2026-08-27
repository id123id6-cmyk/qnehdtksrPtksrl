/**
 * GEO (Generative Engine Optimization) — Week 1~2 적용
 * Anthropic Claude bots + OpenAI bots + llms.txt + Author 스키마 보강
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SITE = 'https://seungbak.com';
const TODAY = '2026-08-27';

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}
function write(p, s) {
  fs.writeFileSync(path.join(ROOT, p), s, 'utf8');
}

function writeRobots() {
  write(
    'robots.txt',
    `# seungbak.com robots.txt
# SEO: Google / Naver(Yeti)
# GEO: Anthropic Claude + OpenAI ChatGPT search/crawlers
# https://privacy.claude.com/en/articles/8896518
# https://developers.openai.com/api/docs/bots

User-agent: *
Allow: /

# --- Naver ---
User-agent: Yeti
Allow: /

# --- Anthropic (Claude) ---
# Claude-SearchBot: 검색 결과 품질·노출
User-agent: Claude-SearchBot
Allow: /

# Claude-User: 사용자가 Claude에 물어볼 때 페이지 조회
User-agent: Claude-User
Allow: /

# ClaudeBot: 모델 학습용 수집 (콘텐츠 미디어 노출 목적상 허용)
User-agent: ClaudeBot
Allow: /

# --- OpenAI (ChatGPT) ---
# OAI-SearchBot: ChatGPT 검색 결과에 사이트 노출 (opt-out 시 검색 답변에 미표시)
User-agent: OAI-SearchBot
Allow: /

# GPTBot: 파운데이션 모델 학습용 (허용 시 학습 데이터 후보에 포함)
User-agent: GPTBot
Allow: /

# ChatGPT-User: 사용자 질문 시 페이지 조회 (robots 미적용일 수 있음, 명시 허용)
User-agent: ChatGPT-User
Allow: /

Sitemap: ${SITE}/sitemap.xml
# AI 요약 가이드: ${SITE}/llms.txt
`
  );
  console.log('✓ robots.txt (GEO bots Allow)');
}

function buildLlmsTxt() {
  const data = JSON.parse(read('blog/posts.json'));
  const byTag = new Map();
  for (const p of data.posts) {
    const tag = p.tag || '기타';
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag).push(p);
  }

  const tools = [
    ['실거래가 지도', '/tools/realestate-map/', '전국 아파트 실거래가 시세를 지도에서 조회'],
    ['분양 알리미', '/tools/bunyang-alarm/', '청약·분양 일정과 D-Day'],
    ['청약 가점 계산기', '/tools/subscription-calculator/', '민영주택 청약 가점 84점 만점 계산'],
    ['월급 실수령액 계산기', '/tools/salary-calculator/', '세후 월급 추정'],
    ['아파트 계산기', '/tools/apt-calculator/', '대출·상환 감 잡기'],
    ['필요 연봉 계산기', '/tools/income-calculator/', '집값 대비 필요 연봉'],
    ['D-day 계산기', '/tools/dday-calculator/', '청약·계약 일정 카운트'],
    ['퇴직금 계산기', '/tools/severance-calculator/', '퇴직금·퇴직소득 감 잡기'],
  ];

  let md = `# seungbak.com

> 월급쟁이 눈높이의 부동산·세금·청약·노후 정보 사이트. 실거래가 지도와 무료 계산 도구, 초보용 블로그를 제공합니다.
> 운영자: 승박 (생산관리 직장인). 전문가 자문이 아닌 정보 참고용입니다. 정확한 신고·신청은 국세청·청약홈·공식 기관을 확인하세요.

사이트: ${SITE}/
소개(작성자): ${SITE}/about.html
블로그: ${SITE}/blog/
RSS: ${SITE}/blog/rss.xml
사이트맵: ${SITE}/sitemap.xml
용어집: ${SITE}/glossary.html
전체 요약(긴 버전): ${SITE}/llms-full.txt

## 원칙

- 초보·월급쟁이 독자 눈높이로 제도를 풀어 씀
- 특정 지역·매수 권유 없음. 정보 제공·계산 보조 목적
- 출처: 국세청 홈택스, 청약홈, 국토교통부, 국민연금공단, 한국주택금융공사 등 공식 안내를 우선 참조
- 언어: 한국어 (ko-KR)

## 주요 도구

`;
  for (const [name, href, desc] of tools) {
    md += `- [${name}](${SITE}${href}): ${desc}\n`;
  }

  md += `\n## 블로그 (카테고리별 대표 글)\n\n`;
  for (const [tag, posts] of [...byTag.entries()].sort((a, b) => b[1].length - a[1].length)) {
    md += `### ${tag}\n`;
    for (const p of posts.slice(0, 5)) {
      md += `- [${p.title}](${SITE}/blog/${p.slug}): ${p.excerpt}\n`;
    }
    md += `\n`;
  }

  md += `## 작성자

- 이름: 승박
- 프로필: ${SITE}/about.html
- 역할: seungbak.com 1인 기획·개발·운영
- 연락: id123id6@gmail.com
- Instagram: https://www.instagram.com/seungbak.tools/

## Optional

- [개인정보처리방침](${SITE}/privacy.html)
- [이용약관](${SITE}/terms.html)
- [면책조항](${SITE}/disclaimer.html)
`;

  write('llms.txt', md);

  // llms-full: all posts + more body excerpts
  let full = md + `\n## 전체 글 목록 (${data.posts.length})\n\n`;
  for (const p of data.posts) {
    full += `### ${p.title}\n`;
    full += `- URL: ${SITE}/blog/${p.slug}\n`;
    full += `- 날짜: ${p.date}\n`;
    full += `- 카테고리: ${p.tag}\n`;
    full += `- 요약: ${p.excerpt}\n\n`;
  }
  write('llms-full.txt', full);
  console.log('✓ llms.txt + llms-full.txt');
}

function enhanceAuthorSchema() {
  const blogDir = path.join(ROOT, 'blog');
  const files = fs.readdirSync(blogDir).filter((f) => /^post-\d+\.html$/.test(f));
  const oldAuthor = '"author": { "@type": "Person", "name": "승박" }';
  const newAuthor = `"author": { "@type": "Person", "name": "승박", "url": "${SITE}/about.html" }`;
  let n = 0;
  for (const f of files) {
    let html = read(`blog/${f}`);
    if (html.includes('"url": "https://seungbak.com/about.html"') && html.includes('"author"')) {
      // already enhanced if pattern matches
    }
    if (html.includes(oldAuthor)) {
      html = html.replace(oldAuthor, newAuthor);
      write(`blog/${f}`, html);
      n++;
    } else if (
      html.includes('"@type": "Person", "name": "승박"') &&
      !html.includes('"name": "승박", "url":')
    ) {
      html = html.replace(
        /"author":\s*\{\s*"@type":\s*"Person",\s*"name":\s*"승박"\s*\}/g,
        newAuthor
      );
      write(`blog/${f}`, html);
      n++;
    }
  }
  console.log(`✓ Article author.url 보강 (${n} posts)`);
}

function writeGlossary() {
  const terms = [
    ['1세대 1주택 비과세', 'One household, one home capital gains tax exemption', '양도소득세에서 1세대가 국내 1주택만 보유하고 보유·거주 요건 등을 충족하면 일정 한도까지 비과세되는 제도.'],
    ['양도소득세', 'Capital gains tax', '부동산을 팔아 생긴 이익(양도차익)에 매기는 세금. 신고는 보통 양도일이 속한 달의 말일부터 2개월 이내.'],
    ['조정대상지역', 'Adjustment-targeted area', '투기 억제 등을 위해 지정되는 지역. 취득 당시 지정 여부가 거주요건 판정에 중요.'],
    ['장기보유특별공제', 'Long-term holding special deduction', '오래 보유·거주할수록 양도차익에서 빼 주는 공제. 1세대 1주택 특례는 보유·거주 합산 최대 80%.'],
    ['일시적 2주택', 'Temporary two-home rule', '이사 과정에서 잠깐 2주택이 된 경우, 순서·기한(예: 신규 취득 후 3년 내 종전 처분)을 지키면 1주택으로 보는 특례.'],
    ['고가주택(12억)', 'High-priced home threshold', '실거래가 12억 초과 시 초과분만 과세 대상이 되는 안분 구조. 전액 과세가 아님.'],
    ['주택연금', 'Home pension / reverse mortgage', '집을 담보로 평생(또는 약정) 연금을 받는 한국주택금융공사 상품.'],
    ['청약 가점', 'Subscription point score', '민영주택 가점제에서 무주택기간·부양가족·통장가입기간으로 산정하는 점수(만점 84점).'],
    ['DSR', 'Debt Service Ratio', '연소득 대비 원리금 상환액 비율. 대출 한도를 가르는 핵심 규제 지표.'],
    ['IRP', 'Individual Retirement Pension', '개인형 퇴직연금. 세액공제·퇴직금 이연 등에 쓰임.'],
  ];

  const rows = terms
    .map(
      ([ko, en, def]) =>
        `        <tr><th scope="row">${ko}<br><span style="font-weight:400;color:#64748b;font-size:13px">${en}</span></th><td>${def}</td></tr>`
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>부동산·세금 용어집 | 승박</title>
  <meta name="description" content="1세대 1주택 비과세, 양도세, 장특공제, 일시적 2주택, 주택연금, 청약 가점 등 seungbak.com에서 자주 쓰는 용어를 한국어·영어로 정리한 용어집.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${SITE}/glossary.html">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE}/glossary.html">
  <meta property="og:title" content="부동산·세금 용어집 | 승박">
  <meta property="og:description" content="AI·검색엔진이 엔티티를 맞추기 쉽도록 핵심 용어를 한국어·영어로 정리했습니다.">
  <meta property="og:image" content="${SITE}/images/og-image.png">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="css/global-theme.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "name": "seungbak.com 부동산·세금 용어집",
    "url": "${SITE}/glossary.html",
    "inLanguage": "ko-KR",
    "description": "부동산·양도세·청약·연금 관련 핵심 용어 정의"
  }
  </script>
</head>
<body class="theme-policy-page">
<nav class="theme-nav">
  <div class="theme-nav-inner">
    <a href="/" class="theme-nav-logo">seungbak.com</a>
    <div class="theme-nav-menu">
      <a href="/tools/realestate-map/" class="theme-nav-item">지도</a>
      <a href="/tools/" class="theme-nav-item">도구</a>
      <a href="/blog/" class="theme-nav-item">블로그</a>
      <a href="/about.html" class="theme-nav-item">소개</a>
    </div>
  </div>
</nav>
<main>
  <section class="theme-page-hero">
    <div class="theme-page-container">
      <h1 class="theme-h1">부동산·세금 용어집</h1>
      <p class="theme-page-hero-tagline">검색·AI가 같은 개념을 맞추도록, 한국어 정식명과 영어를 함께 적었습니다.</p>
    </div>
  </section>
  <section class="theme-section theme-section--beige">
    <div class="theme-page-container theme-prose">
      <p>이 페이지는 seungbak.com 블로그·도구에서 반복되는 용어를 짧게 정의합니다. 제도 세부는 시기·지역에 따라 달라지므로 <strong>국세청 홈택스·청약홈 등 공식 안내</strong>를 기준으로 확인하세요.</p>
      <div class="post-table-wrap" style="overflow-x:auto">
        <table class="post-table" style="width:100%;border-collapse:collapse;background:#fff">
          <thead>
            <tr><th scope="col">용어</th><th scope="col">한 줄 정의</th></tr>
          </thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </div>
      <p style="margin-top:24px"><a href="/blog/">블로그로 돌아가기</a> · <a href="/llms.txt">llms.txt</a></p>
    </div>
  </section>
</main>
<footer class="theme-footer">
  <div class="theme-footer-inner">
    <div class="theme-footer-brand">
      <div class="theme-footer-logo">seungbak.com</div>
      <div class="theme-footer-desc">부동산 정보를 한 곳에서, 무료 도구</div>
    </div>
    <div class="theme-footer-bottom">
      <div>© 2026 seungbak.com</div>
    </div>
  </div>
</footer>
</body>
</html>
`;
  write('glossary.html', html);
  console.log('✓ glossary.html');
}

function patchAboutPerson() {
  let html = read('about.html');
  const personLd = `{
      "@type": "Person",
      "name": "승박",
      "url": "${SITE}/about.html",
      "image": "${SITE}/images/about/profile.png",
      "jobTitle": "생산관리 직장인",
      "description": "월급쟁이 눈높이로 부동산·세금·청약·노후 정보를 정리하는 seungbak.com 운영자",
      "worksFor": { "@type": "Organization", "name": "seungbak.com", "url": "${SITE}/" },
      "sameAs": ["https://www.instagram.com/seungbak.tools/"],
      "knowsAbout": ["부동산", "양도소득세", "청약", "주택연금", "퇴직소득세", "실거래가"]
    }`;
  html = html.replace(
    /"mainEntity":\s*\{[\s\S]*?\}\s*\n\s*\}/,
    `"mainEntity": ${personLd}\n  }`
  );
  write('about.html', html);
  console.log('✓ about.html Person E-E-A-T 보강');
}

function patchIndexLinks() {
  let html = read('index.html');
  if (!html.includes('llms.txt')) {
    html = html.replace(
      '<link rel="alternate" type="application/rss+xml" title="승박 블로그 RSS" href="https://seungbak.com/blog/rss.xml">',
      `<link rel="alternate" type="application/rss+xml" title="승박 블로그 RSS" href="https://seungbak.com/blog/rss.xml">
  <link rel="alternate" type="text/plain" title="llms.txt" href="https://seungbak.com/llms.txt">`
    );
  }
  // footer glossary
  if (!html.includes('glossary.html')) {
    html = html.replace(
      '<li><a href="/blog/">블로그</a></li>',
      '<li><a href="/blog/">블로그</a></li>\n            <li><a href="/glossary.html">용어집</a></li>'
    );
  }
  write('index.html', html);
  console.log('✓ index.html llms.txt / glossary 링크');
}

function addGlossaryToSitemap() {
  let sm = read('sitemap.xml');
  if (sm.includes('/glossary.html')) {
    console.log('· sitemap already has glossary');
    return;
  }
  const entry = `
  <url>
    <loc>${SITE}/glossary.html</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <url>
    <loc>${SITE}/llms.txt</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.4</priority>
  </url>
`;
  sm = sm.replace('</urlset>', `${entry}</urlset>\n`);
  write('sitemap.xml', sm);
  console.log('✓ sitemap glossary + llms.txt');
}

function enhanceRecentFaqSchema() {
  // post-53 has FAQ section — add FAQPage if not present
  const file = 'blog/post-53.html';
  let html = read(file);
  if (html.includes('FAQPage')) {
    console.log('· post-53 already FAQPage');
    return;
  }
  const faq = `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "분양권·입주권도 주택 수에 포함되나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "경우에 따라 주택 수 판정에 영향을 줄 수 있습니다. 아직 입주 전이라고 0주택으로 단정하지 말고 국세청 홈택스·세무 전문가 확인이 필요합니다."
        }
      },
      {
        "@type": "Question",
        "name": "일시적 2주택에서 신규주택을 먼저 사도 되나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "일시적 2주택 특례는 종전 취득 후 1년 경과 → 신규 취득 → 신규 취득일부터 3년 이내 종전 처분 순서가 핵심입니다. 무조건 신규 먼저가 되는 구조가 아닙니다."
        }
      },
      {
        "@type": "Question",
        "name": "세대 분리하면 1주택으로 보나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "형식적 분리만으로 세대가 나뉜다고 단정할 수 없습니다. 실질적 생활·등록·주택 보유 현황을 보므로 절세 목적 분리는 리스크가 큽니다."
        }
      }
    ]
  }
  </script>`;
  html = html.replace('</head>', `${faq}\n</head>`);
  write(file, html);
  console.log('✓ post-53 FAQPage schema');
}

writeRobots();
buildLlmsTxt();
enhanceAuthorSchema();
writeGlossary();
patchAboutPerson();
patchIndexLinks();
addGlossaryToSitemap();
enhanceRecentFaqSchema();
console.log('\nGEO Week1-2 applied.');
