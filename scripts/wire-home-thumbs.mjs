import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const posts = JSON.parse(fs.readFileSync('blog/posts.json', 'utf8')).posts.slice(0, 12);
fs.mkdirSync('images/main/thumbs', { recursive: true });

for (const p of posts) {
  const src = path.join('.', (p.image || '').replace(/^\//, ''));
  if (!fs.existsSync(src)) {
    console.log('skip missing', p.id, src);
    continue;
  }
  const out = `images/main/thumbs/post-${p.id}.webp`;
  await sharp(src).resize(400, 225, { fit: 'cover' }).webp({ quality: 70 }).toFile(out);
  console.log(out, (fs.statSync(out).size / 1024).toFixed(1) + 'KB');
}

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(
  /src="\/blog\/images\/post-(\d+)\/[^"]+"/g,
  'src="/images/main/thumbs/post-$1.webp"'
);
// also older pattern post-XX-hero
html = html.replace(
  /src="\/blog\/images\/post-(\d+)[^"]*"/g,
  (m, id) => {
    if (m.includes('/thumbs/')) return m;
    return `src="/images/main/thumbs/post-${id}.webp"`;
  }
);
fs.writeFileSync('index.html', html, 'utf8');
console.log('index thumbs wired');
