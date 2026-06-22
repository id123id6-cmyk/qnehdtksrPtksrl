/**
 * post-14 + 블로그 카드 썸네일 검증
 * 실행: node scripts/test-blog-post14.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:8765";
const OUT = "screenshots/blog-post14";

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
  await page.goto(`${BASE}/blog/post-14.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");
  await page.screenshot({ path: `${OUT}/post-14-desktop.png`, fullPage: false });

  const postMeta = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    h1: document.querySelector("h1")?.textContent?.trim(),
    imgCount: document.querySelectorAll(".post-article img").length,
  }));

  await page.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#blog-grid .blog-card");
  await page.screenshot({ path: `${OUT}/blog-index-desktop.png`, fullPage: false });

  const indexChecks = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#blog-grid .blog-card")];
    const first = cards[0];
    return {
      total: cards.length,
      firstHref: first?.getAttribute("href"),
      firstHasThumb: first?.classList.contains("has-thumbnail"),
      firstThumbSrc: first?.querySelector(".blog-card-thumbnail img")?.getAttribute("src"),
      withThumb: cards.filter((c) => c.classList.contains("has-thumbnail")).length,
      noThumb: cards.filter((c) => c.classList.contains("no-thumbnail")).length,
    };
  });

  await page.click('#blog-grid a[href="post-14.html"]');
  await page.waitForURL("**/post-14.html");
  const navOk = page.url().includes("post-14.html");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: `${OUT}/blog-index-mobile.png`, fullPage: false });

  await browser.close();

  const pass =
    postMeta.h1?.includes("청년미래적금") &&
    postMeta.ogImage?.includes("post-14-youth-savings") &&
    indexChecks.total === 14 &&
    indexChecks.firstHref === "post-14.html" &&
    indexChecks.firstHasThumb &&
    indexChecks.withThumb >= 3 &&
    indexChecks.noThumb >= 1 &&
    navOk &&
    errors.length === 0;

  console.log(
    JSON.stringify({ postMeta, indexChecks, navOk, errors, pass, screenshots: OUT }, null, 2)
  );
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
