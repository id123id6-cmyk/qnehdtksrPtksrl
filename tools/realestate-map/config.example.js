/**
 * 로컬 설정 템플릿
 * 1. 이 파일을 config.js 로 복사
 * 2. .env.local 의 publishable 키만 입력
 *
 * 또는: node scripts/generate-frontend-config.mjs
 */
window.REALESTATE_MAP_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseKey: "YOUR_PUBLISHABLE_KEY",
  kakaoJsKey: "YOUR_KAKAO_JS_KEY",
  /** 카카오 로컬 API (지하철·학교 검색) — REST API 키 */
  kakaoRestKey: "YOUR_KAKAO_REST_KEY",
};
