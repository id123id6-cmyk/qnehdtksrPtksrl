/**
 * 부동산 지도 검증 + 스크린샷 + JSON 리포트
 * 실행: node scripts/test-realestate-validation.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "realestate-validation");
const REPORT = path.join(ROOT, "data", "validation", "realestate-ui-report.json");
const BASE = "http://localhost:8765/tools/realestate-map/";
const PYEONGTAEK_GU = path.join(
  ROOT,
  "tools/realestate-map/data/gyeonggi/pyeongtaek-si-gu.geojson"
);
const PYEONGTAEK_BACKUP = path.join(OUT, "pyeongtaek-si-gu.current.geojson");

mkdirSync(OUT, { recursive: true });
mkdirSync(path.dirname(REPORT), { recursive: true });

spawnSync(process.execPath, ["scripts/validate-realestate-data.mjs"], {
  cwd: ROOT,
  encoding: "utf8",
});

let dbSummary = {};
try {
  dbSummary = JSON.parse(
    readFileSync(path.join(ROOT, "data/validation/realestate-report.json"), "utf8")
  ).summary;
} catch {
  /* ignore */
}

async function waitMapReady(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.searchIndexReady === true, { timeout: 120000 });
  await page.waitForFunction(
    () => {
      const loading = document.getElementById("map-loading");
      return !loading || loading.hidden;
    },
    { timeout: 60000 }
  );
}

async function selectDistrict(page, code, minMarkers = 1) {
  await page.evaluate((lawd) => window.RealEstateMap?.selectDistrict?.(lawd), code);
  await page.waitForFunction(
    (args) => {
      const gu = document.getElementById("selectedGu")?.textContent?.trim();
      const count = parseInt(document.getElementById("marker-count")?.textContent || "0", 10);
      return gu && count >= args.min;
    },
    { code, min: minMarkers },
    { timeout: 90000 }
  );
  await page.waitForTimeout(2000);
}

async function capturePyeongtaekBeforeAfter(browser) {
  const oldGeo = spawnSync("git", ["show", "HEAD:tools/realestate-map/data/gyeonggi/pyeongtaek-si-gu.geojson"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (oldGeo.status !== 0) return { skipped: "git old geojson unavailable" };

  copyFileSync(PYEONGTAEK_GU, PYEONGTAEK_BACKUP);
  writeFileSync(PYEONGTAEK_GU, oldGeo.stdout);

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await waitMapReady(page);
    await selectDistrict(page, "41220", 200);
    await page.screenshot({ path: path.join(OUT, "pyeongtaek-before-desktop.png") });

    copyFileSync(PYEONGTAEK_BACKUP, PYEONGTAEK_GU);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.searchIndexReady === true, { timeout: 120000 });
    await selectDistrict(page, "41220", 200);
    await page.screenshot({ path: path.join(OUT, "pyeongtaek-after-desktop.png") });

    await page.fill("#search-input", "평택용이금호");
    await page.waitForTimeout(800);
    await page.waitForSelector(".search-result-item", { timeout: 15000 });
    const aptId = await page.evaluate(() => {
      const items = [...document.querySelectorAll(".search-result-item")];
      const hit = items.find((el) => el.textContent?.includes("평택") || el.textContent?.includes("용이"));
      return hit?.dataset?.id || items[0]?.dataset?.id;
    });
    if (aptId) await page.click(`[data-id="${aptId}"]`);
    await page.waitForTimeout(3000);

    const geumho = await page.evaluate(() => {
      const sidebar = document.getElementById("sidebar-content")?.textContent?.replace(/\s+/g, " ").trim() || "";
      const hasTx = !/거래\s*없음|거래내역이 없/i.test(sidebar);
      const pyeongMatch = sidebar.match(/\d+평/g) || [];
      return { sidebar: sidebar.slice(0, 500), hasTx, pyeongTypes: [...new Set(pyeongMatch)].slice(0, 8) };
    });
    await page.screenshot({ path: path.join(OUT, "pyeongtaek-geumho-detail.png") });
    return { geumho };
  } finally {
    spawnSync(process.execPath, ["scripts/fix-gyeonggi-gu-geojson.mjs", "pyeongtaek-si"], { cwd: ROOT });
    await page.close();
  }
}

const browser = await chromium.launch();
const errors = [];
const uiResults = [];
const beforeAfter = await capturePyeongtaekBeforeAfter(browser);

const samples = [
  { code: "11680", slug: "gangnam", name: "강남구", min: 500 },
  { code: "41117", slug: "suwon-yeongtong", name: "수원 영통구", min: 100 },
  { code: "11710", slug: "songpa", name: "송파구(인천 대체)", min: 300 },
  { code: "41135", slug: "bundang", name: "성남 분당구", min: 200 },
  { code: "41220", slug: "pyeongtaek-check", name: "평택시 재확인", min: 200 },
];

for (const s of samples) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${s.slug}: ${m.text()}`);
  });
  try {
    await waitMapReady(page);
    await selectDistrict(page, s.code, s.min);
    const info = await page.evaluate(() => ({
      guLabel: document.getElementById("selectedGu")?.textContent?.trim(),
      markerCount: parseInt(document.getElementById("marker-count")?.textContent || "0", 10),
      mapLevel: window.RealEstateMap?.getMapLevel?.(),
    }));
    await page.screenshot({ path: path.join(OUT, `${s.slug}-desktop.png`) });
    uiResults.push({ ...s, ...info, ok: info.markerCount >= s.min });
  } catch (e) {
    uiResults.push({ ...s, ok: false, error: String(e.message || e) });
  }
  await page.close();
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await waitMapReady(mobile);
await selectDistrict(mobile, "41220", 200);
await mobile.screenshot({ path: path.join(OUT, "pyeongtaek-after-mobile.png") });
await mobile.close();
await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  dbSummary,
  beforeAfter,
  uiResults,
  note: "인천 연수구(28200) 미수집 — 송파구(11710) 대체",
  consoleErrors: errors.slice(0, 20),
  screenshotsDir: OUT,
};

writeFileSync(REPORT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
