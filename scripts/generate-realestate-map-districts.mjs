/**
 * nationwide-districts.mjs + DB 좌표 평균 → districts.js용 구역 객체 생성
 * 실행: node scripts/generate-realestate-map-districts.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import { NATIONWIDE_DISTRICTS } from "./lib/nationwide-districts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../data/nationwide/map-districts-generated.json");

const SIDO_ID = {
  "11": "seoul",
  "12": "jeonnamgwangju",
  "26": "busan",
  "27": "daegu",
  "28": "incheon",
  "30": "daejeon",
  "31": "ulsan",
  "36": "sejong",
  "41": "gyeonggi",
  "42": "gangwon",
  "43": "chungbuk",
  "44": "chungnam",
  "45": "jeonbuk",
  "47": "gyeongbuk",
  "48": "gyeongnam",
  "50": "jeju",
};

const SIDO_CENTER = {
  jeonnamgwangju: { lat: 35.1595, lng: 126.8526 },
  daegu: { lat: 35.8714, lng: 128.6014 },
  incheon: { lat: 37.4563, lng: 126.7052 },
  daejeon: { lat: 36.3504, lng: 127.3845 },
  ulsan: { lat: 35.5384, lng: 129.3114 },
  sejong: { lat: 36.4801, lng: 127.289 },
  gangwon: { lat: 37.8813, lng: 127.7298 },
  chungbuk: { lat: 36.8, lng: 127.7 },
  chungnam: { lat: 36.5184, lng: 126.8 },
  jeonbuk: { lat: 35.8242, lng: 127.148 },
  gyeongbuk: { lat: 36.4919, lng: 128.8889 },
  gyeongnam: { lat: 35.4606, lng: 128.2132 },
  jeju: { lat: 33.4996, lng: 126.5312 },
};

const SKIP_SIDO = new Set(["11", "41", "26"]);

function slugify(name, code) {
  return `lawd-${code}`;
}

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function fetchCentroids() {
  const map = new Map();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("apartments")
      .select("sigungu_code, latitude, longitude")
      .not("latitude", "is", null)
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      const code = row.sigungu_code;
      if (!map.has(code)) map.set(code, { lat: 0, lng: 0, n: 0 });
      const c = map.get(code);
      c.lat += row.latitude;
      c.lng += row.longitude;
      c.n++;
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  const out = {};
  for (const [code, c] of map) {
    out[code] = { lat: c.lat / c.n, lng: c.lng / c.n, count: c.n };
  }
  return out;
}

function buildDistricts(centroids) {
  const bySido = {};
  for (const [sidoCode, entry] of Object.entries(NATIONWIDE_DISTRICTS)) {
    if (SKIP_SIDO.has(sidoCode)) continue;
    const sidoId = SIDO_ID[sidoCode];
    if (!sidoId) continue;
    const center = SIDO_CENTER[sidoId] || { lat: 36.5, lng: 127.5 };
    const districts = {};
    for (const d of entry.districts) {
      const c = centroids[d.code];
      const lat = c ? Number(c.lat.toFixed(4)) : center.lat;
      const lng = c ? Number(c.lng.toFixed(4)) : center.lng;
      const isReady = d.code !== "28720";
      districts[d.code] = {
        name: d.name,
        slug: slugify(d.name, d.code),
        lat,
        lng,
        zoom: 5,
        sido: sidoId,
        ...(isReady ? {} : { isReady: false }),
      };
    }
    bySido[sidoId] = districts;
  }
  return bySido;
}

function toJsObject(name, obj) {
  const lines = Object.entries(obj).map(([code, d]) => {
    const ready = d.isReady === false ? ", isReady: false" : "";
    return `    "${code}": { name: "${d.name}", slug: "${d.slug}", lat: ${d.lat}, lng: ${d.lng}, zoom: ${d.zoom}, sido: "${d.sido}"${ready} },`;
  });
  return `  const ${name} = {\n${lines.join("\n")}\n  };`;
}

const centroids = await fetchCentroids();
const bySido = buildDistricts(centroids);

const jsBlocks = Object.entries(bySido).map(([sidoId, districts]) => {
  const constName = `${sidoId.toUpperCase().replace(/([A-Z])/g, "_$1").replace(/^_/, "")}_DISTRICTS`;
  const altName =
    sidoId === "jeonnamgwangju"
      ? "JEONNAMGWANGJU_DISTRICTS"
      : `${sidoId.toUpperCase()}_DISTRICTS`;
  return { sidoId, constName: altName, js: toJsObject(altName, districts), count: Object.keys(districts).length };
});

writeFileSync(OUT, JSON.stringify({ centroids: Object.keys(centroids).length, bySido, jsBlocks }, null, 2));
console.log(`생성 완료: ${OUT}`);
for (const b of jsBlocks) {
  console.log(`  ${b.constName}: ${b.count}개 구역`);
}
