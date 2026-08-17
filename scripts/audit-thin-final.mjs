import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!["node_modules", ".git", "screenshots"].includes(e.name)) walk(p, a);
    } else if (e.name.endsWith(".html")) a.push(p);
  }
  return a;
}

function toText(h) {
  return h
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cnt(h) {
  return toText(h).replace(/\s/g, "").length;
}

function extract(html, a, b) {
  const i = html.indexOf(a);
  if (i < 0) return "";
  const j = html.indexOf(b, i);
  return j >= 0 ? html.slice(i, j + b.length) : html.slice(i);
}

const sm = [
  ...fs.readFileSync("sitemap.xml", "utf8").matchAll(/<loc>https:\/\/seungbak.com\/([^<]*)<\/loc>/g),
].map((m) => {
  let p = m[1] || "";
  if (p === "") return "index.html";
  if (p.endsWith("/")) return p + "index.html";
  if (p.endsWith(".html")) return p;
  return p + "/index.html";
});
const smSet = new Set(sm);

const files = walk(ROOT)
  .map((p) => path.relative(ROOT, p).replace(/\\/g, "/"))
  .filter((f) => !f.startsWith("screenshots/"))
  .sort();

const rows = files.map((f) => {
  const html = fs.readFileSync(path.join(ROOT, f), "utf8");
  let focal = cnt(html);
  if (f.startsWith("blog/post-")) focal = cnt(extract(html, "<article", "</article>"));
  else if (html.includes("tool-content:start"))
    focal = cnt(extract(html, "<!-- tool-content:start -->", "<!-- tool-content:end -->"));

  const jsNotes = [];
  if (/<div id="card-grid"[^>]*>\s*<\/div>/.test(html)) jsNotes.push("card-grid 비어있음");
  if (html.includes('id="sidebar-content"')) jsNotes.push("sidebar JS");
  if (html.includes('id="result-box"') || html.includes('id="result-section"')) jsNotes.push("result JS");
  if (html.includes("home-latest-posts.js")) jsNotes.push("blog-grid fetch");
  if (html.includes('id="guide-content" hidden')) jsNotes.push("guide hidden");

  return { f, full: cnt(html), focal, sm: smSet.has(f), js: jsNotes.join(", ") || "-" };
});

rows.sort((a, b) => a.full - b.full);

console.log("file\tfull\tfocal\tsitemap\tjs_regions");
for (const r of rows) {
  console.log(`${r.f}\t${r.full}\t${r.focal}\t${r.sm ? "Y" : "N"}\t${r.js}`);
}

console.log("\n--- sitemap mismatch ---");
console.log("not in sitemap:", files.filter((f) => !smSet.has(f)).join(", "));

const tags = [...new Set(JSON.parse(fs.readFileSync("blog/posts.json", "utf8")).posts.map((p) => p.tag))];
console.log("\n--- blog tags ---");
console.log(tags.join(" | "));
