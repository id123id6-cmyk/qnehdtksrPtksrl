import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

console.log("=== 1) 지도 로드 ===");
await page.goto("http://localhost:8765/tools/realestate-map/", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForFunction(
  () => document.getElementById("marker-count")?.textContent?.includes("741"),
  { timeout: 45000 }
);

console.log("=== 2) 신현대11차 검색·선택 ===");
await page.fill("#search-input", "신현대11");
await page.waitForTimeout(500);
await page.click(".search-result-item");
await page.waitForTimeout(2000);

const sidebar = await page.textContent("#sidebar-content");
console.log("사이드바:", sidebar?.slice(0, 120));

const ddayDisabled = await page.isDisabled("#dday-btn");
console.log("D-day 버튼 disabled:", ddayDisabled);

console.log("=== 3) D-day 계산기 이동 ===");
await page.click("#dday-btn");
await page.waitForURL(/dday-calculator/, { timeout: 15000 });

const url = page.url();
console.log("URL:", url);

const targetPrice = await page.inputValue("#target-price");
const aptTitle = await page.textContent("#apt-title");
console.log("단지명:", aptTitle?.trim());
console.log("목표금액:", targetPrice);

console.log("=== 4) 계산 실행 ===");
await page.fill("#current-assets", "5000");
await page.fill("#monthly-save", "200");
await page.click("#calc-btn");
await page.waitForTimeout(1000);

const resultVisible = !(await page.isHidden("#result-card"));
const duration = await page.textContent("#result-duration");
console.log("결과 표시:", resultVisible);
console.log("매수 시점:", duration?.trim());

await page.screenshot({ path: "tools/dday-calculator/test-result.png", fullPage: false });

await browser.close();
console.log(resultVisible && !ddayDisabled ? "\n✅ TEST PASS" : "\n❌ TEST FAIL");
process.exit(resultVisible && !ddayDisabled ? 0 : 1);
