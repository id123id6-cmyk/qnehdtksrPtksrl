/**
 * Supabase 마이그레이션 실행 + 테이블 확인
 * node scripts/run-supabase-migration.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./load-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET;

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error("NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SECRET이 없습니다.");
  process.exit(1);
}

const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
const mask = (s) => (s ? `${s.slice(0, 8)}***` : "(없음)");

console.log("Supabase URL:", SUPABASE_URL);
console.log("Secret key:", mask(SUPABASE_SECRET));
console.log("Project ref:", projectRef);

const sqlPath = path.join(ROOT, "supabase/migrations/001_real_estate_schema.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

async function runWithPg() {
  const { default: pg } = await import("pg");
  const { Client } = pg;

  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;
  const candidates = [];

  if (process.env.DATABASE_URL) {
    candidates.push({ label: "DATABASE_URL", connectionString: process.env.DATABASE_URL });
  }

  if (dbPassword) {
    candidates.push({
      label: "pooler (transaction)",
      connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
    });
    candidates.push({
      label: "direct",
      connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
    });
  }

  // 일부 환경에서 secret을 DB 비밀번호로 쓰는 경우 시도 (보통 실패)
  candidates.push({
    label: "secret-as-password (fallback)",
    connectionString: `postgresql://postgres:${encodeURIComponent(SUPABASE_SECRET)}@db.${projectRef}.supabase.co:5432/postgres`,
  });

  for (const c of candidates) {
    const client = new Client({
      connectionString: c.connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
    try {
      console.log(`\n[pg] 연결 시도: ${c.label}`);
      await client.connect();
      console.log("[pg] 연결 성공 — SQL 실행 중...");
      await client.query(sql);
      await client.end();
      return true;
    } catch (err) {
      console.log(`[pg] ${c.label} 실패:`, err.message);
      try {
        await client.end();
      } catch (_) {}
    }
  }
  return false;
}

async function verifyWithRest() {
  const tables = ["apartments", "transactions", "coordinates_cache"];
  const results = [];

  for (const table of tables) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SECRET,
        Authorization: `Bearer ${SUPABASE_SECRET}`,
      },
    });
    const exists = res.status !== 404 && !res.url.includes("PGRST205");
    const text = await res.text();
    const notFound =
      text.includes("PGRST205") ||
      text.includes("does not exist") ||
      res.status === 404;

    results.push({
      table,
      exists: !notFound && (res.ok || res.status === 200 || res.status === 206),
      status: res.status,
      hint: notFound ? "테이블 없음" : "접근 가능",
    });
  }

  return results;
}

async function getColumnCountsViaPg() {
  const { default: pg } = await import("pg");
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;
  if (!dbPassword && !process.env.DATABASE_URL) return null;

  const connectionString =
    process.env.DATABASE_URL ||
    `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const { rows } = await client.query(`
    SELECT table_name, COUNT(*)::int AS column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('apartments', 'transactions', 'coordinates_cache')
    GROUP BY table_name
    ORDER BY table_name
  `);
  await client.end();
  return rows;
}

let migrated = false;
try {
  migrated = await runWithPg();
} catch (e) {
  console.log("[pg] 모듈/연결 오류:", e.message);
}

console.log("\n=== REST API 테이블 확인 ===");
const restResults = await verifyWithRest();

const allExist = restResults.every((r) => r.exists);

if (!migrated && !allExist) {
  console.log("\n❌ DDL 자동 실행 실패");
  console.log("\n원인: Supabase REST/Secret 키로는 CREATE TABLE 같은 DDL을 실행할 수 없습니다.");
  console.log("DDL 실행에는 Postgres DB 비밀번호 직접 연결이 필요합니다.");
  console.log("\n해결 방법:");
  console.log("1. Supabase 대시보드 → Project Settings → Database → Database password 확인");
  console.log("2. .env.local에 추가: SUPABASE_DB_PASSWORD=your_db_password");
  console.log("3. 다시 실행: node scripts/run-supabase-migration.mjs");
  console.log("\n또는 SQL Editor에서 supabase/migrations/001_real_estate_schema.sql 수동 실행");
  process.exit(1);
}

if (migrated) {
  console.log("\n✅ SQL 마이그레이션 실행 완료");
}

let columnRows = null;
try {
  columnRows = await getColumnCountsViaPg();
} catch (_) {}

const expectedColumns = {
  apartments: 11,
  transactions: 15,
  coordinates_cache: 6,
};

console.log("\n| 테이블명 | 생성 여부 | 컬럼 수 |");
console.log("|----------|-----------|---------|");

for (const name of ["apartments", "transactions", "coordinates_cache"]) {
  const rest = restResults.find((r) => r.table === name);
  const col = columnRows?.find((r) => r.table_name === name);
  const exists = rest?.exists ? "✅" : "❌";
  const colCount = col ? String(col.column_count) : expectedColumns[name] + " (예상)";
  console.log(`| ${name} | ${exists} | ${colCount} |`);
}

if (allExist || migrated) {
  console.log("\n다음 단계: node scripts/import-molit-to-supabase.mjs (강남구 데이터 적재)");
}
