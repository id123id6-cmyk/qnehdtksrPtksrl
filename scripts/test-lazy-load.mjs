/**
 * 강남구 우선 로드 + 검색 인덱스 백그라운드 검증
 * 실행: node scripts/test-lazy-load.mjs
 */
import { chromium } from "playwright";

const URL = "http://localhost:8765/tools/realestate-map/";

const SEARCH_SCENARIOS = [
  { id: "eunma", start: "11680", query: "은마", expectGu: "강남구", needle: "은마" },
  { id: "banpo-jai", start: "11680", query: "반포자이", expectGu: "서초구", needle: "반포" },
  { id: "jamsil-els", start: "11680", query: "잠실 엘스", expectGu: "송파구", needle: "엘스" },
  { id: "mapo-raemian", start: "11440", query: "마포래미안푸르지오", expectGu: "마포구", needle: "마포" },
  { id: "gongdeok-jai", start: "11440", query: "공덕자이", expectGu: "마포구", needle: "공덕" },
  { id: "trimaje", start: "11200", query: "트리마제", expectGu: "성동구", needle: "트리마제" },
  { id: "hannam", start: "11170", query: "한남더힐", expectGu: "용산구", needle: "한남" },
  { id: "yeouido-jai", start: "11560", query: "여의도 자이", expectGu: "영등포구", needle: "여의도" },
  { id: "mokdong", start: "11470", query: "목동신시가지", expectGu: "양천구", needle: "목동" },
  { id: "godeok", start: "11740", query: "고덕 그라시움", expectGu: "강동구", needle: "고덕" },
  { id: "sanggye", start: "11350", query: "상계주공", expectGu: "노원구", needle: "상계" },
];

async function waitForDistrict(page, code, minMarkers) {
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
    { code, min: minMarkers },
    { timeout: 90000 }
  );
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const timings = [];

  page.on("console", (m) => {
    const text = m.text();
    if (m.type() === "error") errors.push(text);
    const timingMatch = text.match(/\[timing\] (\w+): (\d+)ms/);
    if (timingMatch) {
      timings.push({ name: timingMatch[1], ms: Number(timingMatch[2]) });
    }
  });
  page.on("pageerror", (e) => errors.push(e.message));

  const tStart = Date.now();
  await page.goto(URL, { waitUntil: "domcontentloaded" });

  await page.waitForFunction(
    () => {
      const list = window.RealEstateMap?.getDistrictCache?.()?.["11680"] || [];
      const withPrice = list.filter((a) => a.avgPrice1Y != null && a.avgPrice1Y > 0).length;
      const count = parseInt(
        document.getElementById("marker-count")?.textContent || "0",
        10
      );
      const gu = document.getElementById("selectedGu")?.textContent?.trim();
      return gu === "강남구" && count >= 500 && list.length >= 500 && withPrice > 200;
    },
    { timeout: 20000 }
  );
  const initialVisibleMs = Date.now() - tStart;

  const statsT0 = await page.evaluate((c) => {
    const list = window.RealEstateMap?.getDistrictCache?.()?.[c] || [];
    return {
      apartments: list.length,
      withPrice: list.filter((a) => a.avgPrice1Y != null && a.avgPrice1Y > 0).length,
    };
  }, "11680");
  await page.waitForTimeout(3000);
  const statsT3 = await page.evaluate((c) => {
    const list = window.RealEstateMap?.getDistrictCache?.()?.[c] || [];
    return {
      apartments: list.length,
      withPrice: list.filter((a) => a.avgPrice1Y != null && a.avgPrice1Y > 0).length,
    };
  }, "11680");
  const colorFlicker = statsT0.withPrice !== statsT3.withPrice;
  const priceReady = statsT0.withPrice > 200;

  const earlyState = await page.evaluate(() => ({
    searchIndexReady: window.searchIndexReady === true,
    aptCount: (window.RealEstateMap?.getAllApartments?.() || []).length,
    cacheSize: Object.keys(window.RealEstateMap?.getDistrictCache?.() || {}).length,
  }));

  // 인덱스 로드 전: 타 구 검색 불가
  await page.fill("#search-input", "반포자이");
  await page.waitForTimeout(600);
  const beforeIndex = await page.evaluate(() => ({
    ready: window.searchIndexReady === true,
    resultCount: document.querySelectorAll(".search-result-item").length,
  }));

  await page.waitForFunction(() => window.searchIndexReady === true, {
    timeout: 120000,
  });

  const indexState = await page.evaluate(() => ({
    searchIndexReady: window.searchIndexReady,
    aptCount: (window.RealEstateMap?.getAllApartments?.() || []).length,
  }));

  // 구 전환: 첫 전환 / 캐시 전환
  await page.evaluate(() => window.RealEstateMap?.changeDistrict("11650"));
  await page.waitForFunction(
    () => document.getElementById("selectedGu")?.textContent?.trim() === "서초구",
    { timeout: 15000 }
  );
  await page.waitForTimeout(500);

  await page.evaluate(() => window.RealEstateMap?.changeDistrict("11680"));
  await page.waitForFunction(
    () => document.getElementById("selectedGu")?.textContent?.trim() === "강남구",
    { timeout: 5000 }
  );

  await page.evaluate(() => window.RealEstateMap?.changeDistrict("11440"));
  await page.waitForFunction(
    () => document.getElementById("selectedGu")?.textContent?.trim() === "마포구",
    { timeout: 15000 }
  );

  // 통합 검색 11건
  const searchResults = [];
  for (const s of SEARCH_SCENARIOS) {
    const startMin =
      s.start === "11680" ? 500 : s.start === "11650" ? 400 : s.start === "11710" ? 400 : 1;
    await waitForDistrict(page, s.start, startMin);
    await page.fill("#search-input", s.query);
    await page.waitForTimeout(700);

    const hit = await page.evaluate((needle) => {
      const items = [...document.querySelectorAll(".search-result-item")];
      const el = items.find((i) => i.textContent?.includes(needle)) || items[0];
      return el?.dataset?.id || null;
    }, s.needle);

    if (!hit) {
      searchResults.push({ ...s, ok: false, reason: "no_result" });
      continue;
    }

    await page.click(`[data-id="${hit}"]`);
    await page.waitForTimeout(2500);

    const after = await page.evaluate(() => ({
      gu: document.getElementById("selectedGu")?.textContent?.trim(),
      sidebar: document.getElementById("sidebar-content")?.textContent?.length || 0,
    }));

    searchResults.push({
      ...s,
      afterGu: after.gu,
      ok: after.gu === s.expectGu && after.sidebar > 30,
    });
    await page.fill("#search-input", "");
    await page.waitForTimeout(300);
  }

  await browser.close();

  const timingMap = Object.fromEntries(timings.map((t) => [t.name, t.ms]));
  const checks = {
    initialVisibleMs,
    initialUnder3s: initialVisibleMs < 3000,
    priceReadyOnFirstPaint: priceReady,
    noColorFlicker: !colorFlicker,
    statsT0,
    statsT3,
    earlyOnlyGangnamCache: earlyState.cacheSize === 1,
    earlyAptCountSmall: earlyState.aptCount < 1000,
    beforeIndexNoCrossSearch:
      !beforeIndex.ready ? beforeIndex.resultCount === 0 : true,
    searchIndexReady: indexState.searchIndexReady,
    searchIndexCount: indexState.aptCount,
    searchScenariosOk: searchResults.filter((r) => r.ok).length,
    searchScenariosTotal: SEARCH_SCENARIOS.length,
    consoleErrors: errors.length,
    timings: timingMap,
  };

  console.log(JSON.stringify({ checks, searchResults, errors }, null, 2));

  const pass =
    checks.initialUnder3s &&
    checks.priceReadyOnFirstPaint &&
    checks.noColorFlicker &&
    checks.earlyOnlyGangnamCache &&
    checks.searchIndexReady &&
    checks.searchIndexCount > 7000 &&
    checks.searchScenariosOk === checks.searchScenariosTotal &&
    errors.length === 0;

  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
