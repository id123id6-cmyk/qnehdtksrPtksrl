/**
 * 초기 마커 렌더 vs 단지 선택 후 불일치 검증
 * 실행: node scripts/verify-marker-initial-render.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "screenshots", "marker-initial-fix");
const REPORT = path.join(ROOT, "data", "validation", "marker-initial-fix.json");
const BASE = "http://localhost:8765/tools/realestate-map/";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const REGIONS = [
  { slug: "pyeongtaek", code: "41220", name: "평택시" },
  { slug: "gangnam", code: "11680", name: "강남구" },
  { slug: "songpa", code: "11710", name: "송파구" },
  { slug: "bundang", code: "41135", name: "성남 분당구" },
];

const GEUMHO_NAME = "고덕국제신도시금호어울림";

mkdirSync(OUT, { recursive: true });
mkdirSync(path.dirname(REPORT), { recursive: true });

async function getDbMaemaeCount(sb, sigunguCode) {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data: apts } = await sb
    .from("apartments")
    .select("id, name")
    .eq("sigungu_code", sigunguCode)
    .not("latitude", "is", null);

  const ids = apts.map((a) => a.id);
  const withMaemae = new Set();
  const idChunkSize = 150;

  for (let i = 0; i < ids.length; i += idChunkSize) {
    const idChunk = ids.slice(i, i + idChunkSize);
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data } = await sb
        .from("transactions")
        .select("apartment_id")
        .eq("deal_type", "매매")
        .gte("deal_date", cutoffStr)
        .in("apartment_id", idChunk)
        .order("apartment_id")
        .order("deal_date")
        .range(from, from + pageSize - 1);
      if (!data?.length) break;
      for (const r of data) withMaemae.add(r.apartment_id);
      if (data.length < pageSize) break;
      from += data.length;
    }
  }

  const geumho = apts.find((a) => a.name.includes("금호어울림") && a.name.includes("고덕"));
  return {
    total: apts.length,
    dbMaemae1Y: withMaemae.size,
    geumhoId: geumho?.id ?? null,
    geumhoDbHasMaemae: geumho ? withMaemae.has(geumho.id) : false,
  };
}

async function collectMarkerStats(page, sigunguCode) {
  return page.evaluate((code) => {
    const Marker = window.RealEstateMapMarker;
    const cache = window.RealEstateMap?.getDistrictCache?.() || {};
    const apts = cache[code] || [];
    const stats = { low: 0, mid: 0, high: 0, jeonse: 0, none: 0 };
    const noneIds = [];
    let geumho = null;

    for (const apt of apts) {
      const cat = Marker?.getMarkerCategory?.(apt)?.label || "none";
      stats[cat] = (stats[cat] || 0) + 1;
      if (cat === "none") noneIds.push({ id: apt.id, name: apt.name });
      if (apt.name?.includes("금호어울림") && apt.name?.includes("고덕")) {
        geumho = {
          id: apt.id,
          name: apt.name,
          avgPrice1Y: apt.avgPrice1Y,
          tradeCount1Y: apt.tradeCount1Y,
          dominantPyeong: apt.dominantPyeong,
          category: cat,
          label: Marker?.getMarkerPriceText?.(apt),
        };
      }
    }
    return { stats, total: apts.length, noneCount: noneIds.length, geumho, noneSample: noneIds.slice(0, 5) };
  }, sigunguCode);
}

async function getDomMarkers(page) {
  return page.evaluate(() => {
    const els = document.querySelectorAll(".marker-pill, .marker-dot");
    const rows = [];
    for (const el of els) {
      const bg = el.style.backgroundColor || getComputedStyle(el).backgroundColor;
      rows.push({
        text: el.textContent?.trim(),
        bg,
        isGrey: bg.includes("156, 163, 175") || el.classList.contains("marker-none"),
        aptId: el.getAttribute("data-apt-id"),
      });
    }
    return rows;
  });
}

async function waitDistrictReady(page, code) {
  await page.waitForFunction(
    (c) => {
      const cache = window.RealEstateMap?.getDistrictCache?.() || {};
      const list = cache[c];
      if (!Array.isArray(list) || !list.length) return false;
      const withMaemae = list.filter((a) => a.avgPrice1Y != null && a.avgPrice1Y > 0).length;
      const withJeonse = list.filter((a) => (a.jeonseCount1Y ?? 0) > 0).length;
      return withMaemae + withJeonse > 0;
    },
    code,
    { timeout: 90000 }
  );
  await page.waitForTimeout(4000);
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET,
    { auth: { persistSession: false } }
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const report = { regions: [], consoleErrors: [], pass: true };

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.searchIndexReady === true, { timeout: 120000 });

  for (const region of REGIONS) {
    await page.evaluate((c) => window.RealEstateMap?.selectDistrict?.(c), region.code);
    await page.waitForFunction(
      (c) => window.RealEstateMap?.getSigunguCode?.() === c,
      region.code,
      { timeout: 60000 }
    );
    await waitDistrictReady(page, region.code);

    const beforeSelect = await collectMarkerStats(page, region.code);
    const domBefore = await getDomMarkers(page);
    const db = await getDbMaemaeCount(sb, region.code);

    const screenshotPath = path.join(OUT, `${region.slug}-initial.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    let afterSelect = null;
    let mismatch = false;
    if (beforeSelect.geumho?.id && region.slug === "pyeongtaek") {
      await page.evaluate(
        (id) => {
          const code = window.RealEstateMap?.getSigunguCode?.();
          const cache = window.RealEstateMap?.getDistrictCache?.() || {};
          const apt = (cache[code] || []).find((a) => a.id === id);
          if (apt) window.RealEstateMap?.selectApartment?.(apt);
        },
        beforeSelect.geumho.id
      );
      await page.waitForTimeout(3000);
      afterSelect = await collectMarkerStats(page, region.code);
      const bCat = beforeSelect.geumho?.category;
      const aCat = afterSelect.geumho?.category;
      mismatch = bCat === "none" && aCat !== "none";
    }

    const regionReport = {
      region: region.name,
      code: region.code,
      db: db,
      markerStats: beforeSelect.stats,
      noneCount: beforeSelect.noneCount,
      geumhoBefore: beforeSelect.geumho,
      geumhoAfter: afterSelect?.geumho ?? null,
      domMarkerCount: domBefore.length,
      domGreyCount: domBefore.filter((m) => m.isGrey).length,
      selectMismatch: mismatch,
      screenshot: screenshotPath,
    };

    if (region.slug === "pyeongtaek") {
      const geumhoOk =
        beforeSelect.geumho?.category !== "none" &&
        beforeSelect.geumho?.avgPrice1Y > 0;
      if (!geumhoOk) report.pass = false;
      if (mismatch) report.pass = false;
      // DB 대비 마커 none 비율: 실제 거래 없는 단지만 none이어야 함
      const expectedNone = db.total - db.dbMaemae1Y;
      const actualNone = beforeSelect.stats.none || 0;
      const jeonseOnly = (beforeSelect.stats.jeonse || 0);
      // none은 매매0 + 전세0 단지 (jeonse-only는 none 아님)
      if (actualNone > expectedNone + 5) report.pass = false;
    }

    report.regions.push(regionReport);
    console.log(JSON.stringify(regionReport, null, 2));
  }

  report.consoleErrors = consoleErrors;
  if (consoleErrors.length) report.pass = false;

  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log("\nReport:", REPORT);
  console.log("PASS:", report.pass);

  await browser.close();
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
