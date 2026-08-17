import fs from "fs";

const path = "blog/index.html";
const html = fs.readFileSync(path, "utf8");
const openTag = '<div class="blog-grid" id="blog-grid">';
const gridStart = html.indexOf(openTag);
if (gridStart < 0) throw new Error("grid not found");
const restStart = gridStart + openTag.length;
const region = html.slice(restStart);
const all = [...region.matchAll(/<a href="(post-\d+\.html)" class="blog-card[\s\S]*?<\/a>\s*/g)];

let offset = 0;
const contiguous = [];
for (const c of all) {
  const between = region.slice(offset, c.index);
  if (offset > 0 && between.trim() !== "") break;
  contiguous.push(c);
  offset = c.index + c[0].length;
}

const seen = new Set();
const unique = [];
for (const c of contiguous) {
  if (seen.has(c[1])) continue;
  seen.add(c[1]);
  unique.push(c[0].trimEnd());
}

const before = html.slice(0, restStart);
const after = html.slice(restStart + offset);
const rebuilt = before + "\n" + unique.join("\n\n") + "\n\n        " + after.trimStart();
fs.writeFileSync(path, rebuilt);
console.log("raw_contiguous", contiguous.length, "unique", unique.length);
console.log(unique.map((u) => u.match(/post-\d+/)[0]).join(", "));
