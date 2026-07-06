/**
 * 시세통 벤치마킹 업그레이드 검증
 * 실행: node scripts/test-realestate-map-upgrade.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "realestate-map-upgrade");
const BASE = "http://localhost:8765/tools/realestate-map/";
const INDEX = path.join(ROOT, "tools/realestate-map/index.html");

mkdirSync(OUT, { recursive: true });

function checkHeadDiff() {
  const html = readFileSync(INDEX, "utf8");
  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
  const head = headMatch ? headMatch[1] : "";
  const ga = head.includes("G-Y7SC73P9JW");
  const clarity = head.includes("xbdrgqw1pj");
  const adsense = head.includes("ca-pub-8232968272801958");
  return { ga, clarity, adsense, headLines: head.split("\n").length };
}

async function waitReady(page) {
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

async function selectDistrict(page, code) {
  await page.evaluate((lawd) => window.RealEstateMap?.selectDistrict?.(lawd), code);
  await page.waitForFunction(
    (c) => window.RealEstateMap?.getSigunguCode?.() === c,
    code,
    { timeout: 90000 }
  );
  await page.evaluate((lawd) => {
    const m = window.RealEstateMap?.getMap?.();
    const d = window.RealEstateMap?.DISTRICTS?.[lawd];
    if (m && d && window.kakao?.maps) {
      m.setCenter(new kakao.maps.LatLng(d.lat, d.lng));
      m.setLevel(2);
    }
    window.RealEstateMap?.getMarkerLayer?.()?.scheduleRender?.(2, true);
  }, code);
  await page.waitForTimeout(3000);
}

async function main() {
  const headCheck = checkHeadDiff();
  const consoleErrors = [];
  const report = { headCheck, checks: {}, consoleErrors: [], screenshots: [] };

  const browser = await chromium.launch();
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  desktop.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  desktop.on("pageerror", (e) => consoleErrors.push(e.message));

  await waitReady(desktop);
  await selectDistrict(desktop, "11680");

  await desktop.evaluate(() => {
    const m = window.RealEstateMap?.getMap?.();
    if (m) m.setLevel(2);
  });
  await desktop.waitForFunction(
    () => (window.RealEstateMap?.getMarkerLayer?.()?.overlays?.length || 0) > 0,
    { timeout: 30000 }
  );
  await desktop.waitForTimeout(1500);

  await desktop.evaluate(() => {
    const apts = window.RealEstateMap?.getAllApartments?.() || [];
    const eunma = apts.find((a) => a.name && a.name.includes("은마") && a.sigungu_code === "11680");
    if (eunma && window.RealEstateMap?.focusApartment) window.RealEstateMap.focusApartment(eunma);
  });
  await desktop.waitForTimeout(2000);

  const markerCheck = await desktop.evaluate(() => {
    const layer = window.RealEstateMap?.getMarkerLayer?.();
    const contents = (layer?.overlays || []).map((o) => {
      const c = o.getContent?.();
      if (!c) return "";
      return typeof c === "string" ? c : c.outerHTML || c.textContent || "";
    });
    const eunmaHtml = contents.find((h) => h.includes("은마")) || "";
    return {
      cardCount: contents.filter((h) => h.includes("marker-card")).length,
      fullCount: contents.filter((h) => h.includes("marker-card--full")).length,
      dotCount: contents.filter((h) => h.includes("marker-dot")).length,
      eunmaHasMeta: /y|세대/.test(eunmaHtml),
      eunmaText: eunmaHtml.slice(0, 120) || null,
      stats: layer?.getStats?.() || null,
      hidden: layer?._hidden,
      overlayCount: layer?.overlays?.length ?? null,
    };
  });
  report.checks.marker = markerCheck;

  await desktop.screenshot({ path: path.join(OUT, "desktop-marker-gangnam.png") });
  report.screenshots.push("desktop-marker-gangnam.png");

  await selectDistrict(desktop, "41220");
  await desktop.evaluate(() => {
    const m = window.RealEstateMap?.getMap?.();
    if (m) m.setLevel(2);
  });
  await desktop.waitForTimeout(2000);
  await desktop.evaluate(() => {
    const apts = window.RealEstateMap?.getAllApartments?.() || [];
    const apt = apts.find((a) => a.name && a.name.includes("금호어울림"));
    if (apt && window.RealEstateMap?.focusApartment) window.RealEstateMap.focusApartment(apt);
  });
  await desktop.waitForTimeout(2000);

  const pyeongtaekCheck = await desktop.evaluate(() => {
    const layer = window.RealEstateMap?.getMarkerLayer?.();
    const contents = (layer?.overlays || []).map((o) => {
      const c = o.getContent?.();
      if (!c) return "";
      return typeof c === "string" ? c : c.outerHTML || "";
    });
    const html = contents.find((h) => h.includes("금호")) || "";
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    const card = wrap.querySelector(".marker-card");
    const lines = card
      ? {
          line1: card.querySelector(".marker-card-line1")?.textContent,
          line2: card.querySelector(".marker-card-line2")?.textContent,
          line3: card.querySelector(".marker-card-line3")?.textContent,
        }
      : null;
    return { lines, hasThreeLines: Boolean(lines?.line1 && lines?.line2 && lines?.line3), htmlSnippet: html.slice(0, 120) };
  });
  report.checks.pyeongtaek = pyeongtaekCheck;

  await desktop.screenshot({ path: path.join(OUT, "desktop-marker-pyeongtaek.png") });
  report.screenshots.push("desktop-marker-pyeongtaek.png");

  await desktop.evaluate(() => {
    const m = window.RealEstateMap?.getMap?.();
    const RT = window.RealEstateMapRadius;
    if (!m || !RT || !window.kakao?.maps) return;
    const tool = window.__mapRadiusTool || new RT.RadiusTool(m);
    window.__mapRadiusTool = tool;
    const p1 = new kakao.maps.LatLng(37.5172, 127.0473);
    const p2 = new kakao.maps.LatLng(37.5212, 127.0473);
    tool.drawCircle(p1, p2);
  });
  await desktop.waitForTimeout(800);
  const radiusCheck = await desktop.evaluate(() => {
    const RT = window.RealEstateMapRadius;
    const dist = RT?.haversineMeters?.(37.5172, 127.0473, 37.5212, 127.0473) || 0;
    return {
      btnExists: Boolean(document.getElementById("radius-tool-btn")),
      hasCircle: Boolean(window.__mapRadiusTool?.circle),
      hasLabel: Boolean(window.__mapRadiusTool?.labelOverlay),
      haversineOk: dist > 400 && dist < 500,
      circleApi: typeof window.kakao?.maps?.Circle,
    };
  });
  report.checks.radius = radiusCheck;
  await desktop.screenshot({ path: path.join(OUT, "desktop-radius.png") });
  report.screenshots.push("desktop-radius.png");

  await desktop.click('[data-infra="subway"]').catch(() => {});
  await desktop.waitForTimeout(2000);
  const infraCheck = await desktop.evaluate(() => ({
    subwayPins: document.querySelectorAll(".infra-pin--subway").length,
    infraBarBg: getComputedStyle(document.querySelector(".map-infra-bar") || document.body).backgroundColor,
    filterBarExists: Boolean(document.querySelector(".map-filter-bar")),
  }));
  report.checks.infra = infraCheck;
  await desktop.screenshot({ path: path.join(OUT, "desktop-infra-subway.png") });
  report.screenshots.push("desktop-infra-subway.png");

  const uiCheck = await desktop.evaluate(() => {
    const filter = document.querySelector(".map-filter-bar");
    const active = document.querySelector(".filter-btn.active");
    return {
      filterBg: filter ? getComputedStyle(filter).backgroundColor : null,
      hasControlsStack: Boolean(document.getElementById("map-controls-stack")),
      activeFilterDark: active
        ? getComputedStyle(active).backgroundColor === "rgb(26, 26, 26)"
        : false,
    };
  });
  report.checks.ui = uiCheck;

  await desktop.close();

  const mobile = await browser.newPage({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`[mobile] ${m.text()}`);
  });
  await waitReady(mobile);
  await selectDistrict(mobile, "11680");
  await mobile.screenshot({ path: path.join(OUT, "mobile-controls.png") });
  report.screenshots.push("mobile-controls.png");
  await mobile.close();

  await browser.close();

  report.consoleErrors = [...new Set(consoleErrors)].filter(
    (e) =>
      !e.includes("401") &&
      !e.includes("Failed to load resource") &&
      !e.includes("NaN")
  );
  report.pass =
    headCheck.ga &&
    headCheck.clarity &&
    headCheck.adsense &&
    report.checks.ui?.hasControlsStack &&
    (report.checks.marker?.overlayCount > 0 || report.checks.marker?.cardCount > 0) &&
    report.checks.radius?.btnExists &&
    (report.checks.radius?.hasCircle || report.checks.radius?.haversineOk) &&
    report.consoleErrors.length === 0;

  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
