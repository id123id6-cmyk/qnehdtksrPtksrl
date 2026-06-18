/**
 * 국토부 아파트 매매·전월세 실거래 → Supabase 적재 (장기)
 *
 * 실행:
 *   node scripts/import-molit-5years.mjs --lawd 11680
 *
 * 옵션:
 *   --from 2020-01   (기본 2020-01)
 *   --to   2026-06   (기본 2026-06)
 *
 * 필요 패키지:
 *   npm install @supabase/supabase-js
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

loadEnvLocal();
requireEnv(["MOLIT_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const TRADE_URL =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";
const RENT_URL =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";

const BATCH_SIZE = 200;
const PAGE_SIZE = 1000;
const API_DELAY_MS = 200;
const MAX_RETRIES = 3;

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const LAWD_CD = getArg("lawd", "11680");
const FROM_YM = getArg("from", "2020-01");
const TO_YM = getArg("to", "2026-06");

const MOLIT_TRADE_KEY = process.env.MOLIT_API_KEY;
const MOLIT_RENT_KEY = process.env.MOLIT_RENT_KEY || process.env.MOLIT_API_KEY;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const apartmentIdCache = new Map();
const knownApartmentKeys = new Set();

const stats = {
  newApartments: 0,
  errors: 0,
  monthsCompleted: 0,
  byType: {
    매매: { fetched: 0, inserted: 0, skipped: 0 },
    전세: { fetched: 0, inserted: 0, skipped: 0 },
    월세: { fetched: 0, inserted: 0, skipped: 0 },
  },
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function aptNaturalKey(sigunguCode, name, dong, jibun) {
  return `${sigunguCode}|${name}|${dong || ""}|${jibun || ""}`;
}

function parseYm(ym) {
  const [y, m] = ym.split("-");
  return { year: parseInt(y, 10), month: parseInt(m, 10) };
}

function formatYm(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function toDealYmd(ym) {
  return ym.replace("-", "");
}

/** 2020-01 ~ 2026-06 형태의 월 목록 (오래된 순) */
function buildMonthRange(fromYm, toYm) {
  const list = [];
  const from = parseYm(fromYm);
  const to = parseYm(toYm);
  let y = from.year;
  let m = from.month;

  while (y < to.year || (y === to.year && m <= to.month)) {
    list.push(formatYm(y, m));
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return list;
}

function pickXml(block, tag) {
  const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1].trim() : "";
}

function parseIntAmount(raw) {
  if (!raw) return 0;
  const n = parseInt(String(raw).replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseTradeItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
    const b = match[1];
    const floorRaw = pickXml(b, "floor");
    const areaRaw = pickXml(b, "excluUseAr");
    const buildYearRaw = pickXml(b, "buildYear");

    return {
      aptNm: pickXml(b, "aptNm"),
      umdNm: pickXml(b, "umdNm"),
      jibun: pickXml(b, "jibun"),
      buildYear: buildYearRaw ? parseInt(buildYearRaw, 10) : null,
      dealAmount: parseIntAmount(pickXml(b, "dealAmount")),
      dealYear: parseInt(pickXml(b, "dealYear"), 10),
      dealMonth: parseInt(pickXml(b, "dealMonth"), 10),
      dealDay: parseInt(pickXml(b, "dealDay"), 10),
      excluUseAr: areaRaw ? parseFloat(areaRaw) : null,
      floor: floorRaw ? parseInt(floorRaw, 10) : null,
      dealType: "매매",
      monthlyRent: null,
      rentDeposit: null,
    };
  });
}

function parseRentItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
    const b = match[1];
    const floorRaw = pickXml(b, "floor");
    const areaRaw = pickXml(b, "excluUseAr");
    const buildYearRaw = pickXml(b, "buildYear");
    const deposit = parseIntAmount(pickXml(b, "deposit"));
    const monthlyRent = parseIntAmount(pickXml(b, "monthlyRent"));
    const dealType = monthlyRent === 0 ? "전세" : "월세";

    return {
      aptNm: pickXml(b, "aptNm"),
      umdNm: pickXml(b, "umdNm"),
      jibun: pickXml(b, "jibun"),
      buildYear: buildYearRaw ? parseInt(buildYearRaw, 10) : null,
      dealAmount: deposit,
      dealYear: parseInt(pickXml(b, "dealYear"), 10),
      dealMonth: parseInt(pickXml(b, "dealMonth"), 10),
      dealDay: parseInt(pickXml(b, "dealDay"), 10),
      excluUseAr: areaRaw ? parseFloat(areaRaw) : null,
      floor: floorRaw ? parseInt(floorRaw, 10) : null,
      dealType,
      monthlyRent: dealType === "월세" ? monthlyRent : null,
      rentDeposit: dealType === "월세" ? deposit : null,
    };
  });
}

async function withRetry(fn, label) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`  ⚠ ${label} 실패 (${attempt}/${MAX_RETRIES}): ${err.message}`);
      if (attempt < MAX_RETRIES) await sleep(1000);
    }
  }
  throw lastErr;
}

async function fetchMolitPage(baseUrl, serviceKey, lawd, ym, pageNo, parseFn) {
  const url = new URL(baseUrl);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("LAWD_CD", lawd);
  url.searchParams.set("DEAL_YMD", ym);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(PAGE_SIZE));

  const res = await fetch(url.toString());
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const resultCode =
    pickXml(text, "resultCode") ||
    text.match(/<resultCode>([^<]+)<\/resultCode>/)?.[1]?.trim();

  if (resultCode && resultCode !== "000") {
    const msg = text.match(/<resultMsg>([^<]+)<\/resultMsg>/)?.[1] || "";
    throw new Error(`API resultCode=${resultCode} ${msg}`);
  }

  const totalCount = parseInt(
    text.match(/<totalCount>([^<]+)<\/totalCount>/)?.[1] || "0",
    10
  );
  const items = parseFn(text);
  return { totalCount, items };
}

async function fetchMolitMonth(baseUrl, serviceKey, lawd, dealYmd, parseFn, label) {
  const first = await withRetry(
    () => fetchMolitPage(baseUrl, serviceKey, lawd, dealYmd, 1, parseFn),
    `${label} ${dealYmd} page 1`
  );
  await sleep(API_DELAY_MS);

  let all = [...first.items];
  const totalPages = Math.ceil(first.totalCount / PAGE_SIZE);

  for (let page = 2; page <= totalPages; page++) {
    const { items } = await withRetry(
      () => fetchMolitPage(baseUrl, serviceKey, lawd, dealYmd, page, parseFn),
      `${label} ${dealYmd} page ${page}`
    );
    all = all.concat(items);
    await sleep(API_DELAY_MS);
  }

  return { totalCount: first.totalCount, items: all };
}

async function verifyRentApi(sampleYm) {
  try {
    await fetchMolitPage(
      RENT_URL,
      MOLIT_RENT_KEY,
      LAWD_CD,
      toDealYmd(sampleYm),
      1,
      parseRentItems
    );
    return true;
  } catch (err) {
    if (String(err.message).includes("403")) {
      console.warn("⚠️  전월세 API HTTP 403 — 활용신청·키 확인 필요");
      console.warn("   공공데이터포털: RTMSDataSvcAptRent (아파트 전월세 실거래)");
      console.warn("   .env.local → MOLIT_RENT_KEY 설정 후 재실행하세요.");
      console.warn("   → 매매 데이터만 적재를 계속합니다.\n");
      return false;
    }
    throw err;
  }
}

async function verifySupabase() {
  const { error } = await supabase
    .from("apartments")
    .select("id", { count: "exact", head: true });

  if (error) {
    if (error.message?.includes("fetch failed") || error.message?.includes("ENOTFOUND")) {
      throw new Error(
        `Supabase 연결 실패: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n` +
          "→ Dashboard에서 Project URL 확인, SQL 마이그레이션 실행 여부 확인"
      );
    }
    if (error.code === "PGRST205" || error.message?.includes("does not exist")) {
      throw new Error(
        "apartments 테이블이 없습니다. supabase/migrations/001_real_estate_schema.sql 을 SQL Editor에서 먼저 실행하세요."
      );
    }
    throw new Error(`Supabase 확인 실패: ${error.message}`);
  }
}

async function preloadApartments() {
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("apartments")
      .select("id,name,dong,jibun")
      .eq("sigungu_code", LAWD_CD)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`apartments preload: ${error.message}`);
    }

    if (!data?.length) break;

    for (const row of data) {
      const key = aptNaturalKey(LAWD_CD, row.name, row.dong || "", row.jibun || "");
      apartmentIdCache.set(key, row.id);
      knownApartmentKeys.add(key);
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }
}

async function upsertApartment(row) {
  const name = row.aptNm;
  const dong = row.umdNm || "";
  const jibun = row.jibun || "";
  const key = aptNaturalKey(LAWD_CD, name, dong, jibun);

  if (apartmentIdCache.has(key)) {
    return apartmentIdCache.get(key);
  }

  const isNew = !knownApartmentKeys.has(key);

  const payload = {
    name,
    sigungu_code: LAWD_CD,
    dong,
    jibun,
    build_year: row.buildYear || null,
  };

  const { data, error } = await supabase
    .from("apartments")
    .upsert(payload, { onConflict: "sigungu_code,name,dong,jibun" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`apartments upsert: ${error.message}`);
  }

  apartmentIdCache.set(key, data.id);
  knownApartmentKeys.add(key);
  if (isNew) stats.newApartments++;
  return data.id;
}

async function insertTransactionsBatch(rows) {
  if (!rows.length) return { inserted: 0, skipped: 0, byType: {} };

  const byType = {};
  for (const row of rows) {
    byType[row.deal_type] = (byType[row.deal_type] || 0) + 1;
  }

  const { data, error } = await supabase
    .from("transactions")
    .upsert(rows, {
      onConflict:
        "apartment_id,deal_type,deal_year,deal_month,deal_day,deal_amount,floor,exclu_use_ar",
      ignoreDuplicates: true,
    })
    .select("id,deal_type");

  if (error) {
    if (error.code === "23505" || error.message?.includes("duplicate")) {
      const result = { inserted: 0, skipped: rows.length, byType: {} };
      for (const [type, count] of Object.entries(byType)) {
        result.byType[type] = { inserted: 0, skipped: count };
      }
      return result;
    }
    throw new Error(`transactions insert: ${error.message}`);
  }

  const insertedByType = {};
  for (const row of data || []) {
    insertedByType[row.deal_type] = (insertedByType[row.deal_type] || 0) + 1;
  }

  const result = { inserted: data?.length ?? 0, skipped: rows.length - (data?.length ?? 0), byType: {} };
  for (const [type, count] of Object.entries(byType)) {
    const inserted = insertedByType[type] || 0;
    result.byType[type] = { inserted, skipped: count - inserted };
  }
  return result;
}

function applyBatchStats(batchResult) {
  for (const [type, counts] of Object.entries(batchResult.byType)) {
    if (!stats.byType[type]) continue;
    stats.byType[type].inserted += counts.inserted;
    stats.byType[type].skipped += counts.skipped;
  }
}

async function processItems(items, kindLabel) {
  const monthStats = {
    total: items.length,
    inserted: 0,
    skipped: 0,
    byType: { 전세: 0, 월세: 0 },
  };

  const txBuffer = [];

  for (const item of items) {
    if (!item.aptNm || !item.dealAmount) continue;

    stats.byType[item.dealType].fetched++;

    if (item.dealType === "전세") monthStats.byType.전세++;
    if (item.dealType === "월세") monthStats.byType.월세++;

    try {
      const apartmentId = await upsertApartment(item);

      const tx = {
        apartment_id: apartmentId,
        deal_amount: item.dealAmount,
        deal_year: item.dealYear,
        deal_month: item.dealMonth,
        deal_day: item.dealDay,
        exclu_use_ar: item.excluUseAr,
        floor: item.floor,
        deal_type: item.dealType,
        source: "molit",
      };

      if (item.dealType === "월세") {
        tx.monthly_rent = item.monthlyRent;
        tx.rent_deposit = item.rentDeposit;
      }

      txBuffer.push(tx);

      if (txBuffer.length >= BATCH_SIZE) {
        const result = await insertTransactionsBatch(txBuffer.splice(0, BATCH_SIZE));
        monthStats.inserted += result.inserted;
        monthStats.skipped += result.skipped;
        applyBatchStats(result);
      }
    } catch (err) {
      stats.errors++;
      console.warn(`  ⚠ 건 처리 오류: ${err.message}`);
    }
  }

  if (txBuffer.length) {
    try {
      const result = await insertTransactionsBatch(txBuffer);
      monthStats.inserted += result.inserted;
      monthStats.skipped += result.skipped;
      applyBatchStats(result);
    } catch (err) {
      stats.errors++;
      console.warn(`  ⚠ 배치 insert 오류: ${err.message}`);
    }
  }

  return monthStats;
}

async function processTradeMonth(ym) {
  const dealYmd = toDealYmd(ym);
  let items = [];

  try {
    const result = await fetchMolitMonth(
      TRADE_URL,
      MOLIT_TRADE_KEY,
      LAWD_CD,
      dealYmd,
      parseTradeItems,
      "매매"
    );
    items = result.items;
    await sleep(API_DELAY_MS);
  } catch (err) {
    console.error(`  ❌ [매매 ${ym}] API 실패: ${err.message}`);
    stats.errors++;
    return;
  }

  const monthStats = await processItems(items, "매매");
  console.log(
    `[매매 ${ym}] ${monthStats.total}건 → 신규 ${monthStats.inserted}, 중복 ${monthStats.skipped}`
  );
}

async function processRentMonth(ym) {
  const dealYmd = toDealYmd(ym);
  let items = [];

  try {
    const result = await fetchMolitMonth(
      RENT_URL,
      MOLIT_RENT_KEY,
      LAWD_CD,
      dealYmd,
      parseRentItems,
      "전월세"
    );
    items = result.items;
    await sleep(API_DELAY_MS);
  } catch (err) {
    console.error(`  ❌ [전세 ${ym}] API 실패: ${err.message}`);
    stats.errors++;
    return;
  }

  const monthStats = await processItems(items, "전월세");
  const rentDetail =
    monthStats.byType.전세 || monthStats.byType.월세
      ? ` (전세 ${monthStats.byType.전세}, 월세 ${monthStats.byType.월세})`
      : "";
  console.log(
    `[전세 ${ym}] ${monthStats.total}건 → 신규 ${monthStats.inserted}, 중복 ${monthStats.skipped}${rentDetail}`
  );
}

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min > 0) return `${min}분 ${remSec}초`;
  return `${sec}초`;
}

async function main() {
  const started = Date.now();
  const monthList = buildMonthRange(FROM_YM, TO_YM);
  const totalMonths = monthList.length;

  console.log("=== 국토부 5년+ 실거래 → Supabase 적재 ===");
  console.log(`지역코드: ${LAWD_CD} | 기간: ${FROM_YM} ~ ${TO_YM} (${totalMonths}개월)`);
  console.log(`예상 API 호출: 매매 ${totalMonths}회 + 전월세 ${totalMonths}회 = ${totalMonths * 2}회\n`);

  console.log("Supabase 연결 확인 중...");
  await verifySupabase();
  console.log("✅ Supabase 연결 OK");

  console.log("기존 단지 목록 로드 중...");
  await preloadApartments();
  console.log(`✅ 기존 단지 ${knownApartmentKeys.size}개 캐시\n`);

  let rentEnabled = await verifyRentApi(monthList[0]);
  if (rentEnabled) await sleep(API_DELAY_MS);

  for (const ym of monthList) {
    await processTradeMonth(ym);
    if (rentEnabled) {
      await processRentMonth(ym);
    }
    stats.monthsCompleted++;
    console.log(`${stats.monthsCompleted}/${totalMonths} 개월 완료\n`);
  }

  const elapsed = formatDuration(Date.now() - started);

  console.log("========== 처리 결과 요약 ==========");
  console.log(`매매 거래 수: ${stats.byType.매매.fetched.toLocaleString()}건 (신규 ${stats.byType.매매.inserted.toLocaleString()}, 중복 ${stats.byType.매매.skipped.toLocaleString()})`);
  console.log(`전세 거래 수: ${stats.byType.전세.fetched.toLocaleString()}건 (신규 ${stats.byType.전세.inserted.toLocaleString()}, 중복 ${stats.byType.전세.skipped.toLocaleString()})`);
  console.log(`월세 거래 수: ${stats.byType.월세.fetched.toLocaleString()}건 (신규 ${stats.byType.월세.inserted.toLocaleString()}, 중복 ${stats.byType.월세.skipped.toLocaleString()})`);
  console.log(`신규 단지 수: ${stats.newApartments.toLocaleString()}개`);
  console.log(`에러: ${stats.errors}건`);
  console.log(`소요 시간: ${elapsed}`);
  console.log("====================================");

  if (stats.newApartments > 0) {
    console.log("\n💡 신규 단지가 발견되었습니다.");
    console.log("   scripts/geocode-apartments.mjs 를 재실행해서 좌표 변환하세요.");
  }
}

main().catch((err) => {
  console.error("치명적 오류:", err.message);
  process.exit(1);
});
