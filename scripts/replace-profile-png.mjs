import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OLD = "/images/about/profile.jpg";
const NEW = "/images/about/profile.png";
const changed = [];

const targets = [
  join(ROOT, "about.html"),
  join(ROOT, "scripts", "inject-author-box.mjs"),
  ...readdirSync(join(ROOT, "blog"))
    .filter((f) => /^post-.*\.html$/.test(f))
    .map((f) => join(ROOT, "blog", f)),
];

for (const file of targets) {
  let text = readFileSync(file, "utf8");
  if (!text.includes(OLD)) continue;
  text = text.split(OLD).join(NEW);
  writeFileSync(file, text);
  changed.push(file.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
}

console.log(JSON.stringify({ count: changed.length, files: changed }, null, 2));
