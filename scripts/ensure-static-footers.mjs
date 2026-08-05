/**
 * 전 페이지 정적 footer 정규화 (privacy/about/terms/문의 + © 2026 seungbak.com)
 * node scripts/ensure-static-footers.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const THEME_FOOTER = `<footer class="theme-footer">
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
</footer>`;

const SITE_FOOTER = `<footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-col footer-brand">
        <p class="footer-logo">seungbak.com</p>
        <p class="footer-tagline">생산관리 월급쟁이가 만드는 부동산·생활 도구</p>
        <p class="footer-owner">운영자: <strong>승박</strong></p>
      </div>
      <div class="footer-col">
        <p class="footer-col-title">바로가기</p>
        <ul class="footer-nav">
          <li><a href="/">홈</a></li>
          <li><a href="/tools/">도구</a></li>
          <li><a href="/blog/">블로그</a></li>
          <li><a href="/about.html">소개</a></li>
          <li><a href="/contact.html">문의</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <p class="footer-col-title">정책</p>
        <ul class="footer-nav">
          <li><a href="/privacy.html">개인정보처리방침</a></li>
          <li><a href="/terms.html">이용약관</a></li>
          <li><a href="/disclaimer.html">면책조항</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <p class="footer-col-title">함께해요</p>
        <ul class="footer-nav">
          <li><a href="/contact.html">문의하기</a></li>
          <li><a href="mailto:id123id6@gmail.com">id123id6@gmail.com</a></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <p class="footer-copy">© 2026 seungbak.com</p>
    </div>
  </footer>`;

const HR_FOOTER = `<footer class="hr-footer">
    <div class="hr-container">
      <div class="hr-footer-grid">
        <div>
          <p class="hr-footer-logo">seungbak.com</p>
          <p class="hr-footer-desc">부동산 실거래가 지도와 무료 계산 도구를 제공합니다.</p>
        </div>
        <div>
          <p class="hr-footer-title">링크</p>
          <ul class="hr-footer-nav">
            <li><a href="/about.html">소개</a></li>
            <li><a href="/contact.html">문의</a></li>
            <li><a href="/privacy.html">개인정보처리방침</a></li>
            <li><a href="/terms.html">이용약관</a></li>
            <li><a href="/disclaimer.html">면책조항</a></li>
          </ul>
        </div>
        <div>
          <p class="hr-footer-title">연락처</p>
          <ul class="hr-footer-nav">
            <li><a href="https://instagram.com/seungbak.tools" rel="noopener noreferrer" target="_blank">Instagram @seungbak.tools</a></li>
            <li><a href="mailto:id123id6@gmail.com">id123id6@gmail.com</a></li>
          </ul>
        </div>
      </div>
      <div class="hr-footer-bottom">
        <p class="hr-footer-copy">© 2026 seungbak.com</p>
      </div>
    </div>
  </footer>`;

function listTargets() {
  const files = [
    "index.html",
    "about.html",
    "privacy.html",
    "terms.html",
    "contact.html",
    "disclaimer.html",
    "blog/index.html",
  ];
  for (const d of fs.readdirSync(path.join(ROOT, "tools"), { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const p = path.join("tools", d.name, "index.html");
    if (fs.existsSync(path.join(ROOT, p))) files.push(p);
  }
  for (const name of fs.readdirSync(path.join(ROOT, "blog"))) {
    if (/^post-\d+\.html$/i.test(name)) files.push(path.join("blog", name));
  }
  return files;
}

function footerNeedsReplace(footerHtml) {
  const hasPrivacy = /privacy\.html/.test(footerHtml);
  const hasTerms = /terms\.html/.test(footerHtml);
  const hasAbout = /about\.html/.test(footerHtml);
  const hasContact =
    /contact\.html/.test(footerHtml) || /mailto:id123id6@gmail\.com/.test(footerHtml);
  const hasStaticCopy = /©\s*2026\s*seungbak\.com/.test(footerHtml);
  const hasYearSpan = /current-year/.test(footerHtml);
  return !(hasPrivacy && hasTerms && hasAbout && hasContact && hasStaticCopy && !hasYearSpan);
}

function pickFooter(html, file) {
  if (file === "index.html" || /class="hr-footer"/.test(html)) return HR_FOOTER;
  if (/class="theme-footer"/.test(html) || /global-theme\.css/.test(html)) return THEME_FOOTER;
  return SITE_FOOTER;
}

function stripYearScripts(html) {
  return html.replace(
    /<script>\s*\(function\s*\(\)\s*\{\s*var el = document\.getElementById\("current-year"\)[\s\S]*?<\/script>\s*/g,
    ""
  ).replace(
    /document\.getElementById\("current-year"\)\.textContent\s*=\s*new Date\(\)\.getFullYear\(\);\s*/g,
    ""
  );
}

function processFile(rel) {
  const full = path.join(ROOT, rel);
  let html = fs.readFileSync(full, "utf8");
  const before = html;
  const footerRe = /<footer\b[^>]*>[\s\S]*?<\/footer>/i;
  const m = html.match(footerRe);
  const replacement = pickFooter(html, rel);

  if (!m) {
    const idx = html.lastIndexOf("</body>");
    if (idx === -1) throw new Error(`No </body> in ${rel}`);
    html = html.slice(0, idx) + "\n  " + replacement + "\n" + html.slice(idx);
  } else if (footerNeedsReplace(m[0])) {
    html = html.replace(footerRe, replacement);
  }

  html = stripYearScripts(html);

  // index: remove year JS that only sets current-year
  if (rel === "index.html") {
    html = html.replace(
      /\s*var yearEl = document\.getElementById\("current-year"\);\s*if \(yearEl\) yearEl\.textContent = new Date\(\)\.getFullYear\(\);\s*/g,
      "\n"
    );
  }

  if (html !== before) {
    fs.writeFileSync(full, html, "utf8");
    return "updated";
  }
  return "ok";
}

const results = [];
for (const f of listTargets()) {
  results.push({ file: f, status: processFile(f) });
}
const updated = results.filter((r) => r.status === "updated");
console.log(`processed=${results.length} updated=${updated.length}`);
for (const r of updated) console.log("UPDATED", r.file);
