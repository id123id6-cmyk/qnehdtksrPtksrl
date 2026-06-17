/**
 * .env.local 파일을 읽어 process.env에 병합합니다.
 * Node 18+ 스크립트용 (dotenv 패키지 없이 사용)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

export function loadEnvLocal(filename = ".env.local") {
  const envPath = path.join(ROOT, filename);
  if (!fs.existsSync(envPath)) {
    throw new Error(
      `${filename} 파일이 없습니다. .env.local.example 을 복사해 키를 입력하세요.`
    );
  }

  const content = fs.readFileSync(envPath, "utf8");
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
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return env;
}

export function requireEnv(keys) {
  const missing = keys.filter((key) => !process.env[key] || process.env[key].includes("..."));
  if (missing.length) {
    throw new Error(
      `다음 환경 변수가 비어 있거나 불완전합니다: ${missing.join(", ")}\n.env.local 에 전체 키를 입력하세요.`
    );
  }
}
