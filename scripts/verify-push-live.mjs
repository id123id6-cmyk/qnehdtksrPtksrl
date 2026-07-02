import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "screenshots/push-verify-f4bb2a4";
mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const errors = [];
  const results = {};

  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`map: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`map: ${e.message}`));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("https://seungbak.com/tools/realestate-map/", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page
    .waitForFunction(() => window.searchIndexReady === true, { timeout: 120000 })
    .catch(() => {});

  await page.evaluate(() => window.RealEstateMap?.selectDistrict?.("41220"));
  await page.waitForTimeout(10000);
  await page.evaluate(() => {
    const apt = (window.RealEstateMap?.getDistrictCache?.()["41220"] || []).find(
      (a) => a.name?.includes("금호어울림") && a.name?.includes("고덕")
    );
    if (apt) window.RealEstateMap?.selectApartment?.(apt);
  });
  await page
    .waitForSelector("#sidebar-area-tabs .sidebar-area-tab", { timeout: 40000 })
    .catch(() => {});

  results.geumho = await page.evaluate(() => ({
    tabs: [...document.querySelectorAll("#sidebar-area-tabs .sidebar-area-tab")].map(
      (t) => t.textContent.trim()
    ),
    marker: (() => {
      const apt = (window.RealEstateMap?.getDistrictCache?.()["41220"] || []).find(
        (a) => a.name?.includes("금호어울림")
      );
      return window.RealEstateMapMarker?.getMarkerLabel?.(apt, 5) || "";
    })(),
  }));
  await page.screenshot({ path: `${OUT}/map-geumho-desktop.png` });

  await page.evaluate(() => window.RealEstateMap?.selectDistrict?.("11710"));
  await page.waitForTimeout(10000);
  await page.evaluate(() => {
    const apt = (window.RealEstateMap?.getDistrictCache?.()["11710"] || []).find(
      (a) => a.name === "잠실엘스"
    );
    if (apt) window.RealEstateMap?.selectApartment?.(apt);
  });
  await page
    .waitForSelector("#sidebar-area-tabs .sidebar-area-tab", { timeout: 40000 })
    .catch(() => {});

  results.jamsil = await page.evaluate(() =>
    [...document.querySelectorAll("#sidebar-area-tabs .sidebar-area-tab")].map((t) =>
      t.textContent.trim()
    )
  );
  await page.screenshot({ path: `${OUT}/map-jamsil-desktop.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("https://seungbak.com/tools/realestate-map/", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/map-mobile.png` });
  await page.close();

  const blog = await browser.newPage();
  blog.on("console", (m) => {
    if (m.type() === "error") errors.push(`blog18: ${m.text()}`);
  });
  await blog.setViewportSize({ width: 1440, height: 900 });
  await blog.goto("https://seungbak.com/blog/post-18.html", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await blog.waitForSelector("h1");
  await blog.evaluate(async () => {
    for (const img of document.querySelectorAll(".post-article img")) {
      img.scrollIntoView();
      await new Promise((r) => setTimeout(r, 80));
    }
  });
  results.blog18 = await blog.evaluate(() => ({
    title: document.title,
    images: document.querySelectorAll(".post-article img").length,
    imgsOk: [...document.querySelectorAll(".post-article img")].every(
      (i) => i.complete && i.naturalWidth > 0
    ),
  }));
  await blog.screenshot({ path: `${OUT}/blog-post18-desktop.png` });
  await blog.setViewportSize({ width: 390, height: 844 });
  await blog.screenshot({ path: `${OUT}/blog-post18-mobile.png` });
  await blog.close();

  const index = await browser.newPage();
  await index.goto("https://seungbak.com/blog/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  results.blogIndex = await index.evaluate(() => ({
    first: document.querySelector("#blog-grid a.blog-card")?.getAttribute("href"),
    has18: !!document.querySelector('a[href="post-18.html"]'),
  }));
  await index.screenshot({ path: `${OUT}/blog-index-desktop.png` });
  await index.close();

  await browser.close();

  console.log(
    JSON.stringify(
      { commit: "f4bb2a4", files: 31, results, errors, screenshots: OUT },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
