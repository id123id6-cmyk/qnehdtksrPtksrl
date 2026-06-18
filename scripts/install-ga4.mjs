/**
 * 모든 HTML 파일 <head> 직후에 GA4 스니펫 삽입
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const GA_ID = "G-Y7SC73P9JW";

const SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_ID}', {
    'page_title': document.title,
    'page_path': window.location.pathname
  });
</script>
`;

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      await walk(full, out);
    } else if (e.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

const files = (await walk(ROOT)).sort();
const updated = [];
const skipped = [];

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  let html = await readFile(file, "utf8");
  if (html.includes(GA_ID)) {
    skipped.push(rel);
    continue;
  }
  const headMatch = html.match(/<head[^>]*>/i);
  if (!headMatch) {
    console.warn(`SKIP (no <head>): ${rel}`);
    continue;
  }
  const insertAt = headMatch.index + headMatch[0].length;
  html = html.slice(0, insertAt) + "\n" + SNIPPET + html.slice(insertAt);
  await writeFile(file, html, "utf8");
  updated.push(rel);
}

console.log(`Updated: ${updated.length}`);
updated.forEach((f) => console.log(`  + ${f}`));
if (skipped.length) {
  console.log(`Skipped (already has GA): ${skipped.length}`);
  skipped.forEach((f) => console.log(`  = ${f}`));
}
