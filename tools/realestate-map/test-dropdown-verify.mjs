/**
 * 지역 드롭다운 검증 + 스크린샷 (일회성)
 * node tools/realestate-map/test-dropdown-verify.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "..", "screenshots", "realestate-map-dropdown");
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

  await page.addInitScript(() => localStorage.setItem("seungbak_map_visited", "true"));
  await waitReady(page);
  await page.waitForTimeout(1500);

  const scriptCounts = await page.evaluate(() => {
    const urls = [...document.scripts].map((s) => s.src).filter(Boolean);
    return {
      toolbar: urls.filter((u) => u.includes("map-toolbar.js")).length,
      welcome: urls.filter((u) => u.includes("map-welcome.js")).length,
      region: urls.filter((u) => u.includes("region.js")).length,
    };
  });

  await page.click("#sidoDropdownBtn");
  await page.waitForTimeout(400);
  const sidoOpen = await page.evaluate(() => !document.getElementById("sidoDropdownMenu")?.hidden);
  await page.screenshot({ path: path.join(OUT, "01-sido-dropdown-open.png") });

  await page.click('[data-sido="gyeonggi"]');
  await page.waitForTimeout(1200);
  const afterGyeonggi = await page.evaluate(() => ({
    label: document.getElementById("selectedSido")?.textContent,
    level: window.RealEstateMap?.getMapLevel?.(),
    center: window.RealEstateMap?.getMapCenter?.(),
  }));
  await page.screenshot({ path: path.join(OUT, "02-gyeonggi-selected.png") });

  await page.click("#guDropdownBtn");
  await page.waitForTimeout(400);
  await page.click('[data-sigungu="41135"]');
  await page.waitForFunction(
    () => window.RealEstateMap?.getSigunguCode?.() === "41135",
    { timeout: 90000 }
  );
  await page.waitForFunction(
    () => (document.getElementById("marker-count")?.textContent || "").includes("개 단지"),
    { timeout: 90000 }
  );
  await page.waitForTimeout(1500);
  const afterBundang = await page.evaluate(() => ({
    code: window.RealEstateMap?.getSigunguCode?.(),
    gu: document.getElementById("selectedGu")?.textContent,
    level: window.RealEstateMap?.getMapLevel?.(),
  }));
  await page.screenshot({ path: path.join(OUT, "03-bundang-selected.png") });

  await page.evaluate(() => {
    console.warn("[test] intentional warning probe");
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "04-console-state.png"), fullPage: false });

  await browser.close();

  const head = readFileSync(INDEX, "utf8").match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";
  const report = {
    scriptCounts,
    sidoOpen,
    afterGyeonggi,
    afterBundang,
    consoleErrors: [...new Set(errors)],
    consoleWarnings: [...new Set(warnings)].slice(0, 5),
    headOk: head.includes("G-Y7SC73P9JW") && head.includes("xbdrgqw1pj"),
  };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const pass =
    report.headOk &&
    scriptCounts.toolbar === 1 &&
    scriptCounts.welcome === 1 &&
    sidoOpen &&
    afterGyeonggi.label === "경기도" &&
    afterBundang.code === "41135" &&
    report.consoleErrors.length === 0;

  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
