import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";

const OUT = path.join("screenshots", "phase2-theme-severance");
mkdirSync(OUT, { recursive: true });
const URL = "http://localhost:8765/tools/severance-calculator/";

async function run() {
  const errors = [];
  const browser = await chromium.launch({ headless: true });

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  desktop.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  desktop.on("pageerror", (e) => errors.push(e.message));

  await desktop.goto(URL, { waitUntil: "networkidle", timeout: 60000 });

  const checks = await desktop.evaluate(() => {
    const hero = document.querySelector(".hero");
    const cs = hero ? getComputedStyle(hero) : null;
    return {
      bodyClass: document.body.className,
      hasThemeNav: !!document.querySelector(".theme-nav"),
      logo: document.querySelector(".theme-nav-logo")?.textContent?.trim(),
      navItems: [...document.querySelectorAll(".theme-nav-item")].map((a) => a.textContent?.trim()),
      heroBg: cs ? cs.backgroundColor : null,
      guideToggle: !!document.getElementById("guide-toggle"),
    };
  });

  await desktop.screenshot({ path: path.join(OUT, "hero-dark.png") });
  await desktop.screenshot({ path: path.join(OUT, "full-page.png"), fullPage: true });

  await desktop.click("#guide-toggle");
  await desktop.waitForTimeout(300);
  const guideOpen = await desktop.evaluate(
    () => document.getElementById("guide-toggle")?.getAttribute("aria-expanded") === "true"
  );
  await desktop.click("#guide-toggle");

  await desktop.fill("#join-date", "2019-03-01");
  await desktop.fill("#salary-1", "350");
  await desktop.fill("#salary-2", "350");
  await desktop.fill("#salary-3", "350");
  await desktop.click("#calculate-btn");
  await desktop.waitForTimeout(600);
  const severance = await desktop.evaluate(
    () => document.getElementById("result-severance")?.textContent
  );

  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  mobile.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await mobile.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  const mobileOk = await mobile.evaluate(() => ({
    nav: !!document.querySelector(".theme-nav"),
    hero: !!document.querySelector(".hero"),
  }));
  await mobile.close();
  await desktop.close();
  await browser.close();

  console.log(
    JSON.stringify(
      { checks, guideOpen, severance, mobileOk, errors: [...new Set(errors)] },
      null,
      2
    )
  );
}

run();
