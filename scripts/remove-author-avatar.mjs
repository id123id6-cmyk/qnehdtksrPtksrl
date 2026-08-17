import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const imgLine =
  /            <img src="\/images\/about\/profile\.jpg" alt="승박 프로필 사진" class="post-author-avatar" width="72" height="72" loading="lazy">\r?\n/g;

let n = 0;
for (const f of readdirSync("blog").filter((x) => /^post-.*\.html$/.test(x))) {
  const p = join("blog", f);
  let h = readFileSync(p, "utf8");
  if (!imgLine.test(h)) continue;
  h = h.replace(imgLine, "");
  writeFileSync(p, h);
  n++;
  console.log("fixed:", f);
}
console.log("total:", n);
