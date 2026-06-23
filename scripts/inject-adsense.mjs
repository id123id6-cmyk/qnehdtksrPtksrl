import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SNIPPET = `  <meta name="google-adsense-account" content="ca-pub-8232968272801958">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8232968272801958" crossorigin="anonymous"></script>
`;
const MARKER = "google-adsense-account";
const SKIP_DIRS = new Set(["node_modules", "screenshots", ".git"]);

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(p, out);
    } else if (entry.name.endsWith(".html")) {
      out.push(p);
    }
  }
  return out;
}

const files = await walk(ROOT);
let updated = 0;
let skipped = 0;
const noViewport = [];

for (const file of files) {
  let html = await readFile(file, "utf8");
  if (html.includes(MARKER)) {
    skipped++;
    continue;
  }
  const re =
    /(<meta name="viewport" content="width=device-width, initial-scale=1\.0">)/;
  if (!re.test(html)) {
    noViewport.push(file.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
    continue;
  }
  html = html.replace(re, `$1\n${SNIPPET}`);
  await writeFile(file, html, "utf8");
  updated++;
}

console.log(JSON.stringify({ updated, skipped, noViewport, total: files.length }, null, 2));
