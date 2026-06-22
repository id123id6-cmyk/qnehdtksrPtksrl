/**
 * post-15 + 상호 링크 + 블로그 인덱스 검증
 * 실행: node scripts/test-blog-post15.mjs
 */
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:8765";
const OUT = "screenshots/blog-post15";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/blog/post-15.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");

  const postMeta = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector("h1")?.textContent?.trim(),
    description: document.querySelector('meta[name="description"]')?.content,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    hasComparisonImg: !!document.querySelector('img[src*="post-15-comparison"]'),
    linkTo14: !!document.querySelector('a[href="post-14.html"]'),
  }));

  await page.screenshot({ path: `${OUT}/post-15-desktop.png`, fullPage: false });

  await page.goto(`${BASE}/blog/post-14.html`, { waitUntil: "domcontentloaded" });
  const link14to15 = await page.locator('a[href="post-15.html"]').count();
  await page.click('a[href="post-15.html"]');
  await page.waitForURL("**/post-15.html");
  const nav14to15 = page.url().includes("post-15.html");

  await page.click('a[href="post-14.html"]');
  await page.waitForURL("**/post-14.html");
  const nav15to14 = page.url().includes("post-14.html");

  await page.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded" });
  const indexChecks = await page.evaluate(() => {
    const first = document.querySelector("#blog-grid a.blog-card");
    return {
      firstHref: first?.getAttribute("href"),
      hasPost15: !!document.querySelector('#blog-grid a[href="post-15.html"]'),
      post15Thumb: !!document.querySelector(
        '#blog-grid a[href="post-15.html"] .blog-card-thumbnail img'
      ),
    };
  });
  await page.locator("#blog-grid").screenshot({ path: `${OUT}/blog-index-top.png` });

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const homeChecks = await page.evaluate(() => ({
    postCount: document.getElementById("stat-posts")?.textContent?.trim(),
    hasPost15Preview: !!document.querySelector('a[href="/blog/post-15.html"]'),
  }));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/blog/post-15.html`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: `${OUT}/post-15-mobile.png`, fullPage: false });

  const sitemap = await readFile("sitemap.xml", "utf8");
  const sitemapHas15 = sitemap.includes("post-15.html");

  await browser.close();

  const pass =
    postMeta.title?.includes("청년미래적금 vs 청년도약계좌") &&
    postMeta.description?.includes("갈아타기 손익") &&
    postMeta.hasComparisonImg &&
    postMeta.linkTo14 &&
    link14to15 > 0 &&
    nav14to15 &&
    nav15to14 &&
    indexChecks.firstHref === "post-15.html" &&
    indexChecks.hasPost15 &&
    indexChecks.post15Thumb &&
    homeChecks.postCount === "15" &&
    homeChecks.hasPost15Preview &&
    sitemapHas15 &&
    errors.length === 0;

  console.log(
    JSON.stringify(
      { postMeta, link14to15, nav14to15, nav15to14, indexChecks, homeChecks, sitemapHas15, errors, pass, screenshots: OUT },
      null,
      2
    )
  );
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
