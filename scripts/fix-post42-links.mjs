import fs from "node:fs";

const files = [
  "blog/post-40.html",
  "blog/post-41.html",
  "blog/post-43.html",
  "blog/post-44.html",
  "tools/bunyang-alarm/index.html",
  "tools/subscription-calculator/index.html",
];

for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  const before = (s.match(/post-42\.html/g) || []).length;
  s = s.replaceAll('href="post-42.html"', 'href="/glossary.html"');
  s = s.replaceAll('href="/blog/post-42.html"', 'href="/glossary.html"');
  fs.writeFileSync(f, s);
  const after = (s.match(/post-42\.html/g) || []).length;
  console.log(f, { before, after });
}
