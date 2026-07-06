/**
 * 사이드바 + 초등학교 섹션 검증 스크린샷
 * node tools/realestate-map/test-sidebar-schools.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "..", "screenshots", "realestate-map-sidebar");
const BASE = "http://localhost:8765/tools/realestate-map/";
const INDEX = path.join(__dirname, "index.html");

mkdirSync(OUT, { recursive: true });

async function waitReady(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => document.getElementById("sidoDropdownBtn"), { timeout: 60000 });
  await page.waitForFunction(
    () => {
      const loading = document.getElementById("map-loading");
      return !loading || loading.hidden;
    },
    { timeout: 60000 }
  );
}

async function selectGangnam(page) {
  await page.click("#map-empty-close").catch(() => {});
  await page.waitForTimeout(300);
  await page.click("#sidoDropdownBtn");
  await page.waitForTimeout(200);
  await page.click('[data-sido="seoul"]');
  await page.waitForTimeout(400);
  await page.click("#guDropdownBtn");
  await page.waitForTimeout(200);
  await page.click('[data-sigungu="11680"]');
  await page.waitForFunction(
    () => window.RealEstateMap?.getSigunguCode?.() === "11680",
    { timeout: 90000 }
  );
  await page.waitForFunction(
    () => (document.getElementById("marker-count")?.textContent || "").includes("개 단지"),
    { timeout: 90000 }
  );
  await page.waitForTimeout(2000);
}

async function selectFirstApartment(page) {
  await page.evaluate(async () => {
    const code = window.RealEstateMap.getSigunguCode();
    const cache = window.RealEstateMap.getDistrictCache?.() || {};
    const list = cache[code] || window.RealEstateMap.getAllApartments?.() || [];
    const apt = list.find((a) => a.latitude && a.longitude) || list[0];
    if (!apt) throw new Error("no apartment");
    await window.RealEstateMap.selectApartment(apt);
  });
  await page.waitForFunction(
    () => document.getElementById("nearby-schools-section") != null,
    { timeout: 30000 }
  );
  await page.waitForFunction(
    () => {
      const list = document.getElementById("nearby-schools-list");
      return list && !list.textContent.includes("검색 중");
    },
    { timeout: 30000 }
  );
}

async function main() {
  const errors = [];
  const browser = await chromium.launch();
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  desktop.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  desktop.on("pageerror", (e) => errors.push(e.message));

  await desktop.addInitScript(() => {
    localStorage.setItem("seungbak_map_help_dismissed", "true");
  });

  await waitReady(desktop);
  await selectGangnam(desktop);
  await selectFirstApartment(desktop);

  const apiCalls1 = await desktop.evaluate(
    () => window.RealEstateMapNearbySchools?.getApiCallCount?.() ?? 0
  );

  await desktop.screenshot({ path: path.join(OUT, "01-sidebar-full.png") });

  await desktop.locator(".deal-tab[data-deal='전세']").click();
  await desktop.waitForTimeout(800);
  await desktop.screenshot({ path: path.join(OUT, "02-deal-tabs.png") });

  await desktop.locator(".chart-section").screenshot({
    path: path.join(OUT, "03-chart-closeup.png"),
  });

  await desktop.locator("#nearby-schools-section").screenshot({
    path: path.join(OUT, "04-schools-closeup.png"),
  });

  await desktop.screenshot({ path: path.join(OUT, "05-desktop-full.png"), fullPage: false });

  await selectFirstApartment(desktop);
  const apiCalls2 = await desktop.evaluate(
    () => window.RealEstateMapNearbySchools?.getApiCallCount?.() ?? 0
  );

  const schoolCount = await desktop.evaluate(
    () => document.querySelectorAll(".nearby-school-card").length
  );

  const mobile = await browser.newPage({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });
  await mobile.addInitScript(() => localStorage.setItem("seungbak_map_help_dismissed", "true"));
  await waitReady(mobile);
  await selectGangnam(mobile);
  await selectFirstApartment(mobile);
  await mobile.waitForTimeout(1000);
  await mobile.screenshot({ path: path.join(OUT, "06-mobile.png"), fullPage: false });

  await browser.close();

  const head = readFileSync(INDEX, "utf8").match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";
  const report = {
    schoolCount,
    apiCallsFirst: apiCalls1,
    apiCallsAfterReselect: apiCalls2,
    cacheWorking: apiCalls1 > 0 && apiCalls2 === apiCalls1,
    consoleErrors: [...new Set(errors)],
    headOk: head.includes("G-Y7SC73P9JW") && head.includes("xbdrgqw1pj"),
  };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const pass =
    report.headOk &&
    schoolCount > 0 &&
    report.consoleErrors.length === 0 &&
    apiCalls1 >= 1;

  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
