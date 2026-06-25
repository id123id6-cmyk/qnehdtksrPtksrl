/**
 * post-20 검증
 * 실행: node scripts/test-blog-post20.mjs
 */
import { chromium } from "playwright";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:8765";
const OUT = "screenshots/blog-post20";

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
  await page.goto(`${BASE}/blog/post-20.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");

  await page.evaluate(async () => {
    for (const img of document.querySelectorAll(".post-article img")) {
      img.scrollIntoView();
      await new Promise((r) => setTimeout(r, 80));
    }
  });

  const bodyText = await page.evaluate(() => {
    const article = document.querySelector(".post-article");
    return article?.innerText?.replace(/\s+/g, " ").trim() || "";
  });
  const charCount = bodyText.replace(/\s/g, "").length;

  const checks = await page.evaluate(() => ({
    title: document.title,
    images: [...document.querySelectorAll(".post-article img")].map((i) => ({
      src: i.getAttribute("src"),
      alt: i.getAttribute("alt"),
      ok: i.complete && i.naturalWidth > 0,
    })),
    ctaMap: !!document.querySelector('a[href="/tools/realestate-map/"]'),
    ctaDday: !!document.querySelector('a[href="/tools/dday-calculator/"]'),
    ctaSalary: !!document.querySelector('a[href="/tools/salary-calculator/"]'),
    linkPost19: !!document.querySelector('a[href="post-19.html"]'),
    tables: document.querySelectorAll(".post-table").length,
    tipBox: !!document.querySelector(".post-tip-box"),
    highlightNum: document.querySelectorAll(".post-highlight-num").length,
  }));

  await page.screenshot({ path: `${OUT}/post-20-desktop.png`, fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${OUT}/post-20-mobile.png`, fullPage: false });

  await page.goto(`${BASE}/blog/post-19.html`, { waitUntil: "domcontentloaded" });
  const post19Links = await page.evaluate(() => ({
    ctaPost20: !!document.querySelector('a[href="post-20.html"]'),
    navPost20: [...document.querySelectorAll(".post-nav a")].some(
      (a) => a.getAttribute("href") === "post-20.html"
    ),
  }));

  await page.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded" });
  const indexChecks = await page.evaluate(() => ({
    first: document.querySelector("#blog-grid a.blog-card")?.getAttribute("href"),
    has20: !!document.querySelector('a[href="post-20.html"]'),
    has19: !!document.querySelector('a[href="post-19.html"]'),
  }));

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const homeChecks = await page.evaluate(() => ({
    has20: !!document.querySelector('a[href="/blog/post-20.html"]'),
    has19: !!document.querySelector('a[href="/blog/post-19.html"]'),
    firstBlog: document.querySelector('a[href^="/blog/post-"]')?.getAttribute("href"),
  }));

  await browser.close();

  const imgSizes = {};
  for (const f of [
    "youth-account-dream.png",
    "interest-rate-benefit.png",
    "home-ownership-key.png",
  ]) {
    const s = await stat(path.join("blog/images/post-20", f));
    imgSizes[f] = Math.round(s.size / 1024);
  }

  const kw = {
    청년주택드림청약통장: (bodyText.match(/청년주택드림청약통장/g) || []).length,
    우대금리: (bodyText.match(/우대금리/g) || []).length,
    청년주택드림대출: (bodyText.match(/청년주택드림대출/g) || []).length,
  };

  const pass =
    charCount >= 2800 &&
    charCount <= 3300 &&
    checks.images.length === 3 &&
    checks.images.every((i) => i.ok) &&
    checks.ctaMap &&
    checks.ctaDday &&
    checks.ctaSalary &&
    checks.linkPost19 &&
    post19Links.ctaPost20 &&
    post19Links.navPost20 &&
    indexChecks.first === "post-20.html" &&
    indexChecks.has20 &&
    homeChecks.has20 &&
    homeChecks.has19 &&
    errors.length === 0;

  console.log(
    JSON.stringify(
      {
        charCount,
        kw,
        checks,
        post19Links,
        indexChecks,
        homeChecks,
        imgSizes,
        errors,
        pass,
        screenshots: OUT,
      },
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
