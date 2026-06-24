/**
 * Playwright: 구 선택 시 지도 중심·경계·마커 정렬 검증
 * 실행: node scripts/verify-district-map-alignment.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "district-alignment-fix");
const REPORT = path.join(ROOT, "data/validation/district-map-playwright.json");
const BASE = "http://localhost:8765/tools/realestate-map/";

const SEOUL_SAMPLE = [
  { code: "11680", name: "강남구", lat: 37.5172, lng: 127.0473 },
  { code: "11710", name: "송파구", lat: 37.5145, lng: 127.1059 },
  { code: "11740", name: "강동구", lat: 37.5301, lng: 127.1238 },
  { code: "11620", name: "관악구", lat: 37.4784, lng: 126.9516 },
  { code: "11440", name: "마포구", lat: 37.5663, lng: 126.9019 },
  { code: "11350", name: "노원구", lat: 37.6543, lng: 127.0568 },
];

const GYEONGGI_SAMPLE = [
  { code: "41220", name: "평택시", lat: 36.9673, lng: 127.0528 },
  { code: "41135", name: "성남 분당구", lat: 37.3711, lng: 127.1457 },
];

mkdirSync(OUT, { recursive: true });
mkdirSync(path.dirname(REPORT), { recursive: true });

const MAX_DELTA = 0.08;

async function measureDistrict(page, target) {
  await page.evaluate((c) => window.RealEstateMap?.selectDistrict?.(c), target.code);
  await page.waitForFunction(
    (c) => window.RealEstateMap?.getSigunguCode?.() === c,
    target.code,
    { timeout: 60000 }
  );
  await page.waitForTimeout(4500);

  const data = await page.evaluate((expected) => {
    const center = window.RealEstateMap?.getMapCenter?.();
    const cache = window.RealEstateMap?.getDistrictCache?.() || {};
    const apts = cache[expected.code] || [];
    let aptLat = 0;
    let aptLng = 0;
    let n = 0;
    for (const a of apts) {
      if (a.latitude == null) continue;
      aptLat += a.latitude;
      aptLng += a.longitude;
      n++;
    }
    const aptCenter = n ? { lat: aptLat / n, lng: aptLng / n, count: n } : null;

    const pills = document.querySelectorAll(".marker-pill, .marker-dot");
    return { center, aptCenter, markerDom: pills.length };
  }, target);

  const dCenter = data.center
    ? Math.hypot(data.center.lat - target.lat, data.center.lng - target.lng)
    : 999;
  const dApt = data.aptCenter
    ? Math.hypot(data.aptCenter.lat - target.lat, data.aptCenter.lng - target.lng)
    : 999;

  const ok = dCenter <= MAX_DELTA && dApt <= MAX_DELTA && (data.aptCenter?.count || 0) > 0;
  const shot = path.join(OUT, `${target.code}-${target.name.replace(/\s+/g, "")}.png`);
  await page.screenshot({ path: shot, fullPage: false });

  return {
    ...target,
    mapCenter: data.center,
    aptCenter: data.aptCenter,
    markerDom: data.markerDom,
    deltaMap: dCenter,
    deltaApt: dApt,
    ok,
    screenshot: shot,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.searchIndexReady === true, { timeout: 120000 });

  const results = [];
  for (const t of [...SEOUL_SAMPLE, ...GYEONGGI_SAMPLE]) {
    results.push(await measureDistrict(page, t));
  }

  // 강동→관악 연속 전환 (회귀 재현 시나리오)
  await page.evaluate(() => window.RealEstateMap?.selectDistrict?.("11740"));
  await page.waitForTimeout(3000);
  const gangdong = await measureDistrict(page, SEOUL_SAMPLE[2]);
  const gwanak = await measureDistrict(page, SEOUL_SAMPLE[3]);
  const switchOk =
    gangdong.ok &&
    gwanak.ok &&
    Math.hypot(gwanak.mapCenter.lat - 37.4784, gwanak.mapCenter.lng - 126.9516) <= MAX_DELTA;

  const report = {
    maxDelta: MAX_DELTA,
    results,
    switchScenario: { gangdong, gwanak, ok: switchOk },
    consoleErrors: errors,
    pass: results.every((r) => r.ok) && switchOk && errors.length === 0,
  };

  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
