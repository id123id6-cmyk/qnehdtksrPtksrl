import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "blog", "images", "post-58");
fs.mkdirSync(dir, { recursive: true });
fs.mkdirSync(path.join(root, "images", "main", "thumbs"), { recursive: true });

function svg(w, h) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f766e"/><stop offset="100%" stop-color="#134e4a"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<rect x="${Math.round(w * 0.08)}" y="${Math.round(h * 0.18)}" width="${Math.round(w * 0.84)}" height="${Math.round(h * 0.64)}" rx="24" fill="rgba(255,255,255,0.12)"/>
<text x="50%" y="46%" text-anchor="middle" fill="#ecfdf5" font-family="Malgun Gothic, sans-serif" font-size="${Math.round(w / 22)}" font-weight="700">필요연봉 계산</text>
<text x="50%" y="58%" text-anchor="middle" fill="#99f6e4" font-family="Malgun Gothic, sans-serif" font-size="${Math.round(w / 40)}">LTV 40% · DSR 40% · 30년 원리금균등</text>
</svg>`);
}

const heroPath = path.join(dir, "hero.png");
const thumbPath = path.join(dir, "thumb.png");
const webpPath = path.join(root, "images", "main", "thumbs", "post-58.webp");

await sharp(svg(1536, 1024)).png().toFile(heroPath);
await sharp(svg(400, 225)).png().toFile(thumbPath);
await sharp(thumbPath).webp({ quality: 82 }).toFile(webpPath);

const h = await sharp(heroPath).metadata();
const t = await sharp(thumbPath).metadata();
console.log("hero", h.width, h.height, "thumb", t.width, t.height);
