/**
 * post-21 검증
 * 실행: node scripts/test-blog-post21.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

const BASE = "http://localhost:8765";
const OUT = "screenshots/blog-post21";

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
  await page.goto(`${BASE}/blog/post-21.html`, { waitUntil: "domcontentloaded" });
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
    ctaPost18: !!document.querySelector('a[href="post-18.html"]'),
    ctaPost20: !!document.querySelector('a[href="post-20.html"]'),
    hfLink: !!document.querySelector('a[href="https://www.hf.go.kr"]'),
    tables: document.querySelectorAll(".post-table").length,
    faq: document.body.innerText.includes("Q1."),
  }));

  await page.screenshot({ path: `${OUT}/post-21-desktop.png`, fullPage: false });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: `${OUT}/post-21-mobile.png`, fullPage: false });

  await page.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded" });
  const indexChecks = await page.evaluate(() => ({
    first: document.querySelector("#blog-grid a.blog-card")?.getAttribute("href"),
    has21: !!document.querySelector('a[href="post-21.html"]'),
  }));

  const sitemap = readFileSync("sitemap.xml", "utf8");
  const sitemapOk = sitemap.includes("post-21.html") && sitemap.includes("2026-06-26");

  await browser.close();

  const pass =
    charCount >= 6000 &&
    charCount <= 7500 &&
    checks.images.length === 3 &&
    checks.images.every((i) => i.alt && i.ok) &&
    checks.ctaSub &&
    checks.ctaMap &&
    checks.ctaPost18 &&
    checks.ctaPost20 &&
    checks.hfLink &&
    checks.tables >= 4 &&
    checks.faq &&
    indexChecks.first === "post-21.html" &&
    indexChecks.has21 &&
    sitemapOk &&
    errors.length === 0;

  const report = { charCount, checks, indexChecks, sitemapOk, errors, pass };
  console.log(JSON.stringify(report, null, 2));
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
