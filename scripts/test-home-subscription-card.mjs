/**
 * 홈 index.html 청약 가점 카드 검증
 * 실행: node scripts/test-home-subscription-card.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:8765";
const OUT = "screenshots/home-subscription-card";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

  const checks = await page.evaluate(() => ({
    statTools: document.getElementById("stat-tools")?.textContent,
    toolCards: document.querySelectorAll(".tools-grid--other .tool-card").length,
    heroTool: !!document.querySelector('a[href="/tools/realestate-map/"]'),
    card: !!document.querySelector('a[href="/tools/subscription-calculator/"]'),
    cardTitle: document.querySelector('a[href="/tools/subscription-calculator/"] .tool-card-title')?.textContent,
    ga4: typeof gtag !== "undefined",
    headGa: !!document.querySelector('script[src*="googletagmanager.com/gtag/js?id=G-Y7SC73P9JW"]'),
    headAdsense: document.querySelector('meta[name="google-adsense-account"]')?.content,
  }));

  await page.click('a[href="/tools/subscription-calculator/"]');
  await page.waitForURL("**/tools/subscription-calculator/**");
  const navigated = page.url().includes("/tools/subscription-calculator");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: `${OUT}/mobile-home.png`, fullPage: false });

  await browser.close();

  const pass =
    checks.statTools === "7" &&
    checks.toolCards === 6 &&
    checks.heroTool &&
    checks.card &&
    checks.cardTitle?.includes("청약 가점") &&
    checks.headGa &&
    checks.headAdsense === "ca-pub-8232968272801958" &&
    navigated &&
    errors.length === 0;

  console.log(JSON.stringify({ checks, navigated, errors, pass, screenshots: OUT }, null, 2));
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
