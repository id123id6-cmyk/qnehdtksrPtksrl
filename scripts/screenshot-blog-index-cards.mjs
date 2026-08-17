import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";

const OUT = path.join("screenshots", "phase2-step2-partb");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto("http://localhost:8765/blog/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.locator('a[href="post-28.html"] .blog-card-title').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, "blog-index-cards.png"), fullPage: false });
console.log("saved blog-index-cards.png");
await browser.close();
