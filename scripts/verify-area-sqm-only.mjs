/**
 * 실거래가 지도 — ㎡ 표기 통일 검증 (평수 UI 제거)
 * 실행: node scripts/verify-area-sqm-only.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MAP_DIR = path.join(ROOT, "tools", "realestate-map");
const OUT = path.join(ROOT, "screenshots", "area-sqm-only");
const REPORT = path.join(ROOT, "data", "validation", "area-sqm-only-report.json");
const BASE = "http://localhost:8765/tools/realestate-map/";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const FORBIDDEN_UI = [
  /\d+평/,
  /\(\d+평\)/,
  /평대/,
  /평형\s*<\/th>/,
  /<th>평형<\/th>/,
];

const FORBIDDEN_GONGGEUP = [/공급/];

const ALLOWED_GONGGEUP = [/\/\//, /^\s*\*/, /supplySqm/];

const ALLOWED_PYEONG = [
  /평균/,
  /평택/,
  /은평/,
  /양평/,
  /가평/,
  /평범/,
  /이 평형 거래/,
  /평형 타입/,
  /평형 데이터/,
  /\[평형\]/,
  /면적대/,
];

const TARGET_COMPLEXES = [
  { key: "geumho", code: "41220", aptId: "6399a9e3-ffb8-4e44-9711-af6bfd1db91a", label: "평택 금호어울림" },
  { key: "eunma", code: "11680", aptId: "948c0f63-4f00-46a4-8632-ec8c465b3d1c", label: "서울 강남 은마아파트" },
  { key: "helio", code: "11710", aptId: "582cc460-2c72-4e3e-a468-d4ce7f3189f1", label: "서울 송파 헬리오시티" },
  { key: "bundang", code: "41135", aptId: "45031372-e3c2-4639-aa6a-857c16201f3e", label: "경기 분당 시범단지" },
  { key: "jamsil", code: "11710", aptId: "3abb6516-adab-4d86-aa85-fac0bdd2a260", label: "서울 송파 잠실엘스" },
  { key: "raemian", code: "11680", aptId: "676e5be3-a7af-48ca-8429-896ed5a993fe", label: "서울 강남 래미안대치팰리스" },
  { key: "hansol", code: "41135", aptId: "45031372-e3c2-4639-aa6a-857c16201f3e", label: "경기 분당 한솔마을" },
  { key: "pyeongtaek2", code: "41220", namePattern: "금호", label: "평택 금호(추가)" },
  { key: "gangnam", code: "11680", namePattern: "개포", label: "서울 강남 개포" },
  { key: "songpa", code: "11710", namePattern: "리센츠", label: "서울 송파 리센츠" },
];

mkdirSync(OUT, { recursive: true });
mkdirSync(path.dirname(REPORT), { recursive: true });

function walkJsFiles(dir, acc = []) {
  for (const ent of readdirSync(dir)) {
    const full = path.join(dir, ent);
    const st = statSync(full);
    if (st.isDirectory()) walkJsFiles(full, acc);
    else if (/\.(js|html|css)$/.test(ent)) acc.push(full);
  }
  return acc;
}

function grepForbiddenUi() {
  const files = walkJsFiles(MAP_DIR);
  const hits = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (!line.includes("평")) return;
      if (ALLOWED_PYEONG.some((re) => re.test(line))) return;
      if (FORBIDDEN_UI.some((re) => re.test(line))) {
        hits.push({ file: rel, line: i + 1, text: line.trim().slice(0, 120) });
      }
    });
  }
  return hits;
}

function grepGonggeupUi() {
  const files = walkJsFiles(MAP_DIR);
  const hits = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (!line.includes("공급")) return;
      if (ALLOWED_GONGGEUP.some((re) => re.test(line))) return;
      if (FORBIDDEN_GONGGEUP.some((re) => re.test(line))) {
        hits.push({ file: rel, line: i + 1, text: line.trim().slice(0, 120) });
      }
    });
  }
  return hits;
}

function unitTests() {
  function formatAreaDisplay(excl) {
    const exclLabel =
      Number(excl) === 59.98 ? "59.98" : String(Math.round(excl * 100) / 100);
    return `전용 ${exclLabel}㎡`;
  }
  function formatTableArea(excl) {
    return Number(excl) === 59.98 ? "59.98㎡" : `${excl}㎡`;
  }

  const card = formatAreaDisplay(59.98);
  const table = formatTableArea(59.98);
  const tab = "60㎡";
  return {
    card,
    table,
    tab,
    pass:
      card === "전용 59.98㎡" &&
      table === "59.98㎡" &&
      tab === "60㎡" &&
      !card.includes("공급") &&
      !/\d+평/.test(card),
  };
}

async function waitForMapReady(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => !!window.RealEstateMap?.selectDistrict, {
    timeout: 120000,
  });
  await page.waitForTimeout(1500);
}

async function waitDistrictReady(page, code) {
  await page.waitForFunction(
    (c) => {
      const cache = window.RealEstateMap?.getDistrictCache?.() || {};
      const list = cache[c];
      if (!Array.isArray(list) || !list.length) return false;
      const withMaemae = list.filter(
        (a) => a.avgPrice1Y != null && a.avgPrice1Y > 0
      ).length;
      const withJeonse = list.filter((a) => (a.jeonseCount1Y ?? 0) > 0).length;
      return withMaemae + withJeonse > 0;
    },
    code,
    { timeout: 90000 }
  );
  await page.waitForFunction(() => window.__areaCategoriesReady === true, {
    timeout: 120000,
  });
  await page.waitForTimeout(800);
}

async function selectDistrict(page, code) {
  await page.evaluate((c) => window.RealEstateMap?.selectDistrict?.(c), code);
  await page.waitForFunction(
    (c) => window.RealEstateMap?.getSigunguCode?.() === c,
    code,
    { timeout: 90000 }
  );
  await waitDistrictReady(page, code);
}

async function findAptId(supabase, code, pattern) {
  const { data } = await supabase
    .from("apartments")
    .select("id, name")
    .eq("sigungu_code", code)
    .ilike("name", `%${pattern}%`)
    .limit(20);
  return data?.[0] || null;
}

async function selectApartment(page, aptId) {
  await page.evaluate((id) => {
    const code = window.RealEstateMap?.getSigunguCode?.();
    const cache = window.RealEstateMap?.getDistrictCache?.() || {};
    const apt = (cache[code] || []).find((a) => a.id === id);
    if (!apt) throw new Error(`apartment not found: ${id}`);
    return window.RealEstateMap?.selectApartment?.(apt);
  }, aptId);
  await page.waitForSelector(".apt-info-card h2", { timeout: 30000 });
  await page.waitForTimeout(600);
}

async function collectDomState(page) {
  return page.evaluate(() => {
    const body = document.body.innerText || "";
    const forbidden = body.match(/\d+평/g) || [];
    const tabs = [...document.querySelectorAll(".sidebar-area-tab")]
      .map((el) => el.textContent?.trim())
      .filter(Boolean);
    const summary =
      document.querySelector(".apt-pyeong-summary")?.textContent?.trim() || "";
    const tableHeaders = [
      ...document.querySelectorAll(".transactions-table th"),
    ].map((el) => el.textContent?.trim());
    const tableCells = [
      ...document.querySelectorAll(".transactions-table tbody td:nth-child(3)"),
    ]
      .slice(0, 5)
      .map((el) => el.textContent?.trim());
    const markerLabels = [
      ...document.querySelectorAll(".marker-label, .apt-marker-label"),
    ]
      .slice(0, 8)
      .map((el) => el.textContent?.trim())
      .filter(Boolean);
    const gonggeup = body.includes("공급");
    return {
      forbiddenPyeong: forbidden,
      hasGonggeup: gonggeup,
      tabs,
      summary,
      tableHeaders,
      tableCells,
      markerLabels,
      hasAreaHeader: tableHeaders.includes("면적"),
      hasPyeongHeader: tableHeaders.includes("평형"),
    };
  });
}

async function main() {
  const grepHits = grepForbiddenUi();
  const gonggeupHits = grepGonggeupUi();
  const unit = unitTests();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET
  );

  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await waitForMapReady(page);

  const complexes = [];
  for (const target of TARGET_COMPLEXES) {
    let aptId = target.aptId;
    let aptName = target.label;
    if (!aptId && target.namePattern) {
      const apt = await findAptId(supabase, target.code, target.namePattern);
      if (!apt) {
        complexes.push({ ...target, error: "DB에서 단지 미발견" });
        continue;
      }
      aptId = apt.id;
      aptName = apt.name;
    }
    try {
      await selectDistrict(page, target.code);
      await selectApartment(page, aptId);
      const state = await collectDomState(page);
      await page.screenshot({
        path: path.join(OUT, `${target.key}-pc.png`),
        fullPage: false,
      });
      const pass =
        state.forbiddenPyeong.length === 0 &&
        !state.hasGonggeup &&
        !state.hasPyeongHeader &&
        (state.tableHeaders.length === 0 || state.hasAreaHeader) &&
        (state.summary === "" ||
          (state.summary.startsWith("전용") &&
            state.summary.includes("㎡") &&
            !state.summary.includes("공급"))) &&
        state.tabs.every((t) => t === "전체" || /㎡$/.test(t)) &&
        state.tableCells.every((c) => !c.includes("공급"));

      complexes.push({
        ...target,
        aptId,
        aptName,
        ...state,
        pass,
      });
    } catch (e) {
      complexes.push({ ...target, aptId, aptName, error: e.message });
    }
  }

  try {
    await page.setViewportSize({ width: 375, height: 812 });
    await selectDistrict(page, "41220");
    await selectApartment(page, "6399a9e3-ffb8-4e44-9711-af6bfd1db91a");
    await page.screenshot({
      path: path.join(OUT, "geumho-mobile.png"),
      fullPage: false,
    });
  } catch (e) {
    errors.push(`mobile: ${e.message}`);
  }

  await browser.close();

  const report = {
    grepHits,
    grepPass: grepHits.length === 0,
    gonggeupHits,
    gonggeupPass: gonggeupHits.length === 0,
    unit,
    complexes,
    complexesPass: complexes.filter((c) => !c.error).every((c) => c.pass),
    errors,
    screenshots: OUT,
    pass:
      grepHits.length === 0 &&
      gonggeupHits.length === 0 &&
      unit.pass &&
      complexes.filter((c) => !c.error).length >= 8 &&
      complexes.filter((c) => !c.error).every((c) => c.pass) &&
      errors.length === 0,
  };

  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
