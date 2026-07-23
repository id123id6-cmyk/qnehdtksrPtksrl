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
/** 최근 6개월 (공고가 드문 경우 60일은 0건이 될 수 있음) */
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

function getField(row, canonical) {
  const aliases = FIELD_ALIASES[canonical] || [canonical];
  for (const key of aliases) {
    if (row[key] != null && row[key] !== '') return row[key];
  }
  // 대소문자 무시 탐색
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
  // 일부 래퍼/구형 응답 대비
  if (json.response?.body?.items?.item) {
    const item = json.response.body.items.item;
    return Array.isArray(item) ? item : [item];
  }
  if (Array.isArray(json.items)) return json.items;
  return [];
}

function extractMatchCount(json, rowsLength) {
  if (typeof json?.matchCount === 'number') return json.matchCount;
  if (typeof json?.totalCount === 'number') return json.totalCount;
  if (typeof json?.currentCount === 'number' && typeof json?.matchCount !== 'number') {
    // currentCount만 있으면 페이지 내 건수일 수 있음
  }
  const n = Number(json?.response?.body?.totalCount);
  if (Number.isFinite(n)) return n;
  return rowsLength;
}

async function fetchPage(serviceKey, page, gte, lte) {
  // URLSearchParams는 []를 인코딩하므로, odcloud cond 문법은 수동 조립
  const params = [
    `page=${page}`,
    `perPage=${PER_PAGE}`,
    `returnType=JSON`,
    `serviceKey=${encodeURIComponent(serviceKey)}`,
    `cond[RCRIT_PBLANC_DE::GTE]=${encodeURIComponent(gte)}`,
    `cond[RCRIT_PBLANC_DE::LTE]=${encodeURIComponent(lte)}`,
  ].join('&');

  const url = `${API_URL}?${params}`;
  console.log(`[request] page=${page} gte=${gte} lte=${lte}`);

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

async function main() {
  const serviceKey = process.env.BUNYANG_API_KEY;
  if (!serviceKey) {
    console.error('BUNYANG_API_KEY 환경변수가 없습니다.');
    process.exit(1);
  }
  console.log(`[auth] BUNYANG_API_KEY length=${serviceKey.length}`);

  const today = new Date();
  const lte = formatDateISO(today);
  const past = new Date(today);
  past.setMonth(past.getMonth() - LOOKBACK_MONTHS);
  const gte = formatDateISO(past);

  console.log(`[range] ${gte} ~ ${lte} (last ${LOOKBACK_MONTHS} months, YYYY-MM-DD)`);

  let page = 1;
  let totalMatch = Infinity;
  const items = [];
  let loggedKeys = false;

  while ((page - 1) * PER_PAGE < totalMatch) {
    const json = await fetchPage(serviceKey, page, gte, lte);

    if (page === 1) {
      console.log('[response] top-level keys:', Object.keys(json));
      console.log(
        '[response] meta:',
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
      `[page ${page}] rows=${rows.length}, matchCount/total≈${match}, collected=${items.length + rows.length}`
    );

    if (page === 1 && rows.length === 0) {
      console.warn('[warn] 1페이지 0건 — 응답 일부:', JSON.stringify(json).slice(0, 800));
    }

    if (!loggedKeys && rows.length > 0) {
      loggedKeys = true;
      console.log('[sample] first item keys:', Object.keys(rows[0]));
      console.log('[sample] first item preview:', JSON.stringify(rows[0]).slice(0, 1000));
    }

    for (const row of rows) items.push(pick(row));

    if (rows.length === 0) break;
    if (items.length >= totalMatch) break;
    page += 1;
    if (page > 50) {
      console.warn('[warn] page 상한(50) 도달 — 중단');
      break;
    }
  }

  items.sort((a, b) =>
    String(b.RCRIT_PBLANC_DE).localeCompare(String(a.RCRIT_PBLANC_DE))
  );

  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail',
    range: { gte, lte, lookbackMonths: LOOKBACK_MONTHS, dateFormat: 'YYYY-MM-DD' },
    count: items.length,
    items,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`[done] Wrote ${OUT_PATH} (${items.length} items)`);

  if (items.length === 0) {
    console.error('[error] 수집 결과가 0건입니다. Actions 로그의 요청/응답을 확인하세요.');
    // 0건이어도 파일을 갱신해 원인 추적이 가능하도록 exit 0 유지
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
