/**
 * blog/post-*.html 메타에서 blog/index.html 카드 목록 자동 생성
 * 실행: node scripts/build-blog-index.mjs
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const BLOG_DIR = join(ROOT, "blog");
const INDEX_PATH = join(BLOG_DIR, "index.html");
const HOME_INDEX_PATH = join(ROOT, "index.html");
const HOME_PREVIEW_COUNT = 6;
const SITE = "https://seungbak.com";

const CATEGORY_MAP = {
  "blog-category-badge--project": {
    id: "side-project",
    label: "🛠️ 사이드 프로젝트",
    badgeClass: "blog-category-badge--project",
  },
  "blog-category-badge--ai": {
    id: "ai-tools",
    label: "🤖 AI 도구",
    badgeClass: "blog-category-badge--ai",
  },
  "blog-category-badge--side": {
    id: "side-income",
    label: "💰 직장인 부업",
    badgeClass: "blog-category-badge--side",
  },
  "blog-category-badge--real-estate": {
    id: "real-estate",
    label: "🏢 재테크",
    badgeClass: "blog-category-badge--real-estate",
  },
};

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function extractMeta(html, name) {
  const re = new RegExp(
    `<meta\\s+(?:name|property)=["']${name}["']\\s+content=["']([^"']*)["']`,
    "i"
  );
  const m = html.match(re);
  if (m) return m[1];
  const re2 = new RegExp(
    `<meta\\s+content=["']([^"']*)["']\\s+(?:name|property)=["']${name}["']`,
    "i"
  );
  return html.match(re2)?.[1] || "";
}

function extractH1(html) {
  const m = html.match(/<article[^>]*>[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return "";
  return m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function extractFirstImg(html) {
  const article = html.match(/<article[\s\S]*<\/article>/i)?.[0] || html;
  const withoutComments = article.replace(/<!--[\s\S]*?-->/g, "");
  const m = withoutComments.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] || "";
}

function toRelativeThumbnail(urlOrPath) {
  if (!urlOrPath) return "";
  if (urlOrPath.startsWith(SITE + "/blog/")) {
    return urlOrPath.slice((SITE + "/blog/").length);
  }
  if (urlOrPath.startsWith("images/")) return urlOrPath;
  if (urlOrPath.startsWith("/blog/images/")) return urlOrPath.replace("/blog/", "");
  if (urlOrPath.startsWith("../")) return "";
  if (urlOrPath.startsWith("http")) return urlOrPath;
  return urlOrPath;
}

function detectCategory(html) {
  const metaCat = extractMeta(html, "blog:category");
  if (metaCat) {
    for (const [, cfg] of Object.entries(CATEGORY_MAP)) {
      if (cfg.id === metaCat) return cfg;
    }
  }
  for (const [cls, cfg] of Object.entries(CATEGORY_MAP)) {
    if (html.includes(cls)) return cfg;
  }
  return CATEGORY_MAP["blog-category-badge--project"];
}

function estimateReadTime(html) {
  const article = html.match(/<article[\s\S]*<\/article>/i)?.[0] || html;
  const text = article.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 220));
}

function extractCategoryBadge(html) {
  const m = html.match(/<span class="blog-category-badge[^"]*">([^<]+)<\/span>/i);
  return m?.[1]?.trim() || "";
}

function parsePostFile(filename, html) {
  const ogImage = extractMeta(html, "og:image");
  const firstImg = extractFirstImg(html);
  const thumbnail = toRelativeThumbnail(ogImage || firstImg);
  const category = detectCategory(html);
  const badgeText = extractCategoryBadge(html);
  const description = extractMeta(html, "description");
  const h1 = extractH1(html);
  const date =
    extractMeta(html, "article:published_time") ||
    html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1] ||
    "";

  const postNum = Number(filename.match(/post-(\d+)/)?.[1] || 0);

  return {
    filename,
    postNum,
    cardTitle: h1 || extractMeta(html, "og:title").replace(/\s*\|\s*.+$/, ""),
    excerpt: description,
    date,
    dateDisplay: date,
    thumbnail,
    readTime: estimateReadTime(html),
    category: category.id,
    categoryLabel: badgeText || category.label,
    badgeClass: category.badgeClass,
  };
}

function renderCard(post) {
  const thumbClass = post.thumbnail ? "has-thumbnail" : "no-thumbnail";
  const thumbHtml = post.thumbnail
    ? `          <div class="blog-card-thumbnail">
            <img src="${escapeHtml(post.thumbnail)}" alt="${escapeHtml(post.cardTitle)}" loading="lazy">
          </div>`
    : "";

  return `          <a href="${escapeHtml(post.filename)}" class="blog-card fade-in ${thumbClass}" data-category="${escapeHtml(post.category)}">
${thumbHtml}
            <div class="blog-card-content">
              <span class="blog-category-badge blog-card-category ${post.badgeClass}">${escapeHtml(post.categoryLabel)}</span>
              <h3 class="blog-card-title">${escapeHtml(post.cardTitle)}</h3>
              <p class="blog-card-excerpt">${escapeHtml(post.excerpt)}</p>
              <div class="blog-card-meta">
                <time class="blog-card-date" datetime="${escapeHtml(post.date)}">${escapeHtml(post.dateDisplay)}</time>
                <span class="blog-card-readtime">${post.readTime}분 읽기</span>
              </div>
            </div>
          </a>`;
}

function truncateExcerpt(text, maxLen = 72) {
  const t = String(text || "").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trimEnd() + "…";
}

function renderHomeCard(post) {
  const thumbClass = post.thumbnail ? "has-thumbnail" : "";
  const thumbHtml = post.thumbnail
    ? `            <div class="blog-card-thumbnail">
              <img src="/blog/${escapeHtml(post.thumbnail)}" alt="${escapeHtml(post.cardTitle)}" loading="lazy">
            </div>`
    : "";

  return `          <a href="/blog/${escapeHtml(post.filename)}" class="blog-card ${thumbClass}">
${thumbHtml}
            <div class="blog-card-content">
              <span class="blog-category-badge ${post.badgeClass}">${escapeHtml(post.categoryLabel)}</span>
              <h3 class="blog-card-title">${escapeHtml(post.cardTitle)}</h3>
              <p class="blog-card-excerpt">${escapeHtml(truncateExcerpt(post.excerpt))}</p>
              <div class="blog-card-meta">
                <time class="blog-card-date" datetime="${escapeHtml(post.date)}">${escapeHtml(post.dateDisplay)}</time>
                <span class="blog-card-readtime">${post.readTime}분 읽기</span>
              </div>
            </div>
          </a>`;
}

async function main() {
  const files = (await readdir(BLOG_DIR))
    .filter((f) => /^post-\d+\.html$/.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/\d+/)?.[0] || 0);
      const nb = Number(b.match(/\d+/)?.[0] || 0);
      return nb - na;
    });

  const posts = [];
  for (const file of files) {
    const html = await readFile(join(BLOG_DIR, file), "utf8");
    posts.push(parsePostFile(file, html));
  }

  posts.sort((a, b) => {
    const dateCmp = (b.date || "").localeCompare(a.date || "");
    if (dateCmp !== 0) return dateCmp;
    return b.postNum - a.postNum;
  });

  const cardsHtml = posts.map(renderCard).join("\n\n");
  const indexHtml = await readFile(INDEX_PATH, "utf8");

  const gridRe = /(<div class="blog-grid" id="blog-grid">)[\s\S]*?(<\/div>\s*\n\s*<div class="no-results" aria-live="polite">)/;
  if (!gridRe.test(indexHtml)) {
    throw new Error("blog/index.html에서 blog-grid 마커를 찾을 수 없습니다.");
  }

  const newIndex = indexHtml.replace(
    gridRe,
    `$1\n${cardsHtml}\n        $2`
  );

  await writeFile(INDEX_PATH, newIndex, "utf8");

  const homeHtml = await readFile(HOME_INDEX_PATH, "utf8");
  const homeCardsHtml = posts
    .slice(0, HOME_PREVIEW_COUNT)
    .map(renderHomeCard)
    .join("\n\n");

  const homeGridRe =
    /(<div class="blog-grid">)\s*[\s\S]*?(\s*<\/div>\s*\n\s*<div class="blog-section-footer">)/;
  if (!homeGridRe.test(homeHtml)) {
    throw new Error("index.html에서 blog-preview-section blog-grid 마커를 찾을 수 없습니다.");
  }

  const newHome = homeHtml
    .replace(homeGridRe, `$1\n${homeCardsHtml}\n$2`)
    .replace(
      /(<strong id="stat-posts">)\d+(<\/strong>)/,
      `$1${posts.length}$2`
    );

  await writeFile(HOME_INDEX_PATH, newHome, "utf8");

  const withThumb = posts.filter((p) => p.thumbnail).length;
  console.log(
    JSON.stringify(
      {
        posts: posts.length,
        withThumbnail: withThumb,
        withoutThumbnail: posts.length - withThumb,
        latest: posts[0]?.filename,
        homePreview: posts.slice(0, HOME_PREVIEW_COUNT).map((p) => p.filename),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
