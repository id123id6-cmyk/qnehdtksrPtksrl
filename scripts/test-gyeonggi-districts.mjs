/**
 * 경기도 31시군 지도 UI·로딩 검증 (Playwright)
 * 실행: (로컬 서버 8765 필요) node scripts/test-gyeonggi-districts.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GYEONGGI_DISTRICTS } from "./lib/gyeonggi-districts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = "http://localhost:8765";
const MAP_URL = `${BASE}/tools/realestate-map/`;

const SAMPLE_CODES = ["41135", "41287", "41117", "41150", "41590"];
const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function selectGyeonggiDistrict(page, code) {
  await page.evaluate(async (lawdCode) => {
    const sidoEl = document.getElementById("selectedSido");
    if (sidoEl && !sidoEl.textContent.includes("경기")) {
      document.getElementById("sidoDropdownMenu").hidden = false;
      document.querySelector('[data-sido="gyeonggi"]')?.click();
    }
    await window.RealEstateMap?.selectDistrict?.(lawdCode);
  }, code);
}

mkdirSync(path.join(ROOT, "screenshots", "gyeonggi"), { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const loadTimes = [];

try {
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(MAP_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#sidoDropdownBtn", { timeout: 60000 });
  await page.waitForSelector("#map-empty-state:not([hidden])", { timeout: 15000 });

  await page.click("#sidoDropdownBtn");
  await page.click('[data-sido="gyeonggi"]');
  await page.screenshot({
    path: path.join(ROOT, "screenshots", "gyeonggi", "gyeonggi-sido-desktop.png"),
  });

  const gyeonggiGuCount = await page.evaluate(
    () => document.querySelectorAll("#guDropdownMenu [data-sigungu]").length
  );
  console.log(`경기도 시·군·구 드롭다운: ${gyeonggiGuCount}개`);

  for (const code of SAMPLE_CODES) {
    const name = GYEONGGI_DISTRICTS.find((d) => d.code === code)?.name || code;
    const t0 = Date.now();
    await selectGyeonggiDistrict(page, code);
    await page.waitForFunction(
      () => {
        const loading = document.getElementById("map-loading");
        return !loading || loading.hidden;
      },
      { timeout: 20000 }
    );
    const ms = Date.now() - t0;
    loadTimes.push({ code, name, ms });
    console.log(`✅ ${name}: ${ms}ms`);
    if (ms > 1000) console.warn(`  ⚠️ 1초 초과`);
  }

  await page.goto(MAP_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#map-empty-state:not([hidden])", { timeout: 15000 });
  await page.click('.map-empty-popular-btn[data-code="41135"]');
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: path.join(ROOT, "screenshots", "gyeonggi", "bundang-desktop.png"),
  });

  const mobile = await browser.newPage();
  mobile.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await mobile.setViewportSize(MOBILE_VIEWPORT);
  await mobile.goto(MAP_URL, { waitUntil: "domcontentloaded" });
  await mobile.waitForSelector("#sidoDropdownBtn", { timeout: 60000 });
  await mobile.click('.map-empty-popular-btn[data-code="41135"]');
  await mobile.waitForTimeout(3000);
  await mobile.screenshot({
    path: path.join(ROOT, "screenshots", "gyeonggi", "bundang-mobile.png"),
  });

  console.log("\n=== 로딩 시간 샘플 ===");
  loadTimes.forEach((r) => console.log(`  ${r.name}: ${r.ms}ms`));
  console.log(`\n콘솔 에러: ${errors.length}`);
  if (errors.length) errors.slice(0, 10).forEach((e) => console.log(" ", e));
  if (errors.length) process.exit(1);
} finally {
  await browser.close();
}
