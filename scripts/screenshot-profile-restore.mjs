import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";

const OUT = path.join("screenshots", "profile-restore");
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:8765";

async function checkPage(page, url, selector) {
  const errors = [];
  const failed = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() === 404) failed.push(r.url());
  });

  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 60000 });
  const imgLocator = page.locator(selector).first();
  await imgLocator.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    (sel) => {
      const img = document.querySelector(sel);
      return img && img.complete && img.naturalWidth > 0;
    },
    selector,
    { timeout: 20000 }
  );

  const info = await page.evaluate((sel) => {
    const img = document.querySelector(sel);
    if (!img) return null;
    const cs = getComputedStyle(img);
    const rect = img.getBoundingClientRect();
    return {
      src: img.getAttribute("src"),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      borderRadius: cs.borderRadius,
      display: cs.display,
    };
  }, selector);

  return { info, errors, failed };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = { errors: [], failed: [], pages: {} };

  // Desktop post-30 author box
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const r = await checkPage(page, "/blog/post-30.html", ".post-author-avatar");
    results.pages.post30 = r.info;
    results.errors.push(...r.errors);
    results.failed.push(...r.failed);
    await page.locator(".post-author-box").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, "post-30-author-box.png") });
    await page.close();
  }

  // Desktop post-1 quick check
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const r = await checkPage(page, "/blog/post-1.html", ".post-author-avatar");
    results.pages.post1 = r.info;
    results.errors.push(...r.errors);
    results.failed.push(...r.failed);
    await page.close();
  }

  // about.html hero profile
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const r = await checkPage(
      page,
      "/about.html",
      '.theme-about-hero img[src*="profile.png"]'
    );
    results.pages.about = r.info;
    results.errors.push(...r.errors);
    results.failed.push(...r.failed);
    await page.screenshot({ path: path.join(OUT, "about-hero-profile.png") });
    await page.close();
  }

  // Mobile post-1 author box
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    const r = await checkPage(page, "/blog/post-1.html", ".post-author-avatar");
    results.pages.post1mobile = r.info;
    results.errors.push(...r.errors);
    results.failed.push(...r.failed);
    const box = page.locator(".post-author-box");
    await box.scrollIntoViewIfNeeded();
    await box.screenshot({ path: path.join(OUT, "post-1-author-mobile.png") });
    await page.close();
  }

  await browser.close();
  results.errors = [...new Set(results.errors)];
  results.failed = [...new Set(results.failed)];
  console.log(JSON.stringify(results, null, 2));
}

run();
