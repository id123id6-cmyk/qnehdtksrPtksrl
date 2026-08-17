import { chromium } from "playwright";

const URL = "http://localhost:8765/blog/post-33.html";
const errors = [];
const browser = await chromium.launch({ headless: true });

for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
  const page = await browser.newPage({ viewport });
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(400);
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ errors: [...new Set(errors)] }, null, 2));
