/**
 * Phase 2 STEP 4-A — 실거래가 지도 설명 섹션 검증
 */
import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";

const OUT = path.join("screenshots", "phase2-step4a");
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:8765/tools/realestate-map/";

const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage();
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.message));

// Desktop: map smoke test
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);

// Close welcome modal if visible
if (await page.locator("#map-empty-state:not([hidden])").count()) {
  await page.evaluate(() => {
    const el = document.getElementById("map-empty-state");
    if (el) el.hidden = true;
    const backdrop = document.getElementById("map-empty-backdrop");
    if (backdrop) backdrop.hidden = true;
  });
  await page.waitForTimeout(300);
}

// Wait for region selector
await page.waitForSelector("#region-selector select, #region-selector button", { timeout: 30000 }).catch(() => {});

// Try selecting 서울 via native select (may be visually hidden on desktop)
const selected = await page.evaluate(() => {
  const sel = document.getElementById("nativeSidoSelect");
  if (!sel) return false;
  const opt = [...sel.options].find((o) => o.textContent?.includes("서울"));
  if (!opt) return false;
  sel.value = opt.value;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
});
if (selected) await page.waitForTimeout(3000);

const markerCount = await page.locator("#marker-count").textContent();
const mapVisible = await page.locator("#map").isVisible();
const sectionVisible = await page.locator(".tool-description").isVisible();

// Screenshot 1: description top (scroll to section)
await page.evaluate(() => {
  document.querySelector(".tool-description")?.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, "description-top.png"), fullPage: false });

// Screenshot 2: FAQ section
await page.evaluate(() => {
  const faq = [...document.querySelectorAll(".tool-description h2")].find((h) =>
    h.textContent?.includes("자주 묻는 질문")
  );
  faq?.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, "description-faq.png"), fullPage: false });

// Mobile screenshot
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2000);
await page.evaluate(() => {
  document.querySelector(".tool-description")?.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, "description-mobile.png"), fullPage: false });

await browser.close();

console.log(
  JSON.stringify(
    {
      mapVisible,
      sectionVisible,
      markerCount: markerCount?.trim(),
      consoleErrors: errors.length,
      errors: errors.slice(0, 10),
      screenshots: OUT,
    },
    null,
    2
  )
);
