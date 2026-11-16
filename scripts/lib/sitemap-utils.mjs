import fs from 'fs';
import path from 'path';

const SITE = 'https://seungbak.com';

/** YYYY-MM-DD (Asia/Seoul-friendly local date) */
export function todayYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 홈(/)·/blog/ lastmod를 글 추가·허브 갱신일에 맞춰 올린다.
 * sitemap.xml을 통째로 재생성하지 않고 해당 블록만 고친다.
 */
export function bumpHubLastmod(sitemapPath, date = todayYmd()) {
  let xml = fs.readFileSync(sitemapPath, 'utf8');
  const hubs = [`${SITE}/`, `${SITE}/blog/`];
  for (const loc of hubs) {
    const re = new RegExp(
      `(<loc>${escapeRe(loc)}</loc>\\s*\\n\\s*<lastmod>)[^<]+(</lastmod>)`
    );
    if (!re.test(xml)) {
      throw new Error(`hub loc not found: ${loc}`);
    }
    xml = xml.replace(re, `$1${date}$2`);
  }
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  return date;
}

/** llms.txt 등 HTML이 아닌 항목 제거 */
export function removeNonHtmlEntries(sitemapPath, pathSuffixes = ['/llms.txt', '/llms-full.txt']) {
  let xml = fs.readFileSync(sitemapPath, 'utf8');
  let removed = 0;
  for (const suffix of pathSuffixes) {
    const re = new RegExp(
      `\\s*<url>\\s*<loc>${escapeRe(SITE + suffix)}</loc>[\\s\\S]*?</url>`,
      'g'
    );
    const next = xml.replace(re, '');
    if (next !== xml) removed += 1;
    xml = next;
  }
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  return removed;
}

/**
 * 글 URL 1개만 삽입하고 홈·블로그 lastmod를 date로 갱신.
 * insertBeforeLoc 기본: 기존 최신글(보통 post-N-1) 앞에 넣기.
 */
export function addPostUrl(
  sitemapPath,
  { slug, date = todayYmd(), insertBeforeLoc }
) {
  let xml = fs.readFileSync(sitemapPath, 'utf8');
  const loc = `${SITE}/blog/${slug}`;
  if (xml.includes(loc)) {
    bumpHubLastmod(sitemapPath, date);
    return { added: false, date };
  }
  const before = insertBeforeLoc || null;
  const block = `  <url>
    <loc>${loc}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

`;
  if (before) {
    const marker = `<loc>${before}</loc>`;
    const idx = xml.indexOf(marker);
    if (idx < 0) throw new Error(`insertBeforeLoc not found: ${before}`);
    const urlStart = xml.lastIndexOf('<url>', idx);
    xml = xml.slice(0, urlStart) + block + xml.slice(urlStart);
  } else {
    // /blog/ 블록 바로 뒤에 삽입
    const blogRe =
      /(<loc>https:\/\/seungbak\.com\/blog\/<\/loc>[\s\S]*?<\/url>\s*\n)/;
    if (!blogRe.test(xml)) throw new Error('/blog/ block not found');
    xml = xml.replace(blogRe, `$1\n${block}`);
  }
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  bumpHubLastmod(sitemapPath, date);
  return { added: true, date };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function latestPostDate(postsJsonPath) {
  const data = JSON.parse(fs.readFileSync(postsJsonPath, 'utf8'));
  const dates = (data.posts || []).map((p) => p.date).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : todayYmd();
}

export function resolveSitemapPath(root = process.cwd()) {
  return path.join(root, 'sitemap.xml');
}
