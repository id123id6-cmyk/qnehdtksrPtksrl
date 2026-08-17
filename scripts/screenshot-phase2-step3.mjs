import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";

const OUT = path.join("screenshots", "phase2-step3");
mkdirSync(OUT, { recursive: true });

const shots = [
  { url: "http://localhost:8765/blog/post-27.html", sel: ".post-original-section", file: "post-27-original.png" },
  { url: "http://localhost:8765/blog/post-30.html", sel: ".post-original-section", file: "post-30-original.png" },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

for (const s of shots) {
  await page.goto(s.url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(s.sel);
  await page.locator(s.sel).scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.locator(s.sel).screenshot({ path: path.join(OUT, s.file) });
  console.log("saved:", s.file);
}

await browser.close();
