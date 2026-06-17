/**
 * 국토부 아파트 매매 실거래 → Supabase 적재
 *
 * 실행:
 *   node scripts/import-molit-to-supabase.mjs --lawd 11680 --months 12
 *
 * 필요 패키지:
 *   npm install @supabase/supabase-js
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

loadEnvLocal();
requireEnv(["MOLIT_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const MOLIT_BASE_URL =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";

const BATCH_SIZE = 200;
const PAGE_SIZE = 1000;

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const LAWD_CD = getArg("lawd", "11680");
const MONTHS = parseInt(getArg("months", "12"), 10);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const stats = {
  apartmentsSeen: new Set(),
  apartmentsUpserted: 0,
  transactionsAttempted: 0,
  transactionsInserted: 0,
  transactionsSkipped: 0,
  errors: 0,
};

const apartmentIdCache = new Map();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function aptNaturalKey(sigunguCode, name, dong, jibun) {
  return `${sigunguCode}|${name}|${dong || ""}|${jibun || ""}`;
}

function getRecentMonths(count) {
  const list = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    list.push(`${y}${m}`);
    d.setMonth(d.getMonth() - 1);
  }
  return list;
}

function pickXml(block, tag) {
  const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1].trim() : "";
}

function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
    const b = match[1];
    const dealAmountRaw = pickXml(b, "dealAmount").replace(/,/g, "");
    const floorRaw = pickXml(b, "floor");
    const areaRaw = pickXml(b, "excluUseAr");
    const buildYearRaw = pickXml(b, "buildYear");

    return {
      aptNm: pickXml(b, "aptNm"),
      umdNm: pickXml(b, "umdNm"),
      jibun: pickXml(b, "jibun"),
      buildYear: buildYearRaw ? parseInt(buildYearRaw, 10) : null,
      dealAmount: dealAmountRaw ? parseInt(dealAmountRaw, 10) : 0,
      dealYear: parseInt(pickXml(b, "dealYear"), 10),
      dealMonth: parseInt(pickXml(b, "dealMonth"), 10),
      dealDay: parseInt(pickXml(b, "dealDay"), 10),
      excluUseAr: areaRaw ? parseFloat(areaRaw) : null,
      floor: floorRaw ? parseInt(floorRaw, 10) : null,
    };
  });
}

async function withRetry(fn, label) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`  ⚠ ${label} 실패 (${attempt}/3): ${err.message}`);
      if (attempt < 3) await sleep(1000);
    }
  }
  throw lastErr;
}

async function fetchMolitPage(lawd, ym, pageNo) {
  const url = new URL(MOLIT_BASE_URL);
  url.searchParams.set("serviceKey", process.env.MOLIT_API_KEY);
  url.searchParams.set("LAWD_CD", lawd);
  url.searchParams.set("DEAL_YMD", ym);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(PAGE_SIZE));

  const res = await fetch(url.toString());
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const resultCode = pickXml(text, "resultCode") || text.match(/<resultCode>([^<]+)<\/resultCode>/)?.[1]?.trim();
  if (resultCode && resultCode !== "000") {
    const msg = text.match(/<resultMsg>([^<]+)<\/resultMsg>/)?.[1] || "";
    throw new Error(`API resultCode=${resultCode} ${msg}`);
  }

  const totalCount = parseInt(
    text.match(/<totalCount>([^<]+)<\/totalCount>/)?.[1] || "0",
    10
  );
  const items = parseItems(text);
  return { totalCount, items };
}

async function fetchMolitMonth(lawd, ym) {
  const first = await withRetry(() => fetchMolitPage(lawd, ym, 1), `${ym} page 1`);
  let all = [...first.items];

  const totalPages = Math.ceil(first.totalCount / PAGE_SIZE);
  for (let page = 2; page <= totalPages; page++) {
    const { items } = await withRetry(
      () => fetchMolitPage(lawd, ym, page),
      `${ym} page ${page}`
    );
    all = all.concat(items);
  }

  return { totalCount: first.totalCount, items: all };
}

async function verifySupabase() {
  const { error } = await supabase.from("apartments").select("id", { count: "exact", head: true });
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

async function upsertApartment(row) {
  const name = row.aptNm;
  const dong = row.umdNm || "";
  const jibun = row.jibun || "";
  const key = aptNaturalKey(LAWD_CD, name, dong, jibun);

  if (apartmentIdCache.has(key)) {
    return apartmentIdCache.get(key);
  }

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
  stats.apartmentsSeen.add(key);
  stats.apartmentsUpserted++;
  return data.id;
}

async function insertTransactionsBatch(rows) {
  if (!rows.length) return;

  stats.transactionsAttempted += rows.length;

  const { data, error } = await supabase
    .from("transactions")
    .upsert(rows, {
      onConflict:
        "apartment_id,deal_type,deal_year,deal_month,deal_day,deal_amount,floor,exclu_use_ar",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    if (error.code === "23505" || error.message?.includes("duplicate")) {
      stats.transactionsSkipped += rows.length;
      return;
    }
    throw new Error(`transactions insert: ${error.message}`);
  }

  const inserted = data?.length ?? 0;
  stats.transactionsInserted += inserted;
  stats.transactionsSkipped += rows.length - inserted;
}

async function processMonth(ym, index, total) {
  let items = [];
  try {
    const result = await fetchMolitMonth(LAWD_CD, ym);
    items = result.items;
  } catch (err) {
    console.error(`  ❌ ${ym} API 실패 (3회 재시도 후): ${err.message}`);
    stats.errors++;
    return { ym, processed: 0, apartments: 0 };
  }

  const aptKeysThisMonth = new Set();
  const txBuffer = [];

  for (const item of items) {
    if (!item.aptNm || !item.dealAmount) continue;

    try {
      const apartmentId = await upsertApartment(item);
      const key = aptNaturalKey(LAWD_CD, item.aptNm, item.umdNm || "", item.jibun || "");
      aptKeysThisMonth.add(key);

      txBuffer.push({
        apartment_id: apartmentId,
        deal_amount: item.dealAmount,
        deal_year: item.dealYear,
        deal_month: item.dealMonth,
        deal_day: item.dealDay,
        exclu_use_ar: item.excluUseAr,
        floor: item.floor,
        deal_type: "매매",
        source: "molit",
      });

      if (txBuffer.length >= BATCH_SIZE) {
        await insertTransactionsBatch(txBuffer.splice(0, BATCH_SIZE));
      }
    } catch (err) {
      stats.errors++;
      console.warn(`  ⚠ 건 처리 오류: ${err.message}`);
    }
  }

  if (txBuffer.length) {
    try {
      await insertTransactionsBatch(txBuffer);
    } catch (err) {
      stats.errors++;
      console.warn(`  ⚠ 배치 insert 오류: ${err.message}`);
    }
  }

  const label = `[${index}/${total}] ${ym.slice(0, 4)}-${ym.slice(4)}`;
  console.log(
    `${label}: ${items.length}건 처리 (단지 ${aptKeysThisMonth.size}개, 거래 ${items.length}건)`
  );

  return { ym, processed: items.length, apartments: aptKeysThisMonth.size };
}

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}분 ${remSec}초`;
}

async function main() {
  const started = Date.now();
  const monthList = getRecentMonths(MONTHS);

  console.log("=== 국토부 → Supabase 적재 ===");
  console.log(`지역코드: ${LAWD_CD} | 기간: 최근 ${MONTHS}개월`);
  console.log(`대상 월: ${monthList.join(", ")}\n`);

  console.log("Supabase 연결 확인 중...");
  await verifySupabase();
  console.log("✅ Supabase 연결 OK\n");

  for (let i = 0; i < monthList.length; i++) {
    await processMonth(monthList[i], i + 1, monthList.length);
  }

  const elapsed = formatDuration(Date.now() - started);

  console.log("\n========== 처리 결과 요약 ==========");
  console.log(`총 단지 수: ${stats.apartmentsSeen.size}개`);
  console.log(`총 거래 수: ${stats.transactionsAttempted}건`);
  console.log(`신규 추가: ${stats.transactionsInserted}건`);
  console.log(`중복 SKIP: ${stats.transactionsSkipped}건`);
  console.log(`에러: ${stats.errors}건`);
  console.log(`소요 시간: ${elapsed}`);
  console.log("====================================");
}

main().catch((err) => {
  console.error("치명적 오류:", err.message);
  process.exit(1);
});
