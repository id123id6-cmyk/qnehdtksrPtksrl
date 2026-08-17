import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TOOLS = [
  "tools/index.html",
  "tools/bunyang-alarm/index.html",
  "tools/subscription-calculator/index.html",
  "tools/dday-calculator/index.html",
  "tools/realestate-map/index.html",
  "tools/severance-calculator/index.html",
  "tools/apt-calculator/index.html",
  "tools/salary-calculator/index.html",
  "tools/income-calculator/index.html",
];

const KEEP = [
  "index.html",
  "about.html",
  "contact.html",
  "privacy.html",
  "terms.html",
  "disclaimer.html",
  "blog/index.html",
];

console.log("=== 1. 도구 9페이지 noindex (정확히 1개) ===");
for (const f of TOOLS) {
  const html = fs.readFileSync(path.join(ROOT, f), "utf8");
  const matches = html.match(/<meta name="robots"[^>]*>/gi) || [];
  const noindex = matches.filter((m) => /noindex,\s*follow/i.test(m));
  console.log(`${f}\trobots태그=${matches.length}\tnoindex=${noindex.length}\t${noindex[0] || "MISSING"}`);
}

console.log("\n=== 2. 심사 유지 페이지 noindex 없음 ===");
const blogPosts = fs
  .readdirSync(path.join(ROOT, "blog"))
  .filter((f) => f.startsWith("post-") && f.endsWith(".html"))
  .map((f) => `blog/${f}`);
let bad = [];
for (const f of [...KEEP, ...blogPosts]) {
  const html = fs.readFileSync(path.join(ROOT, f), "utf8");
  if (/noindex/i.test(html)) bad.push(f);
}
console.log(bad.length ? "FAIL: " + bad.join(", ") : "OK: noindex 없음 (" + (KEEP.length + blogPosts.length) + " pages)");

console.log("\n=== 3. sitemap tools URL ===");
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const toolUrls = (sm.match(/tools\//g) || []).length;
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log("tools/ in sitemap:", toolUrls);
console.log("total URLs:", locs.length);
console.log("has home:", locs.includes("https://seungbak.com/"));
console.log("has blog index:", locs.includes("https://seungbak.com/blog/"));
console.log("has about:", locs.includes("https://seungbak.com/about.html"));
console.log("has post-48:", locs.includes("https://seungbak.com/blog/post-48.html"));

console.log("\n=== 4. sitemap.full.xml backup ===");
console.log(fs.existsSync(path.join(ROOT, "sitemap.full.xml")) ? "OK: exists" : "FAIL: missing");
if (fs.existsSync(path.join(ROOT, "sitemap.full.xml"))) {
  const full = fs.readFileSync(path.join(ROOT, "sitemap.full.xml"), "utf8");
  console.log("backup tools/ count:", (full.match(/tools\//g) || []).length);
}

console.log("\n=== 5. robots.txt ===");
console.log(fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8"));
