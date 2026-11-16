import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import {
  bumpHubLastmod,
  removeNonHtmlEntries,
  latestPostDate,
  todayYmd,
} from './lib/sitemap-utils.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sitemapPath = path.join(root, 'sitemap.xml');
const postsPath = path.join(root, 'blog', 'posts.json');

const date = latestPostDate(postsPath) || todayYmd();
const removed = removeNonHtmlEntries(sitemapPath);
const hub = bumpHubLastmod(sitemapPath, date);

const xml = fs.readFileSync(sitemapPath, 'utf8');
const home = xml.match(
  /<loc>https:\/\/seungbak\.com\/<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/
);
const blog = xml.match(
  /<loc>https:\/\/seungbak\.com\/blog\/<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/
);
const hasLlms = /llms(?:-full)?\.txt/.test(xml);
const locCount = (xml.match(/<loc>/g) || []).length;

console.log(
  JSON.stringify(
    {
      hubDate: hub,
      homeLastmod: home?.[1] ?? null,
      blogLastmod: blog?.[1] ?? null,
      removedLlmsBlocks: removed,
      hasLlms,
      locCount,
    },
    null,
    2
  )
);
