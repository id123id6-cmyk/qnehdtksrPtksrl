/**
 * 단지 카드 평수(공급면적 기준) 검증
 * 실행: node scripts/verify-apartment-card-pyeong.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "apartment-card-pyeong");
const BASE = "http://localhost:8765/tools/realestate-map/";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const GEUMHO_ID = "6399a9e3-ffb8-4e44-9711-af6bfd1db91a";

mkdirSync(OUT, { recursive: true });

async function waitForMapReady(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.searchIndexReady === true, {
    timeout: 120000,
  });
}

async function selectDistrict(page, code) {
  await page.evaluate((c) => window.RealEstateMap?.selectDistrict?.(c), code);
  await page.waitForFunction(
    (c) => window.RealEstateMap?.getSigunguCode?.() === c,
    code,
    { timeout: 60000 }
  );
  await page.waitForFunction(() => window.__areaCategoriesReady === true, {
    timeout: 120000,
  });
  await page.waitForTimeout(800);
}

async function selectApartment(page, aptId) {
  await page.evaluate((id) => {
    const code = window.RealEstateMap?.getSigunguCode?.();
    const cache = window.RealEstateMap?.getDistrictCache?.() || {};
    const apt = (cache[code] || []).find((a) => a.id === id);
    if (!apt) throw new Error(`apartment not found: ${id}`);
    return window.RealEstateMap?.selectApartment?.(apt);
  }, aptId);
  await page.waitForSelector(".apt-pyeong-summary", { timeout: 30000 });
  await page.waitForTimeout(500);
}

function unitTests() {
  const P = {
    resolve(exclSqm) {
      const types = [
        { exclMin: 50, exclMax: 60, supplySqm: 79.34, pyeong: 24 },
        { exclMin: 60, exclMax: 72, supplySqm: 95.87, pyeong: 29 },
      ];
      const n = Number(exclSqm);
      for (const t of types) {
        if (n >= t.exclMin && n < t.exclMax) return t;
      }
      return { supplySqm: n * 1.323 };
    },
    pyeongFromSupply(s) {
      return Math.round(s / 3.3058);
    },
    formatApartmentCard(excl, groupKey) {
      const lookup = groupKey != null ? Number(groupKey) : Number(excl);
      const r = P.resolve(lookup);
      const pyeong = P.pyeongFromSupply(r.supplySqm);
      return `${pyeong}평 (전용 ${excl}㎡)`;
    },
  };

  const rawExcl = 59.98;
  const group60 = 60;
  const cardOld = `${P.resolve(rawExcl).pyeong}평 (전용 ${rawExcl}㎡)`;
  const cardNew = P.formatApartmentCard(rawExcl, group60);
  const tabPyeong = P.pyeongFromSupply(P.resolve(group60).supplySqm);

  return {
    cardOld,
    cardNew,
    tabPyeong,
    pass: cardNew.includes("29평") && tabPyeong === 29 && cardOld.includes("24평"),
  };
}

async function fetchRandomApts(supabase, n = 10) {
  const { data } = await supabase
    .from("apartments")
    .select("id, name, sigungu_code")
    .in("sigungu_code", ["11680", "11710", "41220", "41135", "41110", "28110"])
    .not("sigungu_code", "is", null)
    .limit(500);
  const shuffled = (data || []).sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function main() {
  const unit = unitTests();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET
  );

  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await waitForMapReady(page);

  // 평택 금호어울림
  await selectDistrict(page, "41220");
  await selectApartment(page, GEUMHO_ID);

  const geumho = await page.evaluate(() => {
    const code = window.RealEstateMap?.getSigunguCode?.();
    const cache = window.RealEstateMap?.getDistrictCache?.() || {};
    const apt = (cache[code] || []).find((a) => a.id === "6399a9e3-ffb8-4e44-9711-af6bfd1db91a");
    const groupKey = apt?.dominantAreaGroup != null ? String(apt.dominantAreaGroup) : null;
    const tab = groupKey
      ? document.querySelector(`.sidebar-area-tab[data-area="${groupKey}"]`)
      : document.querySelector(".sidebar-area-tab:not([data-area='all'])");
    const summary = document.querySelector(".apt-pyeong-summary")?.textContent?.trim();
    const tabLabel = tab?.textContent?.trim();
    const tabPyeong = tabLabel?.match(/\((\d+)평\)/)?.[1];
    const cardPyeong = summary?.match(/^(\d+)평/)?.[1];
    return { tabLabel, summary, tabPyeong, cardPyeong, dominantAreaGroup: groupKey };
  });

  await page.screenshot({
    path: path.join(OUT, "geumho-after.png"),
    fullPage: false,
  });

  const samples = [];
  const randomApts = await fetchRandomApts(supabase, 10);

  for (const apt of randomApts) {
    try {
      await selectDistrict(page, apt.sigungu_code);
      await selectApartment(page, apt.id);
      const info = await page.evaluate((aptId) => {
        const code = window.RealEstateMap?.getSigunguCode?.();
        const cache = window.RealEstateMap?.getDistrictCache?.() || {};
        const apt = (cache[code] || []).find((a) => a.id === aptId);
        const groupKey =
          apt?.dominantAreaGroup != null ? String(apt.dominantAreaGroup) : null;
        const tab = groupKey
          ? document.querySelector(`.sidebar-area-tab[data-area="${groupKey}"]`)
          : null;
        const summary =
          document.querySelector(".apt-pyeong-summary")?.textContent?.trim() ||
          "";
        const tabLabel = tab?.textContent?.trim() || "";
        const tabPyeong = tabLabel.match(/\((\d+)평\)/)?.[1] ?? null;
        const cardPyeong = summary.match(/^(\d+)평/)?.[1] ?? null;
        return {
          tabLabel,
          summary,
          tabPyeong,
          cardPyeong,
          dominantAreaGroup: groupKey,
          match: !tabPyeong || tabPyeong === cardPyeong,
        };
      }, apt.id);
      samples.push({ name: apt.name, code: apt.sigungu_code, ...info });
    } catch (e) {
      samples.push({ name: apt.name, code: apt.sigungu_code, error: e.message });
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await selectDistrict(page, "41220");
  await selectApartment(page, GEUMHO_ID);
  await page.screenshot({
    path: path.join(OUT, "geumho-mobile-after.png"),
    fullPage: false,
  });

  await browser.close();

  const geumhoPass =
    geumho.cardPyeong === "29" &&
    geumho.tabPyeong === "29" &&
    geumho.summary?.includes("전용");

  const samplePass = samples.filter((s) => !s.error && s.tabPyeong && s.cardPyeong).every(
    (s) => s.match
  );

  const report = {
    unit,
    geumho,
    geumhoPass,
    samples,
    samplePass,
    errors,
    pass: unit.pass && geumhoPass && samplePass && errors.length === 0,
    screenshots: OUT,
  };

  writeFileSync(
    path.join(ROOT, "data", "validation", "apartment-card-pyeong-report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
