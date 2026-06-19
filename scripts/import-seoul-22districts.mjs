/**
 * 서울 22개 신규 구 MOLIT 데이터 수집 (매매+전세만, 13개월)
 * 실행: node scripts/import-seoul-22districts.mjs
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMPORT_SCRIPT = path.join(__dirname, "import-molit-5years.mjs");

const DISTRICTS = [
  { code: "11110", name: "종로구" },
  { code: "11140", name: "중구" },
  { code: "11170", name: "용산구" },
  { code: "11200", name: "성동구" },
  { code: "11215", name: "광진구" },
  { code: "11230", name: "동대문구" },
  { code: "11260", name: "중랑구" },
  { code: "11290", name: "성북구" },
  { code: "11305", name: "강북구" },
  { code: "11320", name: "도봉구" },
  { code: "11350", name: "노원구" },
  { code: "11380", name: "은평구" },
  { code: "11410", name: "서대문구" },
  { code: "11440", name: "마포구" },
  { code: "11470", name: "양천구" },
  { code: "11500", name: "강서구" },
  { code: "11530", name: "구로구" },
  { code: "11545", name: "금천구" },
  { code: "11560", name: "영등포구" },
  { code: "11590", name: "동작구" },
  { code: "11620", name: "관악구" },
  { code: "11740", name: "강동구" },
];

const FROM = "2025-06";
const TO = "2026-06";

function runImport(district) {
  return new Promise((resolve, reject) => {
    const args = [
      IMPORT_SCRIPT,
      "--lawd",
      district.code,
      "--from",
      FROM,
      "--to",
      TO,
      "--jeonse-only",
    ];
    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${district.name} exit ${code}`));
    });
  });
}

const started = Date.now();
const failed = [];
const completed = [];

console.log("=== 서울 22개구 데이터 수집 (매매+전세, 13개월) ===\n");

for (let i = 0; i < DISTRICTS.length; i++) {
  const d = DISTRICTS[i];
  console.log(`\n[${i + 1}/${DISTRICTS.length}] ${d.name}(${d.code}) 수집 시작...`);
  try {
    await runImport(d);
    completed.push(d);
    console.log(`✅ [${i + 1}/${DISTRICTS.length}] ${d.name} 완료`);
  } catch (err) {
    failed.push({ ...d, error: err.message });
    console.error(`❌ [${i + 1}/${DISTRICTS.length}] ${d.name} 실패: ${err.message}`);
  }
}

const elapsed = Math.round((Date.now() - started) / 1000);
console.log("\n========== 배치 수집 요약 ==========");
console.log(`성공: ${completed.length}/${DISTRICTS.length}`);
console.log(`실패: ${failed.length}`);
if (failed.length) {
  console.log("실패 구:", failed.map((f) => `${f.name}(${f.code})`).join(", "));
}
console.log(`소요: ${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`);
console.log("====================================");
console.log("\n통계 확인: node scripts/report-district-stats.mjs");

if (failed.length) process.exit(1);
