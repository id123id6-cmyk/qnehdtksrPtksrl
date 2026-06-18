/**
 * 환경 변수 로더
 * - 로컬: .env.local 파일 읽기
 * - Vercel: process.env (대시보드 Environment Variables)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function mergeIntoProcessEnv(env) {
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseEnvFile(content) {
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function loadEnvFromFile(envPath) {
  const content = fs.readFileSync(envPath, "utf8");
  return parseEnvFile(content);
}

/** 로컬 전용 — .env.local 필수 */
export function loadEnvLocal(filename = ".env.local") {
  const envPath = path.join(ROOT, filename);
  if (!fs.existsSync(envPath)) {
    throw new Error(
      `${filename} 파일이 없습니다. .env.local.example 을 복사해 키를 입력하세요.`
    );
  }

  const env = loadEnvFromFile(envPath);
  mergeIntoProcessEnv(env);
  return env;
}

/** 로컬(.env.local) + Vercel(process.env) 모두 지원 */
export function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (fs.existsSync(envPath)) {
    const env = loadEnvFromFile(envPath);
    mergeIntoProcessEnv(env);
  }
  normalizeSupabaseEnvAliases();
  return {};
}

/** Vercel 대시보드 등에 오타로 등록된 변수명 보정 */
function normalizeSupabaseEnvAliases() {
  const aliases = {
    NEXT_PUBLIC_SUPASASE_URL: "NEXT_PUBLIC_SUPABASE_URL",
    NEXT_PUBLIC_SUPASASE_KEY: "NEXT_PUBLIC_SUPABASE_KEY",
  };

  for (const [wrong, right] of Object.entries(aliases)) {
    if (process.env[wrong] && !process.env[right]) {
      process.env[right] = process.env[wrong];
    }
  }
}

export function requireEnv(keys) {
  const missing = keys.filter((key) => !process.env[key] || process.env[key].includes("..."));
  if (missing.length) {
    const vercelHint = process.env.VERCEL
      ? `\n[Vercel] 감지된 NEXT_PUBLIC_* 키: ${
          Object.keys(process.env)
            .filter((k) => k.startsWith("NEXT_PUBLIC_"))
            .join(", ") || "(없음)"
        }`
      : "";
    throw new Error(
      `다음 환경 변수가 비어 있거나 불완전합니다: ${missing.join(", ")}\n` +
        "로컬: .env.local | Vercel: Project Settings > Environment Variables" +
        vercelHint
    );
  }
}
