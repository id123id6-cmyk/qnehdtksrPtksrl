import fs from "node:fs";
import { execSync } from "node:child_process";

const p = fs.readFileSync("blog/post-58.html", "utf8");
const art = p.slice(p.indexOf("<article"), p.indexOf("</article>"));
const text = art.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
console.log({
  ld: (p.match(/application\/ld\+json/g) || []).length,
  h2: (p.match(/<h2/g) || []).length,
  tables: (p.match(/class="post-table"/g) || []).length,
  faq: (p.match(/<h3>Q/g) || []).length,
  chars: text.length,
  has_daily: /매일/.test(p),
  has_perfect: /완벽정리/.test(p),
});
const j = JSON.parse(fs.readFileSync("blog/posts.json", "utf8"));
const index = fs.readFileSync("index.html", "utf8");
const sitemap = fs.readFileSync("sitemap.xml", "utf8");
console.log({
  posts: [j.count, j.posts.length, j.posts[0].id],
  homeCards: (index.match(/class="hr-blog-card"/g) || []).length,
  loc: (sitemap.match(/<loc>/g) || []).length,
  has58sitemap: /post-58\.html/.test(sitemap),
  has52home: /post-52\.html/.test(index),
});
console.log(execSync("git status --short", { encoding: "utf8" }));
console.log("sitemap numstat:", execSync("git diff --numstat sitemap.xml", { encoding: "utf8" }) || "(none)");
