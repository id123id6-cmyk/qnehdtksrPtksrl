/**
 * 도구 모음 + 소개 페이지 테마 검증
 * node scripts/test-tools-about-theme.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "screenshots", "tools-about-theme");
const BASE = "http://localhost:8765";
const LINES_BEFORE = 1917;

const BLUE = [
  "#2563eb", "#1d4ed8", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe", "#eff6ff",
  "#e0f2fe", "#bae6fd", "#7c3aed", "#a855f7", "#c084fc", "#667eea", "#764ba2",
  "rgb(37, 99, 235)", "rgb(59, 130, 246)",
];

const PAGES = [
  { path: "/tools/", file: "tools/index.html", bodyClass: "theme-tools-index", navActive: "도구" },
  { path: "/about.html", file: "about.html", bodyClass: "theme-about-page", navActive: "소개" },
];

mkdirSync(OUT, { recursive: true });

function grepBlue(files) {
  const hits = [];
  for (const f of files) {
    for (const pat of BLUE) {
      try {
        const out = execSync(`rg -n -i "${pat.replace(/[()]/g, "\\$&")}" "${f}"`, {
          cwd: ROOT,
          encoding: "utf8",
        }).trim();
        if (out) hits.push({ file: f, pattern: pat, lines: out });
      } catch { /* none */ }
    }
  }
  return hits;
}

function headScriptsOk(html) {
  return html.includes("G-Y7SC73P9JW") && html.includes("xbdrgqw1pj") && html.includes("adsbygoogle");
}

function headAnalyticsDiff(before, after) {
  const strip = (h) => h
    .replace(/<link rel="stylesheet"[^>]*global-theme\.css"[^>]*>\s*/gi, "")
    .replace(/\s+/g, " ");
  return strip(before) === strip(after);
}

async function testPage(browser, url, viewport, screenshotName) {
  const page = await browser.newPage({ viewport });
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, screenshotName), fullPage: true });
  const navActive = await page.locator(".theme-nav-item.is-active").textContent();
  await page.close();
  return { consoleErrors: [...new Set(errs)], navActive: navActive?.trim() };
}

async function main() {
  const browser = await chromium.launch();
  const results = [];

  const toolsDesktop = await testPage(browser, "/tools/", { width: 1440, height: 900 }, "tools-index-desktop.png");
  const toolsMobile = await testPage(browser, "/tools/", { width: 375, height: 812 }, "tools-index-mobile.png");
  const aboutDesktop = await testPage(browser, "/about.html", { width: 1440, height: 900 }, "about-desktop.png");
  const aboutMobile = await testPage(browser, "/about.html", { width: 375, height: 812 }, "about-mobile.png");

  await browser.close();

  const blueHits = grepBlue(["tools/index.html", "about.html"]);
  const linesAfter = readFileSync(path.join(ROOT, "css/global-theme.css"), "utf8").split(/\r?\n/).length;

  for (const p of PAGES) {
    const html = readFileSync(path.join(ROOT, p.file), "utf8");
    results.push({
      file: p.file,
      bodyClass: html.includes(p.bodyClass),
      headScriptsOk: headScriptsOk(html),
      blueInFile: BLUE.some((pat) => html.toLowerCase().includes(pat.toLowerCase())),
      navActive: p.path === "/tools/" ? toolsDesktop.navActive : aboutDesktop.navActive,
    });
  }

  const allErrs = [
    ...toolsDesktop.consoleErrors,
    ...toolsMobile.consoleErrors,
    ...aboutDesktop.consoleErrors,
    ...aboutMobile.consoleErrors,
  ];

  const report = {
    results,
    blueHits,
    blueRemaining: blueHits.length,
    globalThemeCssLines: { before: LINES_BEFORE, after: linesAfter, added: linesAfter - LINES_BEFORE },
    consoleErrors: [...new Set(allErrs)],
    totalConsoleErrors: [...new Set(allErrs)].length,
    navActive: { tools: toolsDesktop.navActive, about: aboutDesktop.navActive },
    pass:
      results.every((r) => r.bodyClass && r.headScriptsOk && !r.blueInFile) &&
      blueHits.length === 0 &&
      [...new Set(allErrs)].length === 0 &&
      toolsDesktop.navActive === "도구" &&
      aboutDesktop.navActive === "소개",
  };

  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
