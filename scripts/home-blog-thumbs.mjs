import fs from 'fs';
import sharp from 'sharp';
import path from 'path';

const html = fs.readFileSync('index.html', 'utf8');
const imgs = [...html.matchAll(/src="(\/blog\/images\/[^"]+)"/g)].map((m) => m[1]);
console.log('adsense', html.includes('adsbygoogle'));
console.log('pretendard', html.includes('pretendard'));

for (const p of imgs) {
  const full = path.join('.', p.replace(/^\//, ''));
  const st = fs.statSync(full);
  console.log((st.size / 1024).toFixed(0) + 'KB', p);
}

// make homepage thumbs 400w webp if missing
fs.mkdirSync('images/main/thumbs', { recursive: true });
for (const p of imgs) {
  const id = p.match(/post-(\d+)/)?.[1];
  if (!id) continue;
  const src = path.join('.', p.replace(/^\//, ''));
  const out = `images/main/thumbs/post-${id}.webp`;
  await sharp(src).resize(400, 225, { fit: 'cover' }).webp({ quality: 70 }).toFile(out);
  console.log('thumb', out, (fs.statSync(out).size / 1024).toFixed(1) + 'KB');
}
