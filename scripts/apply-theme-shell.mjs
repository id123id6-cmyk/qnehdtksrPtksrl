/**
 * global-theme 네비/푸터 일괄 적용 (1회성)
 * node scripts/apply-theme-shell.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const PAGES = [
  { file: "blog/index.html", css: "../css/global-theme.css", active: "blog" },
  { file: "tools/subscription-calculator/index.html", css: "../../css/global-theme.css", active: "tools" },
  { file: "tools/salary-calculator/index.html", css: "../../css/global-theme.css", active: "tools" },
  { file: "tools/apt-calculator/index.html", css: "../../css/global-theme.css", active: "tools" },
  { file: "tools/income-calculator/index.html", css: "../../css/global-theme.css", active: "tools" },
  { file: "tools/dday-calculator/index.html", css: "../../css/global-theme.css", active: "tools" },
  { file: "about.html", css: "css/global-theme.css", active: "about" },
  { file: "contact.html", css: "css/global-theme.css", active: null },
  { file: "privacy.html", css: "css/global-theme.css", active: null },
  { file: "disclaimer.html", css: "css/global-theme.css", active: null },
  { file: "terms.html", css: "css/global-theme.css", active: null },
];

const FOOTER = `<footer class="theme-footer">
  <div class="theme-footer-inner">
    <div class="theme-footer-brand">
      <div class="theme-footer-logo">seungbak.com</div>
      <div class="theme-footer-desc">
        부동산 정보를 한 곳에서, 7개 무료 도구
      </div>
    </div>
    <div class="theme-footer-links">
      <div class="theme-footer-col">
        <div class="theme-footer-title">도구</div>
        <a href="/tools/realestate-map/" class="theme-link">실거래가 지도</a>
        <a href="/tools/subscription-calculator/" class="theme-link">청약 가점 계산기</a>
        <a href="/tools/income-calculator/" class="theme-link">월급 계산기</a>
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
      <div>© 2026 seungbak.com. All rights reserved.</div>
      <div>
        <a href="https://www.instagram.com/seungbak.tools/" target="_blank" rel="noopener" class="theme-link">@seungbak.tools</a>
        ·
        <a href="mailto:id123id6@gmail.com" class="theme-link">id123id6@gmail.com</a>
      </div>
    </div>
  </div>
</footer>`;

function navHtml(active) {
  const items = [
    { href: "/tools/realestate-map/", label: "지도", key: "map" },
    { href: "/#tools", label: "도구", key: "tools" },
    { href: "/blog/", label: "블로그", key: "blog" },
    { href: "/about.html", label: "소개", key: "about" },
  ];
  const links = items
    .map(({ href, label, key }) => {
      const on = active === key;
      return `<a href="${href}" class="theme-nav-item${on ? " is-active" : ""}"${on ? ' aria-current="page"' : ""}>${label}</a>`;
    })
    .join("\n      ");
  return `<nav class="theme-nav">
  <div class="theme-nav-inner">
    <a href="/" class="theme-nav-logo">seungbak.com</a>
    <div class="theme-nav-menu">
      ${links}
    </div>
  </div>
</nav>`;
}

function apply(filePath, cssHref, active) {
  const full = path.join(ROOT, filePath);
  let html = readFileSync(full, "utf8");

  if (!html.includes("global-theme.css")) {
    const linkTag = `  <link rel="stylesheet" href="${cssHref}">`;
    const headClose = html.lastIndexOf("</head>");
    if (headClose === -1) throw new Error(`No </head> in ${filePath}`);
    html = html.slice(0, headClose) + linkTag + "\n" + html.slice(headClose);
  }

  html = html.replace(/<header class="site-header">[\s\S]*?<\/header>/, navHtml(active));
  html = html.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, FOOTER);

  if (html.includes('id="current-year"')) {
    html = html.replace(
      /<script>[\s\S]*?getElementById\("current-year"\)[\s\S]*?<\/script>\s*/g,
      ""
    );
  }

  writeFileSync(full, html, "utf8");
  return full;
}

for (const p of PAGES) {
  apply(p.file, p.css, p.active);
  console.log("OK", p.file);
}
