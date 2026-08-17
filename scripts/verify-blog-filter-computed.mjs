import { chromium } from "playwright";

const URL = "http://localhost:8765/blog/";
const filters = ["all", "side-project", "ai-tools", "side-income", "real-estate"];
const errors = [];

const browser = await chromium.launch({ headless: true });

for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
  const page = await browser.newPage({ viewport });
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${viewport.width}] ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[${viewport.width}] ${e.message}`));

  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });

  const viewportResults = {};
  for (const filter of filters) {
    await page.click(`.filter-btn[data-filter="${filter}"]`);
    await page.waitForTimeout(150);
    viewportResults[filter] = await page.evaluate((f) => {
      const cards = [...document.querySelectorAll("#blog-grid .blog-card")];
      const visible = cards.filter((c) => getComputedStyle(c).display !== "none");
      const byCategory = {};
      visible.forEach((c) => {
        const cat = c.getAttribute("data-category");
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      });
      const sample = cards
        .filter((c) => c.getAttribute("data-category") === f || f === "all")
        .slice(0, 3)
        .map((c) => ({
          href: c.getAttribute("href"),
          category: c.getAttribute("data-category"),
          display: getComputedStyle(c).display,
          hasHidden: c.classList.contains("hidden"),
        }));
      return {
        visibleCount: visible.length,
        byCategory,
        sample: f === "all" ? [] : cards
          .filter((c) => c.getAttribute("data-category") === f)
          .map((c) => ({
            href: c.getAttribute("href"),
            display: getComputedStyle(c).display,
            hasHidden: c.classList.contains("hidden"),
          })),
      };
    }, filter);
  }
  console.log(`\n=== viewport ${viewport.width}px ===`);
  console.log(JSON.stringify(viewportResults, null, 2));
  await page.close();
}

await browser.close();
console.log("\nerrors:", [...new Set(errors)]);
