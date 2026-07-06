/**
 * 지역 필터 동작 + UI 스크린샷
 * node scripts/test-map-region-filter.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "realestate-map-region");
const BASE = "http://localhost:8765/tools/realestate-map/";
const INDEX = path.join(ROOT, "tools/realestate-map/index.html");
const KEY = "seungbak_map_visited";

mkdirSync(OUT, { recursive: true });

async function waitReady(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(
    () => document.getElementById("sidoDropdownBtn") != null,
    { timeout: 60000 }
  );
  await page.waitForFunction(
    () => {
      const loading = document.getElementById("map-loading");
      return !loading || loading.hidden;
    },
    { timeout: 60000 }
  );
}

async function getMapLevel(page) {
  return page.evaluate(() => window.RealEstateMap?.getMapLevel?.());
}

async function main() {
  const errors = [];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("401")) errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.addInitScript((k) => {
    localStorage.setItem(k, "true");
  }, KEY);

  await waitReady(page);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "01-initial-toolbar.png") });

  await page.click("#sidoDropdownBtn");
  await page.waitForTimeout(300);
  await page.click('[data-sido="seoul"]');
  await page.waitForTimeout(1200);
  const afterSeoul = await page.evaluate(() => ({
    level: window.RealEstateMap?.getMapLevel?.(),
    center: window.RealEstateMap?.getMapCenter?.(),
    hint: document.getElementById("selectedGu")?.textContent,
  }));
  await page.screenshot({ path: path.join(OUT, "02-seoul-selected.png") });

  await page.click("#guDropdownBtn");
  await page.waitForTimeout(300);
  await page.click('[data-sigungu="11710"]');
  await page.waitForFunction(
    () => window.RealEstateMap?.getSigunguCode?.() === "11710",
    { timeout: 90000 }
  );
  await page.waitForFunction(
    () => (document.getElementById("marker-count")?.textContent || "").includes("개 단지"),
    { timeout: 90000 }
  );
  await page.waitForTimeout(2000);
  const afterSongpa = await page.evaluate(() => ({
    code: window.RealEstateMap?.getSigunguCode?.(),
    level: window.RealEstateMap?.getMapLevel?.(),
    count: document.getElementById("marker-count")?.textContent,
  }));
  await page.screenshot({ path: path.join(OUT, "03-songpa-selected.png") });

  const mobile = await browser.newPage({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });
  await mobile.addInitScript((k) => localStorage.setItem(k, "true"), KEY);
  await waitReady(mobile);
  await mobile.waitForTimeout(1000);
  await mobile.screenshot({ path: path.join(OUT, "04-mobile-toolbar.png") });

  await browser.close();

  const head = readFileSync(INDEX, "utf8").match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";
  const report = {
    headOk: head.includes("G-Y7SC73P9JW") && head.includes("xbdrgqw1pj"),
    afterSeoul,
    afterSongpa,
    consoleErrors: [...new Set(errors)],
  };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const pass =
    report.headOk &&
    afterSeoul.level === 10 &&
    afterSongpa.code === "11710" &&
    report.consoleErrors.length === 0;

  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
