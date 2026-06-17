/**
 * Supabase 연결 테스트
 * node scripts/test-supabase-connection.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET;
const mask = (s) => (s ? `${s.slice(0, 8)}***` : "(없음)");

console.log("=== Supabase 연결 테스트 ===");
console.log("URL:", url);
console.log("Secret:", mask(key));

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function testFetch() {
  console.log("\n[1] fetch REST root...");
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    console.log("  HTTP status:", res.status, res.statusText);
    const text = await res.text();
    console.log("  Body (앞 200자):", text.slice(0, 200) || "(empty)");
    return res.ok;
  } catch (err) {
    console.log("  ❌ fetch 실패:", err.message);
    if (err.cause) console.log("  cause:", err.cause.message || err.cause);
    return false;
  }
}

async function testSupabaseJs() {
  console.log("\n[2] @supabase/supabase-js apartments SELECT...");
  try {
    const { data, error, count } = await supabase
      .from("apartments")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.log("  ❌ Supabase error:", error.message);
      console.log("  code:", error.code, "| details:", error.details);
      return false;
    }
    console.log("  ✅ 연결 성공 (apartments 행 수:", count ?? 0, ")");
    return true;
  } catch (err) {
    console.log("  ❌ 예외:", err.message);
    if (err.cause) console.log("  cause:", err.cause.message || err.cause);
    return false;
  }
}

async function testRpc() {
  console.log("\n[3] raw SQL 대용 — 서버 시간 확인 (apartments limit 1)...");
  try {
    const { data, error } = await supabase.from("apartments").select("id").limit(1);
    if (error) {
      console.log("  ❌", error.message);
      return false;
    }
    console.log("  ✅ 쿼리 OK, sample rows:", data?.length ?? 0);
    return true;
  } catch (err) {
    console.log("  ❌", err.message);
    return false;
  }
}

const fetchOk = await testFetch();
const jsOk = await testSupabaseJs();
await testRpc();

console.log("\n========== 결과 ==========");
console.log("REST fetch:", fetchOk ? "✅ 성공" : "❌ 실패");
console.log("supabase-js: ", jsOk ? "✅ 성공" : "❌ 실패");
console.log("==========================");

if (!fetchOk && !jsOk) {
  console.log("\n💡 DNS/네트워크 문제 가능성 높음 → ping/nslookup 확인");
  console.log("💡 Project URL이 Dashboard와 일치하는지 확인");
  process.exit(1);
}

if (fetchOk && !jsOk) {
  console.log("\n💡 REST는 되지만 테이블 없음 → SQL 마이그레이션 실행 필요");
  process.exit(1);
}

console.log("\n✅ Supabase 연결 정상");
