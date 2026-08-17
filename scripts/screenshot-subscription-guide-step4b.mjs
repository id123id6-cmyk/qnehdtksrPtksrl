import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";

const OUT = path.join("screenshots", "phase2-step4b-subscription");
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:8765/tools/subscription-calculator/";

async function run() {
  const errors = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });

  const hero = await page.evaluate(() => ({
    ctaCount: document.querySelectorAll(".hero-cta .hero-cta-btn").length,
    calcHref: document.querySelector('.hero-cta a[href="#calculator"]')?.textContent?.trim(),
    guideHref: document.querySelector('.hero-cta a[href="#guide"]')?.textContent?.trim(),
    toggleExists: !!document.getElementById("guide-toggle"),
    guideHidden: document.getElementById("guide-content")?.hidden,
  }));

  await page.screenshot({ path: path.join(OUT, "hero.png"), fullPage: false });

  await page.click("#guide-toggle");
  await page.waitForTimeout(400);
  const guideOpen = await page.evaluate(() => ({
    expanded: document.getElementById("guide-toggle")?.getAttribute("aria-expanded"),
    hidden: document.getElementById("guide-content")?.hidden,
    stepCount: document.querySelectorAll(".guide-step").length,
  }));
  await page.screenshot({ path: path.join(OUT, "guide-open.png"), fullPage: false });

  await page.click("#guide-toggle");
  await page.waitForTimeout(200);

  await page.fill("#birth-date", "1990-05-15");
  await page.waitForTimeout(300);
  const calc = await page.evaluate(() => ({
    totalScore: document.getElementById("total-score")?.textContent,
    homelessPreview: document.getElementById("homeless-preview")?.textContent,
  }));

  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  mobile.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await mobile.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  const mobileOk = await mobile.evaluate(() => ({
    ctaCount: document.querySelectorAll(".hero-cta .hero-cta-btn").length,
    toggleVisible: !!document.getElementById("guide-toggle"),
  }));
  await mobile.close();
  await browser.close();

  console.log(
    JSON.stringify(
      { hero, guideOpen, calc, mobileOk, errors: [...new Set(errors)] },
      null,
      2
    )
  );
}

run();
