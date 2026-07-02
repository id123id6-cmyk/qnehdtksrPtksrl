/**
 * about.html 검증
 * 실행: node scripts/test-about-page.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:8765";

async function main() {
  const headBefore = readFileSync("about.html", "utf8").split("</head>")[0];
  const errors = [];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/about.html`, { waitUntil: "domcontentloaded" });

  const charCount = await page.evaluate(() => {
    const main = document.querySelector("main");
    return main?.innerText?.replace(/\s+/g, " ").trim().length || 0;
  });

  const checks = await page.evaluate(() => ({
    hero: document.querySelector(".about-hero h1")?.textContent?.includes("승박"),
    profile: !!document.querySelector('img[src="/images/about/wizard-profile.png"]'),
    profileAlt: document.querySelector('img[src="/images/about/wizard-profile.png"]')?.getAttribute("alt"),
    mailto: document.querySelector('a[href="mailto:id123id6@gmail.com"]') !== null,
    insta: document.querySelector('a[href="https://www.instagram.com/seungbak.tools/"]')?.getAttribute("target") === "_blank",
    ctaTools: !!document.querySelector('.about-cta-row a[href="/tools/"]'),
    ctaBlog: !!document.querySelector('.about-cta-row a[href="/blog/"]'),
    ctaContact: !!document.querySelector('.about-cta-row a[href="/contact.html"]'),
    imgOk: (() => {
      const img = document.querySelector('img[src="/images/about/wizard-profile.png"]');
      return img?.complete && img.naturalWidth > 0;
    })(),
  }));

  await browser.close();

  const headScriptsOk =
    headBefore.includes("G-Y7SC73P9JW") &&
    headBefore.includes("xbdrgqw1pj") &&
    headBefore.includes("ca-pub-8232968272801958");

  const pass =
    charCount >= 2500 &&
    charCount <= 3500 &&
    checks.hero &&
    checks.profile &&
    checks.profileAlt &&
    checks.mailto &&
    checks.insta &&
    checks.ctaTools &&
    checks.ctaBlog &&
    checks.ctaContact &&
    checks.imgOk &&
    headScriptsOk &&
    errors.length === 0;

  console.log(JSON.stringify({ charCount, checks, headScriptsOk, errors, pass }, null, 2));
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
