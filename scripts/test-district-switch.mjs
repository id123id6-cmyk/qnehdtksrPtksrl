/**
 * 강남3구 지도 구 전환 Playwright 테스트
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const URL = "http://localhost:8765/tools/realestate-map/";
const SHOT_DIR = path.join(ROOT, "tools/realestate-map/screenshots");

const DISTRICTS = [
  { code: "11680", name: "강남구", minApts: 700 },
  { code: "11650", name: "서초구", minApts: 600 },
  { code: "11710", name: "송파구", minApts: 400 },
];

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];

  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(
    () => document.getElementById("marker-count")?.textContent?.includes("개"),
    { timeout: 120000 }
  );

  const results = [];

  for (const district of DISTRICTS) {
    await page.evaluate((code) => {
      window.RealEstateMap?.changeDistrict(code);
    }, district.code);

    await page.waitForFunction(
      (min) => {
        const text = document.getElementById("marker-count")?.textContent || "";
        const n = parseInt(text, 10);
        return Number.isFinite(n) && n >= min;
      },
      district.minApts,
      { timeout: 60000 }
    );

    await page.waitForTimeout(1500);

    const state = await page.evaluate((name) => {
      const countText = document.getElementById("marker-count")?.textContent || "";
      const count = parseInt(countText, 10);
      const guLabel = document.getElementById("selectedGu")?.textContent?.trim();
      const markers = document.querySelectorAll(".marker-pill, .marker-dot").length;
      return { count, guLabel, markers, districtName: name };
    }, district.name);

    await page.screenshot({
      path: path.join(SHOT_DIR, `district-${district.code}.png`),
      fullPage: false,
    });

    results.push({
      ...district,
      ...state,
      ok: state.guLabel === district.name && state.count >= district.minApts,
    });
  }

  // 필터 + 검색 스모크 (송파)
  await page.evaluate(() => {
    document.getElementById("filter-btn-price")?.click();
    document.querySelector('[data-filter-type="price"][data-filter-value="10to20"]')?.click();
  });
  await page.waitForTimeout(800);

  const filterOk = await page.evaluate(() => {
    const strong = document.getElementById("filtered-count");
    return strong && parseInt(strong.textContent, 10) > 0;
  });

  await browser.close();

  const checks = {
    allDistricts: results.every((r) => r.ok),
    filterWorks: filterOk,
    consoleErrors: errors.length,
  };

  console.log(JSON.stringify({ results, checks, errors }, null, 2));

  if (!checks.allDistricts || !checks.filterWorks || errors.length) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
