/**
 * 랜딩 팝업 스크린샷 검증
 * node scripts/test-map-welcome.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "realestate-map-welcome");
const BASE = "http://localhost:8765/tools/realestate-map/";
const INDEX = path.join(ROOT, "tools/realestate-map/index.html");
const KEY = "seungbak_map_visited";

mkdirSync(OUT, { recursive: true });

function headOk() {
  const head = readFileSync(INDEX, "utf8").match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";
  return head.includes("G-Y7SC73P9JW") && head.includes("xbdrgqw1pj");
}

async function waitReady(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.searchIndexReady === true, { timeout: 120000 });
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
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1) 첫 방문 — localStorage 비움
  const page1 = await ctx.newPage();
  page1.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("401")) errors.push(m.text());
  });
  await page1.addInitScript((k) => localStorage.removeItem(k), KEY);
  await waitReady(page1);
  await page1.waitForTimeout(800);
  const firstVisit = await page1.evaluate(() => ({
    popupVisible: !document.getElementById("map-empty-state")?.hidden,
    toolbarVisible: !document.getElementById("map-toolbar")?.classList.contains("map-controls-hidden"),
    toolbarZ: getComputedStyle(document.getElementById("map-toolbar")).zIndex,
    popupZ: getComputedStyle(document.getElementById("map-empty-state")).zIndex,
  }));
  await page1.screenshot({ path: path.join(OUT, "01-first-visit-desktop.png") });

  // 2) 재방문
  const page2 = await ctx.newPage();
  await page2.addInitScript((k) => localStorage.setItem(k, "true"), KEY);
  await waitReady(page2);
  await page2.waitForTimeout(800);
  const revisit = await page2.evaluate(() => ({
    popupHidden: document.getElementById("map-empty-state")?.hidden,
    toolbarVisible: !document.getElementById("map-toolbar")?.classList.contains("map-controls-hidden"),
  }));
  await page2.screenshot({ path: path.join(OUT, "02-revisit-desktop.png") });

  // 3) 팝업 닫힌 상태
  const page3 = await ctx.newPage();
  await page3.addInitScript((k) => localStorage.removeItem(k), KEY);
  await waitReady(page3);
  await page3.click("#map-empty-close");
  await page3.waitForTimeout(500);
  const closed = await page3.evaluate(() => ({
    popupHidden: document.getElementById("map-empty-state")?.hidden,
    visited: localStorage.getItem("seungbak_map_visited"),
  }));
  await page3.screenshot({ path: path.join(OUT, "03-popup-closed-desktop.png") });

  // 모바일 첫 방문
  const mobile = await browser.newPage({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });
  await mobile.addInitScript((k) => localStorage.removeItem(k), KEY);
  await waitReady(mobile);
  await mobile.waitForTimeout(800);
  await mobile.screenshot({ path: path.join(OUT, "04-first-visit-mobile.png") });

  await browser.close();

  const report = {
    headOk: headOk(),
    firstVisit,
    revisit,
    closed,
    consoleErrors: [...new Set(errors)],
  };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const pass =
    report.headOk &&
    firstVisit.popupVisible &&
    firstVisit.toolbarVisible &&
    revisit.popupHidden &&
    revisit.toolbarVisible &&
    closed.popupHidden &&
    closed.visited === "true" &&
    report.consoleErrors.length === 0;

  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
