/**
 * push 전 Playwright 지역·줌·필터 검증
 * 실행: node scripts/verify-pre-push-playwright.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "pre-push-verify");
const REPORT = path.join(ROOT, "data", "validation", "pre-push-playwright.json");
const BASE = "http://localhost:8765/tools/realestate-map/";

mkdirSync(OUT, { recursive: true });

const REGIONS = [
  { slug: "gangnam", code: "11680", name: "강남구" },
  { slug: "songpa", code: "11710", name: "송파구" },
  { slug: "mapo", code: "11440", name: "마포구" },
  { slug: "nowon", code: "11350", name: "노원구" },
  { slug: "pyeongtaek", code: "41220", name: "평택시" },
  { slug: "suwon-yeongtong", code: "41117", name: "수원 영통구" },
  { slug: "bundang", code: "41135", name: "성남 분당구" },
  { slug: "ilsan-dong", code: "41285", name: "고양 일산동구" },
  { slug: "ilsan-seo", code: "41287", name: "고양 일산서구" },
];

const ZOOM_LEVELS = [4, 7, 9, 13];
const AREA_FILTERS = [
  { value: "all", label: "전체" },
  { value: "band10", label: "10평대" },
  { value: "band20", label: "20평대" },
  { value: "band30", label: "30평대" },
  { value: "band40", label: "40평대" },
  { value: "band50", label: "50평대+" },
];

spawnSync(process.execPath, ["scripts/analyze-pyeong-distribution.mjs"], { cwd: ROOT });

async function waitMapReady(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.searchIndexReady === true, { timeout: 120000 });
  await page.waitForTimeout(1500);
}

async function selectDistrict(page, code) {
  await page.evaluate((c) => window.RealEstateMap?.selectDistrict?.(c), code);
  await page.waitForFunction(
    (c) => window.RealEstateMap?.getSigunguCode?.() === c,
    code,
    { timeout: 30000 }
  );
  await page.waitForTimeout(4000);
}

async function setMapZoom(page, targetLevel) {
  const mapBox = await page.locator("#map").boundingBox();
  if (!mapBox) throw new Error("map not found");
  const cx = mapBox.x + mapBox.width / 2;
  const cy = mapBox.y + mapBox.height / 2;
  await page.mouse.move(cx, cy);

  for (let i = 0; i < 40; i++) {
    const cur = await page.evaluate(() => window.RealEstateMap?.getMapLevel?.());
    if (cur === targetLevel) return cur;
    const delta = cur < targetLevel ? 120 : -120;
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(250);
  }
  return page.evaluate(() => window.RealEstateMap?.getMapLevel?.());
}

async function getMarkerStats(page) {
  return page.evaluate(() => {
    const level = window.RealEstateMap?.getMapLevel?.();
    const apts = window.RealEstateMap?.getAllApartments?.() || [];
    const filtered = window.RealEstateMapFilter?.applyFilters?.(apts) || apts;
    const pills = document.querySelectorAll(".marker-pill").length;
    const dots = document.querySelectorAll(".marker-dot").length;
    const clusters = document.querySelectorAll(".cluster-marker").length;
    const noTradePills = [...document.querySelectorAll(".marker-pill")].filter((el) =>
      el.textContent?.includes("거래없음")
    ).length;
    const pyeongOk = [...document.querySelectorAll(".marker-pill")].some(
      (el) => /\d+평/.test(el.textContent || "") || el.textContent?.includes("거래없음")
    );
    return {
      level,
      totalApts: apts.length,
      filteredCount: filtered.length,
      domPills: pills,
      domDots: dots,
      domClusters: clusters,
      noTradePills,
      pyeongOnMarker: pyeongOk,
      resultCountText: document.getElementById("filter-result-count")?.textContent?.trim(),
    };
  });
}

async function applyAreaFilter(page, value) {
  await page.click('[data-filter="area"]');
  await page.waitForTimeout(200);
  await page.click(`[data-filter-type="area"][data-filter-value="${value}"]`);
  await page.waitForTimeout(1500);
}

const browser = await chromium.launch();
const results = { regions: [], filterTests: [], consoleErrors: [] };

for (const region of REGIONS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push({ region: region.slug, text: msg.text() });
  });
  page.on("pageerror", (err) => {
    errors.push({ region: region.slug, text: String(err) });
  });

  const regionResult = { ...region, zooms: [], filter: [], errors: [] };

  try {
    await waitMapReady(page);
    await selectDistrict(page, region.code);

    for (const z of ZOOM_LEVELS) {
      const actual = await setMapZoom(page, z);
      await page.waitForTimeout(2000);
      const stats = await getMarkerStats(page);
      const shot = `${region.slug}-zoom${z}.png`;
      await page.screenshot({ path: path.join(OUT, shot) });
      regionResult.zooms.push({
        targetZoom: z,
        actualZoom: actual,
        ...stats,
        screenshot: shot,
        ok: stats.domPills + stats.domDots + stats.domClusters > 0 || stats.totalApts === 0,
      });
    }

    await setMapZoom(page, 5);
    await page.waitForTimeout(1000);

    for (const f of AREA_FILTERS) {
      await applyAreaFilter(page, f.value);
      const stats = await getMarkerStats(page);
      regionResult.filter.push({
        filter: f.label,
        value: f.value,
        filteredCount: stats.filteredCount,
        domMarkers: stats.domPills + stats.domDots,
        resultCountText: stats.resultCountText,
      });
    }

    const sample = await page.evaluate(() => {
      const pill = document.querySelector(".marker-pill");
      const apt = (window.RealEstateMap?.getAllApartments?.() || []).find(
        (a) => a.avgPrice1Y != null && a.dominantPyeong != null
      );
      return {
        sampleMarkerText: pill?.textContent?.trim() || null,
        sampleApt: apt
          ? {
              name: apt.name,
              avgPrice1Y: apt.avgPrice1Y,
              dominantPyeong: apt.dominantPyeong,
              formatted: window.RealEstateMapMarker?.formatPrice?.(apt.avgPrice1Y),
            }
          : null,
      };
    });
    regionResult.sample = sample;
  } catch (e) {
    regionResult.error = String(e.message || e);
  }

  regionResult.errors = errors;
  results.consoleErrors.push(...errors);
  results.regions.push(regionResult);
  await page.close();
}

results.filterSummary = REGIONS.map((r) => {
  const reg = results.regions.find((x) => x.slug === r.slug);
  return {
    region: r.name,
    filters: reg?.filter || [],
  };
});

results.generatedAt = new Date().toISOString();
results.screenshotsDir = OUT;
results.notes = {
  incheon: "인천 연수구 — districts.js 미등록·DB 미수집으로 검증 제외",
  nonCapital: "비수도권 — DB에 서울·경기만 존재, 별도 지역 검증 불가",
};

writeFileSync(REPORT, JSON.stringify(results, null, 2));
await browser.close();
console.log(JSON.stringify(results, null, 2));
