/**
 * 구거래(deal_date < 2025-06-01) 분포 분석 + SQL 백업 + 삭제
 *
 *   node scripts/analyze-and-cleanup-old-transactions.mjs           # 분석만
 *   node scripts/analyze-and-cleanup-old-transactions.mjs --backup  # 분석 + 백업
 *   node scripts/analyze-and-cleanup-old-transactions.mjs --delete  # 분석 + 백업 + 삭제
 */
import { createClient } from "@supabase/supabase-js";
import { createWriteStream, mkdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import { GYEONGGI_NAMES } from "./lib/gyeonggi-districts.mjs";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVE_FILE = path.join(__dirname, "../data/archive/gyeonggi-old-transactions-backup.sql");
const CUTOFF = "2025-06-01";
const DO_BACKUP = process.argv.includes("--backup") || process.argv.includes("--delete");
const DO_DELETE = process.argv.includes("--delete");

const SEOUL_NAMES = {
  "11110": "종로구", "11140": "중구", "11170": "용산구", "11200": "성동구",
  "11215": "광진구", "11230": "동대문구", "11260": "중랑구", "11290": "성북구",
  "11305": "강북구", "11320": "도봉구", "11350": "노원구", "11380": "은평구",
  "11410": "서대문구", "11440": "마포구", "11470": "양천구", "11500": "강서구",
  "11530": "구로구", "11545": "금천구", "11560": "영등포구", "11590": "동작구",
  "11620": "관악구", "11650": "서초구", "11680": "강남구", "11710": "송파구", "11740": "강동구",
};

function districtName(code) {
  return SEOUL_NAMES[code] || GYEONGGI_NAMES[code] || code;
}

function sqlLiteral(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function countTable(table, filter) {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count || 0;
}

async function loadApartmentCodeMap() {
  const map = new Map();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("apartments")
      .select("id, sigungu_code")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const r of data) map.set(r.id, r.sigungu_code);
    if (data.length < 1000) break;
    from += 1000;
  }
  return map;
}

async function fetchAllOldTransactions() {
  const rows = [];
  let page = 0;
  const PAGE = 500;
  while (true) {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, apartment_id, deal_amount, deal_year, deal_month, deal_day, deal_date, exclu_use_ar, floor, deal_type, rent_deposit, monthly_rent, source, source_id, created_at"
      )
      .lt("deal_date", CUTOFF)
      .order("deal_date")
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    page++;
  }
  return rows;
}

console.log("=== 구거래 분석 (deal_date < 2025-06-01) ===\n");

const txBefore = await countTable("transactions");
const aptMap = await loadApartmentCodeMap();
const oldRows = await fetchAllOldTransactions();

const byCode = new Map();
for (const r of oldRows) {
  const code = aptMap.get(r.apartment_id) || "unknown";
  byCode.set(code, (byCode.get(code) || 0) + 1);
}

const sorted = [...byCode.entries()].sort((a, b) => b[1] - a[1]);
console.log("구역별 구거래 분포:");
console.log("sigungu_code | 구역명 | old_count");
console.log("-".repeat(50));
for (const [code, cnt] of sorted) {
  console.log(`${code} | ${districtName(code)} | ${cnt}`);
}
console.log("-".repeat(50));
console.log(`합계: ${oldRows.length.toLocaleString()}건\n`);

if (!DO_BACKUP) {
  console.log("백업/삭제는 --backup 또는 --delete 옵션으로 실행하세요.");
  process.exit(0);
}

mkdirSync(path.dirname(ARCHIVE_FILE), { recursive: true });
const out = createWriteStream(ARCHIVE_FILE, { encoding: "utf8" });
const write = (s) => new Promise((res, rej) => out.write(s, (e) => (e ? rej(e) : res())));

await write(`-- 구거래 전체 백업 (deal_date < ${CUTOFF})\n`);
await write(`-- 건수: ${oldRows.length}\n`);
await write(`-- 생성: ${new Date().toISOString()}\nBEGIN;\n\n`);

for (const r of oldRows) {
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
}
await write("\nCOMMIT;\n");
await new Promise((res, rej) => out.end((e) => (e ? rej(e) : res())));

const sizeMb = Math.round(statSync(ARCHIVE_FILE).size / 1024 / 1024 * 10) / 10;
console.log(`백업 완료: ${ARCHIVE_FILE} (${oldRows.length}건, ${sizeMb} MB)`);

if (!DO_DELETE) {
  console.log("삭제는 --delete 옵션으로 재실행하세요.");
  process.exit(0);
}

console.log("\n삭제 시작...");
let deleted = 0;
while (true) {
  const { data: batch, error: selErr } = await supabase
    .from("transactions")
    .select("id")
    .lt("deal_date", CUTOFF)
    .limit(500);
  if (selErr) throw new Error(selErr.message);
  if (!batch?.length) break;
  const ids = batch.map((r) => r.id);
  const { error: delErr, count } = await supabase
    .from("transactions")
    .delete({ count: "exact" })
    .in("id", ids);
  if (delErr) throw new Error(delErr.message);
  deleted += count || 0;
  if (deleted % 5000 === 0) console.log(`  삭제 ${deleted.toLocaleString()}건...`);
}

const txAfter = await countTable("transactions");
const remaining = await countTable("transactions", (q) => q.lt("deal_date", CUTOFF));

console.log("\n========== Before / After ==========");
console.log(`거래: ${txBefore.toLocaleString()} → ${txAfter.toLocaleString()} (-${deleted.toLocaleString()})`);
console.log(`잔여 구거래: ${remaining}건`);
console.log(`추정 용량: ~${Math.round(((await countTable("apartments")) + txAfter) * 1024 / 1024 / 1024 * 10) / 10} MB`);
console.log("====================================");

if (remaining > 0) process.exit(1);
