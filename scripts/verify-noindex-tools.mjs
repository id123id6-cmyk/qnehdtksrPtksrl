import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TOOLS = [
  "tools/index.html",
  "tools/bunyang-alarm/index.html",
  "tools/subscription-calculator/index.html",
  "tools/dday-calculator/index.html",
  "tools/realestate-map/index.html",
  "tools/severance-calculator/index.html",
  "tools/apt-calculator/index.html",
  "tools/salary-calculator/index.html",
  "tools/income-calculator/index.html",
];

console.log("=== 도구 페이지 index, follow 확인 ===");
let bad = 0;
for (const f of TOOLS) {
  const html = fs.readFileSync(path.join(ROOT, f), "utf8");
  const ok = /<meta name="robots" content="index,\s*follow">/i.test(html);
  console.log(f + "\t" + (ok ? "OK" : "FAIL"));
  if (!ok) bad++;
}
if (bad) process.exit(1);
console.log("all tools indexable");
