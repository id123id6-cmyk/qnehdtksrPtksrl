/**
 * Phase 2 STEP 1 — about/contact/privacy 스크린샷
 */
import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";

const OUT = path.join("screenshots", "phase2-step1");
mkdirSync(OUT, { recursive: true });

const pages = [
  { url: "http://localhost:8765/about.html", file: "about.png" },
  { url: "http://localhost:8765/contact.html", file: "contact.png" },
  { url: "http://localhost:8765/privacy.html", file: "privacy.png" },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

for (const p of pages) {
  await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(800);
  const email = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href^="mailto:"]')];
    return links.map((a) => ({
      href: a.getAttribute("href"),
      text: a.textContent?.trim(),
    }));
  });
  const outPath = path.join(OUT, p.file);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(JSON.stringify({ page: p.file, email, screenshot: outPath }));
}

await browser.close();
