import { chromium } from "playwright";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const URL = "http://localhost:8765/blog/post-32.html";
const html = readFileSync("blog/post-32.html", "utf8");
const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
const broken = imgs.filter((src) => {
  const p = src.startsWith("/") ? src.slice(1) : path.join("blog", src);
  return !existsSync(p);
});

const errors = [];
const browser = await chromium.launch({ headless: true });

for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
  const page = await browser.newPage({ viewport });
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ broken, errors: [...new Set(errors)] }, null, 2));
