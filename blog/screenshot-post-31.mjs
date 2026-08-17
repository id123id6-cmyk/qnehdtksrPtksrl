/**
 * post-31 상단부 스크린샷
 */
import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "screenshots", "post-31");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));

await page.goto("http://localhost:8765/blog/post-31.html", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(OUT, "post-31-top.png"), fullPage: false });
console.log("screenshot:", path.join(OUT, "post-31-top.png"));
console.log("console errors:", errors.length, errors);
await browser.close();
