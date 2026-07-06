/**
 * 도구 페이지 theme-tool-page 클래스 + style.css 파란색 제거
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const TOOLS = [
  "subscription-calculator",
  "salary-calculator",
  "apt-calculator",
  "income-calculator",
  "dday-calculator",
];

const REPLACEMENTS = [
  [/var\(--color-primary-dark\)/g, "var(--color-dark)"],
  [/var\(--color-primary-muted\)/g, "var(--color-beige-light)"],
  [/var\(--color-primary-soft\)/g, "#F5EFE0"],
  [/var\(--color-primary,\s*#2563eb\)/g, "var(--color-dark)"],
  [/var\(--color-primary\)/g, "var(--color-dark)"],
  [/#2563eb/gi, "#1A1A1A"],
  [/#3b82f6/gi, "#1A1A1A"],
  [/#1d4ed8/gi, "#333333"],
  [/#60a5fa/gi, "#1A1A1A"],
  [/#93c5fd/gi, "rgba(26,26,26,0.2)"],
  [/#dbeafe/gi, "#FAF5E8"],
  [/#eff6ff/gi, "#FAF5E8"],
  [/#e0f2fe/gi, "#FAF5E8"],
  [/#bae6fd/gi, "#F5EFE0"],
  [/#7dd3fc/gi, "#F5EFE0"],
  [/#f0f9ff/gi, "#FAF5E8"],
  [/#38bdf8/gi, "#1A1A1A"],
  [/#0ea5e9/gi, "#1A1A1A"],
  [/#0284c7/gi, "#1A1A1A"],
  [/#1e3a8a/gi, "#1A1A1A"],
  [/#7c3aed/gi, "#1A1A1A"],
  [/#8b5cf6/gi, "#666666"],
  [/#1e40af/gi, "#1A1A1A"],
  [/#bfdbfe/gi, "#E5DFD0"],
  [/#eef2ff/gi, "#FAF5E8"],
  [/#e5edff/gi, "#FAF5E8"],
  [/rgba\(37,\s*99,\s*235[^)]*\)/gi, "rgba(26,26,26,0.12)"],
  [/rgba\(14,\s*165,\s*233[^)]*\)/gi, "rgba(26,26,26,0.08)"],
];

for (const tool of TOOLS) {
  const indexPath = path.join(ROOT, "tools", tool, "index.html");
  let html = readFileSync(indexPath, "utf8");
  if (!html.includes("theme-tool-page")) {
    html = html.replace(/<body([^>]*)>/, (m, attrs) => {
      if (/class="/.test(attrs)) {
        return `<body${attrs.replace(/class="([^"]*)"/, 'class="$1 theme-tool-page"')}>`;
      }
      return `<body class="theme-tool-page"${attrs}>`;
    });
    writeFileSync(indexPath, html, "utf8");
    console.log("HTML", tool);
  }

  const cssPath = path.join(ROOT, "tools", tool, "style.css");
  let css = readFileSync(cssPath, "utf8");
  const before = css;
  for (const [re, rep] of REPLACEMENTS) {
    css = css.replace(re, rep);
  }
  if (css !== before) {
    writeFileSync(cssPath, css, "utf8");
    console.log("CSS", tool);
  }
}

const ddayJs = path.join(ROOT, "tools", "dday-calculator", "script.js");
let js = readFileSync(ddayJs, "utf8");
if (js.includes('borderColor: "#2563eb"')) {
  js = js.replace('borderColor: "#2563eb"', 'borderColor: "#1A1A1A"');
  writeFileSync(ddayJs, js, "utf8");
  console.log("JS dday chart color only");
}
