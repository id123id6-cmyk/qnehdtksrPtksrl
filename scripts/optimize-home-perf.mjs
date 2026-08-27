import fs from 'fs';

const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');

// 1) Replace entire <head> opening through stylesheets with optimized head start
const headStart = `<!-- Google tag (gtag.js) -->`;
const headEndMarker = `<link rel="stylesheet" href="css/main-redesign.css">`;

const newHeadAssets = `  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="naver-site-verification" content="2a8cd3a503e59b3fb6f24c2d761e945be988b654" />
  <meta name="google-adsense-account" content="ca-pub-8232968272801958">

  <title>서울 부동산 실거래가 + 직장인 도구 모음 | 승박이형</title>
  <meta name="description" content="내 월급으로 살 수 있는 집은 어디? 서울·경기 13,412개 단지 실거래가 47만건을 지도 한 장으로. 월급쟁이를 위한 무료 부동산 지도">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://seungbak.com/">
  <link rel="alternate" type="application/rss+xml" title="승박 블로그 RSS" href="https://seungbak.com/blog/rss.xml">
  <link rel="alternate" type="text/plain" title="llms.txt" href="https://seungbak.com/llms.txt">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://seungbak.com/">
  <meta property="og:title" content="서울 부동산 실거래가 + 직장인 도구 모음 | 승박이형">
  <meta property="og:description" content="내 월급으로 살 수 있는 집은 어디? 서울·경기 13,412개 단지 실거래가 47만건을 지도 한 장으로. 월급쟁이를 위한 무료 부동산 지도">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:site_name" content="승박">
  <meta property="og:image" content="https://seungbak.com/images/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="seungbak.com 부동산 실거래가 지도와 무료 계산 도구">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="서울 부동산 실거래가 + 직장인 도구 모음 | 승박이형">
  <meta name="twitter:description" content="내 월급으로 살 수 있는 집은 어디? 서울·경기 13,412개 단지 실거래가 47만건을 지도 한 장으로. 월급쟁이를 위한 무료 부동산 지도">
  <meta name="twitter:image" content="https://seungbak.com/images/og-image.png">

  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">

  <link rel="preload" href="/css/main-redesign.css" as="style">
  <link rel="stylesheet" href="/css/main-redesign.css">
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="preload" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"></noscript>`;

const i0 = html.indexOf(headStart);
const i1 = html.indexOf(headEndMarker);
if (i0 < 0 || i1 < 0) throw new Error('head markers not found');
html = html.slice(0, i0) + newHeadAssets + html.slice(i1 + headEndMarker.length);

// remove leftover charset/viewport/naver that might duplicate if structure differs - check
// Actually we replaced from Google tag through main-redesign, so charset block that was AFTER clarity is gone. Good.

html = html.replace(
  `<img src="/images/main/map-preview.png" alt="seungbak.com 실거래가 지도 미리보기" width="1200" height="800" loading="lazy">`,
  `<picture>
                <source srcset="/images/main/map-preview.webp" type="image/webp">
                <img src="/images/main/map-preview.jpg" alt="seungbak.com 실거래가 지도 미리보기" width="640" height="427" loading="lazy" decoding="async">
              </picture>`
);

html = html.replace(
  `<img src="/tools/bunyang-alarm/images/apt-1.jpg" alt="분양 알리미 미리보기" width="960" height="640" loading="lazy">`,
  `<picture>
                <source srcset="/images/main/bunyang-preview.webp" type="image/webp">
                <img src="/images/main/bunyang-preview.jpg" alt="분양 알리미 미리보기" width="640" height="427" loading="lazy" decoding="async">
              </picture>`
);

html = html.replace(
  /(<div class="hr-blog-thumb">\s*<img src="[^"]+" alt="[^"]+") loading="lazy">/g,
  '$1 loading="lazy" decoding="async" width="400" height="225">'
);

const deferredThirdParty = `
  <script>
    (function () {
      function loadThirdParty() {
        var g = document.createElement("script");
        g.async = true;
        g.src = "https://www.googletagmanager.com/gtag/js?id=G-Y7SC73P9JW";
        document.head.appendChild(g);
        window.dataLayer = window.dataLayer || [];
        function gtag(){ dataLayer.push(arguments); }
        window.gtag = gtag;
        gtag("js", new Date());
        gtag("config", "G-Y7SC73P9JW", {
          page_title: document.title,
          page_path: window.location.pathname
        });

        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "xbdrgqw1pj");

        var a = document.createElement("script");
        a.async = true;
        a.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8232968272801958";
        a.crossOrigin = "anonymous";
        document.head.appendChild(a);
      }
      function schedule() {
        if ("requestIdleCallback" in window) {
          requestIdleCallback(loadThirdParty, { timeout: 3500 });
        } else {
          setTimeout(loadThirdParty, 2500);
        }
      }
      if (document.readyState === "complete") schedule();
      else window.addEventListener("load", schedule);
    })();
  </script>
</body>`;

if (!html.includes('loadThirdParty')) {
  html = html.replace('</body>', deferredThirdParty);
}

fs.writeFileSync(path, html, 'utf8');
console.log('index.html optimized OK');
console.log('has webp', html.includes('map-preview.webp'));
console.log('has styles.css link', /href="styles\.css"/.test(html));
console.log('korean title ok', html.includes('부동산'));
