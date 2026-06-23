/**
 * Phase 1 평형 변경 검증 + before/after 스크린샷
 * 실행: node scripts/test-phase1-pyeong.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolveArea } from "./lib/pyeong-map.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "phase1-pyeong");
const REPORT = path.join(ROOT, "data", "validation", "phase1-pyeong-ui.json");
const BASE = "http://localhost:8765/tools/realestate-map/";

mkdirSync(OUT, { recursive: true });

const godeok = resolveArea(59.98);
console.log("[검증] 고덕 59.98㎡ →", godeok);

spawnSync(process.execPath, ["scripts/analyze-pyeong-distribution.mjs"], { cwd: ROOT });

async function waitMapReady(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.searchIndexReady === true, { timeout: 120000 });
  await page.waitForTimeout(2000);
}

async function selectAndSearch(page, districtCode, query) {
  await page.evaluate((code) => window.RealEstateMap?.selectDistrict?.(code), districtCode);
  await page.waitForTimeout(4000);
  await page.fill("#search-input", query);
  await page.waitForTimeout(800);
  await page.waitForSelector(".search-result-item", { timeout: 20000 });
  await page.click(".search-result-item");
  await page.waitForTimeout(3000);
}

const cases = [
  { slug: "pyeongtaek-godeok-geumho", code: "41220", query: "평택고덕금호", expect: "24평" },
  { slug: "gangnam", code: "11680", query: "래미안대치", expect: "34평" },
  { slug: "suwon-yeongtong", code: "41117", query: "영통", expect: "평" },
  { slug: "songpa", code: "11710", query: "잠실엘스", expect: "평" },
  { slug: "bundang", code: "41135", query: "분당", expect: "평" },
];

const browser = await chromium.launch();
const results = [];

for (const c of cases) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await waitMapReady(page);
    await selectAndSearch(page, c.code, c.query);
    const info = await page.evaluate(() => {
      const summary = document.querySelector(".apt-pyeong-summary")?.textContent?.trim();
      const sidebar = document.getElementById("sidebar-content")?.textContent || "";
      const tabs = [...document.querySelectorAll(".area-tab")].map((b) => b.textContent?.trim());
      return { summary, tabs, has24: sidebar.includes("24평"), has18: sidebar.includes("18평") };
    });
    await page.screenshot({ path: path.join(OUT, `${c.slug}-after.png`) });
    results.push({
      ...c,
      ...info,
      ok: info.summary?.includes(c.expect) || info.summary?.includes("24평"),
    });
  } catch (e) {
    results.push({ ...c, ok: false, error: String(e.message || e) });
  }
  await page.close();
}

await browser.close();

let dist = {};
try {
  dist = JSON.parse(
    readFileSync(path.join(ROOT, "data/validation/pyeong-distribution.json"), "utf8")
  );
} catch {
  /* ignore */
}

const report = {
  generatedAt: new Date().toISOString(),
  godeokMapping: godeok,
  uiResults: results,
  distribution: {
    topLabels: dist.labelDistribution?.slice(0, 10),
    bands: dist.bandDistribution,
    nonStandardCount: dist.nonStandardCount,
    nonStandardRate: dist.nonStandardRate,
  },
  screenshotsDir: OUT,
};

writeFileSync(REPORT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
