/**
 * post-22 검증
 * 실행: node scripts/test-blog-post22.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:8765";
const OUT = "screenshots/blog-post22";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];

  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/blog/post-22.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");

  await page.evaluate(async () => {
    for (const img of document.querySelectorAll(".post-article img")) {
      img.scrollIntoView();
      await new Promise((r) => setTimeout(r, 100));
    }
  });
  await page.waitForTimeout(300);

  const bodyText = await page.evaluate(() => {
    const article = document.querySelector(".post-article");
    return article?.innerText?.replace(/\s+/g, " ").trim() || "";
  });
  const charCount = bodyText.length;

  const checks = await page.evaluate(() => ({
    images: [...document.querySelectorAll(".post-article img")].map((i) => ({
      src: i.getAttribute("src"),
      alt: i.getAttribute("alt"),
      ok: i.complete && i.naturalWidth > 0,
    })),
    ctaSub: !!document.querySelector('a[href="/tools/subscription-calculator/"]'),
    ctaMap: !!document.querySelector('a[href="/tools/realestate-map/"]'),
    ctaPost20: !!document.querySelector('a[href="post-20.html"]'),
    ctaPost21: !!document.querySelector('a[href="post-21.html"]'),
    applyhome: !!document.querySelector('a[href*="applyhome.co.kr"]'),
    rebLink: document.body.innerText.includes("한국부동산원"),
    tables: document.querySelectorAll(".post-table").length,
    faq: document.body.innerText.includes("Q1."),
  }));

  await page.screenshot({ path: `${OUT}/post-22-desktop.png`, fullPage: false });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: `${OUT}/post-22-mobile.png`, fullPage: false });

  await page.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded" });
  const blogIndexChecks = await page.evaluate(() => ({
    first: document.querySelector("#blog-grid a.blog-card")?.getAttribute("href"),
    has22: !!document.querySelector('a[href="post-22.html"]'),
  }));

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const homeChecks = await page.evaluate(() => ({
    firstBlog: document.querySelector(".blog-preview-section .blog-grid a.blog-card")?.getAttribute("href"),
    has22: !!document.querySelector('.blog-preview-section a[href="/blog/post-22.html"]'),
    statPosts: document.getElementById("stat-posts")?.textContent,
  }));

  const indexHtml = readFileSync("index.html", "utf8");
  const headEnd = indexHtml.indexOf("</head>");
  const headOriginal = readFileSync("index.html", "utf8").slice(0, headEnd);
  const headUnchanged = headOriginal === readFileSync("index.html", "utf8").slice(0, headEnd);

  const sitemap = readFileSync("sitemap.xml", "utf8");
  const sitemapOk = sitemap.includes("post-22.html") && sitemap.includes("2026-06-26");

  await browser.close();

  const pass =
    charCount >= 6000 &&
    charCount <= 7800 &&
    checks.images.length === 3 &&
    checks.images.every((i) => i.alt && i.ok) &&
    checks.ctaSub &&
    checks.ctaMap &&
    checks.ctaPost20 &&
    checks.ctaPost21 &&
    checks.applyhome &&
    checks.rebLink &&
    checks.tables >= 2 &&
    checks.faq &&
    blogIndexChecks.first === "post-22.html" &&
    blogIndexChecks.has22 &&
    homeChecks.firstBlog === "/blog/post-22.html" &&
    homeChecks.has22 &&
    homeChecks.statPosts === "22" &&
    sitemapOk &&
    errors.length === 0;

  const report = { charCount, checks, blogIndexChecks, homeChecks, headUnchanged, sitemapOk, errors, pass };
  console.log(JSON.stringify(report, null, 2));
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
