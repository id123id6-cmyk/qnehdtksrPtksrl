/**
 * 모바일 지도 UX 스모크 테스트 (375px)
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const URL = "http://localhost:8765/tools/realestate-map/";
const SHOT_DIR = path.join(ROOT, "tools/realestate-map/screenshots");

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(
    () => {
      const el = document.getElementById("marker-count");
      return el && /\d+개/.test(el.textContent || "");
    },
    { timeout: 120000 }
  );

  await page.screenshot({
    path: path.join(SHOT_DIR, "mobile-after-map-loaded.png"),
    fullPage: false,
  });

  const layout = await page.evaluate(() => {
    const mapPanel = document.querySelector(".map-panel");
    const region = document.querySelector(".region-selector");
    const filter = document.querySelector(".map-filter-bar");
    const fab = document.getElementById("mobileSearchFab");
    const sidebar = document.getElementById("sidebar-panel");
    const legend = document.getElementById("map-legend");

    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };

    const filterScroll = filter
      ? { scrollWidth: filter.scrollWidth, clientWidth: filter.clientWidth, overflowX: getComputedStyle(filter).overflowX }
      : null;

    const regionR = rect(region);
    const filterR = rect(filter);
    const gap = regionR && filterR ? filterR.left - regionR.right : null;
    const hasOverlap =
      regionR && filterR
        ? regionR.right > filterR.left && regionR.left < filterR.right
        : null;

    return {
      mapPanel: rect(mapPanel),
      region: regionR,
      filter: filterR,
      filterGap: gap,
      hasOverlap,
      filterScroll,
      fabVisible: fab ? getComputedStyle(fab).display !== "none" : false,
      sidebarTransform: sidebar ? getComputedStyle(sidebar).transform : null,
      sidebarOpen: sidebar?.classList.contains("is-open"),
      legend: rect(legend),
      markerCount: document.getElementById("marker-count")?.textContent?.trim(),
    };
  });

  // Legend collapse (바텀시트 열기 전)
  await page.click(".map-legend-toggle");
  const legendCollapsed = await page.evaluate(() =>
    document.getElementById("map-legend")?.classList.contains("is-collapsed")
  );

  // FAB click → search float
  await page.click("#mobileSearchFab");
  await page.waitForTimeout(300);
  const searchOpen = await page.evaluate(() => {
    const f = document.getElementById("mobileSearchFloat");
    return f && !f.hidden && document.body.classList.contains("mobile-search-open");
  });
  await page.screenshot({
    path: path.join(SHOT_DIR, "mobile-after-search-fab.png"),
    fullPage: false,
  });

  // Filter horizontal scroll
  const filterScrolled = await page.evaluate(() => {
    const bar = document.querySelector(".map-filter-bar");
    if (!bar) return false;
    const before = bar.scrollLeft;
    bar.scrollLeft = 80;
    return bar.scrollLeft > before || bar.scrollWidth > bar.clientWidth;
  });

  // Marker click via search (more reliable than map canvas)
  await page.fill("#mobile-search-input", "래미안");
  await page.waitForTimeout(500);
  const firstResult = page.locator(".search-results button, .search-results .search-result-item").first();
  if (await firstResult.count()) {
    await firstResult.click();
    await page.waitForTimeout(800);
  }

  const afterSelect = await page.evaluate(() => {
    const sidebar = document.getElementById("sidebar-panel");
    const r = sidebar?.getBoundingClientRect();
    return {
      sidebarOpen: sidebar?.classList.contains("is-open"),
      sidebarTop: r?.top,
      sidebarHeight: r?.height,
      hasContent: (document.getElementById("sidebar-content")?.innerText?.length || 0) > 20,
    };
  });

  await page.screenshot({
    path: path.join(SHOT_DIR, "mobile-after-bottom-sheet.png"),
    fullPage: false,
  });

  await browser.close();

  const checks = {
    mapFullWidth: layout.mapPanel?.width >= 370,
    mapBelowHeader: layout.mapPanel?.top >= 55 && layout.mapPanel?.top <= 58,
    mapFullHeight: layout.mapPanel?.height >= 750,
    regionFilterNoOverlap: layout.hasOverlap === false,
    filterCanScroll: filterScrolled || (layout.filterScroll?.scrollWidth > layout.filterScroll?.clientWidth),
    fabVisible: layout.fabVisible,
    searchToggle: searchOpen,
    bottomSheetOpens: afterSelect.sidebarOpen,
    bottomSheetOnScreen: afterSelect.sidebarTop !== undefined && afterSelect.sidebarTop < 500,
    legendCollapse: legendCollapsed,
    markerLoaded: /\d+개/.test(layout.markerCount || ""),
    consoleErrors: errors.length,
  };

  console.log(JSON.stringify({ layout, afterSelect, checks, errors }, null, 2));

  const failed = Object.entries(checks).filter(([, v]) => v === false);
  if (failed.length || errors.length) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
