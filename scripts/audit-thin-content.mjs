import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function walkHtml(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (["node_modules", ".git"].includes(ent.name)) continue;
      walkHtml(p, acc);
    } else if (ent.name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

function stripForText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

/** 크롤러가 JS 없이 못 보는 영역: id/class 힌트로 제거 */
const JS_SHELL_PATTERNS = [
  /<[^>]+id=["']hr-blog-grid["'][\s\S]*?<\/[^>]+>/gi,
  /<[^>]+id=["']result-box["'][\s\S]*?<\/[^>]+>/gi,
  /<[^>]+id=["']result-section["'][\s\S]*?<\/[^>]+>/gi,
  /<[^>]+id=["']result-wrapper["'][\s\S]*?<\/[^>]+>/gi,
  /<[^>]+id=["']sidebar-content["'][\s\S]*?<\/[^>]+>/gi,
  /<[^>]+id=["']sidebarContent["'][\s\S]*?<\/[^>]+>/gi,
  /<[^>]+id=["']bunyang-list["'][\s\S]*?<\/[^>]+>/gi,
  /<[^>]+id=["']alarm-list["'][\s\S]*?<\/[^>]+>/gi,
  /<[^>]+id=["']popular-grid["'][\s\S]*?<\/[^>]+>/gi,
  /<[^>]+id=["']scenario-tbody["'][\s\S]*?<\/tbody>/gi,
  /<[^>]+id=["']map-container["'][\s\S]*?<\/[^>]+>/gi,
  /<canvas[\s\S]*?<\/canvas>/gi,
];

function countText(html, { excludeJsShells = false } = {}) {
  let h = stripForText(html);
  if (excludeJsShells) {
    for (const re of JS_SHELL_PATTERNS) h = h.replace(re, " ");
  }
  const text = h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const noSpace = text.replace(/\s/g, "");
  return { charsWithSpace: text.length, charsNoSpace: noSpace.length, preview: text.slice(0, 80) };
}

function detectJsRegions(html, rel) {
  const regions = [];
  const checks = [
    ["hr-blog-grid", "home-latest-posts.js → 블로그 카드 innerHTML 교체"],
    ["result-box", "계산 결과 영역 (초기 display:none / 빈 값)"],
    ["result-section", "계산 결과 섹션"],
    ["sidebar-content", "실거래 지도 사이드바 innerHTML"],
    ["sidebarContent", "실거래 지도 사이드바"],
    ["bunyang-list", "분양 알리미 목록 fetch/렌더"],
    ["alarm-list", "알림 목록 JS 렌더"],
    ["popular-grid", "인기 지역 그리드 JS"],
    ["scenario-tbody", "시나리오 테이블 JS 생성"],
    ["blog-grid", "blog/index 카드 (정적이면 무시)"],
  ];
  for (const [id, note] of checks) {
    if (html.includes(`id="${id}"`) || html.includes(`id='${id}'`)) {
      // blog-grid on blog/index is static hardcoded - special case
      if (id === "blog-grid" && rel === "blog/index.html") continue;
      regions.push(`${id}: ${note}`);
    }
  }
  if (/fetch\s*\(|\.innerHTML\s*=/.test(html) && !html.includes("home-latest-posts")) {
    // inline fetch in page
    if (/fetch\s*\(/.test(html.replace(/<script[\s\S]*?<\/script>/gi, "")) === false) {
      // only in external scripts referenced
    }
  }
  const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
  if (scripts.some((s) => s.includes("home-latest-posts"))) regions.push("외부: home-latest-posts.js");
  if (scripts.some((s) => s.includes("calculator.js") || s.includes("map.js"))) regions.push("외부: calculator/map.js 결과 렌더");
  if (scripts.some((s) => s.includes("bunyang"))) regions.push("외부: bunyang JS 목록 렌더");
  return [...new Set(regions)];
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function parseSitemap() {
  const xml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return urls.map((u) => {
    const p = u.replace("https://seungbak.com", "") || "/";
    let file;
    if (p === "/") file = "index.html";
    else if (p.endsWith("/")) file = p.slice(1) + "index.html";
    else if (p.endsWith(".html")) file = p.slice(1);
    else file = p.slice(1) + "/index.html";
    return { url: u, file };
  });
}

const allHtml = walkHtml(ROOT).map(rel).sort();
const productionHtml = allHtml.filter(
  (f) => !f.startsWith("screenshots/") && !f.includes("/screenshots/")
);

const sitemapEntries = parseSitemap();
const sitemapFiles = new Set(sitemapEntries.map((e) => e.file));

const rows = productionHtml.map((file) => {
  const full = path.join(ROOT, file);
  const html = fs.readFileSync(full, "utf8");
  const staticOnly = countText(html, { excludeJsShells: false });
  const crawlerView = countText(html, { excludeJsShells: true });
  const jsRegions = detectJsRegions(html, file);
  const inSitemap = sitemapFiles.has(file);
  return {
    file,
    inSitemap,
    staticChars: staticOnly.charsNoSpace,
    crawlerChars: crawlerCharsSafe(crawlerView.charsNoSpace, jsRegions),
    jsRegions: jsRegions.join("; ") || "-",
  };
});

function crawlerCharsSafe(n, regions) {
  return n;
}

rows.sort((a, b) => a.crawlerChars - b.crawlerChars);

const under300 = rows.filter((r) => r.crawlerChars < 300);
const under800 = rows.filter((r) => r.crawlerChars < 800 && r.crawlerChars >= 300);

const sitemapOnly = [...sitemapFiles].filter((f) => !productionHtml.includes(f));
const fileOnly = productionHtml.filter((f) => !sitemapFiles.has(f) && !f.startsWith("screenshots"));

console.log("=== PAGE COUNT ===");
console.log("total html:", allHtml.length, "production:", productionHtml.length);
console.log("\n=== SITEMAP MISMATCH ===");
console.log("sitemap에만 있음 (파일 없음):", sitemapOnly.length ? sitemapOnly.join(", ") : "(없음)");
console.log("파일만 있음 (sitemap 미등록):", fileOnly.length ? fileOnly.join(", ") : "(없음)");

console.log("\n=== UNDER 300 (thin candidates) ===");
for (const r of under300) {
  console.log(`${r.file}\t${r.crawlerChars}\t${r.jsRegions}`);
}

console.log("\n=== 300-799 (borderline) ===");
for (const r of under800) {
  console.log(`${r.file}\t${r.crawlerChars}`);
}

console.log("\n=== ALL PAGES (crawler-view chars asc) ===");
for (const r of rows) {
  console.log(`${r.crawlerChars}\t${r.inSitemap ? "SM" : "--"}\t${r.file}\t${r.jsRegions.slice(0, 60)}`);
}
