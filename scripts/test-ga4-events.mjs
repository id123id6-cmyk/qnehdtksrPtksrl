/**
 * GA4 커스텀 이벤트 collect 요청 확인
 */
import { chromium } from "playwright";

const URL = "http://localhost:8765/tools/realestate-map/";
const GA_ID = "G-Y7SC73P9JW";

function parseCollectEvents(urls) {
  const events = [];
  for (const raw of urls) {
    const matches = raw.match(/[?&]en=([^&]+)/g) || [];
    for (const m of matches) {
      events.push(decodeURIComponent(m.split("=")[1]));
    }
  }
  return events;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const collectUrls = [];
const errors = [];

page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (r.url().includes("google-analytics.com/g/collect")) collectUrls.push(r.url());
});

await page.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForFunction(
  () => document.getElementById("marker-count")?.textContent?.includes("개"),
  { timeout: 120000 }
);

await page.evaluate(() => {
  window.__gaEvents = [];
  const orig = window.gtag;
  if (typeof orig === "function") {
    window.gtag = function (...args) {
      if (args[0] === "event") {
        window.__gaEvents.push({ name: args[1], params: args[2] || {} });
      }
      return orig.apply(this, args);
    };
  }
});

collectUrls.length = 0;

// 1. 필터 변경
await page.evaluate(() => {
  document.getElementById("filter-btn-price")?.click();
  document.querySelector('[data-filter-type="price"][data-filter-value="under5"]')?.click();
});
await page.waitForTimeout(1500);

// 2. 동 선택
await page.evaluate(() => {
  document.getElementById("dongDropdownBtn")?.click();
});
await page.waitForTimeout(200);
await page.evaluate(() => {
  document.querySelector('.dong-item[data-dong="역삼동"]')?.click();
});
await page.waitForTimeout(1500);

// 3. 마커 클릭 (검색)
await page.fill("#search-input", "래미안");
await page.waitForTimeout(600);
await page.evaluate(() => {
  document.querySelector(".search-result-item")?.click();
});
await page.waitForTimeout(3000);

// 4. 매매/전세 토글
await page.evaluate(() => {
  document.querySelector('.deal-tab[data-deal="전세"]')?.click();
});
await page.waitForTimeout(2500);

const events = parseCollectEvents(collectUrls);
const unique = [...new Set(events)];
const gaSpy = await page.evaluate(() => window.__gaEvents || []);
const spyNames = gaSpy.map((e) => e.name);

const checks = {
  marker_click: spyNames.includes("marker_click") || events.includes("marker_click"),
  dong_select: spyNames.includes("dong_select") || events.includes("dong_select"),
  filter_change: spyNames.includes("filter_change") || events.includes("filter_change"),
  deal_type_toggle: spyNames.includes("deal_type_toggle") || events.includes("deal_type_toggle"),
  consoleErrors: errors.length,
};

console.log(JSON.stringify({ checks, uniqueEvents: unique, gaSpy, totalCollect: collectUrls.length, errors }, null, 2));

await browser.close();

if (Object.values(checks).some((v, i) => i < 4 && v === false) || errors.length) {
  process.exit(1);
}
