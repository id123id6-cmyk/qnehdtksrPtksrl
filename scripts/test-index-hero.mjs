/**
 * 메인 페이지 히어로 2단 분할 + Hero Card 검증
 * 실행: node scripts/test-index-hero.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE_URL = "http://localhost:8765/";
const OUT = "screenshots/index-hero-split";

async function captureHero(page, name, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  const section = page.locator(".hero-wrapper");
  await section.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(400);
  await section.screenshot({ path: `${OUT}/${name}.png` });
}

async function getLayoutMetrics(page) {
  return page.evaluate(() => {
    const left = document.querySelector(".hero-left");
    const right = document.querySelector(".hero-right");
    const card = document.querySelector(".tool-hero-card");
    const lr = left?.getBoundingClientRect();
    const rr = right?.getBoundingClientRect();
    return {
      leftTop: lr?.top ?? null,
      rightTop: rr?.top ?? null,
      leftLeft: lr?.left ?? null,
      rightLeft: rr?.left ?? null,
      leftWidth: lr?.width ?? null,
      rightWidth: rr?.width ?? null,
      cardHref: card?.getAttribute("href"),
      badgeCount: document.querySelectorAll(".hero-badges-grid > *").length,
    };
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await captureHero(page, "desktop-1920", { width: 1920, height: 1080 });
  await captureHero(page, "laptop-1366", { width: 1366, height: 768 });
  await captureHero(page, "tablet-768", { width: 768, height: 1024 });
  await captureHero(page, "mobile-375", { width: 375, height: 667 });

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  const desktopLayout = await getLayoutMetrics(page);

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  const mobileLayout = await getLayoutMetrics(page);

  const checks = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content,
    heroTitle: document.querySelector(".tool-hero-title")?.textContent?.trim(),
    heroLink: document.querySelector(".tool-hero-card")?.getAttribute("href"),
    statsCount: document.querySelectorAll(".tool-hero-stat").length,
    otherToolsCount: document.querySelectorAll(".tools-grid--other .tool-card").length,
    hasHeroWrapper: !!document.querySelector(".hero-wrapper"),
    hasHeroSplit: !!document.querySelector(".hero-split"),
    badgeCount: document.querySelectorAll(".hero-badges-grid > *").length,
    otherHeader: document.querySelector(".tools-other .section-title")?.textContent?.trim(),
  }));

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.click(".tool-hero-card");
  await page.waitForURL("**/tools/realestate-map/**", { timeout: 10000 });
  const mapNavOk = page.url().includes("/tools/realestate-map");

  await browser.close();

  const desktopSplit =
    desktopLayout.leftLeft != null &&
    desktopLayout.rightLeft != null &&
    desktopLayout.rightLeft > desktopLayout.leftLeft + 100 &&
    Math.abs(desktopLayout.leftWidth - desktopLayout.rightWidth) < 80;

  const mobileOrder =
    mobileLayout.rightTop != null &&
    mobileLayout.leftTop != null &&
    mobileLayout.rightTop < mobileLayout.leftTop;

  const pass =
    checks.hasHeroWrapper &&
    checks.heroTitle === "서울 부동산 실거래가 지도" &&
    checks.heroLink === "/tools/realestate-map/" &&
    checks.statsCount === 3 &&
    checks.otherToolsCount === 5 &&
    checks.badgeCount === 6 &&
    desktopSplit &&
    mobileOrder &&
    mapNavOk &&
    errors.length === 0;

  console.log(
    JSON.stringify(
      {
        checks: { ...checks, badgeCount: desktopLayout.badgeCount ?? checks.badgeCount },
        desktopLayout,
        mobileLayout,
        desktopSplit,
        mobileOrder,
        mapNavOk,
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
