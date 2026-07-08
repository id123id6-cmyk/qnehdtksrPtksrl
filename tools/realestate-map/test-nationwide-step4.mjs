/**
 * Step 4 전국 지도 검증
 * 실행: (로컬 8765) node tools/realestate-map/test-nationwide-step4.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:8765/tools/realestate-map/";
const OUT = path.join(__dirname, "screenshots", "step4-nationwide");
mkdirSync(OUT, { recursive: true });

const CASES = [
  { sido: "busan", name: "부산", gu: "26350", guName: "해운대구", shot: "busan-haeundae" },
  { sido: "jeonnamgwangju", name: "광주", gu: "12240", guName: "서구", shot: "gwangju-seo" },
  { sido: "gangwon", name: "강원", gu: "51110", guName: "춘천시", shot: "gangwon-chuncheon" },
  { sido: "jeonbuk", name: "전북", gu: "52111", guName: "완산구", shot: "jeonbuk-wansan" },
  { sido: "jeonnamgwangju", name: "전남", gu: "12110", guName: "목포시", shot: "jeonnam-mokpo" },
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
  await page.waitForTimeout(3000);
}

async function waitMarkers(page, min = 1, timeout = 60000) {
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
await page.addInitScript(() => {
  localStorage.setItem("seungbak_map_help_dismissed", "1");
  localStorage.setItem("seungbak_map_visited", "1");
});

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(err.message));

const results = [];
let loadMs = 0;
let sidoCount = 0;

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

  sidoCount = await page.evaluate(() => {
    document.getElementById("sidoDropdownBtn")?.click();
    return document.querySelectorAll("#sidoDropdownMenu [data-sido]").length;
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  for (const c of CASES) {
    const t1 = Date.now();
    await clickSido(page, c.sido);

    const guVisible = await page.evaluate(
      (code) => !!document.querySelector(`[data-sigungu="${code}"]`),
      c.gu
    );
    if (!guVisible) {
      results.push({ ...c, markers: 0, sidebar: false, switchMs: Date.now() - t1, error: "구역 없음" });
      continue;
    }
    await clickGu(page, c.gu);

    const markers = await waitMarkers(page, 1, 90000);
    const switchMs = Date.now() - t1;

    let sidebar = false;
    if (markers > 0) {
      await page.evaluate(() => {
        const el = document.querySelector(".marker-dot, .marker-card");
        if (el) el.click();
      });
      await page.waitForTimeout(1200);
      sidebar = await page.evaluate(() => {
        const t = document.getElementById("sidebar-content")?.textContent || "";
        return t.length > 20 && !t.includes("지역을 선택");
      });
    }

    await page.screenshot({ path: path.join(OUT, `${c.shot}.png`), fullPage: false });
    results.push({ ...c, markers, sidebar, switchMs, error: null });
  }
} catch (err) {
  console.error("테스트 실패:", err.message);
  results.push({ error: err.message });
}

await browser.close();

const report = { loadMs, sidoCount, consoleErrors, results, at: new Date().toISOString() };
writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

console.log("\n=== Step 4 전국 지도 테스트 ===");
console.log(`초기 로딩: ${loadMs}ms | 시도 수: ${sidoCount}`);
console.log(`콘솔 에러: ${consoleErrors.length}건`);
for (const r of results) {
  if (r.error && !r.name) continue;
  const mk = r.markers > 0 ? "✅" : "❌";
  const sb = r.sidebar ? "✅" : r.markers > 0 ? "❌" : "—";
  console.log(`${mk} ${r.name} ${r.guName} | 마커 ${r.markers} | 사이드바 ${sb} | ${r.switchMs}ms${r.error ? ` | ${r.error}` : ""}`);
}
console.log(`스크린샷: ${OUT}`);
