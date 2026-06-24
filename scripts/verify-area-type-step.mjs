/**
 * Step 1~5 평형 타입(시나리오 C) 검증
 * 실행: node scripts/verify-area-type-step.mjs
 */
import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "area-type-step");
const REPORT = path.join(ROOT, "data", "validation", "area-type-step-report.json");
const BASE = "http://localhost:8765/tools/realestate-map/";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const COMPLEXES = [
  {
    key: "geumho",
    slug: "pyeongtaek",
    code: "41220",
    name: "고덕국제신도시금호어울림",
    id: "6399a9e3-ffb8-4e44-9711-af6bfd1db91a",
    expectedTabs: 2,
    expectedTabLabels: ["전체", "60㎡"],
    expectedMarker: /60㎡.*3\.8억|60㎡.*3\.9억/,
    filterBand: "40_60",
  },
  {
    key: "jamsil-els",
    slug: "songpa",
    code: "11710",
    name: "잠실엘스",
    id: "3abb6516-adab-4d86-aa85-fac0bdd2a260",
    expectedTabs: 6,
    expectedTabLabels: ["전체", "60", "84.8", "84.9", "85", "119.9"],
    distinctCharts: true,
  },
  {
    key: "raemian-daechi",
    slug: "gangnam",
    code: "11680",
    name: "래미안대치팰리스",
    id: "676e5be3-a7af-48ca-8429-896ed5a993fe",
    expectedTabs: 8,
    scrollTest: true,
  },
  {
    key: "helio",
    slug: "songpa",
    code: "11710",
    name: "헬리오시티",
    id: "582cc460-2c72-4e3e-a468-d4ce7f3189f1",
    expectedTabs: 13,
    scrollTest: true,
    mobileScreenshot: true,
  },
  {
    key: "hansol",
    slug: "bundang",
    code: "41135",
    name: "한솔마을(1단지)(청구)",
    id: "45031372-e3c2-4639-aa6a-857c16201f3e",
    expectedTabs: 5,
  },
];

mkdirSync(OUT, { recursive: true });
mkdirSync(path.dirname(REPORT), { recursive: true });

async function waitForMapReady(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.searchIndexReady === true, {
    timeout: 120000,
  });
}

async function waitDistrictReady(page, code) {
  await page.waitForFunction(
    (c) => {
      const cache = window.RealEstateMap?.getDistrictCache?.() || {};
      const list = cache[c];
      if (!Array.isArray(list) || !list.length) return false;
      const withMaemae = list.filter(
        (a) => a.avgPrice1Y != null && a.avgPrice1Y > 0
      ).length;
      const withJeonse = list.filter((a) => (a.jeonseCount1Y ?? 0) > 0).length;
      return withMaemae + withJeonse > 0;
    },
    code,
    { timeout: 90000 }
  );
  await page.waitForFunction(() => window.__areaCategoriesReady === true, {
    timeout: 120000,
  });
  await page.waitForTimeout(1000);
}

async function selectDistrict(page, code) {
  await page.evaluate((c) => window.RealEstateMap?.selectDistrict?.(c), code);
  await page.waitForFunction(
    (c) => window.RealEstateMap?.getSigunguCode?.() === c,
    code,
    { timeout: 60000 }
  );
  await waitDistrictReady(page, code);
}

async function selectApartmentById(page, aptId) {
  const t0 = Date.now();
  await page.evaluate((id) => {
    const code = window.RealEstateMap?.getSigunguCode?.();
    const cache = window.RealEstateMap?.getDistrictCache?.() || {};
    const apt = (cache[code] || []).find((a) => a.id === id);
    if (!apt) throw new Error(`apartment not found: ${id}`);
    return window.RealEstateMap?.selectApartment?.(apt);
  }, aptId);
  await page.waitForSelector("#sidebar-area-tabs .sidebar-area-tab", {
    timeout: 60000,
  });
  return Date.now() - t0;
}

async function getSidebarTabInfo(page) {
  return page.evaluate(() => {
    const tabs = [...document.querySelectorAll("#sidebar-area-tabs .sidebar-area-tab")];
    return {
      labels: tabs.map((t) => t.textContent.trim()),
      count: tabs.length,
      scrollWidth: document.getElementById("sidebar-area-tabs")?.scrollWidth ?? 0,
      clientWidth: document.getElementById("sidebar-area-tabs")?.clientWidth ?? 0,
    };
  });
}

async function getChartAvgPrice(page) {
  return page.textContent("#avgPrice").catch(() => null);
}

async function getMarkerLabelForApt(page, aptId) {
  return page.evaluate((id) => {
    const code = window.RealEstateMap?.getSigunguCode?.();
    const cache = window.RealEstateMap?.getDistrictCache?.() || {};
    const apt = (cache[code] || []).find((a) => a.id === id);
    if (!apt) return null;
    const level = 5;
    return window.RealEstateMapMarker?.getMarkerLabel?.(apt, level) || "";
  }, aptId);
}

async function applyAreaFilter(page, bandId) {
  await page.click(`#filter-btn-area`);
  await page.click(`[data-filter-type="area"][data-filter-value="${bandId}"]`);
  await page.waitForTimeout(1500);
}

async function computeNationalDistribution(sb) {
  const AT = (rows) => {
    const round1 = (n) => Math.round(Number(n) * 10) / 10;
    const byGroup = new Map();
    for (const row of rows) {
      if (row.exclu_use_ar == null) continue;
      const g = round1(row.exclu_use_ar);
      const k = `${row.apartment_id}|${g}`;
      byGroup.set(k, (byGroup.get(k) || 0) + 1);
    }
    const aptGroups = new Map();
    for (const [k, c] of byGroup) {
      const [aptId] = k.split("|");
      if (!aptGroups.has(aptId)) aptGroups.set(aptId, new Set());
      aptGroups.get(aptId).add(k.split("|")[1]);
    }
    return aptGroups;
  };

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 5);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const aptGroupCounts = new Map();
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await sb
      .from("transactions")
      .select("apartment_id, exclu_use_ar")
      .in("deal_type", ["매매", "전세"])
      .gte("deal_date", cutoffStr)
      .not("exclu_use_ar", "is", null)
      .order("apartment_id")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      const g = Math.round(Number(row.exclu_use_ar) * 10) / 10;
      const key = `${row.apartment_id}|${g}`;
      if (!aptGroupCounts.has(row.apartment_id)) {
        aptGroupCounts.set(row.apartment_id, new Set());
      }
      aptGroupCounts.get(row.apartment_id).add(g);
    }

    if (data.length < pageSize) break;
    from += data.length;
  }

  let single = 0;
  let twoThree = 0;
  let fourPlus = 0;

  for (const groups of aptGroupCounts.values()) {
    const n = groups.size;
    if (n <= 1) single += 1;
    else if (n <= 3) twoThree += 1;
    else fourPlus += 1;
  }

  return {
    totalApartmentsWithTrades: aptGroupCounts.size,
    singleGroup: single,
    twoToThreeGroups: twoThree,
    fourPlusGroups: fourPlus,
  };
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  const results = [];
  const timings = [];

  await waitForMapReady(page);

  for (const c of COMPLEXES) {
    const item = { key: c.key, name: c.name, checks: [] };

    try {
      await selectDistrict(page, c.code);

      await page.waitForFunction(
        (id) => {
          const code = window.RealEstateMap?.getSigunguCode?.();
          const cache = window.RealEstateMap?.getDistrictCache?.() || {};
          return (cache[code] || []).some((a) => a.id === id);
        },
        c.id,
        { timeout: 60000 }
      );

      const loadMs = await selectApartmentById(page, c.id);
      timings.push({ key: c.key, sidebarLoadMs: loadMs });
      item.checks.push({
        name: "sidebar_load_ms",
        pass: loadMs < 500,
        value: loadMs,
      });

      const tabs = await getSidebarTabInfo(page);
      item.tabs = tabs;
      item.checks.push({
        name: "tab_count",
        pass: tabs.count === c.expectedTabs,
        expected: c.expectedTabs,
        actual: tabs.count,
      });

      if (c.expectedTabLabels) {
        const labelOk = c.expectedTabLabels.every((frag) =>
          tabs.labels.some((l) => l.includes(frag))
        );
        item.checks.push({ name: "tab_labels", pass: labelOk, labels: tabs.labels });
      }

      await page.screenshot({
        path: path.join(OUT, `${c.key}-desktop-after.png`),
        fullPage: false,
      });

      if (c.distinctCharts) {
        const prices = [];
        const areaTabs = await page.$$eval(
          "#sidebar-area-tabs .sidebar-area-tab[data-area]",
          (els) => els.map((e) => e.dataset.area).filter((a) => a !== "all")
        );
        for (const area of areaTabs.slice(0, 3)) {
          await page.click(`#sidebar-area-tabs .sidebar-area-tab[data-area="${area}"]`);
          await page.waitForTimeout(800);
          prices.push(await getChartAvgPrice(page));
        }
        const distinct = new Set(prices.filter(Boolean)).size >= 2;
        item.checks.push({ name: "distinct_charts", pass: distinct, prices });
      }

      if (c.scrollTest) {
        const scrollable = tabs.scrollWidth > tabs.clientWidth;
        item.checks.push({
          name: "horizontal_scroll",
          pass: scrollable,
          scrollWidth: tabs.scrollWidth,
          clientWidth: tabs.clientWidth,
        });
      }

      if (c.expectedMarker) {
        const markerLabel = await getMarkerLabelForApt(page, c.id);
        item.markerLabel = markerLabel;
        item.checks.push({
          name: "marker_label",
          pass: c.expectedMarker.test(markerLabel || ""),
          value: markerLabel,
        });
      }

      if (c.filterBand) {
        await applyAreaFilter(page, c.filterBand);
        const visible = await page.evaluate((id) => {
          return !!document.querySelector(`[data-apt-id="${id}"]`);
        }, c.id);
        item.checks.push({ name: "filter_visible", pass: visible });
        const markerAfterFilter = await getMarkerLabelForApt(page, c.id);
        item.checks.push({
          name: "marker_after_filter",
          pass: /60㎡/.test(markerAfterFilter || ""),
          value: markerAfterFilter,
        });
        await page.click("#filterReset");
        await page.waitForTimeout(500);
      }

      if (c.mobileScreenshot) {
        const mobile = await browser.newContext({
          ...devices["iPhone 13"],
        });
        const mPage = await mobile.newPage();
        mPage.on("console", (msg) => {
          if (msg.type() === "error") consoleErrors.push(`[mobile] ${msg.text()}`);
        });
        await waitForMapReady(mPage);
        await selectDistrict(mPage, c.code);
        await mPage.waitForTimeout(2000);
        await selectApartmentById(mPage, c.id);
        await mPage.screenshot({
          path: path.join(OUT, `${c.key}-mobile-tabs.png`),
          fullPage: false,
        });
        const mTabs = await getSidebarTabInfo(mPage);
        item.mobileTabs = mTabs;
        item.checks.push({
          name: "mobile_scrollable",
          pass: mTabs.scrollWidth > mTabs.clientWidth,
        });
        await mobile.close();
      }

      item.pass = item.checks.every((ch) => ch.pass);
    } catch (err) {
      item.pass = false;
      item.error = err.message;
    }

    results.push(item);
  }

  const distribution = await computeNationalDistribution(sb);

  const report = {
    generatedAt: new Date().toISOString(),
    distribution,
    timings,
    consoleErrors,
    results,
    allPass:
      consoleErrors.length === 0 && results.every((r) => r.pass),
  };

  writeFileSync(REPORT, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  await browser.close();

  if (!report.allPass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
