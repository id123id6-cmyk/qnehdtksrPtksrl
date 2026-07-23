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
const LOOKBACK_DAYS = 60;

const FIELDS = [
  'HOUSE_NM',
  'HOUSE_DTL_SECD_NM',
  'SUBSCRPT_AREA_CODE_NM',
  'HSSPLY_ADRES',
  'TOT_SUPLY_HSHLDCO',
  'RCRIT_PBLANC_DE',
  'RCEPT_BGNDE',
  'RCEPT_ENDDE',
  'PRZWNER_PRESNATN_DE',
  'MVN_PREARNGE_YM',
  'PBLANC_URL',
];

function formatYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function pick(row) {
  const out = {};
  for (const key of FIELDS) {
    out[key] = row[key] ?? row[key.toLowerCase()] ?? '';
  }
  // 숫자 세대수 정규화
  const n = Number(String(out.TOT_SUPLY_HSHLDCO).replace(/,/g, ''));
  out.TOT_SUPLY_HSHLDCO = Number.isFinite(n) ? n : out.TOT_SUPLY_HSHLDCO;
  return out;
}

async function fetchPage(serviceKey, page, gte, lte) {
  const url = new URL(API_URL);
  url.searchParams.set('page', String(page));
  url.searchParams.set('perPage', String(PER_PAGE));
  url.searchParams.set('returnType', 'JSON');
  url.searchParams.set('serviceKey', serviceKey);
  url.searchParams.set('cond[RCRIT_PBLANC_DE::GTE]', gte);
  url.searchParams.set('cond[RCRIT_PBLANC_DE::LTE]', lte);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  const serviceKey = process.env.BUNYANG_API_KEY;
  if (!serviceKey) {
    console.error('BUNYANG_API_KEY 환경변수가 없습니다.');
    process.exit(1);
  }

  const today = new Date();
  const lte = formatYmd(today);
  const past = new Date(today);
  past.setDate(past.getDate() - LOOKBACK_DAYS);
  const gte = formatYmd(past);

  console.log(`Fetching ${gte} ~ ${lte} (last ${LOOKBACK_DAYS} days)...`);

  let page = 1;
  let totalMatch = Infinity;
  const items = [];

  while ((page - 1) * PER_PAGE < totalMatch) {
    const json = await fetchPage(serviceKey, page, gte, lte);
    const rows = Array.isArray(json.data) ? json.data : [];
    const match =
      typeof json.matchCount === 'number'
        ? json.matchCount
        : typeof json.totalCount === 'number'
          ? json.totalCount
          : rows.length;

    totalMatch = match;
    for (const row of rows) items.push(pick(row));

    console.log(`page ${page}: +${rows.length} (total ${items.length}/${totalMatch})`);

    if (rows.length === 0) break;
    page += 1;
    if (page > 50) {
      console.warn('page 상한(50) 도달 — 중단');
      break;
    }
  }

  // 모집공고일 내림차순
  items.sort((a, b) => String(b.RCRIT_PBLANC_DE).localeCompare(String(a.RCRIT_PBLANC_DE)));

  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail',
    range: { gte, lte, lookbackDays: LOOKBACK_DAYS },
    count: items.length,
    items,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${OUT_PATH} (${items.length} items)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
