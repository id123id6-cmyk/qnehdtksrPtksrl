import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'tools/realestate-map/index.html',
  'tools/bunyang-alarm/index.html',
  'tools/subscription-calculator/index.html',
  'tools/income-calculator/index.html',
  'tools/salary-calculator/index.html',
  'tools/apt-calculator/index.html',
  'tools/dday-calculator/index.html',
  'tools/severance-calculator/index.html',
];

const posts = JSON.parse(fs.readFileSync(path.join(root, 'blog/posts.json'), 'utf8')).posts;
const hrefSet = new Set(posts.map((p) => p.href));

console.log('## DIAGNOSIS TABLE');
console.log('| page | top intro | related <a> count |');
console.log('|---|---|---|');

for (const rel of files) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  const hasIntro = /class="tool-top-intro"/.test(html);
  const idx = html.indexOf('함께 보면 좋은 글');
  let aCount = 0;
  if (idx >= 0) {
    const ul = html.slice(idx).match(/<ul class="tool-content-links">([\s\S]*?)<\/ul>/);
    if (ul) {
      const re = /<a\s+href="([^"]+)">([^<]*)<\/a>/g;
      let m;
      while ((m = re.exec(ul[1]))) aCount++;
    }
  }
  console.log(`| ${rel} | ${hasIntro ? 'Y' : 'N'} | ${aCount} |`);
}

console.log('\n## VERIFY: intro first line');
for (const rel of files) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  const m = html.match(/class="tool-top-intro"[^>]*>\s*([^<\n]+)/);
  console.log(`\n[${rel}]`);
  console.log(m ? m[1].trim().slice(0, 120) : 'MISSING INTRO');
}

console.log('\n## VERIFY: related links + posts.json check');
for (const rel of files) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  const idx = html.indexOf('함께 보면 좋은 글');
  console.log(`\n[${rel}]`);
  if (idx < 0) {
    console.log('MISSING SECTION');
    continue;
  }
  const sliceMatch = html.slice(idx).match(/<ul class="tool-content-links">([\s\S]*?)<\/ul>/);
  if (!sliceMatch) {
    console.log('  NO tool-content-links UL');
    continue;
  }
  const slice = sliceMatch[1];
  const re = /<a\s+href="([^"]+)">([^<]*)<\/a>/g;
  let m;
  let n = 0;
  while ((m = re.exec(slice))) {
    n++;
    const href = m[1];
    const text = m[2].trim();
    const inJson = hrefSet.has(href);
    const fileOk = fs.existsSync(path.join(root, href.replace(/^\//, '')));
    console.log(`  ${n}. href=${href}`);
    console.log(`     text=${text.slice(0, 80)}`);
    console.log(`     posts.json=${inJson ? 'O' : 'X'} file=${fileOk ? 'O' : 'X'}`);
  }
  if (!n) console.log('  NO <a> LINKS FOUND');
}
