/**
 * 국토부 아파트 매매 실거래 API 연결 테스트
 *
 * 실행 (프로젝트 루트에서):
 *   node scripts/test-molit-api.mjs
 *
 * 옵션:
 *   node scripts/test-molit-api.mjs --lawd 11110 --ym 202406
 *   lawd: 법정동코드 앞 5자리 (기본 11110 종로구)
 *   ym:   계약년월 YYYYMM (기본: 전월)
 */
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

loadEnvLocal();
requireEnv(["MOLIT_API_KEY"]);

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

function previousMonthYm() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

const LAWD_CD = getArg("lawd", "11110");
const DEAL_YMD = getArg("ym", previousMonthYm());
const SERVICE_KEY = process.env.MOLIT_API_KEY;

// 국토교통부 아파트 매매 실거래 상세 자료
const BASE_URL =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";

const url = new URL(BASE_URL);
url.searchParams.set("serviceKey", SERVICE_KEY);
url.searchParams.set("LAWD_CD", LAWD_CD);
url.searchParams.set("DEAL_YMD", DEAL_YMD);
url.searchParams.set("pageNo", "1");
url.searchParams.set("numOfRows", "10");

console.log("=== 국토부 API 테스트 ===");
console.log("지역코드:", LAWD_CD, "| 계약년월:", DEAL_YMD);
console.log("요청 URL (키 제외):", BASE_URL, "?LAWD_CD=...&DEAL_YMD=...");

try {
  const res = await fetch(url.toString());
  const text = await res.text();

  if (!res.ok) {
    console.error("HTTP 오류:", res.status, res.statusText);
    console.error(text.slice(0, 500));
    process.exit(1);
  }

  const resultMatch = text.match(/<resultCode>([^<]+)<\/resultCode>/);
  const msgMatch = text.match(/<resultMsg>([^<]+)<\/resultMsg>/);
  const totalMatch = text.match(/<totalCount>([^<]+)<\/totalCount>/);

  const resultCode = resultMatch ? resultMatch[1].trim() : "(파싱 실패)";
  const resultMsg = msgMatch ? msgMatch[1].trim() : "";
  const totalCount = totalMatch ? totalMatch[1].trim() : "?";

  console.log("\n결과 코드:", resultCode, resultMsg ? `(${resultMsg})` : "");
  console.log("총 건수:", totalCount);

  if (resultCode === "000") {
    const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    console.log("\n샘플 거래 (최대 3건):");
    items.slice(0, 3).forEach((match, i) => {
      const block = match[1];
      const pick = (tag) => {
        const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
        return m ? m[1].trim() : "-";
      };
      console.log(
        `  ${i + 1}. ${pick("aptNm")} | ${pick("dealAmount")}만원 | ${pick("floor")}층 | ${pick("dealYear")}.${pick("dealMonth")}.${pick("dealDay")}`
      );
    });
    console.log("\n✅ API 연결 성공");
  } else {
    console.error("\n❌ API 오류 — serviceKey 인코딩·만료·일일 한도를 확인하세요.");
    console.error(text.slice(0, 800));
    process.exit(1);
  }
} catch (err) {
  console.error("요청 실패:", err.message);
  process.exit(1);
}
