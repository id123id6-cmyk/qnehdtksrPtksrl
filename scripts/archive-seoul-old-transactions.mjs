/**
 * 서울 25구 구거래( deal_date < 2025-06-01 ) SQL 백업 + 삭제
 *
 * 실행:
 *   node scripts/archive-seoul-old-transactions.mjs          # 백업만
 *   node scripts/archive-seoul-old-transactions.mjs --delete # 백업 후 삭제
 */
import { createClient } from "@supabase/supabase-js";
import { createWriteStream, mkdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVE_DIR = path.join(__dirname, "../data/archive");
const ARCHIVE_FILE = path.join(ARCHIVE_DIR, "seoul-old-transactions-backup.sql");
const CUTOFF = "2025-06-01";
const DO_DELETE = process.argv.includes("--delete");

const SEOUL_CODES = [
  "11110", "11140", "11170", "11200", "11215", "11230", "11260", "11290",
  "11305", "11320", "11350", "11380", "11410", "11440", "11470", "11500",
  "11530", "11545", "11560", "11590", "11620", "11650", "11680", "11710", "11740",
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function sqlLiteral(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function countTable(table) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count || 0;
}

async function fetchSeoulApartmentIds() {
  const ids = [];
  for (const code of SEOUL_CODES) {
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("apartments")
        .select("id")
        .eq("sigungu_code", code)
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      ids.push(...data.map((r) => r.id));
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  return ids;
}

async function countOldTransactions(apartmentIds) {
  let total = 0;
  for (let i = 0; i < apartmentIds.length; i += 80) {
    const chunk = apartmentIds.slice(i, i + 80);
    const { count, error } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .in("apartment_id", chunk)
      .lt("deal_date", CUTOFF);
    if (error) throw new Error(error.message);
    total += count || 0;
  }
  return total;
}

async function fetchOldTransactionsPage(apartmentIds, offset, limit) {
  // apartment_id IN (...) + date filter — paginate via range on filtered set
  // Supabase: fetch by apartment chunks and merge (simpler: one code at a time)
  return [];
}

async function archiveAndMaybeDelete(apartmentIds) {
  mkdirSync(ARCHIVE_DIR, { recursive: true });

  const out = createWriteStream(ARCHIVE_FILE, { encoding: "utf8" });
  const write = (s) =>
    new Promise((resolve, reject) => {
      out.write(s, (err) => (err ? reject(err) : resolve()));
    });

  await write(`-- 서울 25구 구거래 백업 (deal_date < ${CUTOFF})\n`);
  await write(`-- 생성: ${new Date().toISOString()}\n`);
  await write(`-- 복원: psql 또는 Supabase SQL Editor에서 실행\n`);
  await write(`BEGIN;\n\n`);

  let archived = 0;
  const PAGE = 500;

  for (const code of SEOUL_CODES) {
    let aptFrom = 0;
    while (true) {
      const { data: apts, error: aptErr } = await supabase
        .from("apartments")
        .select("id")
        .eq("sigungu_code", code)
        .range(aptFrom, aptFrom + 199);
      if (aptErr) throw new Error(aptErr.message);
      if (!apts?.length) break;

      const aptIds = apts.map((a) => a.id);
      let txFrom = 0;
      while (true) {
        const { data: rows, error: txErr } = await supabase
          .from("transactions")
          .select(
            "id, apartment_id, deal_amount, deal_year, deal_month, deal_day, exclu_use_ar, floor, deal_type, rent_deposit, monthly_rent, source, source_id, created_at"
          )
          .in("apartment_id", aptIds)
          .lt("deal_date", CUTOFF)
          .order("id")
          .range(txFrom, txFrom + PAGE - 1);
        if (txErr) throw new Error(txErr.message);
        if (!rows?.length) break;

        for (const r of rows) {
          const vals = [
            sqlLiteral(r.id),
            sqlLiteral(r.apartment_id),
            r.deal_amount,
            r.deal_year,
            r.deal_month,
            r.deal_day,
            r.exclu_use_ar != null ? r.exclu_use_ar : "NULL",
            r.floor != null ? r.floor : "NULL",
            sqlLiteral(r.deal_type),
            r.rent_deposit != null ? r.rent_deposit : "NULL",
            r.monthly_rent != null ? r.monthly_rent : "NULL",
            sqlLiteral(r.source),
            sqlLiteral(r.source_id),
            sqlLiteral(r.created_at),
          ].join(", ");
          await write(
            `INSERT INTO public.transactions (id, apartment_id, deal_amount, deal_year, deal_month, deal_day, exclu_use_ar, floor, deal_type, rent_deposit, monthly_rent, source, source_id, created_at) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;\n`
          );
          archived++;
        }

        if (rows.length < PAGE) break;
        txFrom += PAGE;
        if (archived % 5000 === 0) {
          console.log(`  백업 진행: ${archived.toLocaleString()}건...`);
        }
      }

      if (apts.length < 200) break;
      aptFrom += 200;
    }
    console.log(`  ${code} 백업 구간 완료 (누적 ${archived.toLocaleString()}건)`);
  }

  await write(`\nCOMMIT;\n`);
  await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));

  return archived;
}

async function deleteOldTransactions(apartmentIds) {
  let deleted = 0;
  for (let i = 0; i < apartmentIds.length; i += 50) {
    const chunk = apartmentIds.slice(i, i + 50);
    const { error, count } = await supabase
      .from("transactions")
      .delete({ count: "exact" })
      .in("apartment_id", chunk)
      .lt("deal_date", CUTOFF);
    if (error) throw new Error(error.message);
    deleted += count || 0;
    if (deleted > 0 && deleted % 10000 === 0) {
      console.log(`  삭제 진행: ${deleted.toLocaleString()}건...`);
    }
  }
  return deleted;
}

console.log("=== 서울 25구 구거래 백업/삭제 ===\n");
console.log(`기준일: deal_date < ${CUTOFF}`);

const txBefore = await countTable("transactions");
const aptBefore = await countTable("apartments");

const aptIds = await fetchSeoulApartmentIds();
console.log(`서울 단지: ${aptIds.length.toLocaleString()}개`);

const oldCount = await countOldTransactions(aptIds);
console.log(`삭제 대상(서울): ${oldCount.toLocaleString()}건`);

if (existsSync(ARCHIVE_FILE) && !DO_DELETE) {
  const sizeMb = Math.round(statSync(ARCHIVE_FILE).size / 1024 / 1024 * 10) / 10;
  console.log(`\n기존 백업 파일 있음: ${ARCHIVE_FILE} (${sizeMb} MB)`);
  console.log("삭제까지 실행: node scripts/archive-seoul-old-transactions.mjs --delete");
  process.exit(0);
}

console.log("\nSQL 백업 시작...");
const archived = await archiveAndMaybeDelete(aptIds);
const sizeMb = Math.round(statSync(ARCHIVE_FILE).size / 1024 / 1024 * 10) / 10;
console.log(`백업 완료: ${archived.toLocaleString()}건 → ${ARCHIVE_FILE} (${sizeMb} MB)`);

if (!DO_DELETE) {
  console.log("\n삭제는 실행하지 않았습니다. --delete 옵션으로 재실행하세요.");
  process.exit(0);
}

console.log("\n삭제 시작...");
const deleted = await deleteOldTransactions(aptIds);
console.log(`삭제 완료: ${deleted.toLocaleString()}건`);

const txAfter = await countTable("transactions");
const aptAfter = await countTable("apartments");

console.log("\n========== Before / After ==========");
console.log(`단지: ${aptBefore.toLocaleString()} → ${aptAfter.toLocaleString()}`);
console.log(`거래: ${txBefore.toLocaleString()} → ${txAfter.toLocaleString()} (-${(txBefore - txAfter).toLocaleString()})`);
console.log(`추정 용량: ~${Math.round(((aptAfter + txAfter) * 1024) / 1024 / 1024 * 10) / 10} MB`);
console.log("====================================");
