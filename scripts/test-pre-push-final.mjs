/**
 * 배포 전 최종 검증
 * node scripts/test-pre-push-final.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "screenshots", "pre-push-verify");
const LOCAL = "http://localhost:8765";
const PROD = "https://seungbak.com";

const PAGES = [
  "/",
  "/tools/",
  "/tools/realestate-map/",
  "/tools/subscription-calculator/",
  "/tools/salary-calculator/",
  "/tools/apt-calculator/",
  "/tools/income-calculator/",
  "/tools/dday-calculator/",
  "/blog/",
  "/blog/post-1.html",
  "/blog/post-15.html",
  "/blog/post-30.html",
  "/about.html",
  "/contact.html",
  "/privacy.html",
  "/disclaimer.html",
  "/terms.html",
];

const HEAD_MARKERS = ["G-Y7SC73P9JW", "ca-pub-8232968272801958", "clarity.ms"];

mkdirSync(OUT, { recursive: true });

async function checkPages(base, label, shots = false) {
  const browser = await chromium.launch();
  const results = [];
  const allErrors = [];

  for (const p of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    page.on("pageerror", (e) => errs.push(e.message));

    let ok = true;
    try {
      await page.goto(`${base}${p}`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(1200);
      const html = await page.content();
      const headOk = HEAD_MARKERS.every((m) => html.includes(m));
      if (!headOk) errs.push("HEAD_INTEGRITY_FAIL");

      if (shots && label === "prod") {
        if (p === "/") {
          await page.screenshot({ path: path.join(OUT, "prod-home-desktop.png"), fullPage: false });
          await page.setViewportSize({ width: 375, height: 812 });
          await page.waitForTimeout(400);
          await page.screenshot({ path: path.join(OUT, "prod-home-mobile.png"), fullPage: false });
          await page.setViewportSize({ width: 1440, height: 900 });
        }
        if (p === "/tools/realestate-map/") {
          await page.waitForTimeout(3000);
          await page.screenshot({ path: path.join(OUT, "prod-map.png"), fullPage: false });
        }
      }
    } catch (e) {
      ok = false;
      errs.push(String(e));
    }

    results.push({ page: p, errors: [...new Set(errs)], ok: ok && errs.length === 0 });
    allErrors.push(...errs.map((e) => `[${label}${p}] ${e}`));
    await page.close();
  }

  await browser.close();
  return { results, allErrors: [...new Set(allErrors)] };
}

async function main() {
  const local = await checkPages(LOCAL, "local");
  let prod = { results: [], allErrors: ["SKIP_PROD"] };
  try {
    prod = await checkPages(PROD, "prod", true);
  } catch (e) {
    prod.allErrors = [String(e)];
  }

  const report = {
    local: {
      pass: local.results.every((r) => r.ok),
      failed: local.results.filter((r) => !r.ok),
      totalErrors: local.allErrors.length,
      errors: local.allErrors,
    },
    prod: {
      pass: prod.results.every((r) => r.ok),
      failed: prod.results.filter((r) => !r.ok),
      totalErrors: prod.allErrors.length,
      errors: prod.allErrors,
    },
    headMarkers: HEAD_MARKERS,
    gitignore: {
      envLocal: readFileSync(path.join(ROOT, ".gitignore"), "utf8").includes(".env.local"),
      configJs: readFileSync(path.join(ROOT, ".gitignore"), "utf8").includes("tools/realestate-map/config.js"),
    },
  };

  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.local.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
