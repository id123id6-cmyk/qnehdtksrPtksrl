/**
 * post-28 검증
 * 실행: node scripts/test-blog-post28.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const BASE = "http://localhost:8765";
const OUT = "screenshots/blog-post28";

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
  await page.goto(`${BASE}/blog/post-28.html`, { waitUntil: "domcontentloaded" });
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
    ctaMap: !!document.querySelector('a[href="/tools/realestate-map/"]'),
    ctaPost27: !!document.querySelector('a[href="post-27.html"]'),
    ctaPost25: !!document.querySelector('a[href="post-25.html"]'),
    ctaPost26: !!document.querySelector('a[href="post-26.html"]'),
    tables: document.querySelectorAll(".post-table").length,
    faq: document.body.innerText.includes("Q1."),
    dateOk: document.querySelector('time[datetime="2026-07-03"]') !== null,
  }));

  await page.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded" });
  const blogIndexChecks = await page.evaluate(() => ({
    first: document.querySelector("#blog-grid a.blog-card")?.getAttribute("href"),
    has28: !!document.querySelector('a[href="post-28.html"]'),
  }));

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const homeChecks = await page.evaluate(() => ({
    firstBlog: document.querySelector(".blog-preview-section .blog-grid a.blog-card")?.getAttribute("href"),
    has28: !!document.querySelector('.blog-preview-section a[href="/blog/post-28.html"]'),
    statPosts: document.getElementById("stat-posts")?.textContent,
    cardCount: document.querySelectorAll(".blog-preview-section .blog-grid a.blog-card").length,
  }));

  const sitemap = readFileSync("sitemap.xml", "utf8");
  const sitemapOk =
    sitemap.includes("post-28.html") && sitemap.includes("2026-07-03");

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
    checks.ctaMap &&
    checks.ctaPost27 &&
    checks.ctaPost25 &&
    checks.ctaPost26 &&
    checks.tables >= 3 &&
    checks.faq &&
    checks.dateOk &&
    blogIndexChecks.first === "post-28.html" &&
    blogIndexChecks.has28 &&
    homeChecks.firstBlog === "/blog/post-28.html" &&
    homeChecks.has28 &&
    homeChecks.statPosts === "28" &&
    homeChecks.cardCount === 6 &&
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
