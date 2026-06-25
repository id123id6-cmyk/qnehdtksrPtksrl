/**
 * post-19 검증
 * 실행: node scripts/test-blog-post19.mjs
 */
import { chromium } from "playwright";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:8765";
const OUT = "screenshots/blog-post19";

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
  await page.goto(`${BASE}/blog/post-19.html`, { waitUntil: "domcontentloaded" });
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
      ok: i.complete && i.naturalWidth > 0,
    })),
    ctaDday: !!document.querySelector('a[href="/tools/dday-calculator/"]'),
    ctaSalary: !!document.querySelector('a[href="/tools/salary-calculator/"]'),
    tables: document.querySelectorAll(".post-table").length,
    tipBox: !!document.querySelector(".post-tip-box"),
  }));

  await page.screenshot({ path: `${OUT}/post-19-desktop.png`, fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${OUT}/post-19-mobile.png`, fullPage: false });

  await page.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded" });
  const indexChecks = await page.evaluate(() => ({
    first: document.querySelector("#blog-grid a.blog-card")?.getAttribute("href"),
    has19: !!document.querySelector('a[href="post-19.html"]'),
  }));

  await browser.close();

  const imgSizes = {};
  for (const f of [
    "youth-rent-worry.png",
    "online-application.png",
    "happy-support.png",
  ]) {
    const s = await stat(path.join("blog/images/post-19", f));
    imgSizes[f] = Math.round(s.size / 1024);
  }

  const keywords = ["청년월세지원", "디딤돌", "보금자리", "신생아"];
  const kw = {
    청년월세지원: (bodyText.match(/청년월세지원/g) || []).length,
    청년월세지원사업: (bodyText.match(/청년월세지원사업/g) || []).length,
    월세지원: (bodyText.match(/월세지원/g) || []).length,
  };

  const pass =
    charCount >= 2500 &&
    charCount <= 3500 &&
    checks.images.length === 3 &&
    checks.images.every((i) => i.ok) &&
    checks.ctaDday &&
    checks.ctaSalary &&
    indexChecks.first === "post-19.html" &&
    indexChecks.has19 &&
    errors.length === 0;

  console.log(
    JSON.stringify(
      { charCount, kw, checks, indexChecks, imgSizes, errors, pass, screenshots: OUT },
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
