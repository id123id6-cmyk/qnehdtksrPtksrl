import fs from "fs";
import path from "path";

const ROOT = process.cwd();

console.log("=== 1. sitemap.full.xml 배포 제외 ===");
console.log("루트 sitemap.full.xml 존재:", fs.existsSync(path.join(ROOT, "sitemap.full.xml")) ? "FAIL(있음)" : "OK(없음)");
console.log("backup/sitemap.full.xml 존재:", fs.existsSync(path.join(ROOT, "backup/sitemap.full.xml")) ? "OK" : "FAIL");
const vercelignore = fs.readFileSync(path.join(ROOT, ".vercelignore"), "utf8");
console.log(".vercelignore backup/:", /backup\//.test(vercelignore) ? "OK" : "FAIL");
console.log(".vercelignore sitemap.full.xml:", /sitemap\.full\.xml/.test(vercelignore) ? "OK" : "FAIL");
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
const blockFull = vercel.redirects?.some((r) => r.source === "/sitemap.full.xml" && r.statusCode === 404);
console.log("vercel.json /sitemap.full.xml → 404:", blockFull ? "OK" : "FAIL");

console.log("\n=== 2. robots.txt ===");
console.log(fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8"));

console.log("\n=== 3. sitemap.xml tools URL ===");
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const toolLocs = (sm.match(/<loc>[^<]*tools/g) || []).length;
console.log("<loc> tools count:", toolLocs, toolLocs === 0 ? "OK" : "FAIL");

console.log("\n=== 4. .vercelignore 공개 차단 대상 ===");
const patterns = [
  ["backup/", "sitemap 백업"],
  ["screenshots/", "스크린샷"],
  ["data/", "nationwide 데이터"],
  ["scripts/*.mjs", "검증/개발 mjs"],
  ["!scripts/generate-frontend-config.mjs", "빌드 mjs 유지"],
  ["blog/screenshots/", "블로그 스크린샷"],
  ["tools/realestate-map/screenshots/", "지도 스크린샷"],
];
for (const [p, label] of patterns) {
  const ok = vercelignore.split("\n").some((line) => line.trim() === p || line.includes(p.replace("*", "")));
  console.log(`${label}\t${p}\t${ok ? "listed" : "MISSING"}`);
}

console.log("\n=== 5. tools-carousel.js 배포 유지 ===");
console.log("tools-carousel in vercelignore:", /tools-carousel/.test(vercelignore) ? "FAIL" : "OK");
