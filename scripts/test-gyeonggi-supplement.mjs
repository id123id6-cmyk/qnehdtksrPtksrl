/**
 * 신규 경기 구역 지도 표시 검증
 * node scripts/test-gyeonggi-supplement.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "gyeonggi-supplement");
const MAP_URL = "http://localhost:8765/tools/realestate-map/";

mkdirSync(OUT, { recursive: true });

async function selectDistrict(page, code) {
  await page.evaluate(async (lawdCode) => {
    const sidoEl = document.getElementById("selectedSido");
    if (sidoEl && !sidoEl.textContent.includes("경기")) {
      document.getElementById("sidoDropdownMenu").hidden = false;
      document.querySelector('[data-sido="gyeonggi"]')?.click();
    }
    await window.RealEstateMap?.selectDistrict?.(lawdCode);
  }, code);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(MAP_URL, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#sidoDropdownBtn", { timeout: 60000 });

const results = [];

for (const { code, slug, name } of [
  { code: "41480", slug: "paju", name: "파주시" },
  { code: "41500", slug: "icheon", name: "이천시" },
  { code: "41590", slug: "hwaseong", name: "화성시" },
]) {
  await page.goto(MAP_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#sidoDropdownBtn", { timeout: 60000 });
  await selectDistrict(page, code);
  await page.waitForFunction(
    () => {
      const loading = document.getElementById("map-loading");
      return !loading || loading.hidden;
    },
    { timeout: 30000 }
  );
  await page.waitForTimeout(2500);

  const info = await page.evaluate(() => ({
    gu: document.getElementById("selectedGu")?.textContent?.trim(),
    aptCount: document.querySelector("[data-apt-count]")?.textContent?.trim(),
    listItems: document.querySelectorAll(".apt-list-item, .transaction-item, .sidebar-list li").length,
    bodySnippet: document.querySelector(".sidebar-content")?.innerText?.slice(0, 300) || "",
  }));

  await page.screenshot({ path: path.join(OUT, `${slug}-desktop.png`) });
  results.push({ code, name, info });
}

await browser.close();
console.log(JSON.stringify({ results, errors, screenshots: OUT }, null, 2));
if (errors.length) process.exit(1);
