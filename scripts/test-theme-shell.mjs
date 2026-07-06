/**
 * global-theme 네비/푸터 적용 검증 + 스크린샷
 * node scripts/test-theme-shell.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "screenshots", "global-theme-shell");
const BASE = "http://localhost:8765";

const PAGES = [
  { slug: "blog", url: "/blog/", active: "블로그" },
  { slug: "subscription-calculator", url: "/tools/subscription-calculator/", active: "도구" },
  { slug: "salary-calculator", url: "/tools/salary-calculator/", active: "도구" },
  { slug: "apt-calculator", url: "/tools/apt-calculator/", active: "도구" },
  { slug: "income-calculator", url: "/tools/income-calculator/", active: "도구" },
  { slug: "dday-calculator", url: "/tools/dday-calculator/", active: "도구" },
  { slug: "about", url: "/about.html", active: "소개" },
  { slug: "contact", url: "/contact.html", active: null },
  { slug: "privacy", url: "/privacy.html", active: null },
  { slug: "disclaimer", url: "/disclaimer.html", active: null },
  { slug: "terms", url: "/terms.html", active: null },
];

mkdirSync(OUT, { recursive: true });

function headScriptsOk(html) {
  return (
    html.includes("G-Y7SC73P9JW") &&
    html.includes("xbdrgqw1pj") &&
    html.includes("adsbygoogle")
  );
}

async function main() {
  const errors = [];
  const results = [];
  const browser = await chromium.launch();

  for (const p of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error") pageErrors.push(m.text());
    });
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto(`${BASE}${p.url}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector(".theme-nav", { timeout: 30000 });
    await page.waitForTimeout(600);

    await page.locator(".theme-nav").screenshot({
      path: path.join(OUT, `${p.slug}-nav.png`),
    });
    await page.locator(".theme-footer").screenshot({
      path: path.join(OUT, `${p.slug}-footer.png`),
    });
    await page.screenshot({
      path: path.join(OUT, `${p.slug}-full.png`),
      fullPage: true,
    });

    const check = await page.evaluate(() => ({
      logo: document.querySelector(".theme-nav-logo")?.textContent?.trim(),
      active: document.querySelector(".theme-nav-item.is-active")?.textContent?.trim() || null,
      hasFooter: !!document.querySelector(".theme-footer-logo"),
      themeCss: !!document.querySelector('link[href*="global-theme.css"]'),
    }));

    const filePath = p.url === "/blog/"
      ? "blog/index.html"
      : p.url.startsWith("/tools/")
        ? `tools${p.url.replace("/tools/", "/").replace(/\/$/, "")}/index.html`
        : p.url.replace(/^\//, "");

    const html = readFileSync(path.join(ROOT, filePath), "utf8");
    const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";

    results.push({
      page: filePath,
      nav: true,
      footer: true,
      active: check.active,
      expectedActive: p.active,
      consoleErrors: [...new Set(pageErrors)],
      headOk: headScriptsOk(head),
    });

    errors.push(...pageErrors.map((e) => `[${p.slug}] ${e}`));
    await page.close();
  }

  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  mobile.on("console", (m) => {
    if (m.type() === "error") errors.push(`[mobile] ${m.text()}`);
  });
  await mobile.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded" });
  await mobile.waitForSelector(".theme-nav");
  await mobile.screenshot({ path: path.join(OUT, "blog-mobile-375.png"), fullPage: true });
  await mobile.close();

  await browser.close();

  const cssLines = readFileSync(path.join(ROOT, "css/global-theme.css"), "utf8").split(/\r?\n/).length;
  const report = {
    results,
    totalConsoleErrors: [...new Set(errors)].length,
    consoleErrors: [...new Set(errors)],
    globalThemeCssLines: cssLines,
    pass: results.every(
      (r) =>
        r.nav &&
        r.footer &&
        r.headOk &&
        r.consoleErrors.length === 0 &&
        (r.expectedActive === null ? r.active === null : r.active === r.expectedActive)
    ),
  };

  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
