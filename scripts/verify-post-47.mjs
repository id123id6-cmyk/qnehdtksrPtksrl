import fs from "fs";

const html = fs.readFileSync("blog/post-47.html", "utf8");
const m = html.match(/<article[\s\S]*?<\/article>/);
const text = m[0]
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<[^>]+>/g, "");
console.log("공백제외글자수=", text.replace(/\s+/g, "").length);
const fb = html.match(/<footer[\s\S]*?<\/footer>/i)[0];
console.log("footer_privacy=", /privacy\.html/.test(fb));
console.log("footer_about=", /about\.html/.test(fb));
console.log(
  "현행표기=",
  /증여재산공제 한도 \(현행\)/.test(html) && /신고기한 \(현행\)/.test(html)
);
console.log(
  "대개편분리=",
  /진행 중인 상속세 대개편/.test(html) && /이 섹션은 ‘현행’이 아닙니다/.test(html)
);
console.log("2028목표=", /2028년 시행 목표/.test(html));
console.log("홈택스면책=", /국세청 홈택스 또는 세무사/.test(html));
const posts = JSON.parse(fs.readFileSync("blog/posts.json", "utf8"));
console.log("posts0=", posts.posts[0].id, "count=", posts.count);
console.log("sitemap=", fs.readFileSync("sitemap.xml", "utf8").includes("post-47.html"));
console.log("blogIndex=", fs.readFileSync("blog/index.html", "utf8").includes("post-47.html"));
console.log("hero=", fs.existsSync("blog/images/post-47/hero.jpg"));
