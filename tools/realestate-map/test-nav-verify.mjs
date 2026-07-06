/**
 * 네비게이션 통일 검증 + 스크린샷
 * node tools/realestate-map/test-nav-verify.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "..", "screenshots", "realestate-map-nav");
const MAIN = "http://localhost:8765/";
const MAP = "http://localhost:8765/tools/realestate-map/";
const MAP_INDEX = path.join(__dirname, "index.html");

mkdirSync(OUT, { recursive: true });

async function waitMapReady(page) {
  await page.goto(MAP, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => document.querySelector(".hr-header"), { timeout: 30000 });
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

  const mainPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  mainPage.on("console", (m) => {
    if (m.type() === "error") errors.push(`[main] ${m.text()}`);
  });
  mainPage.on("pageerror", (e) => errors.push(`[main] ${e.message}`));

  await mainPage.goto(MAIN, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mainPage.waitForTimeout(800);
  await mainPage.locator(".hr-header").screenshot({ path: path.join(OUT, "01-main-nav-closeup.png") });

  const mapPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  mapPage.on("console", (m) => {
    if (m.type() === "error") errors.push(`[map] ${m.text()}`);
  });
  mapPage.on("pageerror", (e) => errors.push(`[map] ${e.message}`));

  await mapPage.addInitScript(() => localStorage.setItem("seungbak_map_visited", "true"));
  await waitMapReady(mapPage);
  await mapPage.waitForTimeout(800);
  await mapPage.locator(".hr-header").screenshot({ path: path.join(OUT, "02-map-nav-closeup.png") });

  const comparePage = await browser.newPage({ viewport: { width: 1440, height: 200 } });
  await comparePage.setContent(`
    <style>
      body { margin: 0; font-family: sans-serif; background: #111; }
      .row { display: flex; gap: 0; }
      .col { flex: 1; }
      .label { background: #222; color: #f5efe0; padding: 8px 12px; font-size: 13px; font-weight: 600; }
      img { width: 100%; display: block; }
    </style>
    <div class="row">
      <div class="col">
        <div class="label">메인 페이지</div>
        <img src="file:///${path.join(OUT, "01-main-nav-closeup.png").replace(/\\/g, "/")}" />
      </div>
      <div class="col">
        <div class="label">지도 페이지</div>
        <img src="file:///${path.join(OUT, "02-map-nav-closeup.png").replace(/\\/g, "/")}" />
      </div>
    </div>
  `);
  await comparePage.screenshot({ path: path.join(OUT, "03-side-by-side.png"), fullPage: true });

  await mapPage.setViewportSize({ width: 375, height: 812 });
  await mapPage.waitForTimeout(400);
  await mapPage.locator(".hr-header").screenshot({ path: path.join(OUT, "04-map-mobile-nav.png") });

  await mapPage.setViewportSize({ width: 1440, height: 900 });
  await mapPage.locator('.hr-nav a.is-active').screenshot({ path: path.join(OUT, "05-map-active-menu.png") });

  const navInfo = await mapPage.evaluate(() => {
    const header = document.querySelector(".hr-header");
    const logo = document.querySelector(".hr-logo");
    const active = document.querySelector('.hr-nav a.is-active');
    const hStyle = header ? getComputedStyle(header) : null;
    const lStyle = logo ? getComputedStyle(logo) : null;
    const aStyle = active ? getComputedStyle(active) : null;
    return {
      logoText: logo?.textContent?.trim(),
      activeText: active?.textContent?.trim(),
      headerBg: hStyle?.backgroundColor,
      logoColor: lStyle?.color,
      activeColor: aStyle?.color,
      activeWeight: aStyle?.fontWeight,
      activeBorder: aStyle?.borderBottomColor,
      menuLinks: [...document.querySelectorAll(".hr-nav a")].map((a) => ({
        text: a.textContent.trim(),
        href: a.getAttribute("href"),
      })),
    };
  });

  const linkChecks = await mapPage.evaluate(async () => {
    const results = [];
    for (const href of ["/tools/", "/blog/", "/about.html"]) {
      const a = document.querySelector(`.hr-nav a[href="${href}"]`);
      results.push({ href, exists: !!a });
    }
    return results;
  });

  await browser.close();

  const head = readFileSync(MAP_INDEX, "utf8").match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";
  const report = {
    navInfo,
    linkChecks,
    consoleErrors: [...new Set(errors)],
    headOk: head.includes("G-Y7SC73P9JW") && head.includes("xbdrgqw1pj"),
    headScriptsUntouched: !head.includes("nav.css") || head.includes("xbdrgqw1pj"),
  };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const pass =
    report.headOk &&
    report.consoleErrors.length === 0 &&
    navInfo.logoText === "seungbak.com" &&
    navInfo.activeText === "지도" &&
    navInfo.headerBg === "rgb(26, 26, 26)" &&
    linkChecks.every((l) => l.exists);

  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
