/**
 * 히어로 배지 클릭 + D-Day 연동 통합 검증
 * 실행: node scripts/test-dday-link.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:8765";
const OUT = "screenshots/dday-link";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  const gaEvents = [];

  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

  await page.evaluate(() => {
    window.__gaEvents = [];
    const orig = window.gtag;
    window.gtag = function (...args) {
      if (args[0] === "event") {
        window.__gaEvents.push({ name: args[1], params: args[2] });
      }
      if (orig) return orig.apply(this, args);
    };
  });

  const heroDesc = await page.locator(".tool-hero-desc").textContent();
  const meta = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
  }));

  const toolsBadge = page.locator('a.badge-link[href="/tools/"]');
  const blogBadge = page.locator('a.badge-link[href="/blog/"]');
  const staticBadge = page.locator(".badge-success");

  await toolsBadge.hover();
  await page.waitForTimeout(300);
  await page.locator(".hero-badges-grid").screenshot({ path: `${OUT}/badge-hover-tools.png` });

  const toolsGaPromise = page.evaluate(() =>
    new Promise((resolve) => {
      const badge = document.querySelector('a.badge-link[href="/tools/"]');
      badge.addEventListener(
        "click",
        () => setTimeout(() => resolve(window.__gaEvents.slice()), 0),
        { once: true }
      );
      badge.click();
    })
  );
  await Promise.all([page.waitForURL("**/tools/**", { timeout: 10000 }), toolsGaPromise]);
  const toolsUrl = page.url();
  gaEvents.push(...(await toolsGaPromise.catch(() => [])));

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.__gaEvents = [];
    const orig = window.gtag;
    window.gtag = function (...args) {
      if (args[0] === "event") {
        window.__gaEvents.push({ name: args[1], params: args[2] });
      }
      if (orig) return orig.apply(this, args);
    };
  });

  const blogGaPromise = page.evaluate(() =>
    new Promise((resolve) => {
      const badge = document.querySelector('a.badge-link[href="/blog/"]');
      badge.addEventListener(
        "click",
        () => setTimeout(() => resolve(window.__gaEvents.slice()), 0),
        { once: true }
      );
      badge.click();
    })
  );
  await Promise.all([page.waitForURL("**/blog/**", { timeout: 10000 }), blogGaPromise]);
  const blogUrl = page.url();
  gaEvents.push(...(await blogGaPromise.catch(() => [])));

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.locator(".hero-wrapper").screenshot({ path: `${OUT}/main-hero-after.png` });

  const nonLinkHover = await staticBadge.evaluate((el) => {
    const before = getComputedStyle(el).transform;
    el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    const after = getComputedStyle(el).transform;
    return { before, after };
  });

  await page.goto(`${BASE}/tools/realestate-map/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#map-empty-state:not([hidden])", { timeout: 15000 });
  await page.click('.map-empty-popular-btn[data-code="11680"]');
  await page.waitForFunction(
    () => parseInt(document.getElementById("total-count")?.textContent || "0", 10) >= 500,
    { timeout: 25000 }
  );

  await page.evaluate(() => {
    const apt = window.RealEstateMap?.getDistrictCache?.()?.["11680"]?.find(
      (a) => a.avgPrice1Y > 0
    );
    if (apt) window.RealEstateMap?.focusApartment?.(apt);
  });

  await page.waitForSelector(".dday-link-btn", { timeout: 15000 });
  await page.locator(".sidebar-content").screenshot({ path: `${OUT}/map-sidebar-dday.png` });

  const promptHref = await page.locator(".dday-link-btn").getAttribute("href");
  await page.click(".dday-link-btn");
  await page.waitForURL("**/dday-calculator/**", { timeout: 10000 });

  const ddayState = await page.evaluate(() => ({
    url: location.href,
    targetPrice: document.getElementById("target-price")?.value,
    aptTitle: document.getElementById("apt-title")?.textContent?.trim(),
    headerHidden: document.getElementById("dday-apt-header")?.hidden === false,
  }));

  await page.screenshot({ path: `${OUT}/dday-auto-fill.png`, fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.locator(".hero-badges-grid").screenshot({ path: `${OUT}/badges-mobile.png` });

  await page.goto(`${BASE}/tools/realestate-map/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#map-empty-state:not([hidden])", { timeout: 15000 });
  await page.click('.map-empty-popular-btn[data-code="11680"]');
  await page.waitForFunction(
    () => parseInt(document.getElementById("total-count")?.textContent || "0", 10) >= 500,
    { timeout: 25000 }
  );
  await page.evaluate(() => {
    const apt = window.RealEstateMap?.getDistrictCache?.()?.["11680"]?.find(
      (a) => a.avgPrice1Y > 0
    );
    if (apt) window.RealEstateMap?.focusApartment?.(apt);
  });
  await page.waitForSelector(".dday-link-box", { timeout: 15000 });
  await page.locator(".sidebar-content").screenshot({ path: `${OUT}/map-sidebar-mobile.png` });

  await browser.close();

  const badgeClickEvents = gaEvents.filter((e) => e.name === "badge_click");
  const pass =
    heroDesc?.includes("D-Day 계산") &&
    meta.title?.includes("직장인 도구 모음") &&
    meta.description?.includes("D-Day 계산기") &&
    toolsUrl.includes("/tools") &&
    blogUrl.includes("/blog") &&
    badgeClickEvents.length >= 2 &&
    nonLinkHover.before === nonLinkHover.after &&
    promptHref?.includes("dday-calculator") &&
    ddayState.targetPrice &&
    Number(ddayState.targetPrice) > 0 &&
    ddayState.headerHidden &&
    errors.length === 0;

  console.log(
    JSON.stringify(
      {
        heroDesc: heroDesc?.trim(),
        meta,
        toolsUrl,
        blogUrl,
        badgeClickEvents,
        nonLinkHover,
        promptHref,
        ddayState,
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
