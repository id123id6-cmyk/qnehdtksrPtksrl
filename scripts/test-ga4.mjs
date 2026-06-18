/**
 * GA4 collect 요청 전송 확인
 */
import { chromium } from "playwright";

const URL = "http://localhost:8765/";
const GA_ID = "G-Y7SC73P9JW";

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
const gaRequests = [];

page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(err.message));
page.on("request", (req) => {
  const u = req.url();
  if (u.includes("googletagmanager.com/gtag/js") || u.includes("google-analytics.com") || (u.includes("/g/collect") && u.includes(GA_ID))) {
    gaRequests.push(u);
  }
});

await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2000);

const hasGtagScript = await page.evaluate(() => typeof window.gtag === "function");
const hasDataLayer = await page.evaluate(() => Array.isArray(window.dataLayer));

await browser.close();

console.log(JSON.stringify({
  hasGtagScript,
  hasDataLayer,
  gaRequestCount: gaRequests.length,
  sampleRequests: gaRequests.slice(0, 3),
  consoleErrors: errors,
}, null, 2));

if (!hasGtagScript || gaRequests.length === 0 || errors.length) {
  process.exit(1);
}
