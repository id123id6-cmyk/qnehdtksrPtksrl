/**
 * 블로그 테마 검증 + 스크린샷
 * node scripts/test-blog-theme.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "screenshots", "blog-theme");
const BASELINE_DIR = path.join(ROOT, "scripts", "blog-text-baselines");
const BASE = "http://localhost:8765";
const LINES_BEFORE = 1328;

const BLUE_PATTERNS = [
  "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe", "#eff6ff",
  "#e0f2fe", "#bae6fd", "#7c3aed", "#a855f7", "#c084fc", "#1d4ed8",
  "#1e40af", "#1e3a8a", "#bfdbfe", "#6d28d9", "rgb(37, 99, 235)", "rgb(59, 130, 246)",
];

mkdirSync(OUT, { recursive: true });

function grepBlueInBlog() {
  const hits = [];
  for (const pat of BLUE_PATTERNS) {
    try {
      const out = execSync(`rg -n -i "${pat.replace(/[()]/g, "\\$&")}" blog/`, {
        cwd: ROOT,
        encoding: "utf8",
      }).trim();
      if (out) hits.push({ pattern: pat, lines: out });
    } catch { /* none */ }
  }
  return hits;
}

function headScriptsOk(html) {
  return html.includes("G-Y7SC73P9JW") && html.includes("xbdrgqw1pj") && html.includes("adsbygoogle");
}

function seoTagsHash(html) {
  const tags = [];
  const re = /<(?:title|meta|link rel="canonical"|script type="application\/ld\+json")[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) tags.push(m[0]);
  return tags.join("\n");
}

function stripArticleTextFromHtml(html) {
  const m = html.match(/<article[^>]*class="[^"]*post-article[^"]*"[^>]*>([\s\S]*?)<\/article>/i);
  if (!m) return "";
  return m[1]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const browser = await chromium.launch();
  const postResults = [];
  const consoleErrors = [];

  // blog index
  const indexPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const indexErrs = [];
  indexPage.on("console", (m) => { if (m.type() === "error") indexErrs.push(m.text()); });
  indexPage.on("pageerror", (e) => indexErrs.push(e.message));
  await indexPage.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await indexPage.waitForTimeout(800);
  const cardCount = await indexPage.locator(".blog-card").count();
  await indexPage.screenshot({ path: path.join(OUT, "index-desktop.png"), fullPage: true });

  const mobilePage = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await mobilePage.goto(`${BASE}/blog/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: path.join(OUT, "index-mobile.png"), fullPage: true });
  await mobilePage.close();

  const indexHtml = readFileSync(path.join(ROOT, "blog", "index.html"), "utf8");
  const indexResult = {
    file: "blog/index.html",
    styled: indexHtml.includes("theme-blog-page"),
    cardsOk: cardCount >= 3,
    consoleErrors: [...new Set(indexErrs)],
    headOk: headScriptsOk(indexHtml),
  };
  consoleErrors.push(...indexErrs.map((e) => `[index] ${e}`));
  await indexPage.close();

  const screenshotPosts = [
    { n: 1, name: "post-1-desktop.png" },
    { n: 15, name: "post-15-desktop.png" },
    { n: 30, name: "post-30-desktop.png" },
  ];

  for (let n = 1; n <= 30; n++) {
    const file = `post-${n}.html`;
    const fp = path.join(ROOT, "blog", file);
    const html = readFileSync(fp, "utf8");
    const seoBefore = seoTagsHash(html);

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    page.on("pageerror", (e) => errs.push(e.message));

    await page.goto(`${BASE}/blog/${file}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(500);

    const shot = screenshotPosts.find((s) => s.n === n);
    if (shot) {
      await page.screenshot({ path: path.join(OUT, shot.name), fullPage: true });
    }
    if (n === 1) {
      const mob = await browser.newPage({ viewport: { width: 375, height: 812 } });
      await mob.goto(`${BASE}/blog/${file}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await mob.waitForTimeout(500);
      await mob.screenshot({ path: path.join(OUT, "post-1-mobile.png"), fullPage: true });
      await mob.close();
    }

    const baselinePath = path.join(BASELINE_DIR, `post-${n}.txt`);
    const liveText = stripArticleTextFromHtml(html);
    const baseline = existsSync(baselinePath) ? readFileSync(baselinePath, "utf8") : liveText;
    const textOk = liveText === baseline;

    const blueInFile = BLUE_PATTERNS.some((p) => html.toLowerCase().includes(p.toLowerCase()));

    postResults.push({
      file,
      styled: html.includes("theme-blog-post") && html.includes("global-theme.css"),
      blueRemoved: !blueInFile,
      textOk,
      consoleErrors: [...new Set(errs)],
      headOk: headScriptsOk(html),
      seoOk: seoTagsHash(html) === seoBefore,
    });
    consoleErrors.push(...errs.map((e) => `[${file}] ${e}`));
    await page.close();
  }

  await browser.close();

  const blueHits = grepBlueInBlog();
  const linesAfter = readFileSync(path.join(ROOT, "css", "global-theme.css"), "utf8").split(/\r?\n/).length;

  const report = {
    index: indexResult,
    posts: postResults,
    summary: {
      indexOk: indexResult.styled && indexResult.cardsOk && indexResult.consoleErrors.length === 0,
      postsOk: postResults.every((p) => p.styled && p.blueRemoved && p.textOk && p.consoleErrors.length === 0 && p.headOk && p.seoOk),
      textIntegrity: `${postResults.filter((p) => p.textOk).length}/30`,
      blueRemaining: blueHits.length,
      blueHits,
      globalThemeCssLines: { before: LINES_BEFORE, after: linesAfter, added: linesAfter - LINES_BEFORE },
      totalConsoleErrors: [...new Set(consoleErrors)].length,
      consoleErrors: [...new Set(consoleErrors)],
    },
    pass:
      indexResult.styled &&
      indexResult.cardsOk &&
      indexResult.consoleErrors.length === 0 &&
      postResults.every((p) => p.styled && p.blueRemoved && p.textOk && p.consoleErrors.length === 0 && p.headOk) &&
      blueHits.length === 0,
  };

  writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
