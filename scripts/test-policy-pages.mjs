/**
 * 정책 페이지 본문 스타일 검증 + 스크린샷
 * node scripts/test-policy-pages.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "screenshots", "policy-pages");
const BASE = "http://localhost:8765";

const PAGES = [
  { slug: "about", url: "/about.html" },
  { slug: "contact", url: "/contact.html" },
  { slug: "privacy", url: "/privacy.html" },
  { slug: "disclaimer", url: "/disclaimer.html" },
  { slug: "terms", url: "/terms.html" },
];

const BLUE = [
  "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe", "#eff6ff",
  "#e0f2fe", "#bae6fd", "#7c3aed", "#4338ca", "rgb(37, 99, 235)", "rgb(59, 130, 246)",
];

mkdirSync(OUT, { recursive: true });

function grepBlue() {
  const hits = [];
  for (const pat of BLUE) {
    try {
      const out = execSync(
        `rg -n -i "${pat.replace(/[()]/g, "\\$&")}" about.html contact.html privacy.html disclaimer.html terms.html`,
        { cwd: ROOT, encoding: "utf8" }
      ).trim();
      if (out) hits.push({ pattern: pat, lines: out });
    } catch { /* none */ }
  }
  return hits;
}

function headScriptsOk(html) {
  return html.includes("G-Y7SC73P9JW") && html.includes("xbdrgqw1pj") && html.includes("adsbygoogle");
}

async function main() {
  const errors = [];
  const results = [];
  const browser = await chromium.launch();

  for (const p of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on("console", (m) => { if (m.type() === "error") pageErrors.push(m.text()); });
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto(`${BASE}${p.url}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".theme-prose, .theme-page-container", { timeout: 20000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `${p.slug}.png`), fullPage: true });

    const styles = await page.evaluate(() => {
      const h1 = document.querySelector(".theme-h1");
      const prose = document.querySelector(".theme-prose p");
      return {
        h1Color: h1 ? getComputedStyle(h1).color : null,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        proseSize: prose ? getComputedStyle(prose).fontSize : null,
        hasPolicyClass: document.body.classList.contains("theme-policy-page"),
      };
    });

    const html = readFileSync(path.join(ROOT, p.url.replace(/^\//, "")), "utf8");
    const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";

    results.push({
      page: p.url,
      blueRemoved: true,
      styled: styles.hasPolicyClass && styles.proseSize === "15px",
      consoleErrors: [...new Set(pageErrors)],
      headOk: headScriptsOk(head),
      styles,
    });
    errors.push(...pageErrors.map((e) => `[${p.slug}] ${e}`));
    await page.close();
  }

  await browser.close();

  const blueHits = grepBlue();
  const cssLines = readFileSync(path.join(ROOT, "css/global-theme.css"), "utf8").split(/\r?\n/).length;
  const report = {
    results,
    blueGrepHits: blueHits,
    blueRemaining: blueHits.length,
    globalThemeCssLines: cssLines,
    totalConsoleErrors: [...new Set(errors)].length,
    pass: results.every((r) => r.consoleErrors.length === 0 && r.headOk && r.styled) && blueHits.length === 0,
  };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
