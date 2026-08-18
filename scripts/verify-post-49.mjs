import fs from "fs";
const html = fs.readFileSync("blog/post-49.html", "utf8");
const m = html.match(/<article[\s\S]*?<\/article>/);
const n = m[0]
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<[^>]+>/g, "")
  .replace(/\s+/g, "").length;
const posts = JSON.parse(fs.readFileSync("blog/posts.json", "utf8"));
const slugs = new Set(posts.posts.map((p) => p.slug));
console.log("article_nospace", n);
console.log("count", posts.count, "id0", posts.posts[0].id);
console.log("post-48", slugs.has("post-48.html") ? "O" : "X");
console.log("post-46", slugs.has("post-46.html") ? "O" : "X");
console.log("post-45", slugs.has("post-45.html") ? "O" : "X");
console.log("privacy", html.includes("privacy.html"));
console.log("sitemap49", fs.readFileSync("sitemap.xml", "utf8").includes("post-49.html"));
