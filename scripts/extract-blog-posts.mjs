import fs from 'fs';

const html = fs.readFileSync('blog/index.html', 'utf8');
const cards = [];
const re =
  /<a href="(post-(\d+)\.html)" class="blog-card[\s\S]*?data-category="([^"]+)"[\s\S]*?<img src="([^"]+)" alt="([^"]*)"[\s\S]*?<span class="blog-category-badge[^"]*">([^<]*)<\/span>[\s\S]*?<h3 class="blog-card-title">([\s\S]*?)<\/h3>[\s\S]*?<p class="blog-card-excerpt">([\s\S]*?)<\/p>[\s\S]*?<time class="blog-card-date" datetime="([^"]+)">/g;

let m;
while ((m = re.exec(html))) {
  const tagRaw = m[6].replace(/\s+/g, ' ').trim();
  const tag = tagRaw.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  cards.push({
    id: Number(m[2]),
    slug: m[1],
    href: `/blog/${m[1]}`,
    category: m[3],
    image: m[4].startsWith('/') ? m[4] : `/blog/${m[4]}`,
    alt: m[5].trim(),
    tag,
    title: m[7].replace(/\s+/g, ' ').trim(),
    excerpt: m[8].replace(/\s+/g, ' ').trim(),
    date: m[9],
  });
}

cards.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

const payload = {
  updatedAt: new Date().toISOString(),
  source: 'blog/index.html',
  count: cards.length,
  posts: cards,
};

fs.writeFileSync('blog/posts.json', JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log('parsed', cards.length);
console.log(
  'latest6',
  cards
    .slice(0, 6)
    .map((c) => `post-${c.id} (${c.date})`)
    .join(', ')
);
