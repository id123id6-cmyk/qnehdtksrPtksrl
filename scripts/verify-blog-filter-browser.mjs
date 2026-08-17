import { chromium } from "playwright";

const URL = "http://localhost:8765/blog/";
const filters = ["all", "side-project", "ai-tools", "side-income", "real-estate"];
const errors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });

const results = {};
for (const filter of filters) {
  await page.click(`.filter-btn[data-filter="${filter}"]`);
  await page.waitForTimeout(400);
  const count = await page.evaluate(() => {
    return [...document.querySelectorAll("#blog-grid .blog-card")].filter(
      (c) => !c.classList.contains("hidden")
    ).length;
  });
  results[filter] = count;
}

await browser.close();
console.log(JSON.stringify({ results, errors: [...new Set(errors)] }, null, 2));
