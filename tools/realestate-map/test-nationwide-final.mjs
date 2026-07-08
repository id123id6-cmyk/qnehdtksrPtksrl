/**
 * 전국 실거래 지도 최종 검증 (16개 지역)
 * 실행: node tools/realestate-map/test-nationwide-final.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:8765/tools/realestate-map/";
const OUT = path.join(__dirname, "screenshots", "final-nationwide");
mkdirSync(OUT, { recursive: true });

const CASES = [
  { sido: "seoul", name: "서울", gu: "11740", guName: "강동구", shot: "seoul-gangdong" },
  { sido: "busan", name: "부산", gu: "26350", guName: "해운대구", shot: "busan-haeundae" },
  { sido: "daegu", name: "대구", gu: "27110", guName: "중구", shot: "daegu-jung" },
  { sido: "jeonnamgwangju", name: "광주", gu: "12240", guName: "서구", shot: "gwangju-seo" },
  { sido: "daejeon", name: "대전", gu: "30170", guName: "서구", shot: "daejeon-seo" },
  { sido: "ulsan", name: "울산", gu: "31140", guName: "남구", shot: "ulsan-nam" },
  { sido: "sejong", name: "세종", gu: "36110", guName: "세종시", shot: "sejong" },
  { sido: "gangwon", name: "강원", gu: "51110", guName: "춘천시", shot: "gangwon-chuncheon" },
  { sido: "chungbuk", name: "충북", gu: "43111", guName: "청주시 상당구", shot: "chungbuk-cheongju" },
  { sido: "chungnam", name: "충남", gu: "44131", guName: "천안시 동남구", shot: "chungnam-cheonan" },
  { sido: "jeonbuk", name: "전북", gu: "52111", guName: "완산구", shot: "jeonbuk-wansan" },
  { sido: "jeonnamgwangju", name: "전남", gu: "12110", guName: "목포시", shot: "jeonnam-mokpo" },
  { sido: "gyeongbuk", name: "경북", gu: "47111", guName: "포항시 남구", shot: "gyeongbuk-pohang" },
  { sido: "gyeongnam", name: "경남", gu: "48121", guName: "창원시 의창구", shot: "gyeongnam-changwon" },
  { sido: "jeju", name: "제주", gu: "50110", guName: "제주시", shot: "jeju-si" },
  { sido: "incheon", name: "인천", gu: "28125", guName: "제물포구", shot: "incheon-jemulpo" },
];

async function clickSido(page, sidoId) {
  await page.click("#sidoDropdownBtn");
  await page.waitForTimeout(400);
  await page.evaluate((id) => {
    document.querySelector(`[data-sido="${id}"]`)?.click();
  }, sidoId);
  await page.waitForTimeout(1000);
}

async function clickGu(page, code) {
  await page.click("#guDropdownBtn");
  await page.waitForTimeout(400);
  await page.evaluate((c) => {
    document.querySelector(`[data-sigungu="${c}"]`)?.click();
  }, code);
  await page.waitForTimeout(3500);
}

async function waitMarkers(page, min = 1, timeout = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const n = await page.evaluate(() => {
      const el = document.getElementById("marker-count");
      const m = el?.textContent?.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    });
    if (n >= min) return n;
    await page.waitForTimeout(800);
  }
  return 0;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

const failedRequests = [];
page.on("requestfailed", (req) => {
  const url = req.url();
  if (url.includes(".geojson") || url.includes("region-labels")) {
    failedRequests.push(url);
  }
});
page.on("response", (res) => {
  const url = res.url();
  if ((url.includes(".geojson") || url.includes("region-labels")) && res.status() >= 400) {
    failedRequests.push(`${res.status()} ${url}`);
  }
});

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(err.message));

await page.addInitScript(() => {
  localStorage.setItem("seungbak_map_help_dismissed", "1");
  localStorage.setItem("seungbak_map_visited", "1");
});

const results = [];
let loadMs = 0;
let radiusRemoved = false;
let filterShot = false;

try {
  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(
    () => {
      const loading = document.getElementById("map-loading");
      return !loading || loading.hidden;
    },
    { timeout: 60000 }
  );
  const emptyClose = page.locator("#map-empty-close");
  if (await emptyClose.isVisible().catch(() => false)) {
    await emptyClose.click();
    await page.waitForTimeout(400);
  }
  loadMs = Date.now() - t0;

  radiusRemoved = await page.evaluate(() => ({
    noRadiusFab: !document.getElementById("map-radius-fab"),
    noRadiusBtn: !document.getElementById("radius-tool-btn"),
    noRadiusScript: !document.querySelector('script[src*="radius-tool"]'),
  }));

  await page.screenshot({ path: path.join(OUT, "filter-no-radius.png"), fullPage: false });
  filterShot = true;

  for (const c of CASES) {
    const t1 = Date.now();
    await clickSido(page, c.sido);

    const guVisible = await page.evaluate(
      (code) => !!document.querySelector(`[data-sigungu="${code}"]`),
      c.gu
    );
    if (!guVisible) {
      results.push({ ...c, markers: 0, boundary: false, guLabel: false, dongLabel: false, switchMs: Date.now() - t1, error: "구역 없음" });
      continue;
    }
    await clickGu(page, c.gu);

    const state = await page.evaluate(() => {
      const rs = window.RealEstateMapRegion?.DistrictRegionSelector?._instance;
      const guPoly = rs?.guPolygons?.length || 0;
      const labels = document.querySelectorAll(".map-region-label").length;
      const guLabels = document.querySelectorAll(".map-region-label--gu").length;
      const dongLabels = document.querySelectorAll(".map-region-label--dong").length;
      return { guPoly, labels, guLabels, dongLabels };
    });

    const markers = await waitMarkers(page, 1, 90000);
    const switchMs = Date.now() - t1;

    if (c.shot === "seoul-gangdong" || c.shot === "busan-haeundae" || c.shot === "gwangju-seo" || c.shot === "gangwon-chuncheon") {
      await page.screenshot({ path: path.join(OUT, `${c.shot}.png`), fullPage: false });
    }

    if (c.shot === "seoul-gangdong") {
      await page.evaluate(() => {
        const rs = window.RealEstateMapRegion?.DistrictRegionSelector?._instance;
        if (rs?.map) rs.map.setLevel(4);
      });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, "zoom-dong-labels.png"), fullPage: false });
    }

    results.push({
      ...c,
      markers,
      boundary: state.guPoly > 0,
      guLabel: state.guLabels > 0,
      dongLabel: state.dongLabels > 0,
      labels: state.labels,
      switchMs,
      error: null,
    });
  }
} catch (err) {
  console.error("테스트 실패:", err.message);
  results.push({ error: err.message });
}

await browser.close();

const report = {
  loadMs,
  radiusRemoved,
  filterShot,
  geojsonFailures: [...new Set(failedRequests)],
  consoleErrors: [...new Set(consoleErrors)],
  results,
  at: new Date().toISOString(),
};
writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

console.log("\n=== 전국 실거래 지도 최종 테스트 ===");
console.log(`초기 로딩: ${loadMs}ms`);
console.log(`반경 UI 제거:`, radiusRemoved);
console.log(`GeoJSON 실패: ${report.geojsonFailures.length}건`);
console.log(`콘솔 에러: ${report.consoleErrors.length}건`);
for (const r of results) {
  if (r.error && !r.name) continue;
  const b = r.boundary ? "✅" : "❌";
  const gl = r.guLabel ? "✅" : "—";
  const dl = r.dongLabel ? "✅" : "—";
  const mk = r.markers > 0 ? "✅" : "❌";
  console.log(`${b}경계 ${gl}구라벨 ${dl}동라벨 ${mk}마커 | ${r.name} ${r.guName} | ${r.switchMs}ms${r.error ? ` | ${r.error}` : ""}`);
}
console.log(`스크린샷: ${OUT}`);
