/**
 * 전세-only 노란 마커 검증 + 전국 분류 통계
 * 실행: node scripts/verify-jeonse-markers.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "jeonse-marker-verify");
const REPORT = path.join(ROOT, "data", "validation", "jeonse-marker-report.json");
const BASE = "http://localhost:8765/tools/realestate-map/";

mkdirSync(OUT, { recursive: true });
loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false } }
);

const cutoff = new Date();
cutoff.setFullYear(cutoff.getFullYear() - 1);
const cutoffStr = cutoff.toISOString().slice(0, 10);

function classifyBefore(apt, maemae1y, jeonse1y) {
  if (maemae1y > 0) return "sale";
  return "none";
}

function classifyAfter(apt, maemae1y, jeonse1y) {
  if (maemae1y > 0) return "sale";
  if (jeonse1y > 0) return "jeonse";
  return "none";
}

console.log("=== 전국 마커 분류 통계 ===");
const apts = [];
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from("apartments").select("id").not("latitude", "is", null).range(from, from + 999);
  if (!data?.length) break;
  apts.push(...data);
  if (data.length < 1000) break;
}

const maemae1ySet = new Set();
const jeonse1ySet = new Set();
for (let i = 0; i < apts.length; i += 200) {
  const chunk = apts.slice(i, i + 200).map((a) => a.id);
  const { data: m } = await sb
    .from("transactions")
    .select("apartment_id")
    .eq("deal_type", "매매")
    .gte("deal_date", cutoffStr)
    .in("apartment_id", chunk);
  for (const r of m || []) maemae1ySet.add(r.apartment_id);

  const { data: j } = await sb
    .from("transactions")
    .select("apartment_id")
    .eq("deal_type", "전세")
    .gte("deal_date", cutoffStr)
    .in("apartment_id", chunk);
  for (const r of j || []) jeonse1ySet.add(r.apartment_id);
}

const stats = {
  before: { sale: 0, none: 0 },
  after: { sale: 0, jeonse: 0, none: 0 },
};
for (const apt of apts) {
  const m = maemae1ySet.has(apt.id) ? 1 : 0;
  const j = jeonse1ySet.has(apt.id) ? 1 : 0;
  stats.before[classifyBefore(apt, m, j)]++;
  stats.after[classifyAfter(apt, m, j)]++;
}

const GODEOK_GRAY = [
  "0484daa9-9cab-4345-8a91-053a8b819fa7",
  "efb8555c-e7fb-4f77-ab11-ebd86630f427",
  "3a54480a-7691-4341-92d0-fca37e3c640a",
  "994204be-e631-44ee-894a-f5102dd43eac",
  "5bb1f8d8-ea75-493a-9f51-3c729d8ad610",
];

async function waitReady(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.searchIndexReady === true, { timeout: 120000 });
  await page.waitForTimeout(1500);
}

const REGIONS = [
  { slug: "pyeongtaek-godeok", code: "41220", query: "고덕국제신도시금호어울림", expectSale: true },
  { slug: "pyeongtaek-dietre", code: "41220", query: "디에트르리비에르", expectJeonse: true },
  { slug: "gangnam", code: "11680", query: "래미안대치" },
  { slug: "songpa", code: "11710", query: "잠실엘스" },
  { slug: "bundang", code: "41135", query: "분당" },
];

const browser = await chromium.launch();
const ui = { consoleErrors: [], regions: [] };

for (const region of REGIONS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  const row = { ...region, errors };
  try {
    await waitReady(page);
    await page.evaluate((c) => window.RealEstateMap?.selectDistrict?.(c), region.code);
    await page.waitForTimeout(5000);
    await page.fill("#search-input", region.query);
    await page.waitForTimeout(800);
    await page.waitForSelector(".search-result-item", { timeout: 20000 });
    await page.click(".search-result-item");
    await page.waitForTimeout(3000);

    row.checks = await page.evaluate(() => {
      const sel = document.querySelector(".marker-selected");
      const badges = [...document.querySelectorAll(".tx-badge")].map((b) => b.textContent?.trim());
      return {
        selectedClass: sel?.className || null,
        selectedText: sel?.textContent?.trim(),
        badges,
        legendJeonse: !!document.querySelector(".dot-jeonse"),
      };
    });
    row.checks.ok =
      !region.expectSale || row.checks.selectedClass?.includes("marker-low") ||
      row.checks.selectedClass?.includes("marker-mid") ||
      row.checks.selectedClass?.includes("marker-high");
    if (region.expectJeonse) {
      row.checks.ok = row.checks.selectedClass?.includes("marker-jeonse");
    }
    await page.screenshot({ path: path.join(OUT, `${region.slug}.png`) });
  } catch (e) {
    row.error = String(e.message || e);
    row.checks = { ok: false };
  }
  ui.consoleErrors.push(...errors);
  ui.regions.push(row);
  await page.close();
}

await browser.close();

const godeokShift = GODEOK_GRAY.map((id) => ({
  id,
  before: "none",
  after: jeonse1ySet.has(id) ? "jeonse" : "none",
}));

const report = {
  generatedAt: new Date().toISOString(),
  national: {
    total: apts.length,
    before: stats.before,
    after: stats.after,
    jeonseNew: stats.after.jeonse,
    noneReduced: stats.before.none - stats.after.none,
  },
  godeokGrayShift: godeokShift,
  ui,
  screenshotsDir: OUT,
  allOk: ui.consoleErrors.length === 0 && ui.regions.every((r) => r.checks?.ok !== false),
};

writeFileSync(REPORT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.allOk ? 0 : 1);
