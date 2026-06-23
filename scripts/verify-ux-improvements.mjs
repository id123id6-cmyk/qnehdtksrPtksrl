/**
 * UX 개선 검증 (평택 고덕 + 회귀 4지역)
 * 실행: node scripts/verify-ux-improvements.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "ux-push-verify");
const BASE = "http://localhost:8765/tools/realestate-map/";

mkdirSync(OUT, { recursive: true });

const REGIONS = [
  { slug: "pyeongtaek-godeok", code: "41220", query: "고덕국제신도시금호어울림" },
  { slug: "gangnam", code: "11680", query: "래미안대치" },
  { slug: "songpa", code: "11710", query: "잠실엘스" },
  { slug: "mapo", code: "11440", query: "마포" },
  { slug: "nowon", code: "11350", query: "노원" },
];

const GRAY_APTS = [
  "평택고덕국제신도시디에트르리비에르",
  "고덕국제신도시로제비앙",
  "고덕국제신도시미래도파밀리에",
];

async function waitReady(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.searchIndexReady === true, { timeout: 120000 });
  await page.waitForTimeout(1500);
}

const browser = await chromium.launch();
const results = { consoleErrors: [], cases: [] };

for (const region of REGIONS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  const caseResult = { ...region, errors: [], checks: {} };

  try {
    await waitReady(page);
    await page.evaluate((c) => window.RealEstateMap?.selectDistrict?.(c), region.code);
    await page.waitForTimeout(4500);

    await page.fill("#search-input", region.query);
    await page.waitForTimeout(800);
    await page.waitForSelector(".search-result-item", { timeout: 20000 });
    await page.click(".search-result-item");
    await page.waitForTimeout(3000);

    const info = await page.evaluate(() => {
      const banner = document.getElementById("sidebar-selected-banner");
      const badges = [...document.querySelectorAll(".tx-badge")].map((b) => b.textContent?.trim());
      const title = document.querySelector(".transactions-section-head h3")?.textContent?.trim();
      const pyeong = document.querySelector(".apt-pyeong-summary")?.textContent?.trim();
      const selectedMarker = document.querySelector(".marker-selected");
      return {
        banner: banner?.textContent?.trim(),
        badges,
        title,
        pyeong,
        hasSelectedMarker: !!selectedMarker,
        selectedMarkerText: selectedMarker?.textContent?.trim(),
      };
    });

    caseResult.checks = info;
    caseResult.checks.ok =
      info.banner?.includes("현재 선택") &&
      info.title === "최근 거래 3건" &&
      info.badges.length >= 1 &&
      info.hasSelectedMarker;

    if (region.slug === "pyeongtaek-godeok") {
      caseResult.checks.pyeong24 = info.pyeong?.includes("24평");
      caseResult.checks.hasMaemaeBadge = info.badges.includes("매매");
      caseResult.checks.hasJeonseBadge = info.badges.includes("전세");
      await page.screenshot({ path: path.join(OUT, "pyeongtaek-godeok-geumho.png") });

      await page.click('[data-sidebar-tx-filter="매매"]');
      await page.waitForTimeout(400);
      const maemaeOnly = await page.evaluate(() =>
        [...document.querySelectorAll(".tx-badge")].every((b) => b.textContent?.trim() === "매매")
      );
      caseResult.checks.maemaeFilterWorks = maemaeOnly;
    }

    await page.screenshot({ path: path.join(OUT, `${region.slug}.png`) });
  } catch (e) {
    caseResult.error = String(e.message || e);
    caseResult.checks.ok = false;
  }

  caseResult.errors = errors;
  results.consoleErrors.push(...errors);
  results.cases.push(caseResult);
  await page.close();
}

// 회색 마커 tooltip (평택 고덕)
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await waitReady(page);
    await page.evaluate(() => window.RealEstateMap?.selectDistrict?.("41220"));
    await page.waitForTimeout(5000);
    for (let i = 0; i < 25; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(2000);

    const tooltips = await page.evaluate((names) => {
      const pills = [...document.querySelectorAll(".marker-pill.marker-none, .marker-dot.marker-none")];
      return pills
        .filter((el) => names.some((n) => el.title?.includes(n.slice(0, 6))))
        .slice(0, 5)
        .map((el) => ({ title: el.title, text: el.textContent?.trim() }));
    }, GRAY_APTS);

    results.grayMarkerTooltips = tooltips;
    results.grayTooltipOk = tooltips.some((t) => t.title?.includes("전세"));
  } catch (e) {
    results.grayTooltipError = String(e.message || e);
  }
  await page.close();
}

await browser.close();

results.allOk =
  results.consoleErrors.length === 0 &&
  results.cases.every((c) => c.checks?.ok !== false) &&
  (results.grayTooltipOk || results.grayMarkerTooltips?.length > 0);

writeFileSync(path.join(ROOT, "data/validation/ux-push-verify.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
process.exit(results.allOk ? 0 : 1);
