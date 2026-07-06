/**
 * 다크 배경 텍스트 가시성 수정 검증
 * node scripts/test-dark-text-fix.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "screenshots", "dark-text-fix");
const BASE = "http://localhost:8765";

mkdirSync(OUT, { recursive: true });

function isLight(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return false;
  const [, r, g, b] = m.map(Number);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

async function shot(page, url, name, selector) {
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(600);
  if (selector) {
    const el = page.locator(selector).first();
    if (await el.count()) await el.screenshot({ path: path.join(OUT, name) });
    else await page.screenshot({ path: path.join(OUT, name), fullPage: true });
  } else {
    await page.screenshot({ path: path.join(OUT, name), fullPage: true });
  }
  return [...new Set(errs)];
}

async function main() {
  const browser = await chromium.launch();
  const errors = [];
  const checks = {};

  // about CTA
  let page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/about.html`, { waitUntil: "domcontentloaded" });
  checks.aboutCta = await page.evaluate(() => {
    const el = document.querySelector(".theme-btn-primary");
    const cs = getComputedStyle(el);
    return { color: cs.color, bg: cs.backgroundColor, fill: cs.webkitTextFillColor };
  });
  await page.locator(".theme-about-contact").screenshot({ path: path.join(OUT, "about-cta.png") });

  // tools hero
  await page.goto(`${BASE}/tools/`, { waitUntil: "domcontentloaded" });
  checks.toolsHero = await page.evaluate(() => {
    const title = document.querySelector(".theme-hero-title");
    const highlight = document.querySelector(".hero-highlight");
    const tcs = getComputedStyle(title);
    const hcs = getComputedStyle(highlight);
    return {
      titleColor: tcs.color,
      titleFill: tcs.webkitTextFillColor,
      highlightColor: hcs.color,
    };
  });
  await page.locator(".theme-tools-hero").screenshot({ path: path.join(OUT, "tools-hero-desktop.png") });

  // tools mobile
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  await page.locator(".theme-tools-hero").screenshot({ path: path.join(OUT, "tools-hero-mobile.png") });
  await page.close();

  // regression pages
  const regression = [
    { url: "/blog/", name: "regression-blog.png" },
    { url: "/privacy.html", name: "regression-privacy.png" },
    { url: "/tools/subscription-calculator/", name: "regression-subscription.png" },
    { url: "/tools/realestate-map/", name: "regression-map.png" },
  ];

  for (const r of regression) {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    errors.push(...await shot(p, r.url, r.name, null));
    await p.close();
  }

  await browser.close();

  const pass =
    isLight(checks.aboutCta.color) &&
    isLight(checks.toolsHero.titleColor) &&
    errors.length === 0;

  const report = { checks, consoleErrors: errors, pass };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
