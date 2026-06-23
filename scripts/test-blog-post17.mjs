/**
 * post-17 검증 + 스크린샷
 * 실행: node scripts/test-blog-post17.mjs
 */
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:8765";
const OUT = "screenshots/blog-post17";

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
  await page.goto(`${BASE}/blog/post-17.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");

  const postMeta = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector("h1")?.textContent?.trim(),
    description: document.querySelector('meta[name="description"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    hasHero: !!document.querySelector('img[src*="post-17-hero"]'),
    aptLink: !!document.querySelector('a[href="/tools/apt-calculator/"]'),
    mapLink: !!document.querySelector('a[href="/tools/realestate-map/"]'),
    nhufLink: !!document.querySelector('a[href*="nhuf.molit.go.kr"]'),
    adsense: !!document.querySelector('script[src*="adsbygoogle"]'),
    ga4: !!document.querySelector('script[src*="G-Y7SC73P9JW"]'),
  }));

  await page.screenshot({ path: `${OUT}/post-17-desktop.png`, fullPage: false });

  await page.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded" });
  const indexChecks = await page.evaluate(() => ({
    firstHref: document.querySelector("#blog-grid a.blog-card")?.getAttribute("href"),
    hasPost17: !!document.querySelector('#blog-grid a[href="post-17.html"]'),
    post17Thumb: !!document.querySelector(
      '#blog-grid a[href="post-17.html"] .blog-card-thumbnail img'
    ),
  }));
  await page.locator("#blog-grid").screenshot({ path: `${OUT}/blog-index-top.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/blog/post-17.html`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: `${OUT}/post-17-mobile.png`, fullPage: false });

  const sitemap = await readFile("sitemap.xml", "utf8");
  const sitemapHas17 = sitemap.includes("post-17.html");

  await browser.close();

  const pass =
    postMeta.title?.includes("신생아 특례대출") &&
    postMeta.hasHero &&
    postMeta.aptLink &&
    postMeta.mapLink &&
    postMeta.nhufLink &&
    postMeta.adsense &&
    postMeta.ga4 &&
    indexChecks.firstHref === "post-17.html" &&
    indexChecks.hasPost17 &&
    indexChecks.post17Thumb &&
    sitemapHas17 &&
    errors.length === 0;

  console.log(
    JSON.stringify(
      { postMeta, indexChecks, sitemapHas17, errors, pass, screenshots: OUT },
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
