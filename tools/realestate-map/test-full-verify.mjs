/**
 * 도움말 팝업 + 지역 드롭다운 통합 검증
 * node tools/realestate-map/test-full-verify.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "..", "screenshots", "realestate-map-full");
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

async function main() {
  const errors = [];
  const warnings = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
    if (m.type() === "warning") warnings.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.addInitScript(() => {
    localStorage.removeItem("seungbak_map_help_dismissed");
    localStorage.removeItem("seungbak_map_visited");
  });

  await waitReady(page);
  await page.waitForTimeout(2000);

  const scriptList = await page.evaluate(() =>
    [...document.scripts].map((s) => s.src).filter((u) => u.includes("/tools/realestate-map/"))
  );

  const popupVisible = await page.evaluate(
    () => !document.getElementById("map-empty-state")?.hidden
  );
  await page.screenshot({ path: path.join(OUT, "01-entry-popup-and-toolbar.png") });

  await page.click("#map-empty-close");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "02-popup-closed.png") });

  await page.click("#sidoDropdownBtn");
  await page.waitForTimeout(400);
  const sidoCount = await page.evaluate(
    () => document.querySelectorAll("#sidoDropdownMenu [data-sido]").length
  );
  const sidoOpen = await page.evaluate(() => !document.getElementById("sidoDropdownMenu")?.hidden);
  await page.screenshot({ path: path.join(OUT, "03-seoul-dropdown-open.png") });

  await page.click('[data-sido="busan"]');
  await page.waitForTimeout(1200);
  const afterBusan = await page.evaluate(() => ({
    label: document.getElementById("selectedSido")?.textContent,
    center: window.RealEstateMap?.getMapCenter?.(),
    lat: window.RealEstateMap?.getMapCenter?.()?.lat,
  }));
  await page.screenshot({ path: path.join(OUT, "04-busan-selected.png") });

  await page.click("#guDropdownBtn");
  await page.waitForTimeout(400);
  const guCount = await page.evaluate(
    () => document.querySelectorAll("#guDropdownMenu [data-sigungu]").length
  );
  await page.click('[data-sigungu="26350"]');
  await page.waitForFunction(
    () => window.RealEstateMap?.getSigunguCode?.() === "26350",
    { timeout: 90000 }
  );
  await page.waitForTimeout(3000);
  const afterHaeundae = await page.evaluate(() => ({
    code: window.RealEstateMap?.getSigunguCode?.(),
    gu: document.getElementById("selectedGu")?.textContent,
    center: window.RealEstateMap?.getMapCenter?.(),
    count: document.getElementById("marker-count")?.textContent,
  }));
  await page.screenshot({ path: path.join(OUT, "05-haeundae-selected.png") });

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitReady(page);
  await page.waitForTimeout(1500);
  await page.click('[data-code="11710"]');
  await page.waitForFunction(
    () => window.RealEstateMap?.getSigunguCode?.() === "11710",
    { timeout: 90000 }
  );
  await page.waitForTimeout(2000);
  const afterSongpaPopup = await page.evaluate(() => ({
    popupHidden: document.getElementById("map-empty-state")?.hidden,
    code: window.RealEstateMap?.getSigunguCode?.(),
  }));
  await page.screenshot({ path: path.join(OUT, "06-songpa-from-popup.png") });

  await browser.close();

  const head = readFileSync(INDEX, "utf8").match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";
  const report = {
    scriptList: scriptList.map((u) => u.split("/").pop()),
    scriptCounts: {
      toolbar: scriptList.filter((u) => u.includes("map-toolbar.js")).length,
      welcome: scriptList.filter((u) => u.includes("map-welcome.js")).length,
    },
    popupVisible,
    sidoOpen,
    sidoCount,
    guCount,
    afterBusan,
    afterHaeundae,
    afterSongpaPopup,
    consoleErrors: [...new Set(errors)],
    consoleWarnings: [...new Set(warnings)].length,
    headOk: head.includes("G-Y7SC73P9JW") && head.includes("xbdrgqw1pj"),
  };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const pass =
    report.headOk &&
    report.scriptCounts.toolbar === 1 &&
    report.scriptCounts.welcome === 1 &&
    popupVisible &&
    sidoOpen &&
    sidoCount === 17 &&
    guCount >= 16 &&
    afterBusan.label === "부산광역시" &&
    afterBusan.lat < 36 &&
    afterHaeundae.code === "26350" &&
    afterSongpaPopup.code === "11710" &&
    afterSongpaPopup.popupHidden &&
    report.consoleErrors.length === 0;

  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
