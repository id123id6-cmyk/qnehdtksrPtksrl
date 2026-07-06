/**
 * index.html 메인 리디자인 검증
 * 실행: node scripts/test-main-redesign.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const BASE = "http://localhost:8765";
const OUT = "screenshots/main-redesign";
const FORBIDDEN = ["보물", "마법사", "마법", "치트키", "꿀팁", "비장의 무기"];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];

  for (const [name, w, h] of [
    ["mobile-375", 375, 812],
    ["tablet-768", 768, 1024],
    ["desktop-1440", 1440, 900],
  ]) {
    const page = await browser.newPage();
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`[${name}] ${m.text()}`);
    });
    page.on("pageerror", (e) => errors.push(`[${name}] ${e.message}`));

    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".hr-hero-title");
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    await page.close();
  }

  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  const checks = await page.evaluate(() => ({
    bodyClass: document.body.classList.contains("home-redesign"),
    heroTitle: document.querySelector(".hr-hero-title")?.textContent?.trim(),
    mapLink: document.querySelectorAll('a[href="/tools/realestate-map/"]').length,
    toolsLink: !!document.querySelector('a[href="/tools/"]'),
    blogLink: !!document.querySelector('a[href="/blog/"]'),
    aboutLink: !!document.querySelector('a[href="/about.html"]'),
    toolCards: document.querySelectorAll(".hr-tool-card").length,
    blogCards: document.querySelectorAll(".hr-blog-card").length,
    gtag: typeof gtag !== "undefined",
    clarity: typeof window.clarity !== "undefined" || !!document.querySelector('script[src*="clarity"]'),
    adsense: !!document.querySelector('script[src*="adsbygoogle"]'),
    mapImgAlt: document.querySelector(".hr-map-image img")?.getAttribute("alt"),
    cssRedesign: !!document.querySelector('link[href="css/main-redesign.css"]'),
  }));

  const bodyText = await page.evaluate(() => document.body.innerText);
  const forbiddenFound = FORBIDDEN.filter((w) => bodyText.includes(w));

  const headHtml = readFileSync("index.html", "utf8").match(/<head>[\s\S]*?<\/head>/)[0];
  const headDiff = execSync("git diff index.html", { encoding: "utf8" });
  const headLinesChanged = headDiff
    .split("\n")
    .filter((l) => l.startsWith("+") || l.startsWith("-"))
    .filter((l) => !l.startsWith("+++") && !l.startsWith("---"));

  const headOnlyCssLink =
    headLinesChanged.length <= 2 &&
    headLinesChanged.every((l) => l.includes("main-redesign.css"));

  const gaUntouched =
    headHtml.includes("G-Y7SC73P9JW") &&
    headHtml.includes("xbdrgqw1pj") &&
    headHtml.includes("ca-pub-8232968272801958") &&
    headHtml.includes("<title>서울 부동산 실거래가");

  await browser.close();

  const pass =
    checks.bodyClass &&
    checks.heroTitle === "부동산 정보를 한 곳에서" &&
    checks.mapLink >= 3 &&
    checks.toolsLink &&
    checks.blogLink &&
    checks.aboutLink &&
    checks.toolCards === 7 &&
    checks.blogCards === 3 &&
    checks.gtag &&
    checks.adsense &&
    checks.mapImgAlt &&
    checks.cssRedesign &&
    forbiddenFound.length === 0 &&
    gaUntouched &&
    headOnlyCssLink &&
    errors.length === 0;

  console.log(
    JSON.stringify(
      {
        checks,
        forbiddenFound,
        gaUntouched,
        headOnlyCssLink,
        headLinesChanged,
        errors,
        pass,
        url: BASE + "/",
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
