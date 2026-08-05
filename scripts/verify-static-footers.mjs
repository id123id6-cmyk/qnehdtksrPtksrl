/**
 * 푸터/홈 섹션 검증 — node scripts/verify-static-footers.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function targets() {
  const files = [
    "index.html",
    "about.html",
    "privacy.html",
    "terms.html",
    "blog/index.html",
  ];
  for (const d of fs.readdirSync(path.join(ROOT, "tools"), { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const p = path.join("tools", d.name, "index.html");
    if (fs.existsSync(path.join(ROOT, p))) files.push(p.replace(/\\/g, "/"));
  }
  const posts = fs
    .readdirSync(path.join(ROOT, "blog"))
    .filter((n) => /^post-\d+\.html$/i.test(n))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const name of posts) files.push(("blog/" + name).replace(/\\/g, "/"));
  return files;
}

console.log("=== 1) 파일 × footer × privacy링크 × terms링크 ===");
console.log("file\tfooter\tprivacy\tterms");
let bad = 0;
for (const f of targets()) {
  const html = fs.readFileSync(path.join(ROOT, f), "utf8");
  const m = html.match(/<footer\b[\s\S]*?<\/footer>/i);
  const fb = m ? m[0] : "";
  const footer = m ? "Y" : "N";
  const privacy = /privacy\.html/.test(fb) ? "Y" : "N";
  const terms = /terms\.html/.test(fb) ? "Y" : "N";
  if (footer !== "Y" || privacy !== "Y") bad++;
  console.log([f, footer, privacy, terms].join("\t"));
}
console.log("FAIL_ROWS", bad);

const home = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const toolsSec = home.match(/id="tools-title"[\s\S]*?<\/section>/);
console.log("\n=== 2a) 홈 무료 부동산 도구 <a href> ===");
const toolHrefs = [...toolsSec[0].matchAll(/<a href="([^"]+)"/g)].map((x) => x[1]);
for (const h of toolHrefs) console.log(h);

const blogSec = home.match(/id="blog-title"[\s\S]*?<\/section>/);
console.log("\n=== 2b) 홈 최신 블로그 글 링크 ===");
const blogCards = [...blogSec[0].matchAll(/<a href="(\/blog\/post-[^"]+)"[\s\S]*?<h3 class="hr-blog-title">([\s\S]*?)<\/h3>/g)];
for (const m of blogCards) console.log(m[1] + " | " + m[2].trim());

console.log("\n=== 3) posts.json 대조 ===");
const posts = JSON.parse(fs.readFileSync(path.join(ROOT, "blog/posts.json"), "utf8")).posts;
const byHref = new Map(posts.map((p) => [p.href, p]));
for (const m of blogCards) {
  const href = m[1];
  const inJson = byHref.has(href);
  const fileOk = fs.existsSync(path.join(ROOT, href.replace(/^\//, "")));
  console.log((inJson && fileOk ? "O" : "X") + "\t" + href);
}

const css = fs.readFileSync(path.join(ROOT, "tools/realestate-map/map.css"), "utf8");
const stillHidden = /body\.map-page\s+\.site-footer\s*\{[^}]*display\s*:\s*none/.test(css);
console.log("\n=== map.css site-footer display:none ===", stillHidden ? "YES(BAD)" : "NO(fixed)");
console.log("map.css shows footer block?", /body\.map-page \.site-footer,\s*\nbody\.map-page \.theme-footer/.test(css) || /정적 푸터/.test(css));
