/**
 * 4단계 최종 검증 (UI + 성능 + 안전성)
 * 실행: node scripts/test-final-validation.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = process.env.VALIDATION_BASE || "http://localhost:8765";
const MAP = `${BASE}/tools/realestate-map/`;
const OUT = path.join(ROOT, "screenshots", "final-validation");

const SAMPLES = [
  { name: "강남구", code: "11680", sido: "seoul" },
  { name: "송파구", code: "11710", sido: "seoul" },
  { name: "마포구", code: "11440", sido: "seoul" },
  { name: "용산구", code: "11170", sido: "seoul" },
  { name: "분당구", code: "41135", sido: "gyeonggi" },
  { name: "일산서구", code: "41287", sido: "gyeonggi" },
  { name: "영통구", code: "41117", sido: "gyeonggi" },
  { name: "평촌(동안)", code: "41173", sido: "gyeonggi" },
  { name: "동탄(화성)", code: "41590", sido: "gyeonggi" },
  { name: "광교(영통)", code: "41117", sido: "gyeonggi", skipIfDuplicate: true },
];

const SAFETY_PAGES = [
  { name: "메인", url: `${BASE}/`, selector: "body" },
  { name: "블로그", url: `${BASE}/blog/`, selector: "body" },
  { name: "D-Day", url: `${BASE}/tools/dday-calculator/`, selector: "body" },
  { name: "연봉계산기", url: `${BASE}/tools/salary-calculator/`, selector: "body" },
];

mkdirSync(OUT, { recursive: true });

async function selectDistrict(page, code, sido) {
  await page.evaluate(
    async ({ lawdCode, sidoId }) => {
      const sidoEl = document.getElementById("selectedSido");
      if (sidoId === "gyeonggi" && sidoEl && !sidoEl.textContent.includes("경기")) {
        document.getElementById("sidoDropdownMenu").hidden = false;
        document.querySelector('[data-sido="gyeonggi"]')?.click();
        await new Promise((r) => setTimeout(r, 300));
      }
      if (sidoId === "seoul" && sidoEl && !sidoEl.textContent.includes("서울")) {
        document.getElementById("sidoDropdownMenu").hidden = false;
        document.querySelector('[data-sido="seoul"]')?.click();
        await new Promise((r) => setTimeout(r, 300));
      }
      await window.RealEstateMap?.selectDistrict?.(lawdCode);
    },
    { lawdCode: code, sidoId: sido }
  );
  await page.waitForFunction(
    () => {
      const loading = document.getElementById("map-loading");
      return !loading || loading.hidden;
    },
    { timeout: 25000 }
  );
}

const browser = await chromium.launch({ headless: true });
const errors = [];
const loadTimes = [];
const safety = [];

function trackErrors(page, label) {
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${label}] ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[${label}] ${e.message}`));
}

try {
  const page = await browser.newPage();
  trackErrors(page, "map");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(MAP, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#sidoDropdownBtn", { timeout: 60000 });

  const ui = await page.evaluate(() => ({
    sidoOptions: [...document.querySelectorAll("[data-sido]")].map((el) => el.textContent.trim()),
    popularActive: document.querySelectorAll(".map-empty-popular-btn:not([disabled])").length,
    popularTotal: document.querySelectorAll(".map-empty-popular-btn").length,
    regionStat: document.querySelector(".map-empty-stat:last-child strong")?.textContent?.trim(),
    districtCountSeoul: Object.keys(
      window.RealEstateMapDistricts?.getDistrictsBySido?.("seoul") || {}
    ).length,
  }));

  await page.click("#sidoDropdownBtn", { force: true });
  await page.click('[data-sido="gyeonggi"]', { force: true });
  const gyeonggiCount = await page.evaluate(
    () => document.querySelectorAll("#guDropdownMenu [data-sigungu]").length
  );

  const seen = new Set();
  for (const s of SAMPLES) {
    if (s.skipIfDuplicate && seen.has(s.code)) {
      loadTimes.push({ ...s, ms: loadTimes.find((x) => x.code === s.code)?.ms, note: "영통구와 동일" });
      continue;
    }
    seen.add(s.code);
    const t0 = Date.now();
    await selectDistrict(page, s.code, s.sido);
    const ms = Date.now() - t0;
    loadTimes.push({ ...s, ms });
  }

  await page.goto(MAP, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#map-empty-state:not([hidden])", { timeout: 15000 });
  await page.click('.map-empty-popular-btn[data-code="11680"]');
  await page.waitForTimeout(2500);
  const flyLevel = await page.evaluate(() => window.RealEstateMap?.getMapLevel?.());
  await page.screenshot({ path: path.join(OUT, "gangnam-desktop.png") });

  await page.goto(MAP, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#map-empty-state:not([hidden])", { timeout: 15000 });
  await page.click('.map-empty-popular-btn[data-code="41135"]');
  await page.waitForTimeout(2500);
  const flyBundang = await page.evaluate(() => window.RealEstateMap?.getMapLevel?.());
  await page.screenshot({ path: path.join(OUT, "bundang-desktop.png") });

  const mobile = await browser.newPage();
  trackErrors(mobile, "mobile");
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(MAP, { waitUntil: "domcontentloaded" });
  await mobile.waitForSelector("#map-empty-state:not([hidden])", { timeout: 15000 });
  await mobile.click('.map-empty-popular-btn[data-code="41135"]');
  await mobile.waitForTimeout(2500);
  await mobile.screenshot({ path: path.join(OUT, "bundang-mobile.png") });

  for (const p of SAFETY_PAGES) {
    const pg = await browser.newPage();
    trackErrors(pg, p.name);
    let ok = false;
    let status = 0;
    try {
      const res = await pg.goto(p.url, { waitUntil: "domcontentloaded", timeout: 15000 });
      status = res?.status() || 0;
      await pg.waitForSelector(p.selector, { timeout: 10000 });
      ok = status >= 200 && status < 400;
    } catch (e) {
      safety.push({ ...p, ok: false, status, error: e.message });
      await pg.close();
      continue;
    }
    safety.push({ name: p.name, url: p.url, ok, status });
    await pg.close();
  }

  const report = {
    ui: { ...ui, gyeonggiDistrictCount: gyeonggiCount },
    flyToLevel: { gangnam: flyLevel, bundang: flyBundang, expected: 3 },
    loadTimes,
    safety,
    consoleErrors: errors,
  };

  console.log(JSON.stringify(report, null, 2));
  if (errors.length) process.exit(1);
} finally {
  await browser.close();
}
