/**
 * post-18 검증 + 스크린샷
 * 실행: node scripts/test-blog-post18.mjs
 */
import { chromium } from "playwright";
import { readFile, readdir, stat } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:8765";
const OUT = "screenshots/blog-post18";
const IMG_DIR = "blog/images/post-18";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/blog/post-18.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");
  await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll(".post-article img")];
    for (const img of imgs) {
      img.scrollIntoView();
      await new Promise((r) => setTimeout(r, 100));
    }
  });
  await page.waitForTimeout(500);

  const bodyText = await page.evaluate(() => {
    const article = document.querySelector(".post-article");
    return article?.innerText?.replace(/\s+/g, " ").trim() || "";
  });
  const charCount = bodyText.replace(/\s/g, "").length;

  const images = await page.evaluate(() =>
    [...document.querySelectorAll(".post-article img")].map((img) => ({
      src: img.getAttribute("src"),
      ok: img.complete && img.naturalWidth > 0,
    }))
  );

  const postMeta = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector("h1")?.textContent?.trim(),
    description: document.querySelector('meta[name="description"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    salaryLink: !!document.querySelector('a[href="/tools/salary-calculator/"]'),
    ddayLink: !!document.querySelector('a[href="/tools/dday-calculator/"]'),
    mapLink: !!document.querySelector('a[href="/tools/realestate-map/"]'),
    aptLink: !!document.querySelector('a[href="/tools/apt-calculator/"]'),
    nhufLink: !!document.querySelector('a[href*="nhuf.molit.go.kr"]'),
    hfLink: !!document.querySelector('a[href*="hf.go.kr"]'),
    ctaBoxes: document.querySelectorAll(".cta-box").length,
  }));

  await page.screenshot({ path: `${OUT}/post-18-desktop-1920.png`, fullPage: false });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: `${OUT}/post-18-desktop-1440.png`, fullPage: false });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/blog/post-18.html`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: `${OUT}/post-18-mobile-375.png`, fullPage: false });
  await page.setViewportSize({ width: 414, height: 896 });
  await page.screenshot({ path: `${OUT}/post-18-mobile-414.png`, fullPage: false });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded" });
  const indexChecks = await page.evaluate(() => ({
    firstHref: document.querySelector("#blog-grid a.blog-card")?.getAttribute("href"),
    hasPost18: !!document.querySelector('#blog-grid a[href="post-18.html"]'),
    post18Thumb: !!document.querySelector(
      '#blog-grid a[href="post-18.html"] .blog-card-thumbnail img'
    ),
  }));
  await page.locator("#blog-grid").screenshot({ path: `${OUT}/blog-index-top.png` });

  const sitemap = await readFile("sitemap.xml", "utf8");
  const imgFiles = await readdir(IMG_DIR);
  const imgSizes = {};
  for (const f of imgFiles) {
    const s = await stat(path.join(IMG_DIR, f));
    imgSizes[f] = Math.round(s.size / 1024);
  }

  const keywords = ["생애최초", "디딤돌", "보금자리", "신생아"];
  const keywordDensity = Object.fromEntries(
    keywords.map((k) => [k, (bodyText.match(new RegExp(k, "g")) || []).length])
  );

  await browser.close();

  const pass =
    charCount >= 2800 &&
    charCount <= 4000 &&
    postMeta.salaryLink &&
    postMeta.ddayLink &&
    postMeta.mapLink &&
    postMeta.aptLink &&
    postMeta.ctaBoxes >= 4 &&
    images.every((i) => i.ok) &&
    images.length === 6 &&
    indexChecks.firstHref === "post-18.html" &&
    indexChecks.hasPost18 &&
    sitemap.includes("post-18.html") &&
    Object.values(imgSizes).every((kb) => kb <= 200) &&
    errors.length === 0;

  console.log(
    JSON.stringify(
      {
        charCount,
        keywordDensity,
        postMeta,
        images,
        imgSizes,
        indexChecks,
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
