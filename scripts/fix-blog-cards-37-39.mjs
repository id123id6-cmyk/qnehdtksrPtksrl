import { execSync } from "child_process";
import fs from "fs";

const old = execSync("git show HEAD:blog/index.html", { encoding: "utf8" });
let cur = fs.readFileSync("blog/index.html", "utf8");

function card(html, id) {
  const re = new RegExp(
    `<a href="post-${id}\\.html" class="blog-card[\\s\\S]*?<\\/a>`
  );
  const m = html.match(re);
  return m ? m[0] : null;
}

for (const id of [39, 38, 37]) {
  const o = card(old, id);
  const c = card(cur, id);
  if (!o || !c) {
    console.log("missing", id, !!o, !!c);
    continue;
  }
  if (o !== c) {
    cur = cur.replace(c, o);
    console.log("restored", id);
  } else {
    console.log("same", id);
  }
}
fs.writeFileSync("blog/index.html", cur);

const h = fs.readFileSync("blog/post-47.html", "utf8");
const m = h.match(/<article[\s\S]*?<\/article>/);
const t = m[0].replace(/<[^>]+>/g, "");
console.log("chars", t.replace(/\s+/g, "").length);
console.log(
  "first10",
  [...cur.matchAll(/href="(post-\d+\.html)"/g)].slice(0, 12).map((x) => x[1]).join(", ")
);
