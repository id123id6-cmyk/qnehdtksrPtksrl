/**
 * 모바일 드롭다운 재현 테스트
 */
import { chromium, devices } from "playwright";

const BASE = "http://localhost:8765/tools/realestate-map/";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices["iPhone 13"],
  locale: "ko-KR",
});
const page = await ctx.newPage();

page.on("console", (m) => {
  if (m.type() === "error") console.log("ERR:", m.text());
});

await page.addInitScript(() => {
  localStorage.setItem("seungbak_map_help_dismissed", "1");
  localStorage.setItem("seungbak_map_visited", "1");
});

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction(() => document.getElementById("guDropdownBtn"), { timeout: 60000 });
await page.waitForTimeout(2000);

const before = await page.evaluate(() => {
  const nativeGu = document.getElementById("nativeGuSelect");
  const customBtn = document.getElementById("guDropdownBtn");
  return {
    hasNative: !!nativeGu,
    hasCustom: !!customBtn && getComputedStyle(customBtn.closest(".region-custom-desktop")).display === "none",
    guLabel: document.getElementById("selectedGu")?.textContent,
    nativeOptions: nativeGu?.options?.length || 0,
  };
});
console.log("before:", before);

if (before.hasNative) {
  await page.selectOption("#nativeGuSelect", { index: 1 });
  await page.waitForTimeout(3000);
  const afterNative = await page.evaluate(() => ({
    gu: document.getElementById("selectedGu")?.textContent,
    nativeVal: document.getElementById("nativeGuSelect")?.value,
    code: window.RealEstateMap?.getSigunguCode?.(),
  }));
  console.log("after native select:", afterNative);
} else {
  await page.tap("#guDropdownBtn");
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector("#guDropdownMenu [data-sigungu]")?.click());
  await page.waitForTimeout(2000);
}

await browser.close();
