/**
 * Supabase 용량 실시간 감시 → 초과 시 수집 중단 플래그 생성
 *
 * 실행 (별도 터미널, 수집과 병행):
 *   node data/nationwide/volume-guard.mjs
 *
 * - 10분마다 용량 확인
 * - 450MB 초과: 경고 로그
 * - 480MB 초과: STOP-COLLECTION.flag 생성
 */
import { writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "../../scripts/load-env.mjs";
import { estimateDbMb } from "../../scripts/lib/estimate-db-size.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = __dirname;
const LOG_FILE = path.join(DATA_DIR, "volume-guard.log");
const STOP_FLAG = path.join(DATA_DIR, "STOP-COLLECTION.flag");

const INTERVAL_MS = 10 * 60 * 1000;
const WARN_MB = 450;
const STOP_MB = 480;
const FREE_MB = 500;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG_FILE, line + "\n");
}

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

mkdirSync(DATA_DIR, { recursive: true });

async function checkOnce() {
  const { rows, apts, txs, mb } = await estimateDbMb(supabase);
  const pct = Math.round((mb / FREE_MB) * 1000) / 10;

  log(`용량 ${mb}MB (${pct}%) — 단지 ${apts.toLocaleString()} + 거래 ${txs.toLocaleString()} = ${rows.toLocaleString()}행`);

  if (mb >= STOP_MB) {
    writeFileSync(
      STOP_FLAG,
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          mb,
          threshold: STOP_MB,
          reason: "volume-guard: Supabase Free 한도 근접",
        },
        null,
        2
      )
    );
    log(`🛑 STOP-COLLECTION.flag 생성 (${mb}MB >= ${STOP_MB}MB)`);
    return "stop";
  }

  if (mb >= WARN_MB) {
    log(`⚠️  경고: ${mb}MB >= ${WARN_MB}MB — 용량 모니터링 강화`);
  }

  return "ok";
}

log(`volume-guard 시작 (간격 ${INTERVAL_MS / 60000}분, 경고 ${WARN_MB}MB, 중단 ${STOP_MB}MB)`);
await checkOnce();

while (true) {
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
  const status = await checkOnce();
  if (status === "stop") {
    log("volume-guard 종료 (중단 플래그 생성됨)");
    process.exit(0);
  }
}
