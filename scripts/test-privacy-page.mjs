/**
 * privacy.html 검증
 * 실행: node scripts/test-privacy-page.mjs
 */
import { readFileSync } from "node:fs";

const html = readFileSync("privacy.html", "utf8");
const head = html.split("</head>")[0];
const mainMatch = html.match(/<main>[\s\S]*<\/main>/);
const charCount = mainMatch
  ? mainMatch[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length
  : 0;

const checks = {
  date: html.includes("2026-07-02"),
  ga: html.includes("Google Analytics"),
  adsense: html.includes("Google AdSense"),
  clarity: html.includes("Microsoft Clarity"),
  mailto: html.includes('href="mailto:id123id6@gmail.com"'),
  externalBlank: (html.match(/target="_blank"/g) || []).length >= 5,
  articles: html.includes("제1조") && html.includes("제10조"),
  gdpr: html.includes("GDPR"),
  agencies: html.includes("개인정보보호위원회"),
};

const headOk =
  head.includes("G-Y7SC73P9JW") &&
  head.includes("xbdrgqw1pj") &&
  head.includes("ca-pub-8232968272801958") &&
  head.includes("<title>개인정보처리방침 | 승박</title>");

const pass =
  charCount >= 3000 &&
  charCount <= 4500 &&
  checks.date &&
  checks.ga &&
  checks.adsense &&
  checks.clarity &&
  checks.mailto &&
  checks.externalBlank &&
  checks.articles &&
  checks.agencies &&
  headOk;

console.log(JSON.stringify({ charCount, checks, headOk, pass }, null, 2));
if (!pass) process.exit(1);
