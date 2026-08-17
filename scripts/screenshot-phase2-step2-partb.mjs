/**
 * Phase 2 STEP 2 PART B — 스크린샷 3장
 */
import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";

const OUT = path.join("screenshots", "phase2-step2-partb");
mkdirSync(OUT, { recursive: true });

const shots = [
  { url: "http://localhost:8765/blog/", file: "blog-index.png", fullPage: false },
  { url: "http://localhost:8765/blog/post-28.html", file: "post-28-top.png", fullPage: true },
  { url: "http://localhost:8765/blog/post-21.html", file: "post-21-top.png", fullPage: true },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

for (const s of shots) {
  await page.goto(s.url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(800);
  if (s.url.endsWith("/blog/")) {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  const outPath = path.join(OUT, s.file);
  await page.screenshot({ path: outPath, fullPage: s.fullPage });
  console.log("saved:", outPath);
}

await browser.close();
