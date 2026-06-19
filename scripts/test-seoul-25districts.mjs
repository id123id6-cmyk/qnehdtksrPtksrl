/**
 * 서울 25개구 확장 Playwright 검증
 * 실행: node scripts/test-seoul-25districts.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const URL = "http://localhost:8765/tools/realestate-map/";
const SHOT_DIR = path.join(ROOT, "tools/realestate-map/screenshots");

const ALL_DISTRICTS = [
  { code: "11680", name: "강남구", minMarkers: 500 },
  { code: "11650", name: "서초구", minMarkers: 400 },
  { code: "11710", name: "송파구", minMarkers: 400 },
  { code: "11110", name: "종로구", minMarkers: 1 },
  { code: "11140", name: "중구", minMarkers: 1 },
  { code: "11170", name: "용산구", minMarkers: 1 },
  { code: "11200", name: "성동구", minMarkers: 1 },
  { code: "11215", name: "광진구", minMarkers: 1 },
  { code: "11230", name: "동대문구", minMarkers: 1 },
  { code: "11260", name: "중랑구", minMarkers: 1 },
  { code: "11290", name: "성북구", minMarkers: 1 },
  { code: "11305", name: "강북구", minMarkers: 1 },
  { code: "11320", name: "도봉구", minMarkers: 1 },
  { code: "11350", name: "노원구", minMarkers: 1 },
  { code: "11380", name: "은평구", minMarkers: 1 },
  { code: "11410", name: "서대문구", minMarkers: 1 },
  { code: "11440", name: "마포구", minMarkers: 1 },
  { code: "11470", name: "양천구", minMarkers: 1 },
  { code: "11500", name: "강서구", minMarkers: 1 },
  { code: "11530", name: "구로구", minMarkers: 1 },
  { code: "11545", name: "금천구", minMarkers: 1 },
  { code: "11560", name: "영등포구", minMarkers: 1 },
  { code: "11590", name: "동작구", minMarkers: 1 },
  { code: "11620", name: "관악구", minMarkers: 1 },
  { code: "11740", name: "강동구", minMarkers: 1 },
];

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
  await mkdir(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const gaEvents = [];

  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(URL, { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForFunction(
    () => window.searchIndexReady === true,
    { timeout: 120000 }
  );
  await page.waitForFunction(
    () => (window.RealEstateMap?.getAllApartments?.() || []).length > 7000,
    { timeout: 30000 }
  );

  const allAptCount = await page.evaluate(
    () => (window.RealEstateMap?.getAllApartments?.() || []).length
  );
  console.log(`allApartments 로드: ${allAptCount}개`);

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

  // 1) 25개 구 전환
  const districtResults = [];
  for (const d of ALL_DISTRICTS) {
    await page.evaluate(() => {
      window.__gaEvents = [];
    });
    try {
      await waitForDistrict(page, d.code, d.minMarkers);
      const state = await page.evaluate(() => ({
        gu: document.getElementById("selectedGu")?.textContent?.trim(),
        count: parseInt(
          document.getElementById("marker-count")?.textContent || "0",
          10
        ),
        ga: window.__gaEvents || [],
      }));
      const districtEvent = state.ga.find((e) => e.name === "district_select");
      districtResults.push({
        code: d.code,
        name: d.name,
        markerCount: state.count,
        gu: state.gu,
        districtEvent: districtEvent?.params,
        ok: state.gu === d.name && state.count >= d.minMarkers,
      });
    } catch (e) {
      districtResults.push({
        code: d.code,
        name: d.name,
        ok: false,
        error: String(e.message || e),
      });
    }
  }
  gaEvents.push(
    ...districtResults.flatMap((r) =>
      r.districtEvent ? [{ name: "district_select", params: r.districtEvent }] : []
    )
  );

  // 2) 거래 유형 토글 (월세 버튼 없음)
  await waitForDistrict(page, "11680", 500);
  await page.fill("#search-input", "래미안");
  await page.waitForTimeout(800);
  await page.click(".search-result-item");
  await page.waitForSelector(".deal-tab[data-deal='매매']", { timeout: 15000 });
  const dealTypeCheck = await page.evaluate(async () => {
    const tabs = [...document.querySelectorAll(".deal-tab")].map((el) =>
      el.getAttribute("data-deal")
    );
    const hasWolse = tabs.includes("월세");
    const jeonTab = document.querySelector('.deal-tab[data-deal="전세"]');
    if (jeonTab) jeonTab.click();
    await new Promise((r) => setTimeout(r, 2000));
    const chart = document.getElementById("priceChart");
    const activeDeal = document.querySelector(".deal-tab.active")?.getAttribute("data-deal");
    const toggleEvents = (window.__gaEvents || [])
      .filter((e) => e.name === "deal_type_toggle")
      .map((e) => e.params?.deal_type);
    return {
      tabs,
      hasWolse,
      chartVisible: !!chart,
      activeDeal,
      toggleDealTypes: toggleEvents,
    };
  });
  gaEvents.push(
    ...(await page.evaluate(() => window.__gaEvents || []))
  );

  // 3) 통합 검색
  const searchResults = [];
  for (const s of SEARCH_SCENARIOS) {
    await page.evaluate(() => {
      window.__gaEvents = [];
    });
    const startMin =
      s.start === "11680" ? 500 : s.start === "11650" ? 400 : s.start === "11710" ? 400 : 1;
    await waitForDistrict(page, s.start, startMin);
    await page.fill("#search-input", s.query);
    await page.waitForTimeout(700);

    const hit = await page.evaluate((needle) => {
      const items = [...document.querySelectorAll(".search-result-item")];
      const el =
        items.find((i) => i.textContent?.includes(needle)) || items[0];
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
      ga: window.__gaEvents || [],
    }));
    const clickEv = after.ga.filter((e) => e.name === "search_result_click").pop();
    searchResults.push({
      ...s,
      afterGu: after.gu,
      sidebarLen: after.sidebar,
      clickEvent: clickEv?.params,
      ok: after.gu === s.expectGu && after.sidebar > 30,
    });
    gaEvents.push(...after.ga);
    await page.fill("#search-input", "");
    await page.waitForTimeout(300);
  }

  await browser.close();

  const districtOk = districtResults.filter((r) => r.ok).length;
  const searchOk = searchResults.filter((r) => r.ok).length;
  const districtSelectCount = gaEvents.filter((e) => e.name === "district_select").length;

  const summary = {
    allApartments: allAptCount,
    districts: { total: 25, ok: districtOk, results: districtResults },
    dealType: {
      tabs: dealTypeCheck.tabs,
      noWolseButton: !dealTypeCheck.hasWolse,
      chartOk: dealTypeCheck.chartVisible,
      jeonseToggle: dealTypeCheck.activeDeal === "전세",
      toggleDealTypes: dealTypeCheck.toggleEvents,
    },
    search: { total: SEARCH_SCENARIOS.length, ok: searchOk, results: searchResults },
    ga: {
      district_select: districtSelectCount,
      search_result_click: gaEvents.some((e) => e.name === "search_result_click"),
      deal_type_toggle: gaEvents.some((e) => e.name === "deal_type_toggle"),
    },
    consoleErrors: errors,
  };

  console.log(JSON.stringify(summary, null, 2));

  const pass =
    districtOk === 25 &&
    !dealTypeCheck.hasWolse &&
    dealTypeCheck.chartVisible &&
    dealTypeCheck.activeDeal === "전세" &&
    searchOk === SEARCH_SCENARIOS.length &&
    errors.length === 0;

  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
