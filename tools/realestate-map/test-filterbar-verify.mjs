/**
 * 필터바·도움말 팝업 Beige 톤 검증 + 스크린샷
 * node tools/realestate-map/test-filterbar-verify.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "..", "screenshots", "realestate-map-filterbar");
const BASE = "http://localhost:8765/tools/realestate-map/";
const INDEX = path.join(__dirname, "index.html");
const MAP_CSS = path.join(__dirname, "map.css");

const BLUE_PATTERNS = [
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#93c5fd",
  "#dbeafe",
  "#eff6ff",
  "#e0f2fe",
  "#bae6fd",
  "#bfdbfe",
  "rgb(37, 99, 235)",
  "rgb(59, 130, 246)",
  "var(--color-primary)",
  "var(--primary)",
];

mkdirSync(OUT, { recursive: true });

function grepBlueInMapFolder() {
  const hits = [];
  for (const pat of BLUE_PATTERNS) {
    try {
      const out = execSync(`rg -n -i "${pat.replace(/[()]/g, "\\$&")}" tools/realestate-map --glob "*.css"`, {
        cwd: path.join(__dirname, "..", ".."),
        encoding: "utf8",
      }).trim();
      if (out) hits.push({ pattern: pat, lines: out });
    } catch {
      /* no match */
    }
  }
  return hits;
}

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
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.addInitScript(() => localStorage.removeItem("seungbak_map_visited"));
  await waitReady(page);
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(OUT, "01-initial-welcome-filterbar.png") });

  const card = page.locator(".map-empty-state-card");
  await card.screenshot({ path: path.join(OUT, "02-welcome-popular-buttons.png") });

  await page.click(".map-help-close-btn");
  await page.waitForTimeout(600);
  const toolbar = page.locator(".map-toolbar");
  await toolbar.screenshot({ path: path.join(OUT, "03-filterbar-closeup.png") });

  await page.click("#sidoDropdownBtn");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "04-sido-dropdown-open.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  await page.click("#guDropdownBtn");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "05-gu-dropdown-open.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  await page.click('[data-sigungu="11680"]');
  await page.waitForFunction(
    () => window.RealEstateMap?.getSigunguCode?.() === "11680",
    { timeout: 90000 }
  );
  await page.waitForTimeout(800);
  await page.click("#filter-btn-price");
  await page.waitForTimeout(300);
  await page.click('.filter-option[data-filter-type="price"][data-filter-value="under5"]');
  await page.waitForTimeout(300);
  await page.click("#filter-btn-age");
  await page.waitForTimeout(300);
  await page.click('.filter-option[data-filter-type="age"][data-filter-value="new"]');
  await page.waitForTimeout(400);
  await toolbar.screenshot({ path: path.join(OUT, "06-filters-selected.png") });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "07-mobile-375.png"), fullPage: true });

  const computed = await page.evaluate(() => {
    const btn = document.getElementById("sidoDropdownBtn");
    const style = btn ? getComputedStyle(btn) : null;
    return {
      sidoBg: style?.backgroundColor,
      sidoColor: style?.color,
      sidoBorder: style?.borderColor,
    };
  });

  await browser.close();

  const head = readFileSync(INDEX, "utf8").match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";
  const blueHits = grepBlueInMapFolder();
  const mapCssContent = readFileSync(MAP_CSS, "utf8");
  const mapCssBlue = BLUE_PATTERNS.filter((p) =>
    mapCssContent.toLowerCase().includes(p.toLowerCase())
  );

  const report = {
    computed,
    consoleErrors: [...new Set(errors)],
    headOk: head.includes("G-Y7SC73P9JW") && head.includes("xbdrgqw1pj"),
    blueGrepHits: blueHits,
    mapCssExplicitBlue: mapCssBlue,
    blueRemainingCount: blueHits.length + mapCssBlue.length,
    screenshots: [
      "01-initial-welcome-filterbar.png",
      "02-welcome-popular-buttons.png",
      "03-filterbar-closeup.png",
      "04-sido-dropdown-open.png",
      "05-gu-dropdown-open.png",
      "06-filters-selected.png",
      "07-mobile-375.png",
    ],
  };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const pass =
    report.headOk &&
    report.consoleErrors.length === 0 &&
    report.blueRemainingCount === 0;

  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
