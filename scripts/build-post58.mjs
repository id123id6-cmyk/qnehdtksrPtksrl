import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addPostUrl } from "./lib/sitemap-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const title = "서울 30평대 아파트, 내 연봉으로 가능할까 — 자치구별 필요연봉 지도";
const excerpt =
  "전용 60~85㎡를 염두에 두고 LTV 40%·DSR 40%·30년 원리금균등 공식으로 필요연봉을 역산하는 방법을 정리했습니다. 기준가 6억·9억·12억 예시만 계산했고, 자치구 시세는 직접 기입하는 빈칸으로 남겨 두었습니다.";
const date = "2026-11-16";
const alt = "계산기와 아파트 가격을 두고 필요연봉을 가늠하는 모습";

const districts = [
  "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구",
  "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구",
  "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구",
];

const districtRows = districts
  .map(
    (name) => `                <tr>
                  <td>${name}</td>
                  <td>—</td>
                  <td>—</td>
                </tr>`
  )
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-Y7SC73P9JW"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-Y7SC73P9JW', {
    'page_title': document.title,
    'page_path': window.location.pathname
  });
</script>

<!-- Microsoft Clarity -->
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "xbdrgqw1pj");
</script>

  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="google-adsense-account" content="ca-pub-8232968272801958">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8232968272801958" crossorigin="anonymous"></script>

  <title>${title} | 승박</title>
  <meta name="description" content="${excerpt}">
  <meta name="keywords" content="필요연봉, LTV, DSR, 서울 아파트, 30평대, 원리금균등, 승박 블로그">
  <meta name="robots" content="index, follow">
  <meta name="author" content="승박">
  <meta name="blog:category" content="real-estate">
  <link rel="canonical" href="https://seungbak.com/blog/post-58.html">

  <meta property="og:type" content="article">
  <meta property="og:url" content="https://seungbak.com/blog/post-58.html">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${excerpt}">
  <meta property="og:image" content="https://seungbak.com/blog/images/post-58/hero.png">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:site_name" content="승박">
  <meta property="article:published_time" content="${date}">
  <meta property="article:author" content="승박">

  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
  <link rel="stylesheet" href="../styles.css">
  <link rel="stylesheet" href="../css/global-theme.css">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${title}",
    "description": "${excerpt}",
    "datePublished": "${date}",
    "dateModified": "${date}",
    "author": { "@type": "Person", "name": "승박", "url": "https://seungbak.com/about.html" },
    "publisher": {
      "@type": "Organization",
      "name": "승박",
      "url": "https://seungbak.com"
    },
    "image": "https://seungbak.com/blog/images/post-58/hero.png",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://seungbak.com/blog/post-58.html"
    },
    "inLanguage": "ko-KR",
    "keywords": ["필요연봉", "LTV", "DSR", "서울 아파트", "원리금균등"]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "홈", "item": "https://seungbak.com/" },
      { "@type": "ListItem", "position": 2, "name": "블로그", "item": "https://seungbak.com/blog/" },
      { "@type": "ListItem", "position": 3, "name": "${title}", "item": "https://seungbak.com/blog/post-58.html" }
    ]
  }
  </script>
  <style>
    .post-article .cta-box {
      margin: 28px 0;
      padding: 24px 26px;
      border-radius: 16px;
      background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
      color: #fff;
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .post-article .cta-box:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(13, 148, 136, 0.35);
    }
    .post-article .cta-box .cta-icon { font-size: 32px; margin-bottom: 8px; }
    .post-article .cta-box h3 { margin: 0 0 8px; font-size: 20px; color: #fff; }
    .post-article .cta-box p { margin: 0 0 16px; font-size: 15px; color: #ccfbf1; }
    .post-article .cta-box .cta-button {
      display: inline-block;
      padding: 12px 24px;
      background: #fff;
      color: #0d9488;
      font-weight: 700;
      border-radius: 10px;
      text-decoration: none;
    }
    .post-article .cta-box .cta-button:hover { background: #f0fdfa; }
    .post-article .post-warn-box {
      margin: 24px 0;
      padding: 20px 22px;
      border-radius: 14px;
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border: 1px solid #fca5a5;
    }
    .post-article .post-warn-box h3 { margin: 0 0 12px; font-size: 18px; color: #991b1b; }
    .post-article .post-warn-box p, .post-article .post-warn-box li { color: #7f1d1d; line-height: 1.55; }
    .post-breadcrumb { font-size: 14px; color: var(--color-text-muted); margin-bottom: 16px; }
    .post-breadcrumb a { color: var(--color-dark); text-decoration: none; }
    .post-breadcrumb a:hover { text-decoration: underline; }
    .post-table-wrap { overflow-x: auto; margin: 16px 0 8px; }
    .post-table {
      width: 100%; border-collapse: collapse; font-size: 14px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
    }
    .post-table th, .post-table td {
      padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left;
    }
    .post-table thead th {
      background: #f0fdfa; color: #115e59; font-weight: 700; white-space: nowrap;
    }
    .post-table tbody tr:nth-child(even) { background: #f8fafc; }
    .post-formula {
      margin: 16px 0; padding: 16px 18px; border-radius: 12px;
      background: #f1f5f9; border: 1px solid #cbd5e1; font-size: 14px; line-height: 1.7;
    }
  </style>
</head>
<body class="theme-blog-post">
  <header class="site-header">
    <div class="container header-inner">
      <div class="logo"><a href="/">승박</a></div>
      <nav class="main-nav">
        <a href="/">홈</a>
        <a href="/tools/">도구</a>
        <a href="/blog/" class="active" aria-current="page">블로그</a>
        <a href="/about.html">소개</a>
        <a href="/contact.html">문의</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="section post-section">
      <div class="container">
        <article class="post-article card page-card" data-category="real-estate">
          <nav class="post-breadcrumb" aria-label="breadcrumb">
            <a href="/">홈</a> &gt; <a href="/blog/">블로그</a> &gt; 부동산
          </nav>

          <span class="blog-category-badge blog-category-badge--real-estate">🏢 부동산</span>
          <h1>${title}</h1>
          <p class="post-subtitle">시세를 새로 만들지 않고, LTV·DSR·원리금균등 공식으로 필요연봉만 역산합니다</p>

          <p class="post-meta">
            <time datetime="${date}">${date}</time>
            <span class="post-meta-sep">|</span>
            작성자: 승박
            <span class="post-meta-sep">|</span>
            8분 읽기
          </p>

          <figure class="post-figure">
            <img src="images/post-58/hero.png" alt="${alt}" width="1536" height="1024" loading="eager">
            <figcaption>필요연봉 계산 안내 이미지 (정보 제공용, 대출·투자 권유 아님)</figcaption>
          </figure>

          <div class="post-warn-box">
            <h3>이 글에서 하지 않는 것</h3>
            <p>
              자치구별 시세·중위가를 새로 쓰지 않습니다. 아래 숫자는
              <strong>기준가 6억·9억·12억</strong>에 LTV 40%·DSR 40%·금리 4.5%·30년 원리금균등
              공식을 적용해 계산한 값뿐입니다. 실제 대출 한도·금리는 금융기관 심사와
              정책에 따라 달라집니다.
            </p>
          </div>

          <p class="post-lead">
            “이 동네 30평대, 내 연봉으로 될까?”라는 질문은 시세 숫자부터 찾게 만들기 쉽습니다.
            오늘은 시세를 가정하지 않고, 사이트 계산기에서 쓰는 공개 공식만으로
            <strong>필요연봉을 역산하는 순서</strong>를 정리합니다.
            대상은 전용 60~85㎡(흔히 말하는 30평대)를 염두에 둔 서울 매수 시나리오입니다.
          </p>

          <h2>1. 계산에 쓰는 가정</h2>
          <p>
            본문 예시는 아래 네 가지를 고정합니다.
            ① 대출 비율 LTV 40%
            ② 총부채원리금상환비율 DSR 40%
            ③ 만기 30년, 원리금균등상환
            ④ 금리 4.5%(사이트 <a href="/tools/apt-calculator/">연봉 아파트 계산기</a> 기본 입력값과 동일).
            기존 부채는 0으로 둡니다. 스트레스 DSR(+1.5%p)은 이번 표에는 넣지 않았고,
            실제 심사에서는 더 보수적으로 잡힐 수 있습니다.
          </p>
          <div class="post-formula">
            <strong>필요연봉 공식</strong><br>
            1) 대출액 = 기준가 × LTV 40%<br>
            2) 월 원리금 = 원리금균등(대출액, 금리 4.5%, 30년)<br>
            3) 연 원리금 = 월 원리금 × 12<br>
            4) 필요연봉 = 연 원리금 ÷ DSR 40%<br>
            자기자금(참고) = 기준가 × (1 − LTV 40%) = 기준가 × 60%
          </div>

          <h2>2. 표 1 — 기준가 6억·9억·12억 공식 적용 예시</h2>
          <p>
            아래는 같은 공식을 세 기준가에 대입한 결과입니다.
            자치구 이름은 붙이지 않았습니다. 시세를 임의로 넣지 않기 위해서입니다.
          </p>
          <div class="post-table-wrap">
            <table class="post-table">
              <caption>필요연봉 계산 공식 적용 예시 (기준가 6억/9억/12억, LTV 40%·DSR 40%·금리 4.5%·30년)</caption>
              <thead>
                <tr>
                  <th scope="col">기준가</th>
                  <th scope="col">대출액 (LTV 40%)</th>
                  <th scope="col">자기자금 (60%)</th>
                  <th scope="col">월 원리금</th>
                  <th scope="col">연 원리금</th>
                  <th scope="col">필요연봉 (÷DSR 40%)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>6억 원</td>
                  <td>2억 4,000만 원</td>
                  <td>3억 6,000만 원</td>
                  <td>1,216,045원</td>
                  <td>14,592,537원</td>
                  <td><strong>약 3,648만 원</strong></td>
                </tr>
                <tr>
                  <td>9억 원</td>
                  <td>3억 6,000만 원</td>
                  <td>5억 4,000만 원</td>
                  <td>1,824,067원</td>
                  <td>21,888,805원</td>
                  <td><strong>약 5,472만 원</strong></td>
                </tr>
                <tr>
                  <td>12억 원</td>
                  <td>4억 8,000만 원</td>
                  <td>7억 2,000만 원</td>
                  <td>2,432,089원</td>
                  <td>29,185,074원</td>
                  <td><strong>약 7,296만 원</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            같은 LTV·DSR·금리·만기라면 기준가가 1.5배·2배로 커질 때 필요연봉도
            같은 배수로 커집니다. 표의 9억·12억 행은 6억 행의 1.5배·2배입니다.
          </p>

          <h2>3. 자치구별 메모표 — 기준가는 직접 기입</h2>
          <p>
            서울 25개 자치구 칸을 아래에 두었습니다.
            <strong>기준가·필요연봉 칸은 비워 두었습니다.</strong>
            관심 단지의 최근 실거래(또는 본인이 잡은 목표 가격)를 기입한 뒤,
            위 공식이나 사이트 계산기로 필요연봉을 채우면 됩니다.
          </p>
          <div class="post-table-wrap">
            <table class="post-table">
              <caption>서울 25개 자치구 메모표 (기준가·필요연봉은 직접 기입)</caption>
              <thead>
                <tr>
                  <th scope="col">자치구</th>
                  <th scope="col">내가 본 기준가 (전용 60~85㎡)</th>
                  <th scope="col">필요연봉 (공식 적용)</th>
                </tr>
              </thead>
              <tbody>
${districtRows}
              </tbody>
            </table>
          </div>

          <h2>4. 표 2 — 계산기에 넣을 값</h2>
          <div class="post-table-wrap">
            <table class="post-table">
              <caption>관련 계산기와 입력값 안내</caption>
              <thead>
                <tr>
                  <th scope="col">도구</th>
                  <th scope="col">링크</th>
                  <th scope="col">무엇을 넣나</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>필요 연봉·실수령 감</td>
                  <td><a href="/tools/income-calculator/">/tools/income-calculator/</a></td>
                  <td>세전 연봉·공제 항목을 넣어 실수령 구조를 먼저 확인. 대출 한도 낙관 전에 “세후 − 고정비”를 적는 용도.</td>
                </tr>
                <tr>
                  <td>연봉 아파트 계산기</td>
                  <td><a href="/tools/apt-calculator/">/tools/apt-calculator/</a></td>
                  <td>연봉·보유 현금·기존 월 상환·지역·LTV·금리·만기를 입력. 정방향(연봉→가능 가격)과 역방향(목표 가격→필요 현금·소득)을 모두 볼 수 있음.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            이번 표 1은 금리를 4.5%로 고정했고, 계산기 기본값과 맞춰 두었습니다.
            금리를 바꾸면 월 원리금과 필요연봉이 달라지니, 본인 조건을 넣을 때는
            계산기에서 금리·기존 부채를 함께 조정하세요.
          </p>

          <h2>5. 자주 묻는 질문</h2>
          <div class="post-faq">
            <h3>Q1. LTV·DSR이 뭔가요?</h3>
            <p>
              LTV(담보인정비율)는 집값 대비 대출 한도 비율입니다.
              이 글 예시의 LTV 40%는 “기준가의 40%까지 대출, 나머지 60%는 자기자금”으로 계산했다는 뜻입니다.
              DSR(총부채원리금상환비율)은 모든 가계대출의 연간 원리금 상환액을 연소득으로 나눈 비율입니다.
              은행권 차주단위 DSR은 통상 40% 이내로 안내됩니다.
            </p>

            <h3>Q2. 만기 30년은 고정인가요?</h3>
            <p>
              아닙니다. 이 글의 표는 비교를 위해 30년·원리금균등으로 고정한 예시입니다.
              만기가 짧아지면 월 원리금이 커져 같은 DSR 40%에서도 필요연봉이 올라갑니다.
              정책모기지 등은 상품·자격에 따라 40년·50년 구간이 있을 수 있으니,
              실제 신청 전에는 해당 상품 안내를 확인하세요.
            </p>

            <h3>Q3. 내 소득이면 어디까지 가능한가요? (공식으로만)</h3>
            <p>
              기존 부채가 없고 DSR 40%·금리 4.5%·30년·원리금균등·LTV 40%라면,
              연 원리금 한도 = 연소득 × 0.4 이고, 그 한도에 맞는 대출액을 역산한 뒤
              기준가 = 대출액 ÷ 0.4 로 올리면 됩니다.
              예: 연소득 5,000만 원이면 연 원리금 한도 2,000만 원 → 월 약 1,666,667원.
              이 월 상환에 대응하는 대출 원금을 역산한 뒤 LTV 40%로 나누면 기준가 상한이 나옵니다.
              기존 부채가 있으면 한도가 줄므로, 숫자만으로 단정하지 말고 계산기에 기존 월 상환을 넣으세요.
            </p>
          </div>

          <h2>6. 정리</h2>
          <p>
            오늘 글의 핵심은 “시세를 새로 만드는 것”이 아니라
            <strong>기준가를 넣은 뒤 같은 공식으로 필요연봉을 읽는 법</strong>입니다.
            표 1의 6억·9억·12억 행만 공식으로 채웠고, 자치구 칸은 빈칸으로 남겨 두었습니다.
          </p>

          <div class="cta-box">
            <div class="cta-icon" aria-hidden="true">🧮</div>
            <h3>숫자 넣어 바로 계산</h3>
            <p>연봉·현금·금리를 넣으면 매수 가능 가격대를 가늠할 수 있습니다.</p>
            <a href="/tools/apt-calculator/" class="cta-button">연봉 아파트 계산기 →</a>
          </div>

          <div class="post-sources">
            <p class="post-sources-title">📎 출처·참고</p>
            <ul>
              <li><a href="https://www.korea.kr/news/policyNewsView.do?newsId=148894892" target="_blank" rel="noopener">정책브리핑 — 가계부채 관리 방안 Q&amp;A (차주단위 DSR)</a></li>
              <li><a href="https://www.hf.go.kr/ko/sub01/sub01_01_01.do" target="_blank" rel="noopener">한국주택금융공사 — 보금자리론 상품소개 (LTV·DTI 안내)</a></li>
              <li>사이트 계산 로직: <a href="/tools/apt-calculator/">연봉 아파트 계산기</a> 원리금균등·DSR 역산</li>
            </ul>
            <p><em>계산 결과는 참고용이며, 실제 대출 가능 여부와 한도는 금융기관 심사·상품 조건에 따릅니다. 투자·세무 자문이 아닙니다.</em></p>
          </div>

          <div class="post-related">
            <p class="post-related-title">📌 관련 글</p>
            <ul>
              <li><a href="post-57.html">월세 세액공제 2026 — 최대 170만원 환급</a></li>
              <li><a href="post-32.html">KB 생애최초 주담대 한도 축소 — 디딤돌은?</a></li>
              <li><a href="post-21.html">보금자리론 vs 디딤돌, 월급쟁이는 뭐가 유리할까?</a></li>
            </ul>
          </div>

          <div class="post-author-box" itemscope itemtype="https://schema.org/Person">
            <img src="/images/about/profile.png" alt="승박 프로필 사진" class="post-author-avatar" width="72" height="72" loading="lazy">
            <div class="post-author-info">
              <p class="post-author-label">글쓴이</p>
              <p class="post-author-name" itemprop="name">승박</p>
              <p class="post-author-bio" itemprop="description">비전공자 생산관리 직장인이 직접 조사·작성합니다. 부동산 정책과 계산기를 월급쟁이 눈높이로 정리하는 <a href="/about.html">seungbak.com</a> 운영자입니다.</p>
              <p class="post-author-links">
                <a href="/about.html">운영자 소개</a>
                <span class="post-meta-sep">·</span>
                <a href="/contact.html">문의하기</a>
                <span class="post-meta-sep">·</span>
                <a href="mailto:id123id6@gmail.com">id123id6@gmail.com</a>
              </p>
            </div>
          </div>

          <p class="post-updated-footer">
            <time datetime="${date}">최초 게시: 2026년 11월 16일</time>
            <span class="post-meta-sep">·</span>
            <time datetime="${date}">최종 수정: 2026년 11월 16일</time>
          </p>

          <nav class="post-nav" aria-label="글 네비게이션">
            <a href="post-57.html" class="post-nav-link">← 이전 글: 월세 세액공제 2026</a>
            <a href="/blog/" class="post-nav-link">블로그 목록 →</a>
          </nav>

          <p class="post-disclaimer">
            <em>
              본 글은 2026년 11월 16일 기준 정보이며, 대출 규제·금리는 변경될 수 있습니다.
              계산 결과는 참고용입니다. 실제 대출은 금융기관·공식 안내를 확인하세요.
            </em>
          </p>
        </article>
      </div>
    </section>
  </main>

  <footer class="theme-footer">
  <div class="theme-footer-inner">
    <div class="theme-footer-brand">
      <div class="theme-footer-logo">seungbak.com</div>
      <div class="theme-footer-desc">부동산 정보를 한 곳에서, 무료 도구</div>
    </div>
    <div class="theme-footer-links">
      <div class="theme-footer-col">
        <div class="theme-footer-title">도구</div>
        <a href="/tools/realestate-map/" class="theme-link">실거래가 지도</a>
        <a href="/tools/bunyang-alarm/" class="theme-link">분양 알리미</a>
        <a href="/tools/subscription-calculator/" class="theme-link">청약 가점 계산기</a>
      </div>
      <div class="theme-footer-col">
        <div class="theme-footer-title">정보</div>
        <a href="/blog/" class="theme-link">블로그</a>
        <a href="/about.html" class="theme-link">소개</a>
        <a href="/contact.html" class="theme-link">문의</a>
      </div>
      <div class="theme-footer-col">
        <div class="theme-footer-title">정책</div>
        <a href="/privacy.html" class="theme-link">개인정보처리방침</a>
        <a href="/terms.html" class="theme-link">이용약관</a>
        <a href="/disclaimer.html" class="theme-link">면책조항</a>
      </div>
    </div>
    <div class="theme-footer-bottom">
      <div>© 2026 seungbak.com</div>
      <div>
        <a href="https://www.instagram.com/seungbak.tools/" target="_blank" rel="noopener" class="theme-link">@seungbak.tools</a>
        ·
        <a href="mailto:id123id6@gmail.com" class="theme-link">id123id6@gmail.com</a>
      </div>
    </div>
  </div>
</footer>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "blog", "post-58.html"), html, "utf8");

// blog/index.html card
const blogIndexPath = path.join(root, "blog", "index.html");
let blogIndex = fs.readFileSync(blogIndexPath, "utf8");
const card = `<a href="post-58.html" class="blog-card fade-in has-thumbnail" data-category="real-estate">
          <div class="blog-card-thumbnail">
            <img src="images/post-58/hero.png" alt="${alt}" loading="lazy">
          </div>
            <div class="blog-card-content">
              <span class="blog-category-badge blog-card-category blog-category-badge--real-estate">🏢 부동산</span>
              <h3 class="blog-card-title">${title}</h3>
              <p class="blog-card-excerpt">${excerpt}</p>
              <div class="blog-card-meta">
                <time class="blog-card-date" datetime="${date}">${date}</time>
                <span class="blog-card-readtime">8분 읽기</span>
              </div>
            </div>
          </a>

`;
if (!blogIndex.includes("post-58.html")) {
  blogIndex = blogIndex.replace(
    '<div class="blog-grid" id="blog-grid">\n',
    `<div class="blog-grid" id="blog-grid">\n${card}`
  );
  fs.writeFileSync(blogIndexPath, blogIndex, "utf8");
}

// posts.json
const postsPath = path.join(root, "blog", "posts.json");
const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));
if (!posts.posts.some((p) => p.id === 58)) {
  posts.posts.unshift({
    id: 58,
    slug: "post-58.html",
    href: "/blog/post-58.html",
    category: "real-estate",
    image: "/blog/images/post-58/hero.png",
    alt,
    tag: "부동산",
    title,
    excerpt,
    date,
  });
  posts.count = posts.posts.length;
  posts.updatedAt = "2026-11-16T00:00:00.000Z";
  fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2) + "\n", "utf8");
}

// rss
const rssPath = path.join(root, "blog", "rss.xml");
let rss = fs.readFileSync(rssPath, "utf8");
if (!rss.includes("post-58.html")) {
  const item = `    <item>
      <title>${title}</title>
      <link>https://seungbak.com/blog/post-58.html</link>
      <guid isPermaLink="true">https://seungbak.com/blog/post-58.html</guid>
      <pubDate>Sun, 16 Nov 2026 00:00:00 GMT</pubDate>
      <description><![CDATA[${excerpt}]]></description>
    </item>
`;
  rss = rss.replace(
    '<atom:link href="https://seungbak.com/blog/rss.xml" rel="self" type="application/rss+xml"/>\n',
    `<atom:link href="https://seungbak.com/blog/rss.xml" rel="self" type="application/rss+xml"/>\n${item}`
  );
  rss = rss.replace(
    /<lastBuildDate>.*?<\/lastBuildDate>/,
    "<lastBuildDate>Sun, 16 Nov 2026 00:00:00 GMT</lastBuildDate>"
  );
  fs.writeFileSync(rssPath, rss, "utf8");
}

// root index — keep 6 cards: add 58, remove 52
const indexPath = path.join(root, "index.html");
let index = fs.readFileSync(indexPath, "utf8");
if (!index.includes("/blog/post-58.html")) {
  const homeCard = `          <a href="/blog/post-58.html" class="hr-blog-card">
            <div class="hr-blog-thumb">
              <img src="/images/main/thumbs/post-58.webp" alt="${alt}" loading="lazy" decoding="async" width="400" height="225">
            </div>
            <div class="hr-blog-body">
              <span class="hr-blog-tag">부동산</span>
              <h3 class="hr-blog-title">${title}</h3>
              <p class="hr-blog-excerpt">${excerpt}</p>
              <time class="hr-blog-date" datetime="${date}">${date}</time>
            </div>
          </a>
`;
  index = index.replace(
    '<div class="hr-blog-grid" id="hr-blog-grid">\n',
    `<div class="hr-blog-grid" id="hr-blog-grid">\n${homeCard}`
  );
  // remove post-52 card block
  index = index.replace(
    /\s*<a href="\/blog\/post-52\.html" class="hr-blog-card">[\s\S]*?<\/a>\n/,
    "\n"
  );
  fs.writeFileSync(indexPath, index, "utf8");
}

// sitemap — 글 URL 1개 + 홈·/blog/ lastmod 갱신 (llms.txt 제외는 유지)
const sitemapPath = path.join(root, "sitemap.xml");
addPostUrl(sitemapPath, {
  slug: "post-58.html",
  date,
  insertBeforeLoc: "https://seungbak.com/blog/post-57.html",
});

const homeCards = (fs.readFileSync(indexPath, "utf8").match(/class="hr-blog-card"/g) || []).length;
const loc = (fs.readFileSync(sitemapPath, "utf8").match(/<loc>/g) || []).length;
const pj = JSON.parse(fs.readFileSync(postsPath, "utf8"));
console.log({
  homeCards,
  loc,
  postsCount: pj.count,
  postsLen: pj.posts.length,
  firstId: pj.posts[0].id,
});
