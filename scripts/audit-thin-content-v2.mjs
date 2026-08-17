import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function walkHtml(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (["node_modules", ".git"].includes(ent.name)) continue;
      walkHtml(p, acc);
    } else if (ent.name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

function extractBlock(html, startRe, endMarker) {
  const start = html.search(startRe);
  if (start < 0) return "";
  const sub = html.slice(start);
  const end = sub.indexOf(endMarker);
  return end >= 0 ? sub.slice(0, end + endMarker.length) : sub;
}

function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function count(html) {
  const t = toText(html);
  return t.replace(/\s/g, "").length;
}

function removeRegions(html) {
  let h = html;
  const ids = [
    "card-grid", "bunyang-modal-body", "sidebar-content", "sidebarContent",
    "result-box", "result-section", "result-wrapper", "scenario-tbody",
    "popular-grid", "map-container", "priceChart", "marker-count",
  ];
  for (const id of ids) {
    const re = new RegExp(`<[^>]+id=["']${id}["'][\\s\\S]*?(?=<(?:div|section|main|footer|article)[\\s>]|$)`, "gi");
    h = h.replace(re, " ");
  }
  return h;
}

function detectJs(html, file) {
  const notes = [];
  if (html.includes('id="card-grid"') && html.includes('class="bunyang-grid"')) notes.push("card-grid: 분양 카드 fetch 후 innerHTML");
  if (html.includes('id="sidebar-content"') || html.includes('id="sidebarContent"')) notes.push("sidebar: 실거래 목록 JS 렌더");
  if (html.includes('id="result-box"') || html.includes('id="result-section"')) notes.push("result: 계산 결과 JS/초기 빈값");
  if (html.includes("home-latest-posts.js")) notes.push("hr-blog-grid: posts.json fetch 후 교체(초기 HTML fallback 있음)");
  if (html.includes('id="guide-content" hidden')) notes.push("guide: hidden(HTML엔 있음, 일부 크롤러 가중치↓ 가능)");
  if (file === "tools/index.html") notes.push("허브: 카드 링크+한줄설명만, 장문 가이드 없음");
  return notes.length ? notes.join("; ") : "-";
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function parseSitemap() {
  const xml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    const p = m[1].replace("https://seungbak.com", "") || "/";
    let file = p === "/" ? "index.html" : p.endsWith("/") ? p.slice(1) + "index.html" : p.startsWith("/") ? p.slice(1) : p;
    return { url: m[1], file };
  });
}

const productionHtml = walkHtml(ROOT)
  .map(rel)
  .filter((f) => !f.startsWith("screenshots/"))
  .sort();

const sitemapFiles = new Set(parseSitemap().map((e) => e.file));

const rows = productionHtml.map((file) => {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const full = count(html);
  const noJsShell = count(removeRegions(html));
  let focal = full;
  if (file.startsWith("blog/post-")) {
    const art = extractBlock(html, /<article[\s\S]*/, "</article>");
    focal = count(art || html);
  } else if (html.includes("tool-content:start")) {
    const block = extractBlock(html, /<!-- tool-content:start -->/, "<!-- tool-content:end -->");
    focal = count(block || html);
  } else if (file === "blog/index.html") {
    const grid = extractBlock(html, /id="blog-grid"/, "</div>");
    focal = count(grid) + count(extractBlock(html, /<main[\s\S]*/, "</main>"));
  }

  const noFooter = count(html.replace(/<footer[\s\S]*?<\/footer>/gi, "").replace(/<nav[\s\S]*?<\/nav>/gi, ""));

  return {
    file,
    sm: sitemapFiles.has(file),
    full,
    noJsShell,
    focal,
    noFooter,
    js: detectJs(html, file),
  };
});

rows.sort((a, b) => a.noJsShell - b.noJsShell);

const under300 = rows.filter((r) => r.noJsShell < 300);
const under800 = rows.filter((r) => r.noJsShell >= 300 && r.noJsShell < 800);
const fileOnly = productionHtml.filter((f) => !sitemapFiles.has(f));

console.log(JSON.stringify({ under300, under800, fileOnly, rows }, null, 0));
