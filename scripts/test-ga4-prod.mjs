import { chromium } from "playwright";
const urls = ["https://seungbak.com/", "https://seungbak.com/tools/realestate-map/"];
const browser = await chromium.launch();
for (const url of urls) {
  const page = await browser.newPage();
  const hits = [];
  page.on("request", (r) => {
    if (r.url().includes("G-Y7SC73P9JW") || r.url().includes("google-analytics.com/g/collect")) hits.push(r.url());
  });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    const inHtml = await page.content();
    console.log(url, {
      snippetInHtml: inHtml.includes("G-Y7SC73P9JW"),
      gtag: await page.evaluate(() => typeof window.gtag === "function"),
      requests: hits.length,
    });
  } catch (e) {
    console.log(url, { error: e.message });
  }
  await page.close();
}
await browser.close();
