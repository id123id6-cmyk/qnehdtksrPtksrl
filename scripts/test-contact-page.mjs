/**
 * contact.html 검증
 * 실행: node scripts/test-contact-page.mjs
 */
import { readFileSync } from "node:fs";

const html = readFileSync("contact.html", "utf8");
const head = html.split("</head>")[0];
const mainMatch = html.match(/<main>[\s\S]*<\/main>/);
const charCount = mainMatch
  ? mainMatch[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length
  : 0;

const checks = {
  mailto: html.includes('href="mailto:id123id6@gmail.com?subject='),
  mailtoSubject: html.includes("%5Bseungbak.com%5D") || html.includes("[seungbak.com]"),
  insta: html.includes('href="https://www.instagram.com/seungbak.tools/"'),
  instaTarget: html.includes('target="_blank"') && html.includes("seungbak.tools"),
  ctaEmail: html.includes("이메일로 문의하기"),
  ctaBlog: html.includes('href="/blog/"'),
  hero: html.includes("언제든 편하게 연락주세요"),
};

const headOk =
  head.includes("G-Y7SC73P9JW") &&
  head.includes("xbdrgqw1pj") &&
  head.includes("ca-pub-8232968272801958") &&
  head.includes("<title>문의 | 승박</title>");

const pass =
  charCount >= 1500 &&
  charCount <= 2200 &&
  checks.mailto &&
  checks.insta &&
  checks.ctaEmail &&
  checks.ctaBlog &&
  checks.hero &&
  headOk;

console.log(JSON.stringify({ charCount, checks, headOk, pass }, null, 2));
if (!pass) process.exit(1);
