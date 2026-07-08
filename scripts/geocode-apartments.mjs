/**
 * apartments 단지 → 카카오 지오코딩 → 위경도 저장
 *
 * 실행:
 *   node scripts/geocode-apartments.mjs
 *
 * 로그: data/nationwide/geocode.log
 * 실패: data/nationwide/geocode-failed.json
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, appendFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import { geocodePrefix as gyeonggiPrefix } from "./lib/gyeonggi-districts.mjs";
import { getAllLawdCodes } from "./lib/nationwide-districts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data", "nationwide");
const LOG_FILE = path.join(DATA_DIR, "geocode.log");
const FAILED_FILE = path.join(DATA_DIR, "geocode-failed.json");

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET", "KAKAO_REST_KEY"]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const KAKAO_KEY = process.env.KAKAO_REST_KEY;
const DELAY_MS = 100;
const PROGRESS_EVERY = 50;
const KAKAO_KA_HEADER =
  process.env.KAKAO_KA_HEADER ||
  "sdk/1.0 os/javascript lang/ko origin/https://seungbak.com";

mkdirSync(DATA_DIR, { recursive: true });

/** 시군구 코드 → 주소 접두사 (서울 25개구) */
const SIGUNGU_PREFIX = {
  "11110": "서울 종로구",
  "11140": "서울 중구",
  "11170": "서울 용산구",
  "11200": "서울 성동구",
  "11215": "서울 광진구",
  "11230": "서울 동대문구",
  "11260": "서울 중랑구",
  "11290": "서울 성북구",
  "11305": "서울 강북구",
  "11320": "서울 도봉구",
  "11350": "서울 노원구",
  "11380": "서울 은평구",
  "11410": "서울 서대문구",
  "11440": "서울 마포구",
  "11470": "서울 양천구",
  "11500": "서울 강서구",
  "11530": "서울 구로구",
  "11545": "서울 금천구",
  "11560": "서울 영등포구",
  "11590": "서울 동작구",
  "11620": "서울 관악구",
  "11650": "서울 서초구",
  "11680": "서울 강남구",
  "11710": "서울 송파구",
  "11740": "서울 강동구",
};

for (const row of getAllLawdCodes()) {
  if (!SIGUNGU_PREFIX[row.code]) {
    SIGUNGU_PREFIX[row.code] = `${row.sidoShort} ${row.name}`;
  }
}

const stats = {
  total: 0,
  success: 0,
  failed: 0,
  cacheHit: 0,
};

const failedList = [];
const cacheByAddress = new Map();

function log(line) {
  const msg = `[${new Date().toISOString()}] ${line}`;
  console.log(line);
  appendFileSync(LOG_FILE, msg + "\n");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function kakaoHeaders() {
  return {
    Authorization: `KakaoAK ${KAKAO_KEY}`,
    KA: KAKAO_KA_HEADER,
  };
}

function regionPrefix(sigunguCode) {
  const code = sigunguCode?.trim();
  if (SIGUNGU_PREFIX[code]) return SIGUNGU_PREFIX[code];
  const gg = gyeonggiPrefix(code);
  if (gg !== "경기도") return gg;
  return SIGUNGU_PREFIX[code] || "대한민국";
}

async function withRetry(fn, label) {
  let lastErr;
  for (let i = 1; i <= 3; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < 3) await sleep(500);
    }
  }
  throw new Error(`${label}: ${lastErr.message}`);
}

async function loadCoordinatesCache() {
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("coordinates_cache")
      .select("address, latitude, longitude")
      .range(from, from + 999);
    if (error) throw new Error(`캐시 로드: ${error.message}`);
    if (!data?.length) break;
    for (const row of data) {
      if (row.address && row.latitude != null) {
        cacheByAddress.set(row.address, row);
      }
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  log(`coordinates_cache 로드: ${cacheByAddress.size}건`);
}

async function kakaoSearch(url, query) {
  const res = await fetch(`${url}?query=${encodeURIComponent(query)}`, {
    headers: kakaoHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${text.slice(0, 120)}`);
  }

  const json = await res.json();
  const doc = json.documents?.[0];
  if (!doc) return null;

  return {
    latitude: parseFloat(doc.y),
    longitude: parseFloat(doc.x),
    address: query,
  };
}

function buildQueries(apt) {
  const region = regionPrefix(apt.sigungu_code);
  const dong = (apt.dong || "").trim();
  const name = (apt.name || "").trim();
  const jibun = (apt.jibun || "").trim();
  const attempts = [];

  if (dong && name) {
    attempts.push({
      query: `${region} ${dong} ${name}`,
      url: "https://dapi.kakao.com/v2/local/search/keyword.json",
    });
  }
  if (dong && jibun) {
    attempts.push({
      query: `${region} ${dong} ${jibun}`,
      url: "https://dapi.kakao.com/v2/local/search/address.json",
    });
  }
  if (dong && name) {
    attempts.push({
      query: `${region} ${name}`,
      url: "https://dapi.kakao.com/v2/local/search/keyword.json",
    });
  }
  return attempts;
}

async function geocodeApartment(apt) {
  const attempts = buildQueries(apt);

  for (const attempt of attempts) {
    const cached = cacheByAddress.get(attempt.query);
    if (cached) {
      stats.cacheHit++;
      return {
        latitude: cached.latitude,
        longitude: cached.longitude,
        address: attempt.query,
        fromCache: true,
      };
    }

    const result = await withRetry(
      () => kakaoSearch(attempt.url, attempt.query),
      attempt.query
    );
    if (result) return result;
    await sleep(DELAY_MS);
  }

  return null;
}

async function saveResult(apt, geo) {
  const { error: aptError } = await supabase
    .from("apartments")
    .update({
      latitude: geo.latitude,
      longitude: geo.longitude,
    })
    .eq("id", apt.id);

  if (aptError) throw new Error(`apartments update: ${aptError.message}`);

  const { error: cacheError } = await supabase.from("coordinates_cache").upsert(
    {
      address: geo.address,
      latitude: geo.latitude,
      longitude: geo.longitude,
      provider: "kakao",
    },
    { onConflict: "address" }
  );

  if (cacheError) throw new Error(`coordinates_cache upsert: ${cacheError.message}`);
  cacheByAddress.set(geo.address, geo);
}

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  return `${min}분 ${sec % 60}초`;
}

function label(apt) {
  return `${apt.dong || "?"} ${apt.name}`;
}

function saveFailed() {
  writeFileSync(
    FAILED_FILE,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        count: failedList.length,
        items: failedList,
      },
      null,
      2
    )
  );
}

async function fetchApartmentsNeedingGeo() {
  const pageSize = 1000;
  const all = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("apartments")
      .select("id, name, dong, jibun, sigungu_code, latitude, longitude")
      .is("latitude", null)
      .order("sigungu_code", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`조회 실패: ${error.message}`);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

async function main() {
  const started = Date.now();
  if (existsSync(LOG_FILE)) {
    appendFileSync(LOG_FILE, `\n--- 새 실행 ${new Date().toISOString()} ---\n`);
  }

  log("=== 카카오 지오코딩 → apartments 좌표 저장 ===");

  await loadCoordinatesCache();
  const apartments = await fetchApartmentsNeedingGeo();
  stats.total = apartments.length;

  if (stats.total === 0) {
    log("좌표가 비어 있는 단지가 없습니다. (이미 모두 처리됨)");
    return;
  }

  log(`처리 대상: ${stats.total}개 (호출 간격 ${DELAY_MS}ms)`);

  for (let i = 0; i < apartments.length; i++) {
    const apt = apartments[i];
    const idx = i + 1;

    try {
      const geo = await geocodeApartment(apt);

      if (geo) {
        await saveResult(apt, geo);
        stats.success++;
        if (idx % PROGRESS_EVERY === 0 || idx === stats.total) {
          const pct = ((idx / stats.total) * 100).toFixed(1);
          log(
            `[${idx}/${stats.total}] ${pct}% — 성공 ${stats.success}, 실패 ${stats.failed}, 캐시히트 ${stats.cacheHit}`
          );
        }
      } else {
        stats.failed++;
        failedList.push({
          id: apt.id,
          name: apt.name,
          dong: apt.dong,
          jibun: apt.jibun,
          sigungu_code: apt.sigungu_code,
          queries: buildQueries(apt).map((q) => q.query),
        });
        if (failedList.length % 20 === 0) saveFailed();
      }
    } catch (err) {
      stats.failed++;
      failedList.push({
        id: apt.id,
        name: apt.name,
        dong: apt.dong,
        sigungu_code: apt.sigungu_code,
        error: err.message,
      });
      log(`[${idx}/${stats.total}] ${label(apt)} → 오류: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  saveFailed();

  const elapsed = formatDuration(Date.now() - started);
  const rate = stats.total ? ((stats.success / stats.total) * 100).toFixed(1) : "0";

  log("\n========== 처리 결과 ==========");
  log(`처리 대상: ${stats.total}개`);
  log(`성공: ${stats.success}개`);
  log(`실패: ${stats.failed}개`);
  log(`캐시 히트: ${stats.cacheHit}회`);
  log(`소요 시간: ${elapsed}`);
  log(`성공률: ${rate}%`);
  log(`실패 목록: ${FAILED_FILE}`);
  log("==============================");
}

main().catch((err) => {
  log(`치명적 오류: ${err.message}`);
  process.exit(1);
});
