/**
 * 청약 가점 계산기 검증
 * 실행: node scripts/test-subscription-calculator.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { calculateSubscriptionScore, parseDate } from "../tools/subscription-calculator/scoring.js";

const BASE = "http://localhost:8765";
const OUT = "screenshots/subscription-calculator";
const REF = parseDate("2026-06-18");

const unitTests = [
  {
    name: "만 30세 미만 (무주택 0점)",
    input: { birthDate: "2000-01-01", useMarriage: false, spouse: false, children: 0, parentsCohabiting: false, hasSubscription: false },
    expect: { homeless: 0, dependents: 5, subscription: 0, total: 5 },
  },
  {
    name: "만 30세 전 결혼 (결혼일부터 산정)",
    input: { birthDate: "1990-06-15", useMarriage: true, marriageDate: "2018-03-01", spouse: true, children: 0, parentsCohabiting: false, hasSubscription: true, subscriptionJoinDate: "2018-03-01" },
    expect: { homeless: 18, dependents: 10, subscription: 10, total: 38 },
  },
  {
    name: "부양가족 0명 (기본 5점)",
    input: { birthDate: "1993-01-01", useMarriage: false, spouse: false, children: 0, parentsCohabiting: false, hasSubscription: false },
    expect: { homeless: 8, dependents: 5, subscription: 0, total: 13 },
  },
  {
    name: "부양가족 6명 이상 (35점 만점)",
    input: { birthDate: "1978-01-01", useMarriage: false, spouse: true, children: 5, parentsCohabiting: true, hasSubscription: false },
    expect: { homeless: 32, dependents: 35, subscription: 0, total: 67 },
  },
  {
    name: "청약통장 미가입 (0점)",
    input: { birthDate: "1992-08-20", useMarriage: false, spouse: false, children: 1, parentsCohabiting: false, hasSubscription: false },
    expect: { homeless: 8, dependents: 10, subscription: 0, total: 18 },
  },
  {
    name: "청약통장 5개월 (1점)",
    input: { birthDate: "1992-08-20", useMarriage: false, spouse: false, children: 0, parentsCohabiting: false, hasSubscription: true, subscriptionJoinDate: "2026-01-18" },
    expect: { homeless: 8, dependents: 5, subscription: 1, total: 14 },
  },
  {
    name: "만 30세 직후 무주택 2점",
    input: { birthDate: "1996-06-18", useMarriage: false, spouse: false, children: 0, parentsCohabiting: false, hasSubscription: false },
    expect: { homeless: 2, dependents: 5, subscription: 0, total: 7 },
  },
];

function runUnitTests() {
  const results = unitTests.map((tc) => {
    const r = calculateSubscriptionScore(tc.input, REF);
    const pass =
      r.homeless.points === tc.expect.homeless &&
      r.dependents.points === tc.expect.dependents &&
      r.subscription.points === tc.expect.subscription &&
      r.total === tc.expect.total;
    return {
      name: tc.name,
      pass,
      expected: tc.expect,
      actual: {
        homeless: r.homeless.points,
        dependents: r.dependents.points,
        subscription: r.subscription.points,
        total: r.total,
      },
    };
  });
  return results;
}

async function runBrowserTests() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/tools/subscription-calculator/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#total-score");

  const desktopChecks = await page.evaluate(() => ({
    title: document.title.includes("청약 가점 계산기"),
    hasCtaMap: !!document.querySelector('a[href="/tools/realestate-map/"]'),
    hasCtaDday: !!document.querySelector('a[href="/tools/dday-calculator/"]'),
    hasCtaBlog: !!document.querySelector('a[href="/blog/post-20.html"]'),
    hasBars: document.querySelectorAll(".score-bar-fill").length === 3,
  }));

  await page.fill("#birth-date", "1990-06-15");
  await page.click("#mode-marriage");
  await page.fill("#marriage-date", "2018-03-01");
  await page.check("#spouse");
  await page.fill("#subscription-join", "2018-03-01");
  await page.waitForTimeout(200);

  const liveScore = await page.evaluate(() => ({
    total: document.getElementById("total-score")?.textContent,
    homeless: document.getElementById("score-homeless")?.textContent,
  }));

  await page.screenshot({ path: `${OUT}/desktop.png`, fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${OUT}/mobile.png`, fullPage: false });

  await page.goto(`${BASE}/tools/`, { waitUntil: "domcontentloaded" });
  const toolsIndex = await page.evaluate(() => ({
    hasCard: !!document.querySelector('a[href="subscription-calculator/"]'),
  }));

  await browser.close();

  return { desktopChecks, liveScore, toolsIndex, errors, screenshots: OUT };
}

async function main() {
  const unitResults = runUnitTests();
  const unitPass = unitResults.every((r) => r.pass);
  const browser = await runBrowserTests();
  const pass = unitPass && browser.errors.length === 0 && browser.desktopChecks.title && browser.toolsIndex.hasCard;

  console.log(
    JSON.stringify(
      {
        unitTests: unitResults,
        unitPass,
        browser,
        pass,
      },
      null,
      2
    )
  );
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
