import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:8765/tools";
const pages = [
  {
    slug: "income-calculator",
    out: "phase2-step4b-income",
    calc: async (page) => {
      await page.fill("#salary", "5000");
      await page.click("#calculate-btn");
      await page.waitForTimeout(500);
      return page.evaluate(() => document.getElementById("yearly-net")?.textContent);
    },
  },
  {
    slug: "apt-calculator",
    out: "phase2-step4b-apt",
    calc: async (page) => {
      await page.fill("#annualIncome", "6000");
      await page.fill("#cash", "5000");
      await page.fill("#existingDebt", "0");
      await page.waitForTimeout(300);
      const btn = page.locator("#calculate-btn");
      if (await btn.isEnabled()) await btn.click();
      await page.waitForTimeout(800);
      return page.evaluate(() => document.getElementById("calculate-btn")?.disabled);
    },
  },
  {
    slug: "salary-calculator",
    out: "phase2-step4b-salary",
    calc: async (page) => {
      await page.fill("#targetPrice", "50000");
      await page.fill("#reverseCash", "8000");
      await page.fill("#existingDebt", "0");
      await page.waitForTimeout(300);
      const btn = page.locator("#reverseCalculateBtn");
      if (await btn.isEnabled()) await btn.click();
      await page.waitForTimeout(800);
      return page.evaluate(() => !!document.getElementById("reverse-result-section"));
    },
  },
  {
    slug: "severance-calculator",
    out: "phase2-step4b-severance",
    calc: async (page) => {
      await page.fill("#join-date", "2020-01-01");
      await page.fill("#salary-1", "400");
      await page.fill("#salary-2", "400");
      await page.fill("#salary-3", "400");
      await page.click("#calculate-btn");
      await page.waitForTimeout(500);
      return page.evaluate(() => document.getElementById("result-severance")?.textContent);
    },
  },
];

async function testOne(browser, cfg, mobile = false) {
  const errors = [];
  const outDir = path.join("screenshots", cfg.out);
  mkdirSync(outDir, { recursive: true });
  const page = await browser.newPage({
    viewport: mobile ? { width: 375, height: 812 } : { width: 1280, height: 900 },
  });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${BASE}/${cfg.slug}/`, { waitUntil: "networkidle", timeout: 60000 });

  const hero = await page.evaluate(() => ({
    ctaCount: document.querySelectorAll(".hero-cta .hero-cta-btn").length,
    hasGuideLink: !!document.querySelector('.hero-cta a[href="#guide"]'),
    toggle: !!document.getElementById("guide-toggle"),
    guideHidden: document.getElementById("guide-content")?.hidden,
    ddayCss: [...document.querySelectorAll('link[rel="stylesheet"]')].some((l) =>
      l.href.includes("dday-calculator/style.css")
    ),
  }));

  if (!mobile) await page.screenshot({ path: path.join(outDir, "hero.png") });

  await page.click("#guide-toggle");
  await page.waitForTimeout(400);
  const guideOpen = await page.evaluate(() => ({
    expanded: document.getElementById("guide-toggle")?.getAttribute("aria-expanded"),
    hidden: document.getElementById("guide-content")?.hidden,
    steps: document.querySelectorAll(".guide-step").length,
  }));
  if (!mobile) await page.screenshot({ path: path.join(outDir, "guide-open.png") });

  await page.click("#guide-toggle");
  await page.waitForTimeout(200);

  const calcResult = await cfg.calc(page);

  await page.close();
  return { hero, guideOpen, calcResult, errors: [...new Set(errors)], mobile };
}

const browser = await chromium.launch({ headless: true });
const results = {};
for (const cfg of pages) {
  results[cfg.slug] = {
    desktop: await testOne(browser, cfg, false),
    mobile: await testOne(browser, cfg, true),
  };
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
