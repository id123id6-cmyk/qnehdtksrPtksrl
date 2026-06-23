import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SNIPPET = `<!-- Microsoft Clarity -->
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "xbdrgqw1pj");
</script>
`;
const MARKER = "clarity.ms/tag/";
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
const noAnchor = [];

for (const file of files) {
  let html = await readFile(file, "utf8");
  if (html.includes(MARKER)) {
    skipped++;
    continue;
  }
  const re =
    /(gtag\('config', 'G-Y7SC73P9JW'[\s\S]*?<\/script>\s*\n)/;
  if (!re.test(html)) {
    noAnchor.push(file.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
    continue;
  }
  html = html.replace(re, `$1${SNIPPET}\n`);
  await writeFile(file, html, "utf8");
  updated++;
}

console.log(JSON.stringify({ updated, skipped, noAnchor, total: files.length }, null, 2));
