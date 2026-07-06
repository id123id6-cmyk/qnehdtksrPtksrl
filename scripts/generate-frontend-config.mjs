/**
 * 환경 변수 → tools/realestate-map/config.js 생성
 * 로컬: .env.local | Vercel: process.env (빌드 시)
 * Publishable 키만 포함 (Secret 키 사용 안 함)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, requireEnv } from "./load-env.mjs";

loadEnv();
requireEnv([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_KEY",
]);

const kakaoRestKey = process.env.KAKAO_REST_KEY || "";
if (!kakaoRestKey) {
  console.warn(
    "⚠️  KAKAO_REST_KEY 가 없습니다. 지하철·학교 검색 등 REST API 기능이 제한될 수 있습니다.\n" +
      "    Vercel: Project Settings > Environment Variables 에 KAKAO_REST_KEY 를 추가하세요."
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, "../tools/realestate-map/config.js");

async function resolveKakaoMapKey() {
  const candidates = [
    ["NEXT_PUBLIC_KAKAO_JS_KEY", process.env.NEXT_PUBLIC_KAKAO_JS_KEY],
    ["NEXT_PUBLIC_KAKAO_MAP_KEY", process.env.NEXT_PUBLIC_KAKAO_MAP_KEY],
  ].filter(([, key]) => key);

  for (const [name, key] of candidates) {
    const res = await fetch(
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=clusterer`
    );
    if (res.ok) {
      return { key, source: name, valid: true };
    }
  }

  const fallback = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!fallback) {
    throw new Error(
      "NEXT_PUBLIC_KAKAO_JS_KEY 가 없습니다. .env.local.example 을 참고하세요."
    );
  }

  console.warn(
    "⚠️  현재 NEXT_PUBLIC_KAKAO_JS_KEY 가 카카오맵 JavaScript 키가 아닙니다.\n" +
      "    카카오 개발자 콘솔 > 플랫폼 키에서 JavaScript 키를 발급해 교체하세요.\n" +
      "    Web 플랫폼: http://localhost, https://seungbak.com 등록 필요"
  );

  return { key: fallback, source: "NEXT_PUBLIC_KAKAO_JS_KEY (미검증)", valid: false };
}

const kakao = await resolveKakaoMapKey();

const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_KEY,
  kakaoJsKey: kakao.key,
  kakaoRestKey: kakaoRestKey,
};

const content = `// 자동 생성 — scripts/generate-frontend-config.mjs
// 카카오맵 키 출처: ${kakao.source}
// 카카오 REST 키 출처: KAKAO_REST_KEY
window.REALESTATE_MAP_CONFIG = ${JSON.stringify(config, null, 2)};
`;

fs.writeFileSync(outPath, content, "utf8");
console.log("생성 완료:", outPath);
console.log("카카오맵 키:", kakao.source);
