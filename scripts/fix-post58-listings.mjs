import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addPostUrl } from "./lib/sitemap-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const title = "서울 30평대 아파트, 내 연봉으로 가능할까 — 자치구별 필요연봉 지도";
const excerpt =
  "전용 60~85㎡를 염두에 두고 LTV 40%·DSR 40%·30년 원리금균등 공식으로 필요연봉을 역산하는 방법을 정리했습니다. 기준가 6억·9억·12억 예시만 계산했고, 자치구 시세는 직접 기입하는 빈칸으로 남겨 두었습니다.";
const date = "2026-11-16";
const alt = "계산기와 아파트 가격을 두고 필요연봉을 가늠하는 모습";

function mustInclude(file, needle, label) {
  if (!fs.readFileSync(file, "utf8").includes(needle)) {
    throw new Error(`${label} missing ${needle}`);
  }
}

// blog/index.html
{
  const file = path.join(root, "blog", "index.html");
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes("post-58.html")) {
    const marker = '<div class="blog-grid" id="blog-grid">';
    const idx = html.indexOf(marker);
    if (idx < 0) throw new Error("blog-grid marker not found");
    const card = `
<a href="post-58.html" class="blog-card fade-in has-thumbnail" data-category="real-estate">
          <div class="blog-card-thumbnail">
            <img src="images/post-58/hero.png" alt="${alt}" loading="lazy">
          </div>
            <div class="blog-card-content">
              <span class="blog-category-badge blog-card-category blog-category-badge--real-estate">🏢 부동산</span>
              <h3 class="blog-card-title">${title}</h3>
              <p class="blog-card-excerpt">${excerpt}</p>
              <div class="blog-card-meta">
                <time class="blog-card-date" datetime="${date}">${date}</time>
                <span class="blog-card-readtime">8분 읽기</span>
              </div>
            </div>
          </a>
`;
    html = html.slice(0, idx + marker.length) + card + html.slice(idx + marker.length);
    fs.writeFileSync(file, html, "utf8");
  }
  mustInclude(file, "post-58.html", "blog/index");
}

// rss
{
  const file = path.join(root, "blog", "rss.xml");
  let rss = fs.readFileSync(file, "utf8");
  if (!rss.includes("post-58.html")) {
    const marker = "<item>";
    const idx = rss.indexOf(marker);
    if (idx < 0) throw new Error("rss item marker not found");
    const item = `    <item>
      <title>${title}</title>
      <link>https://seungbak.com/blog/post-58.html</link>
      <guid isPermaLink="true">https://seungbak.com/blog/post-58.html</guid>
      <pubDate>Sun, 16 Nov 2026 00:00:00 GMT</pubDate>
      <description><![CDATA[${excerpt}]]></description>
    </item>
`;
    rss = rss.slice(0, idx) + item + rss.slice(idx);
    fs.writeFileSync(file, rss, "utf8");
  }
  mustInclude(file, "post-58.html", "rss");
}

// root index
{
  const file = path.join(root, "index.html");
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes("/blog/post-58.html")) {
    const marker = '<div class="hr-blog-grid" id="hr-blog-grid">';
    const idx = html.indexOf(marker);
    if (idx < 0) throw new Error("hr-blog-grid marker not found");
    const card = `
          <a href="/blog/post-58.html" class="hr-blog-card">
            <div class="hr-blog-thumb">
              <img src="/images/main/thumbs/post-58.webp" alt="${alt}" loading="lazy" decoding="async" width="400" height="225">
            </div>
            <div class="hr-blog-body">
              <span class="hr-blog-tag">부동산</span>
              <h3 class="hr-blog-title">${title}</h3>
              <p class="hr-blog-excerpt">${excerpt}</p>
              <time class="hr-blog-date" datetime="${date}">${date}</time>
            </div>
          </a>`;
    html = html.slice(0, idx + marker.length) + card + html.slice(idx + marker.length);

    const start = html.indexOf('<a href="/blog/post-52.html" class="hr-blog-card">');
    if (start < 0) throw new Error("post-52 card not found");
    const end = html.indexOf("</a>", start) + 4;
    html = html.slice(0, start) + html.slice(end);
    fs.writeFileSync(file, html, "utf8");
  }
  mustInclude(file, "/blog/post-58.html", "index");
  if (html.includes("/blog/post-52.html")) {
    // re-read
    const now = fs.readFileSync(file, "utf8");
    if (now.includes("/blog/post-52.html")) throw new Error("post-52 still on home");
  }
}

// sitemap — 글 URL + 홈·/blog/ lastmod
{
  const file = path.join(root, "sitemap.xml");
  addPostUrl(file, {
    slug: "post-58.html",
    date,
    insertBeforeLoc: "https://seungbak.com/blog/post-57.html",
  });
  mustInclude(file, "post-58.html", "sitemap");
}

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const posts = JSON.parse(fs.readFileSync(path.join(root, "blog", "posts.json"), "utf8"));
console.log({
  homeCards: (index.match(/class="hr-blog-card"/g) || []).length,
  loc: (sitemap.match(/<loc>/g) || []).length,
  posts: [posts.count, posts.posts.length, posts.posts[0].id],
  has52: /post-52\.html/.test(index),
  has58blog: fs.readFileSync(path.join(root, "blog", "index.html"), "utf8").includes("post-58.html"),
  has58rss: fs.readFileSync(path.join(root, "blog", "rss.xml"), "utf8").includes("post-58.html"),
});
