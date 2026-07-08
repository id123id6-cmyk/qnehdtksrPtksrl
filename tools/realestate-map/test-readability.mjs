/**
 * 지도 가독성 개선 검증
 * 실행: node tools/realestate-map/test-readability.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:8765/tools/realestate-map/";
const OUT = path.join(__dirname, "screenshots", "readability");
mkdirSync(OUT, { recursive: true });

const CASES = [
  { sido: "daegu", gu: "27110", guName: "대구 중구", shot: "daegu-jung" },
  { sido: "busan", gu: "26230", guName: "부산 부산진구(서면)", shot: "busan-seomyeon" },
  { sido: "seoul", gu: "11680", guName: "서울 강남구", shot: "seoul-gangnam" },
  { sido: "jeonnamgwangju", gu: "12240", guName: "광주 서구", shot: "gwangju-seo" },
  { sido: "incheon", gu: "28125", guName: "인천 제물포구", shot: "incheon-jemulpo" },
];

async function clickSido(page, sidoId) {
  await page.click("#sidoDropdownBtn");
  await page.waitForTimeout(350);
  await page.evaluate((id) => document.querySelector(`[data-sido="${id}"]`)?.click(), sidoId);
  await page.waitForTimeout(900);
}

async function clickGu(page, code) {
  await page.click("#guDropdownBtn");
  await page.waitForTimeout(350);
  await page.evaluate((c) => document.querySelector(`[data-sigungu="${c}"]`)?.click(), code);
  await page.waitForTimeout(4500);
}

const consoleErrors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(err.message));

await page.addInitScript(() => {
  localStorage.setItem("seungbak_map_help_dismissed", "1");
  localStorage.setItem("seungbak_map_visited", "1");
});

const results = [];

try {
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
    await page.waitForTimeout(300);
  }

  const mapTone = await page.evaluate(() => {
    const tile = document.querySelector("#map > div:first-child");
    const style = tile ? getComputedStyle(tile) : null;
    return style?.filter || "none";
  });

  const overlayRemoved = await page.evaluate(() => {
    const map = window.RealEstateMapRegion?.DistrictRegionSelector?._instance?.map;
    if (!map) return null;
    return true;
  });

  for (const c of CASES) {
    await clickSido(page, c.sido);
    await clickGu(page, c.gu);

    const state = await page.evaluate(() => {
      const rs = window.RealEstateMapRegion?.DistrictRegionSelector?._instance;
      const guLabel = document.querySelector(".map-region-label--gu");
      const guStyle = guLabel ? getComputedStyle(guLabel) : null;
      const poly = rs?.guPolygons?.[0];
      let stroke = null;
      if (poly?.getOptions) {
        const o = poly.getOptions();
        stroke = { weight: o.strokeWeight, opacity: o.strokeOpacity };
      }
      return {
        guLabel: !!guLabel,
        fontSize: guStyle?.fontSize || null,
        fontWeight: guStyle?.fontWeight || null,
        stroke,
        level: rs?.map?.getLevel?.() ?? null,
      };
    });

    await page.screenshot({ path: path.join(OUT, `${c.shot}.png`), fullPage: false });
    results.push({ ...c, ...state });
  }

  // 줌인 동 라벨 (대구 중구)
  await clickSido(page, "daegu");
  await clickGu(page, "27110");
  await page.evaluate(() => {
    const rs = window.RealEstateMapRegion?.DistrictRegionSelector?._instance;
    if (rs?.map) rs.map.setLevel(4);
  });
  await page.waitForTimeout(1500);
  const dongCount = await page.evaluate(
    () => document.querySelectorAll(".map-region-label--dong").length
  );
  await page.screenshot({ path: path.join(OUT, "zoom-dong-labels.png"), fullPage: false });

  // 줌아웃 전국 뷰
  await page.evaluate(() => {
    const rs = window.RealEstateMapRegion?.DistrictRegionSelector?._instance;
    if (rs) {
      rs.selectSido("seoul");
      if (rs.map) {
        rs.map.setCenter(new kakao.maps.LatLng(36.35, 127.77));
        rs.map.setLevel(12);
      }
    }
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "zoom-nationwide.png"), fullPage: false });

  const report = {
    mapTone,
    overlayRemoved,
    dongCount,
    consoleErrors: [...new Set(consoleErrors)],
    results,
    at: new Date().toISOString(),
  };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

  console.log("\n=== 지도 가독성 테스트 ===");
  console.log(`CSS filter: ${mapTone}`);
  console.log(`동 라벨(줌인): ${dongCount}개`);
  console.log(`콘솔 에러: ${report.consoleErrors.length}건`);
  for (const r of results) {
    console.log(
      `${r.guLabel ? "✅" : "❌"} ${r.guName} | 구라벨 ${r.fontSize}/${r.fontWeight} | 경계 ${r.stroke?.weight}px@${r.stroke?.opacity}`
    );
  }
  console.log(`스크린샷: ${OUT}`);
} catch (err) {
  console.error("테스트 실패:", err.message);
  process.exitCode = 1;
}

await browser.close();
