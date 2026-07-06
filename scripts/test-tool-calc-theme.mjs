/**
 * 도구 페이지 스타일 + 계산 검증 + 스크린샷
 * node scripts/test-tool-calc-theme.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "screenshots", "tool-calc-theme");
const BASE = "http://localhost:8765";

const BLUE = [
  "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe", "#eff6ff",
  "#e0f2fe", "#bae6fd", "#7c3aed", "rgb(37, 99, 235)", "rgb(59, 130, 246)",
];

const TOOLS = [
  "subscription-calculator",
  "salary-calculator",
  "apt-calculator",
  "income-calculator",
  "dday-calculator",
];

mkdirSync(OUT, { recursive: true });

function grepBlue() {
  const hits = [];
  for (const tool of TOOLS) {
    for (const pat of BLUE) {
      try {
        const out = execSync(
          `rg -n -i "${pat.replace(/[()]/g, "\\$&")}" tools/${tool}`,
          { cwd: ROOT, encoding: "utf8" }
        ).trim();
        if (out) hits.push({ tool, pattern: pat, lines: out });
      } catch { /* none */ }
    }
  }
  return hits;
}

function headOk(html) {
  return html.includes("G-Y7SC73P9JW") && html.includes("xbdrgqw1pj") && html.includes("adsbygoogle");
}

async function main() {
  const errors = [];
  const results = [];
  const browser = await chromium.launch();
  const linesBefore = 882;
  const linesAfter = readFileSync(path.join(ROOT, "css/global-theme.css"), "utf8").split(/\r?\n/).length;

  const tests = [
    {
      slug: "subscription-calculator",
      url: "/tools/subscription-calculator/",
      async run(page) {
        await page.fill("#birth-date", "1990-01-15");
        await page.fill("#children", "3");
        await page.fill("#subscription-join", "2015-06-01");
        await page.waitForTimeout(800);
        const score = await page.textContent("#total-score");
        return score && score.trim() !== "00" && score.trim() !== "0";
      },
    },
    {
      slug: "income-calculator",
      url: "/tools/income-calculator/",
      async run(page) {
        await page.fill("#salary", "5000");
        await page.click("#calculate-btn");
        await page.waitForTimeout(500);
        const monthly = await page.textContent("#monthly-net");
        const visible = await page.evaluate(() => {
          const box = document.getElementById("result-box");
          return box && box.style.display !== "none" && box.offsetParent !== null;
        });
        return visible && monthly && !monthly.includes("0") && monthly.length > 2;
      },
    },
    {
      slug: "salary-calculator",
      url: "/tools/salary-calculator/",
      async run(page) {
        await page.fill("#targetPrice", "50000");
        await page.waitForTimeout(300);
        await page.click("#reverseCalculateBtn");
        await page.waitForTimeout(800);
        const visible = await page.evaluate(
          () => document.getElementById("reverse-result-section")?.classList.contains("visible")
        );
        const text = await page.textContent("#reverse-result-section");
        return visible && text && text.length > 20;
      },
    },
    {
      slug: "apt-calculator",
      url: "/tools/apt-calculator/",
      async run(page) {
        await page.fill("#annualIncome", "8000");
        await page.fill("#cash", "20000");
        await page.waitForTimeout(400);
        const enabled = await page.isEnabled("#calculate-btn");
        if (!enabled) return false;
        await page.click("#calculate-btn");
        await page.waitForTimeout(1000);
        const visible = await page.evaluate(
          () => document.getElementById("result-section")?.classList.contains("visible")
        );
        const price = await page.textContent("#max-price-text");
        return visible && price && price !== "-";
      },
    },
    {
      slug: "dday-calculator",
      url: "/tools/dday-calculator/",
      async run(page) {
        await page.fill("#target-price", "800000");
        await page.fill("#current-assets", "50000");
        await page.fill("#monthly-save", "300");
        await page.click("#calc-btn");
        await page.waitForTimeout(800);
        const duration = await page.textContent("#result-duration");
        const hidden = await page.evaluate(() => document.getElementById("result-card")?.hidden);
        return !hidden && duration && duration.trim().length > 1;
      },
    },
  ];

  for (const t of tests) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on("console", (m) => { if (m.type() === "error") pageErrors.push(m.text()); });
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto(`${BASE}${t.url}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector(".theme-tool-page, body.theme-tool-page", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `${t.slug}-initial.png`), fullPage: true });

    let calcOk = false;
    try {
      calcOk = await t.run(page);
    } catch (e) {
      pageErrors.push(String(e));
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `${t.slug}-result.png`), fullPage: true });

    const html = readFileSync(path.join(ROOT, "tools", t.slug, "index.html"), "utf8");
    const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";

    results.push({
      page: t.url,
      styled: html.includes("theme-tool-page") && html.includes("global-theme.css"),
      calcOk,
      consoleErrors: [...new Set(pageErrors)],
      headOk: headOk(head),
    });
    errors.push(...pageErrors.map((e) => `[${t.slug}] ${e}`));
    await page.close();
  }

  await browser.close();

  const blueHits = grepBlue();
  const report = {
    results,
    blueGrepHits: blueHits,
    blueRemaining: blueHits.length,
    globalThemeCssLines: { before: linesBefore, after: linesAfter, added: linesAfter - linesBefore },
    totalConsoleErrors: [...new Set(errors)].length,
    consoleErrors: [...new Set(errors)],
    pass:
      results.every((r) => r.styled && r.calcOk && r.consoleErrors.length === 0 && r.headOk) &&
      blueHits.length === 0,
  };
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
