#!/usr/bin/env node
/**
 * 청약홈 분양정보 API → tools/bunyang-alarm/data.json
 * API 키는 환경변수 BUNYANG_API_KEY 만 사용 (프론트/레포에 하드코딩 금지)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'tools', 'bunyang-alarm', 'data.json');
const API_URL = 'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail';
const PER_PAGE = 100;
/** 조회 하한: 올해 1/1 과 6개월 전 중 더 이른 날 (YYYY-MM-DD) */
const LOOKBACK_MONTHS = 6;

const FIELD_ALIASES = {
  HOUSE_NM: ['HOUSE_NM', 'house_nm', 'HouseNm'],
  HOUSE_DTL_SECD_NM: ['HOUSE_DTL_SECD_NM', 'house_dtl_secd_nm'],
  SUBSCRPT_AREA_CODE_NM: ['SUBSCRPT_AREA_CODE_NM', 'subscrpt_area_code_nm'],
  HSSPLY_ADRES: ['HSSPLY_ADRES', 'hssply_adres'],
  TOT_SUPLY_HSHLDCO: ['TOT_SUPLY_HSHLDCO', 'tot_suply_hshldco'],
  RCRIT_PBLANC_DE: ['RCRIT_PBLANC_DE', 'rcrit_pblanc_de'],
  RCEPT_BGNDE: ['RCEPT_BGNDE', 'rcept_bgnde'],
  RCEPT_ENDDE: ['RCEPT_ENDDE', 'rcept_endde'],
  PRZWNER_PRESNATN_DE: ['PRZWNER_PRESNATN_DE', 'przwner_presnatn_de'],
  MVN_PREARNGE_YM: ['MVN_PREARNGE_YM', 'mvn_prearnge_ym'],
  PBLANC_URL: ['PBLANC_URL', 'pblanc_url'],
};

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateCompact(date) {
  return formatDateISO(date).replace(/-/g, '');
}

/** data.go.kr 키가 이미 % 인코딩된 경우 이중 인코딩 방지 */
function serviceKeyForQuery(raw) {
  const key = String(raw || '').trim();
  if (/%[0-9A-Fa-f]{2}/.test(key)) return key;
  return encodeURIComponent(key);
}

function getField(row, canonical) {
  const aliases = FIELD_ALIASES[canonical] || [canonical];
  for (const key of aliases) {
    if (row[key] != null && row[key] !== '') return row[key];
  }
  const lowerMap = {};
  for (const k of Object.keys(row)) lowerMap[k.toLowerCase()] = row[k];
  for (const key of aliases) {
    const v = lowerMap[key.toLowerCase()];
    if (v != null && v !== '') return v;
  }
  return '';
}

function pick(row) {
  const out = {};
  for (const key of Object.keys(FIELD_ALIASES)) {
    out[key] = getField(row, key);
  }
  const n = Number(String(out.TOT_SUPLY_HSHLDCO).replace(/,/g, ''));
  out.TOT_SUPLY_HSHLDCO = Number.isFinite(n) ? n : out.TOT_SUPLY_HSHLDCO;
  return out;
}

function extractRows(json) {
  if (!json || typeof json !== 'object') return [];
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json)) return json;
  if (json.response?.body?.items?.item) {
    const item = json.response.body.items.item;
    return Array.isArray(item) ? item : [item];
  }
  if (Array.isArray(json.items)) return json.items;
  if (Array.isArray(json.result?.data)) return json.result.data;
  return [];
}

function extractMatchCount(json, rowsLength) {
  if (typeof json?.matchCount === 'number') return json.matchCount;
  if (typeof json?.totalCount === 'number') return json.totalCount;
  const n = Number(json?.response?.body?.totalCount);
  if (Number.isFinite(n)) return n;
  return rowsLength;
}

function buildUrl(serviceKey, page, dateCond) {
  // URLSearchParams는 []를 인코딩하므로 odcloud cond 문법은 수동 조립
  const parts = [
    `page=${page}`,
    `perPage=${PER_PAGE}`,
    `returnType=JSON`,
    `serviceKey=${serviceKeyForQuery(serviceKey)}`,
  ];
  if (dateCond) {
    parts.push(`cond[RCRIT_PBLANC_DE::GTE]=${encodeURIComponent(dateCond.gte)}`);
    parts.push(`cond[RCRIT_PBLANC_DE::LTE]=${encodeURIComponent(dateCond.lte)}`);
  }
  return `${API_URL}?${parts.join('&')}`;
}

async function fetchPage(serviceKey, page, dateCond) {
  const url = buildUrl(serviceKey, page, dateCond);
  const label = dateCond ? `gte=${dateCond.gte} lte=${dateCond.lte}` : 'no-date-filter';
  console.log(`[request] page=${page} ${label}`);

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`API HTTP ${res.status}: ${text.slice(0, 400)}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error('[parse] JSON 파싱 실패. raw head:', text.slice(0, 400));
    throw new Error('API 응답이 JSON이 아닙니다.');
  }
  return json;
}

async function fetchAllPages(serviceKey, dateCond, tag) {
  let page = 1;
  let totalMatch = Infinity;
  const items = [];
  let loggedKeys = false;

  console.log(`[fetch:${tag}] start`);

  while ((page - 1) * PER_PAGE < totalMatch) {
    const json = await fetchPage(serviceKey, page, dateCond);

    if (page === 1) {
      console.log(`[fetch:${tag}] top-level keys:`, Object.keys(json));
      console.log(
        `[fetch:${tag}] meta:`,
        JSON.stringify({
          currentCount: json.currentCount,
          matchCount: json.matchCount,
          page: json.page,
          perPage: json.perPage,
          totalCount: json.totalCount,
        })
      );
    }

    const rows = extractRows(json);
    const match = extractMatchCount(json, rows.length);
    totalMatch = match;

    console.log(
      `[fetch:${tag}] page ${page}: rows=${rows.length}, matchCount/total≈${match}, collected=${items.length + rows.length}`
    );

    if (page === 1 && rows.length === 0) {
      console.warn(`[fetch:${tag}] 1페이지 0건 — 응답 일부:`, JSON.stringify(json).slice(0, 800));
    }

    if (!loggedKeys && rows.length > 0) {
      loggedKeys = true;
      console.log(`[fetch:${tag}] first item keys:`, Object.keys(rows[0]));
      console.log(`[fetch:${tag}] first item preview:`, JSON.stringify(rows[0]).slice(0, 1000));
    }

    for (const row of rows) items.push(pick(row));

    if (rows.length === 0) break;
    if (items.length >= totalMatch) break;
    page += 1;
    if (page > 50) {
      console.warn(`[fetch:${tag}] page 상한(50) 도달 — 중단`);
      break;
    }
  }

  console.log(`[fetch:${tag}] done: ${items.length} items`);
  return items;
}

function computeRange() {
  const today = new Date();
  const lte = formatDateISO(today);

  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - LOOKBACK_MONTHS);

  const yearStart = new Date(today.getFullYear(), 0, 1);
  const gteDate = sixMonthsAgo < yearStart ? sixMonthsAgo : yearStart;
  const gte = formatDateISO(gteDate);

  return {
    gte,
    lte,
    gteCompact: formatDateCompact(gteDate),
    lteCompact: formatDateCompact(today),
    lookbackMonths: LOOKBACK_MONTHS,
    yearStart: formatDateISO(yearStart),
  };
}

async function main() {
  const serviceKey = process.env.BUNYANG_API_KEY;
  if (!serviceKey) {
    console.error('BUNYANG_API_KEY 환경변수가 없습니다.');
    process.exit(1);
  }
  console.log(`[auth] BUNYANG_API_KEY length=${serviceKey.length}`);

  const range = computeRange();
  console.log(
    `[range] primary YYYY-MM-DD ${range.gte} ~ ${range.lte} (올해 시작 ${range.yearStart} 또는 ${LOOKBACK_MONTHS}개월)`
  );

  // 1) 공식 권장: YYYY-MM-DD
  let items = await fetchAllPages(
    serviceKey,
    { gte: range.gte, lte: range.lte },
    'iso-date'
  );
  let usedRange = { gte: range.gte, lte: range.lte, dateFormat: 'YYYY-MM-DD' };

  // 2) 폴백: YYYYMMDD (일부 스키마/구문서)
  if (items.length === 0) {
    console.warn('[fallback] ISO 날짜 0건 → YYYYMMDD 조건으로 재시도');
    items = await fetchAllPages(
      serviceKey,
      { gte: range.gteCompact, lte: range.lteCompact },
      'compact-date'
    );
    usedRange = {
      gte: range.gteCompact,
      lte: range.lteCompact,
      dateFormat: 'YYYYMMDD',
    };
  }

  // 3) 폴백: 날짜 조건 없이 전량 수집 후 클라이언트 필터
  if (items.length === 0) {
    console.warn('[fallback] 날짜 조건 0건 → 조건 없이 수집 후 기간 필터');
    const all = await fetchAllPages(serviceKey, null, 'no-filter');
    const gteN = range.gteCompact;
    const lteN = range.lteCompact;
    items = all.filter((it) => {
      const d = String(it.RCRIT_PBLANC_DE || '').replace(/\D/g, '');
      if (d.length < 8) return true; // 날짜 없으면 일단 포함
      return d >= gteN && d <= lteN;
    });
    usedRange = {
      gte: range.gte,
      lte: range.lte,
      dateFormat: 'client-filter-after-unfiltered-fetch',
      rawFetched: all.length,
    };
    console.log(`[fallback] unfiltered=${all.length}, after client filter=${items.length}`);
  }

  items.sort((a, b) =>
    String(b.RCRIT_PBLANC_DE).localeCompare(String(a.RCRIT_PBLANC_DE))
  );

  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail',
    range: {
      ...usedRange,
      lookbackMonths: LOOKBACK_MONTHS,
      yearStart: range.yearStart,
    },
    count: items.length,
    items,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`[done] Wrote ${OUT_PATH} (${items.length} items)`);
  console.log(`[done] API returned / collected count=${items.length}`);

  if (items.length === 0) {
    console.error('[error] 수집 결과가 0건입니다. Actions 로그의 요청/응답을 확인하세요.');
  } else {
    console.log('[sample] first collected item keys:', Object.keys(items[0]));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
