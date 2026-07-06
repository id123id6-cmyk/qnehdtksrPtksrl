/**
 * 시세통 스타일 툴바 UI 스크린샷
 * node scripts/test-map-toolbar-ui.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "realestate-map-toolbar");
const BASE = "http://localhost:8765/tools/realestate-map/";
const INDEX = path.join(ROOT, "tools/realestate-map/index.html");

mkdirSync(OUT, { recursive: true });

function headOk() {
  const html = readFileSync(INDEX, "utf8");
  const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";
  return {
    ga: head.includes("G-Y7SC73P9JW"),
    clarity: head.includes("xbdrgqw1pj"),
    adsense: head.includes("ca-pub-8232968272801958"),
  };
}

async function main() {
  const errors = [];
  const browser = await chromium.launch();

  for (const [name, vp] of [
    ["desktop-1440", { width: 1440, height: 900 }],
    ["mobile-375", { width: 375, height: 812, isMobile: true }],
  ]) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile || false,
      hasTouch: Boolean(vp.isMobile),
    });
    page.on("console", (m) => {
      if (m.type() === "error" && !m.text().includes("401")) errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(() => window.searchIndexReady === true, { timeout: 120000 });
    await page.evaluate((c) => window.RealEstateMap?.selectDistrict?.(c), "11680");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    await page.close();
  }

  await browser.close();

  const report = {
    head: headOk(),
    consoleErrors: [...new Set(errors)],
    screenshots: ["desktop-1440.png", "mobile-375.png"],
  };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.consoleErrors.length === 0 && report.head.ga ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
