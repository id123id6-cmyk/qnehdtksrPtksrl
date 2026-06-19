/**
 * 마커 색상 깜빡임(거래없음→정상) 검증
 * 실행: node scripts/test-marker-colors.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const URL = "http://localhost:8765/tools/realestate-map/";
const SHOT_DIR = path.join(ROOT, "tools/realestate-map/screenshots");

async function getMarkerColorStats(page) {
  return page.evaluate(() => {
    const pills = [...document.querySelectorAll(".marker-pill")];
    const none = pills.filter((el) => el.classList.contains("marker-none")).length;
    const colored = pills.length - none;
    return { total: pills.length, none, colored };
  });
}

async function getDistrictPriceStats(page, code) {
  return page.evaluate((c) => {
    const list = window.RealEstateMap?.getDistrictCache?.()?.[c] || [];
    const withPrice = list.filter((a) => a.avgPrice1Y != null && a.avgPrice1Y > 0).length;
    return { apartments: list.length, withPrice };
  }, code);
}

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const timings = [];

  page.on("console", (m) => {
    const text = m.text();
    if (m.type() === "error") errors.push(text);
    const timingMatch = text.match(/\[timing\] (\w+): (\d+)ms/);
    if (timingMatch) timings.push({ name: timingMatch[1], ms: Number(timingMatch[2]) });
  });
  page.on("pageerror", (e) => errors.push(e.message));

  const tStart = Date.now();
  await page.goto(URL, { waitUntil: "domcontentloaded" });

  await page.waitForFunction(
    () => {
      const list = window.RealEstateMap?.getDistrictCache?.()?.["11680"] || [];
      const withPrice = list.filter((a) => a.avgPrice1Y != null && a.avgPrice1Y > 0).length;
      const count = parseInt(
        document.getElementById("marker-count")?.textContent || "0",
        10
      );
      return count >= 500 && list.length >= 500 && withPrice > 200;
    },
    { timeout: 20000 }
  );
  const initialVisibleMs = Date.now() - tStart;

  const statsT0 = await getDistrictPriceStats(page, "11680");
  await page.waitForTimeout(3000);
  const statsT3 = await getDistrictPriceStats(page, "11680");

  const priceDelta = Math.abs(statsT3.withPrice - statsT0.withPrice);

  // 구 전환: 마포구 (첫 로드)
  const switchStart = Date.now();
  await page.evaluate(() => window.RealEstateMap?.changeDistrict("11440"));
  await page.waitForFunction(
    () => {
      const list = window.RealEstateMap?.getDistrictCache?.()?.["11440"] || [];
      return list.length > 100 && list.filter((a) => a.avgPrice1Y > 0).length > 50;
    },
    { timeout: 20000 }
  );
  const mapoSwitchMs = Date.now() - switchStart;
  const mapoPrices = await getDistrictPriceStats(page, "11440");
  const mapoMarkers = await getMarkerColorStats(page);

  await page.screenshot({
    path: path.join(SHOT_DIR, "marker-colors-mapo.png"),
    fullPage: false,
  });

  const cacheStart = Date.now();
  await page.evaluate(() => window.RealEstateMap?.changeDistrict("11680"));
  await page.waitForFunction(
    () => document.getElementById("selectedGu")?.textContent?.trim() === "강남구",
    { timeout: 5000 }
  );
  const cacheSwitchMs = Date.now() - cacheStart;

  await page.screenshot({
    path: path.join(SHOT_DIR, "marker-colors-initial.png"),
    fullPage: false,
  });

  await browser.close();

  const timingMap = Object.fromEntries(timings.map((t) => [t.name, t.ms]));
  const checks = {
    initialVisibleMs,
    initialUnder3s: initialVisibleMs < 3000,
    gangnamWithPrice: statsT0.withPrice > 200,
    noPriceFlicker: priceDelta === 0,
    statsT0,
    statsT3,
    priceDelta,
    mapoSwitchMs,
    mapoWithPrice: mapoPrices.withPrice > 50,
    mapoColoredDom: mapoMarkers.colored,
    cacheSwitchMs,
    cacheUnder500ms: cacheSwitchMs < 500,
    consoleErrors: errors.length,
    timings: timingMap,
  };

  console.log(JSON.stringify({ checks, mapoPrices, errors }, null, 2));

  const pass =
    checks.gangnamWithPrice &&
    checks.noPriceFlicker &&
    checks.mapoWithPrice &&
    checks.cacheUnder500ms &&
    errors.length === 0;

  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
