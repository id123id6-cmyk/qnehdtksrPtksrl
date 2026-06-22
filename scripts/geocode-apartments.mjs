/**
 * apartments 단지 → 카카오 지오코딩 → 위경도 저장
 *
 * 실행:
 *   node scripts/geocode-apartments.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import { geocodePrefix as gyeonggiPrefix } from "./lib/gyeonggi-districts.mjs";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET", "KAKAO_REST_KEY"]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const KAKAO_KEY = process.env.KAKAO_REST_KEY;
const DELAY_MS = 100;
const KAKAO_KA_HEADER =
  process.env.KAKAO_KA_HEADER ||
  "sdk/1.0 os/javascript lang/ko origin/https://seungbak.com";

function kakaoHeaders() {
  return {
    Authorization: `KakaoAK ${KAKAO_KEY}`,
    KA: KAKAO_KA_HEADER,
  };
}

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

const stats = {
  total: 0,
  success: 0,
  failed: 0,
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function regionPrefix(sigunguCode) {
  const code = sigunguCode?.trim();
  if (SIGUNGU_PREFIX[code]) return SIGUNGU_PREFIX[code];
  const gg = gyeonggiPrefix(code);
  if (gg !== "경기도") return gg;
  return "서울";
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

async function geocodeApartment(apt) {
  const region = regionPrefix(apt.sigungu_code);
  const dong = (apt.dong || "").trim();
  const name = (apt.name || "").trim();
  const jibun = (apt.jibun || "").trim();

  const attempts = [];

  if (dong && name) {
    attempts.push({
      type: "keyword",
      query: `${region} ${dong} ${name}`,
      url: "https://dapi.kakao.com/v2/local/search/keyword.json",
    });
  }

  if (dong && jibun) {
    attempts.push({
      type: "address",
      query: `${region} ${dong} ${jibun}`,
      url: "https://dapi.kakao.com/v2/local/search/address.json",
    });
  }

  if (dong && name) {
    attempts.push({
      type: "keyword",
      query: `${region} ${name}`,
      url: "https://dapi.kakao.com/v2/local/search/keyword.json",
    });
  }

  for (const attempt of attempts) {
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
}

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  return `${min}분 ${sec % 60}초`;
}

function label(apt) {
  const dong = apt.dong || "?";
  return `${dong} ${apt.name}`;
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
      .order("dong", { ascending: true })
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

  console.log("=== 카카오 지오코딩 → apartments 좌표 저장 ===\n");

  const apartments = await fetchApartmentsNeedingGeo();

  stats.total = apartments.length;

  if (stats.total === 0) {
    console.log("좌표가 비어 있는 단지가 없습니다. (이미 모두 처리됨)");
    return;
  }

  console.log(`처리 대상: ${stats.total}개\n`);

  for (let i = 0; i < apartments.length; i++) {
    const apt = apartments[i];
    const idx = i + 1;

    try {
      const geo = await geocodeApartment(apt);

      if (geo) {
        await saveResult(apt, geo);
        stats.success++;
        console.log(
          `[${idx}/${stats.total}] ${label(apt)} → (${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}) ✅`
        );
      } else {
        stats.failed++;
        console.log(`[${idx}/${stats.total}] ${label(apt)} → 검색 실패 ❌`);
      }
    } catch (err) {
      stats.failed++;
      console.log(`[${idx}/${stats.total}] ${label(apt)} → 오류: ${err.message} ❌`);
    }

    await sleep(DELAY_MS);
  }

  const elapsed = formatDuration(Date.now() - started);
  const rate = stats.total ? ((stats.success / stats.total) * 100).toFixed(1) : "0";

  console.log("\n========== 처리 결과 ==========");
  console.log(`처리 대상: ${stats.total}개`);
  console.log(`성공: ${stats.success}개 (위경도 채워짐)`);
  console.log(`실패: ${stats.failed}개 (주소 검색 실패)`);
  console.log(`소요 시간: ${elapsed}`);
  console.log(`성공률: ${rate}%`);
  console.log("==============================");
}

main().catch((err) => {
  console.error("치명적 오류:", err.message);
  process.exit(1);
});
