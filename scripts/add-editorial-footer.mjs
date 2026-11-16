import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "screenshots" || name === "backup" || name === "data") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

const files = walk(root);
let changed = 0;
const themeNeedle = '<a href="/disclaimer.html" class="theme-link">면책조항</a>';
const themeInsert = `${themeNeedle}\n        <a href="/editorial.html" class="theme-link">콘텐츠 제작 원칙</a>`;
const liNeedle = '<li><a href="/disclaimer.html">면책조항</a></li>';
const liInsert = `${liNeedle}\n            <li><a href="/editorial.html">콘텐츠 제작 원칙</a></li>`;

for (const file of files) {
  let s = fs.readFileSync(file, "utf8");
  if (s.includes("/editorial.html") && path.basename(file) !== "editorial.html") {
    // may already have from partial run; still allow editorial.html itself
  }
  let next = s;
  if (next.includes(themeNeedle) && !next.includes('href="/editorial.html"')) {
    next = next.split(themeNeedle).join(themeInsert);
  }
  if (next.includes(liNeedle) && !next.includes('href="/editorial.html"')) {
    next = next.split(liNeedle).join(liInsert);
  }
  if (next !== s) {
    fs.writeFileSync(file, next, "utf8");
    changed += 1;
    console.log("updated", path.relative(root, file));
  }
}
console.log("files_changed", changed);
