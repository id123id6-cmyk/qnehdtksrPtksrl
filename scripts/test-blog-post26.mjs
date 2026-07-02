/**
 * post-26 검증
 * 실행: node scripts/test-blog-post26.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const BASE = "http://localhost:8765";
const OUT = "screenshots/blog-post26";

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
  await page.goto(`${BASE}/blog/post-26.html`, { waitUntil: "domcontentloaded" });
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
    ctaPost25: !!document.querySelector('a[href="post-25.html"]'),
    ctaPost21: !!document.querySelector('a[href="post-21.html"]'),
    ctaPost22: !!document.querySelector('a[href="post-22.html"]'),
    tables: document.querySelectorAll(".post-table").length,
    faq: document.body.innerText.includes("Q1."),
    dateOk: document.querySelector('time[datetime="2026-07-02"]') !== null,
  }));

  await page.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded" });
  const blogIndexChecks = await page.evaluate(() => ({
    first: document.querySelector("#blog-grid a.blog-card")?.getAttribute("href"),
    has26: !!document.querySelector('a[href="post-26.html"]'),
  }));

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const homeChecks = await page.evaluate(() => ({
    firstBlog: document.querySelector(".blog-preview-section .blog-grid a.blog-card")?.getAttribute("href"),
    has26: !!document.querySelector('.blog-preview-section a[href="/blog/post-26.html"]'),
    statPosts: document.getElementById("stat-posts")?.textContent,
    cardCount: document.querySelectorAll(".blog-preview-section .blog-grid a.blog-card").length,
  }));

  const sitemap = readFileSync("sitemap.xml", "utf8");
  const sitemapOk =
    sitemap.includes("post-26.html") && sitemap.includes("2026-07-02");

  let headDiffZero = false;
  try {
    const diff = execSync("git diff index.html", { encoding: "utf8" });
    const headOnly = diff.split("@@").filter((chunk) => chunk.includes("<head>"));
    headDiffZero = headOnly.length === 0;
  } catch {
    headDiffZero = true;
  }

  await browser.close();

  const pass =
    charCount >= 6000 &&
    charCount <= 7800 &&
    checks.images.length === 3 &&
    checks.images.every((i) => i.alt && i.ok) &&
    checks.ctaSub &&
    checks.ctaPost25 &&
    checks.ctaPost21 &&
    checks.ctaPost22 &&
    checks.tables >= 3 &&
    checks.faq &&
    checks.dateOk &&
    blogIndexChecks.first === "post-26.html" &&
    blogIndexChecks.has26 &&
    homeChecks.firstBlog === "/blog/post-26.html" &&
    homeChecks.has26 &&
    homeChecks.statPosts === "26" &&
    homeChecks.cardCount === 3 &&
    sitemapOk &&
    headDiffZero &&
    errors.length === 0;

  console.log(
    JSON.stringify(
      { charCount, checks, blogIndexChecks, homeChecks, sitemapOk, headDiffZero, errors, pass },
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
