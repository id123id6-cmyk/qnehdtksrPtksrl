/**
 * Empty State + 인기 지역 검증
 * 실행: node scripts/test-empty-state.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:8765";
const OUT = "screenshots/empty-state";

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
  const t0 = Date.now();
  await page.goto(`${BASE}/tools/realestate-map/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#map-empty-state:not([hidden])", { timeout: 15000 });

  const initial = await page.evaluate(() => ({
    emptyVisible: !document.getElementById("map-empty-state")?.hidden,
    title: document.querySelector(".map-empty-state-title")?.textContent?.trim(),
    guLabel: document.getElementById("selectedGu")?.textContent?.trim(),
    hintVisible: !document.getElementById("region-select-hint")?.hidden,
    hintText: document.getElementById("region-select-hint")?.textContent?.trim(),
    filterHidden: document
      .getElementById("map-filter-bar")
      ?.classList.contains("map-controls-hidden"),
    popularCount: document.querySelectorAll(".map-empty-popular-btn:not([disabled])").length,
    popularNames: [...document.querySelectorAll(".map-empty-popular-btn")].map((b) =>
      b.textContent.trim().replace(/\s*준비 중.*/, "")
    ),
    guDropdownCount: document.querySelectorAll("#guDropdownMenu .gu-item").length,
    districtCount: Object.keys(window.RealEstateMapDistricts?.SEOUL_DISTRICTS || {}).length,
  }));

  await page.screenshot({ path: `${OUT}/initial-desktop.png`, fullPage: false });
  await page.locator(".map-empty-state-card").screenshot({ path: `${OUT}/empty-card-desktop.png` });

  const loadStart = Date.now();
  await page.click('.map-empty-popular-btn[data-code="11680"]');
  await page.waitForFunction(
    () => parseInt(document.getElementById("total-count")?.textContent || "0", 10) >= 500,
    { timeout: 15000 }
  );
  await page.waitForFunction(
    () => (window.RealEstateMap?.getMapLevel?.() ?? 99) <= 4,
    { timeout: 5000 }
  );

  const afterSelect = await page.evaluate(() => ({
    emptyHidden: document.getElementById("map-empty-state")?.hidden === true,
    hintHidden: document.getElementById("region-select-hint")?.hidden === true,
    guLabel: document.getElementById("selectedGu")?.textContent?.trim(),
    markerCount: parseInt(document.getElementById("total-count")?.textContent || "0", 10),
    filterVisible: !document
      .getElementById("map-filter-bar")
      ?.classList.contains("map-controls-hidden"),
    mapLevel: window.RealEstateMap?.getMapLevel?.(),
    mapCenter: window.RealEstateMap?.getMapCenter?.(),
  }));
  const loadMs = Date.now() - loadStart;

  await page.screenshot({ path: `${OUT}/after-gangnam-desktop.png`, fullPage: false });

  await page.click("#map-help-btn");
  await page.waitForSelector("#map-empty-state:not([hidden])", { timeout: 5000 });
  const helpShown = await page.evaluate(
    () => document.getElementById("map-empty-state")?.hidden === false
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/tools/realestate-map/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#map-empty-state:not([hidden])", { timeout: 15000 });
  await page.screenshot({ path: `${OUT}/initial-mobile.png`, fullPage: false });

  await browser.close();

  const pass =
    initial.emptyVisible &&
    initial.title?.includes("어디부터") &&
    initial.guLabel === "구 선택" &&
    initial.filterHidden &&
    initial.hintVisible &&
    initial.hintText?.includes("여기서 지역을 선택해주세요") &&
    initial.districtCount === 25 &&
    initial.guDropdownCount === 25 &&
    initial.popularCount === 6 &&
    initial.popularNames.join(",") === "강남구,송파구,마포구,용산구,성동구,영등포구" &&
    afterSelect.emptyHidden &&
    afterSelect.hintHidden &&
    afterSelect.guLabel === "강남구" &&
    afterSelect.markerCount >= 500 &&
    afterSelect.filterVisible &&
    afterSelect.mapLevel != null &&
    afterSelect.mapLevel <= 4 &&
    afterSelect.mapCenter?.lat > 37.4 &&
    afterSelect.mapCenter?.lat < 37.6 &&
    afterSelect.mapCenter?.lng > 126.9 &&
    afterSelect.mapCenter?.lng < 127.2 &&
    loadMs <= 5000 &&
    helpShown &&
    errors.length === 0;

  console.log(
    JSON.stringify(
      {
        initial,
        afterSelect,
        loadMs,
        helpShown,
        firstPaintMs: Date.now() - t0,
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
