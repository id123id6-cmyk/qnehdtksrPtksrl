import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "blog", "images", "post-31");
fs.mkdirSync(dir, { recursive: true });

const w = 1200;
const h = 630;
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#0f766e"/>
    <stop offset="100%" stop-color="#1e3a5f"/>
  </linearGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<rect x="64" y="90" width="1072" height="450" rx="28" fill="rgba(255,255,255,0.12)"/>
<text x="50%" y="250" text-anchor="middle" fill="#ecfdf5" font-family="Malgun Gothic, sans-serif" font-size="48" font-weight="700">공정시장가액비율</text>
<text x="50%" y="320" text-anchor="middle" fill="#99f6e4" font-family="Malgun Gothic, sans-serif" font-size="28">보유세 시나리오 · 60% → 80%</text>
<text x="50%" y="390" text-anchor="middle" fill="#ccfbf1" font-family="Malgun Gothic, sans-serif" font-size="22">seungbak.com 정보 안내 (세무 자문 아님)</text>
</svg>`);

const out = path.join(dir, "fair-market-ratio-hero.png");
await sharp(svg).png().toFile(out);
const meta = await sharp(out).metadata();
console.log("wrote", out, meta.width, meta.height);
