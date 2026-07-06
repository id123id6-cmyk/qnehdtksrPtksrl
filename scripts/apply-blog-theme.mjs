/**
 * 블로그 목록 + 포스트 30개 테마 적용
 * node scripts/apply-blog-theme.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_DIR = path.join(ROOT, "scripts", "blog-text-baselines");

const BLUE_MAP = [
  [/linear-gradient\(135deg,\s*#2563eb\s+0%,\s*#1d4ed8\s+100%\)/gi, "var(--color-dark)"],
  [/linear-gradient\(135deg,\s*#7c3aed\s+0%,\s*#6d28d9\s+100%\)/gi, "var(--color-dark)"],
  [/linear-gradient\(135deg,\s*#eff6ff\s+0%,\s*#dbeafe\s+100%\)/gi, "var(--color-beige-light)"],
  [/rgba\(37,\s*99,\s*235/gi, "rgba(26, 26, 26"],
  [/rgba\(124,\s*58,\s*237/gi, "rgba(26, 26, 26"],
  [/var\(--color-primary\)/gi, "var(--color-dark)"],
  [/#2563eb/gi, "#1A1A1A"],
  [/#1d4ed8/gi, "#333333"],
  [/#3b82f6/gi, "#1A1A1A"],
  [/#60a5fa/gi, "#666666"],
  [/#93c5fd/gi, "#E5DFD0"],
  [/#dbeafe/gi, "#FAF5E8"],
  [/#eff6ff/gi, "#FAF5E8"],
  [/#e0f2fe/gi, "#FAF5E8"],
  [/#bae6fd/gi, "#E5DFD0"],
  [/#bfdbfe/gi, "#E5DFD0"],
  [/#1e40af/gi, "#1A1A1A"],
  [/#1e3a8a/gi, "#666666"],
  [/#7c3aed/gi, "#1A1A1A"],
  [/#6d28d9/gi, "#333333"],
  [/#a855f7/gi, "#1A1A1A"],
  [/#c084fc/gi, "#666666"],
  [/#ede9fe/gi, "#FAF5E8"],
  [/#f5f3ff/gi, "#FAF5E8"],
  [/#c4b5fd/gi, "#E5DFD0"],
  [/#5b21b6/gi, "#1A1A1A"],
  [/#0369a1/gi, "#1A1A1A"],
];

function stripArticleText(html) {
  const m = html.match(/<article[^>]*class="[^"]*post-article[^"]*"[^>]*>([\s\S]*?)<\/article>/i);
  if (!m) return "";
  return m[1]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fixBlueInStyles(html) {
  return html.replace(/<style>([\s\S]*?)<\/style>/gi, (_, css) => {
    let next = css;
    for (const [re, rep] of BLUE_MAP) next = next.replace(re, rep);
    return `<style>${next}</style>`;
  });
}

function addBodyClass(html, cls) {
  if (html.includes(`class="${cls}"`) || html.includes(`class='${cls}'`)) {
    return html.replace(/<body([^>]*)class="([^"]*)"/, (m, rest, classes) => {
      if (classes.includes(cls)) return m;
      return `<body${rest}class="${classes} ${cls}"`;
    });
  }
  if (/<body class=/.test(html)) {
    return html.replace(/<body class="([^"]*)"/, `<body class="$1 ${cls}"`);
  }
  return html.replace(/<body>/, `<body class="${cls}">`).replace(/<body([^>]*?)>/, (m) => {
    if (m === `<body class="${cls}">`) return m;
    if (!m.includes("class=")) return `<body class="${cls}"${m.slice(5)}`;
    return m;
  });
}

function ensureGlobalThemeLink(html) {
  if (html.includes("global-theme.css")) return html;
  return html.replace(
    /(<link rel="stylesheet" href="\.\.\/styles\.css">)/,
    `$1\n  <link rel="stylesheet" href="../css/global-theme.css">`
  );
}

function patchIndex(html) {
  let out = html;
  out = addBodyClass(out, "theme-blog-page");
  return out;
}

function patchPost(html, n) {
  let out = html;
  const baseline = stripArticleText(out);
  if (baseline) {
    mkdirSync(BASELINE_DIR, { recursive: true });
    writeFileSync(path.join(BASELINE_DIR, `post-${n}.txt`), baseline, "utf8");
  }
  out = fixBlueInStyles(out);
  out = ensureGlobalThemeLink(out);
  out = addBodyClass(out, "theme-blog-post");
  const after = stripArticleText(out);
  if (baseline && after !== baseline) {
    throw new Error(`post-${n}.html: article text changed after patch`);
  }
  return out;
}

// index
const indexPath = path.join(ROOT, "blog", "index.html");
writeFileSync(indexPath, patchIndex(readFileSync(indexPath, "utf8")), "utf8");
console.log("patched blog/index.html");

for (let n = 1; n <= 30; n++) {
  const fp = path.join(ROOT, "blog", `post-${n}.html`);
  if (!existsSync(fp)) {
    console.warn(`skip missing post-${n}.html`);
    continue;
  }
  writeFileSync(fp, patchPost(readFileSync(fp, "utf8"), n), "utf8");
  console.log(`patched post-${n}.html`);
}

console.log("done");
