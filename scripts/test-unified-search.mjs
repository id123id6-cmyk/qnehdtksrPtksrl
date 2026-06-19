/**
 * 강남3구 통합 검색 Playwright 테스트
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const URL = "http://localhost:8765/tools/realestate-map/";
const SHOT_DIR = path.join(ROOT, "tools/realestate-map/screenshots");

const SCENARIOS = [
  {
    id: "banpo-jai",
    startDistrict: "11680",
    query: "반포자이",
    expectDistrict: "11650",
    expectDistrictName: "서초구",
    nameIncludes: "반포",
  },
  {
    id: "jamsil-els",
    startDistrict: "11680",
    query: "잠실 엘스",
    expectDistrict: "11710",
    expectDistrictName: "송파구",
    nameIncludes: "엘스",
  },
  {
    id: "tower-palace",
    startDistrict: "11710",
    query: "타워팰리스",
    expectDistrict: "11680",
    expectDistrictName: "강남구",
    nameIncludes: "타워",
  },
  {
    id: "eunma-same",
    startDistrict: "11680",
    query: "은마",
    expectDistrict: "11680",
    expectDistrictName: "강남구",
    nameIncludes: "은마",
  },
];

async function waitForDistrict(page, code, minCount) {
  await page.evaluate((c) => window.RealEstateMap?.changeDistrict(c), code);
  await page.waitForFunction(
    (args) => {
      const gu = document.getElementById("selectedGu")?.textContent?.trim();
      const count = parseInt(
        document.getElementById("marker-count")?.textContent || "0",
        10
      );
      return gu && count >= args.min;
    },
    { code, min: minCount },
    { timeout: 60000 }
  );
}

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const gaEvents = [];

  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(
    () => window.searchIndexReady === true,
    { timeout: 120000 }
  );
  await page.waitForFunction(
    () => (window.RealEstateMap?.getAllApartments?.() || []).length > 1500,
    { timeout: 30000 }
  );

  await page.evaluate(() => {
    window.__gaEvents = [];
    const orig = window.gtag;
    if (typeof orig === "function") {
      window.gtag = function (...args) {
        if (args[0] === "event") {
          window.__gaEvents.push({ name: args[1], params: args[2] || {} });
        }
        return orig.apply(this, args);
      };
    }
  });

  const results = [];

  for (const scenario of SCENARIOS) {
    await page.evaluate(() => {
      window.__gaEvents = [];
    });

    const minCount =
      scenario.startDistrict === "11680"
        ? 700
        : scenario.startDistrict === "11650"
          ? 600
          : 400;
    await waitForDistrict(page, scenario.startDistrict, minCount);

    await page.fill("#search-input", scenario.query);
    await page.waitForTimeout(600);

    const searchState = await page.evaluate(() => {
      const items = [...document.querySelectorAll(".search-result-item")];
      return {
        count: items.length,
        labels: items.map((el) => ({
          name: el.querySelector(".search-result-name")?.textContent?.trim(),
          sub: el.querySelector("small")?.textContent?.trim(),
        })),
      };
    });

    await page.screenshot({
      path: path.join(SHOT_DIR, `search-${scenario.id}-results.png`),
      fullPage: false,
    });

    const firstMatch = await page.evaluate((needle) => {
      const items = [...document.querySelectorAll(".search-result-item")];
      const hit = items.find((el) =>
        el.textContent?.toLowerCase().includes(needle.toLowerCase())
      );
      return hit?.dataset?.id || items[0]?.dataset?.id || null;
    }, scenario.nameIncludes);

    if (!firstMatch) {
      results.push({ ...scenario, ok: false, reason: "no_search_result" });
      continue;
    }

    await page.click(`[data-id="${firstMatch}"]`);
    await page.waitForTimeout(2500);

    const after = await page.evaluate(() => ({
      gu: document.getElementById("selectedGu")?.textContent?.trim(),
      sidebar: document.getElementById("sidebar-content")?.textContent?.trim() || "",
      ga: window.__gaEvents || [],
    }));

    gaEvents.push(...after.ga);

    await page.screenshot({
      path: path.join(SHOT_DIR, `search-${scenario.id}-after.png`),
      fullPage: false,
    });

    const clickEvents = after.ga.filter((e) => e.name === "search_result_click");
    const clickEvent = clickEvents[clickEvents.length - 1];

    const ok =
      after.gu === scenario.expectDistrictName &&
      after.sidebar.length > 30 &&
      (!clickEvent ||
        clickEvent.params.cross_district ===
          (scenario.expectDistrict !== scenario.startDistrict));

    results.push({
      ...scenario,
      searchCount: searchState.count,
      searchLabels: searchState.labels.slice(0, 3),
      afterGu: after.gu,
      clickEvent: clickEvent?.params,
      ok,
    });

    await page.fill("#search-input", "");
    await page.waitForTimeout(300);
  }

  await browser.close();

  const checks = {
    allScenarios: results.every((r) => r.ok),
    consoleErrors: errors.length,
    hasSearchClicks: gaEvents.some((e) => e.name === "search_result_click"),
  };

  console.log(JSON.stringify({ results, checks, errors }, null, 2));

  if (!checks.allScenarios || errors.length) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
