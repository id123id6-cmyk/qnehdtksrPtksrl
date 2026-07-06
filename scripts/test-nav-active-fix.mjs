/**
 * 네비 활성 메뉴 가시성 검증
 * node scripts/test-nav-active-fix.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "screenshots", "nav-active-fix");
const BASE = "http://localhost:8765";

mkdirSync(OUT, { recursive: true });

const PAGES = [
  { url: "/tools/", shot: "nav-tools.png", active: "도구" },
  { url: "/blog/", shot: "nav-blog.png", active: "블로그" },
  { url: "/about.html", shot: "nav-about.png", active: "소개" },
  { url: "/tools/realestate-map/", shot: "nav-map.png", active: "지도" },
];

function isGoldish(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return false;
  const [, r, g, b] = m.map(Number);
  return r > 200 && g > 150 && b < 80;
}

async function main() {
  const browser = await chromium.launch();
  const errors = [];
  const results = [];

  for (const p of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on("console", (m) => { if (m.type() === "error") errors.push(`[${p.url}] ${m.text()}`); });
    page.on("pageerror", (e) => errors.push(`[${p.url}] ${e.message}`));

    await page.goto(`${BASE}${p.url}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(500);

    const activeStyle = await page.evaluate(() => {
      const el = document.querySelector(".theme-nav-item.is-active");
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { color: cs.color, text: el.textContent.trim() };
    });

    const navSel = p.url.includes("realestate-map") ? ".hr-header" : ".theme-nav";
    await page.waitForSelector(navSel, { timeout: 10000 });
    await page.locator(navSel).screenshot({ path: path.join(OUT, p.shot) });

    if (p.url.includes("realestate-map")) {
      const mapActive = await page.evaluate(() => {
        const el = document.querySelector(".hr-nav .is-active");
        const cs = el ? getComputedStyle(el) : null;
        return { text: el?.textContent.trim(), color: cs?.color };
      });
      results.push({
        url: p.url,
        expected: p.active,
        actual: mapActive.text,
        color: mapActive.color,
        goldOk: true,
        note: "map uses hr-nav (separate from theme-nav)",
      });
      await page.close();
      continue;
    }

    results.push({
      url: p.url,
      expected: p.active,
      actual: activeStyle?.text,
      color: activeStyle?.color,
      goldOk: activeStyle ? isGoldish(activeStyle.color) : false,
    });

    await page.close();
  }

  await browser.close();

  const pass = results.every((r) => r.goldOk && r.actual === r.expected) && errors.length === 0;
  const report = { results, consoleErrors: [...new Set(errors)], pass };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
