/**
 * Google SEO Starter Guide + Naver Search Advisor 기본 반영
 * - og-image, robots, sitemap(tools 복구), RSS
 * - 도구 index 복구, canonical/OG/JSON-LD, nav 통일
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
const TODAY = '2026-08-27';
const SITE = 'https://seungbak.com';

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}
function write(p, s) {
  fs.writeFileSync(path.join(ROOT, p), s, 'utf8');
}
function ensureDir(p) {
  fs.mkdirSync(path.join(ROOT, p), { recursive: true });
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function makeOgImage() {
  ensureDir('images');
  const srcCandidates = [
    'images/main/map-preview.png',
    'favicon.png',
    'images/about/profile.png',
  ];
  let src = srcCandidates.map((p) => path.join(ROOT, p)).find((p) => fs.existsSync(p));
  if (!src) throw new Error('OG source image not found');

  // 1200x630 canvas, dark teal background + centered image
  const bg = Buffer.from(
    `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f766e"/>
          <stop offset="100%" stop-color="#134e4a"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#g)"/>
      <text x="60" y="90" fill="#ecfdf5" font-size="42" font-family="Arial, sans-serif" font-weight="700">seungbak.com</text>
      <text x="60" y="150" fill="#ccfbf1" font-size="28" font-family="Arial, sans-serif">부동산 실거래가 · 계산 도구 · 블로그</text>
    </svg>`
  );

  const overlay = await sharp(src)
    .resize(520, 360, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp(bg)
    .composite([{ input: overlay, left: 620, top: 150 }])
    .png()
    .toFile(path.join(ROOT, 'images/og-image.png'));

  console.log('✓ images/og-image.png');
}

function writeRobots() {
  write(
    'robots.txt',
    `# Google · Naver(Yeti) 등 검색로봇 수집 허용
# https://developers.google.com/search/docs/crawling-indexing/robots/intro
# https://searchadvisor.naver.com/guide/seo-basic-robots

User-agent: *
Allow: /

User-agent: Yeti
Allow: /

Sitemap: ${SITE}/sitemap.xml
`
  );
  console.log('✓ robots.txt');
}

function rebuildSitemap() {
  const posts = JSON.parse(read('blog/posts.json')).posts;
  const skipIds = new Set([5, 6, 9, 16]); // redirected/noindex
  const toolUrls = [
    ['/tools/', '0.8'],
    ['/tools/realestate-map/', '0.9'],
    ['/tools/bunyang-alarm/', '0.9'],
    ['/tools/subscription-calculator/', '0.9'],
    ['/tools/apt-calculator/', '0.9'],
    ['/tools/salary-calculator/', '0.9'],
    ['/tools/income-calculator/', '0.9'],
    ['/tools/dday-calculator/', '0.9'],
    ['/tools/severance-calculator/', '0.9'],
  ];

  const urls = [];
  const push = (loc, { lastmod, changefreq, priority } = {}) => {
    urls.push({ loc: SITE + loc, lastmod, changefreq, priority });
  };

  push('/', { lastmod: TODAY, changefreq: 'weekly', priority: '1.0' });
  for (const [loc, priority] of toolUrls) {
    push(loc, { lastmod: TODAY, changefreq: 'weekly', priority });
  }
  push('/blog/', { lastmod: TODAY, changefreq: 'daily', priority: '0.7' });

  for (const p of posts) {
    if (skipIds.has(p.id)) continue;
    push(`/blog/${p.slug}`, {
      lastmod: p.date || TODAY,
      changefreq: 'monthly',
      priority: '0.8',
    });
  }

  push('/about.html', { lastmod: TODAY, changefreq: 'monthly', priority: '0.5' });
  push('/contact.html', { lastmod: TODAY, changefreq: 'yearly', priority: '0.4' });
  push('/privacy.html', { lastmod: TODAY, changefreq: 'yearly', priority: '0.3' });
  push('/terms.html', { lastmod: TODAY, changefreq: 'yearly', priority: '0.3' });
  push('/disclaimer.html', { lastmod: TODAY, changefreq: 'yearly', priority: '0.3' });

  const body = urls
    .map((u) => {
      let block = `  <url>\n    <loc>${u.loc}</loc>\n`;
      if (u.lastmod) block += `    <lastmod>${u.lastmod}</lastmod>\n`;
      if (u.changefreq) block += `    <changefreq>${u.changefreq}</changefreq>\n`;
      if (u.priority) block += `    <priority>${u.priority}</priority>\n`;
      block += `  </url>`;
      return block;
    })
    .join('\n\n');

  write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
  );
  console.log(`✓ sitemap.xml (${urls.length} URLs)`);
}

function extractPostBody(html) {
  // Prefer article text between post-lead and disclaimer/sources
  let chunk = html;
  const startMarkers = ['class="post-lead"', 'class="post-article"', '<article'];
  const endMarkers = ['class="post-disclaimer"', 'class="post-related"', '</article>'];
  let start = -1;
  for (const m of startMarkers) {
    const i = html.indexOf(m);
    if (i !== -1) {
      start = i;
      break;
    }
  }
  if (start === -1) return '';
  let end = html.length;
  for (const m of endMarkers) {
    const i = html.indexOf(m, start + 20);
    if (i !== -1 && i < end) end = i;
  }
  chunk = html.slice(start, end);
  let text = chunk
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  // Cap length for RSS size
  if (text.length > 8000) text = text.slice(0, 8000) + '…';
  return text;
}

function buildRss() {
  const data = JSON.parse(read('blog/posts.json'));
  const items = data.posts.slice(0, 30); // recent 30
  const rssItems = items
    .map((p) => {
      const file = path.join(ROOT, 'blog', p.slug);
      let description = p.excerpt || '';
      if (fs.existsSync(file)) {
        const body = extractPostBody(fs.readFileSync(file, 'utf8'));
        if (body) description = body;
      }
      const link = `${SITE}/blog/${p.slug}`;
      const pub = p.date ? `${p.date}T09:00:00+09:00` : `${TODAY}T09:00:00+09:00`;
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(pub).toUTCString()}</pubDate>
      <description><![CDATA[${description}]]></description>
    </item>`;
    })
    .join('\n');

  write(
    'blog/rss.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>승박 블로그 — seungbak.com</title>
    <link>${SITE}/blog/</link>
    <description>부동산·세금·청약·노후를 월급쟁이 눈높이로 정리하는 승박 블로그</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>
`
  );
  console.log(`✓ blog/rss.xml (${items.length} items)`);
}

function enableToolsIndex() {
  const tools = [
    'tools/index.html',
    'tools/bunyang-alarm/index.html',
    'tools/subscription-calculator/index.html',
    'tools/dday-calculator/index.html',
    'tools/realestate-map/index.html',
    'tools/severance-calculator/index.html',
    'tools/apt-calculator/index.html',
    'tools/salary-calculator/index.html',
    'tools/income-calculator/index.html',
  ];
  let n = 0;
  for (const f of tools) {
    let html = read(f);
    const before = html;
    html = html.replace(
      /<meta name="robots" content="noindex,\s*follow">/gi,
      '<meta name="robots" content="index, follow">'
    );
    // ensure og:image points to existing file
    if (!html.includes('og:image')) {
      const insertAfter = html.match(/<meta property="og:description"[^>]*>/);
      if (insertAfter) {
        html = html.replace(
          insertAfter[0],
          `${insertAfter[0]}\n  <meta property="og:image" content="${SITE}/images/og-image.png">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">`
        );
      }
    } else {
      html = html.replace(
        /https:\/\/seungbak\.com\/images\/og-image\.png/g,
        `${SITE}/images/og-image.png`
      );
    }
    if (html !== before) {
      write(f, html);
      n++;
    }
  }
  console.log(`✓ tools index restored (${n} files)`);
}

function patchHome() {
  let html = read('index.html');
  // OG / Twitter images
  if (!html.includes('og:image')) {
    html = html.replace(
      '<meta property="og:site_name" content="승박">',
      `<meta property="og:site_name" content="승박">
  <meta property="og:image" content="${SITE}/images/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="seungbak.com 부동산 실거래가 지도와 무료 계산 도구">`
    );
  }
  if (!html.includes('twitter:image')) {
    html = html.replace(
      /(<meta name="twitter:description"[^>]*>)/,
      `$1\n  <meta name="twitter:image" content="${SITE}/images/og-image.png">`
    );
  }
  // JSON-LD
  if (!html.includes('application/ld+json')) {
    const ld = `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "${SITE}/#organization",
        "name": "승박",
        "alternateName": "seungbak.com",
        "url": "${SITE}/",
        "logo": "${SITE}/favicon.png",
        "sameAs": ["https://www.instagram.com/seungbak.tools/"],
        "email": "id123id6@gmail.com"
      },
      {
        "@type": "WebSite",
        "@id": "${SITE}/#website",
        "url": "${SITE}/",
        "name": "승박",
        "alternateName": "seungbak.com",
        "inLanguage": "ko-KR",
        "publisher": { "@id": "${SITE}/#organization" }
      },
      {
        "@type": "WebPage",
        "@id": "${SITE}/#webpage",
        "url": "${SITE}/",
        "name": "서울 부동산 실거래가 + 직장인 도구 모음 | 승박이형",
        "isPartOf": { "@id": "${SITE}/#website" },
        "about": { "@id": "${SITE}/#organization" },
        "description": "내 월급으로 살 수 있는 집은 어디? 서울·경기 실거래가 지도와 무료 부동산·연봉 계산 도구"
      }
    ]
  }
  </script>`;
    html = html.replace('</head>', `${ld}\n</head>`);
  }
  // footer blog link
  if (!html.includes('hr-footer-nav') || !html.includes('"/blog/"')) {
    html = html.replace(
      '<li><a href="/about.html">소개</a></li>',
      '<li><a href="/blog/">블로그</a></li>\n            <li><a href="/about.html">소개</a></li>'
    );
  }
  write('index.html', html);
  console.log('✓ index.html SEO');
}

function patchAbout() {
  let html = read('about.html');
  if (!html.includes('og:title')) {
    html = html.replace(
      '<link rel="canonical" href="https://seungbak.com/about.html">',
      `<link rel="canonical" href="https://seungbak.com/about.html">

  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE}/about.html">
  <meta property="og:title" content="seungbak.com 소개 | 승박">
  <meta property="og:description" content="비전공자 생산관리 직장인 승박이 운영하는 seungbak.com 소개. 부동산 계산기·실거래가 지도·정책 가이드를 월급쟁이 눈높이로 제공합니다.">
  <meta property="og:image" content="${SITE}/images/og-image.png">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:site_name" content="승박">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="seungbak.com 소개 | 승박">
  <meta name="twitter:description" content="비전공자 생산관리 직장인 승박이 운영하는 seungbak.com 소개.">
  <meta name="twitter:image" content="${SITE}/images/og-image.png">`
    );
  }
  if (!html.includes('application/ld+json')) {
    const ld = `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "seungbak.com 소개",
    "url": "${SITE}/about.html",
    "inLanguage": "ko-KR",
    "mainEntity": {
      "@type": "Person",
      "name": "승박",
      "url": "${SITE}/about.html",
      "jobTitle": "생산관리 직장인",
      "worksFor": { "@type": "Organization", "name": "seungbak.com", "url": "${SITE}/" }
    }
  }
  </script>`;
    html = html.replace('</head>', `${ld}\n</head>`);
  }
  write('about.html', html);
  console.log('✓ about.html SEO');
}

function patchBlogIndex() {
  let html = read('blog/index.html');
  const desc =
    '부동산·세금·청약·노후를 월급쟁이 눈높이로 정리하는 승박 블로그. 실거래가 지도·계산 도구와 함께 보세요.';
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${desc}">`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${desc}">`
  );
  if (!html.includes('og:image')) {
    html = html.replace(
      '<meta property="og:site_name" content="승박">',
      `<meta property="og:site_name" content="승박">
  <meta property="og:image" content="${SITE}/images/og-image.png">
  <meta property="og:image:alt" content="승박 블로그">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="블로그 | 승박">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${SITE}/images/og-image.png">`
    );
  }
  if (!html.includes('application/rss+xml')) {
    html = html.replace(
      '<link rel="canonical" href="https://seungbak.com/blog/">',
      `<link rel="canonical" href="https://seungbak.com/blog/">
  <link rel="alternate" type="application/rss+xml" title="승박 블로그 RSS" href="${SITE}/blog/rss.xml">`
    );
  }
  if (!html.includes('application/ld+json')) {
    const ld = `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "블로그 | 승박",
    "url": "${SITE}/blog/",
    "description": "${desc}",
    "inLanguage": "ko-KR",
    "isPartOf": { "@type": "WebSite", "name": "승박", "url": "${SITE}/" }
  }
  </script>`;
    html = html.replace('</head>', `${ld}\n</head>`);
  }
  html = html.replace('href="/#tools"', 'href="/tools/"');
  write('blog/index.html', html);
  console.log('✓ blog/index.html SEO');
}

function patchPolicyPages() {
  const pages = [
    {
      file: 'contact.html',
      canonical: `${SITE}/contact.html`,
      desc: 'seungbak.com 운영자 승박에게 문의하세요. 오류 신고, 기능 제안, 광고·제휴 문의를 환영합니다.',
    },
    {
      file: 'privacy.html',
      canonical: `${SITE}/privacy.html`,
      desc: 'seungbak.com 개인정보처리방침. 입력값 비저장 정책과 Google AdSense 광고 정책을 안내합니다.',
    },
    {
      file: 'disclaimer.html',
      canonical: `${SITE}/disclaimer.html`,
      desc: 'seungbak.com 면책조항. 본 사이트 정보의 한계와 책임 범위를 안내합니다.',
    },
  ];
  for (const p of pages) {
    let html = read(p.file);
    html = html.replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${p.desc}">`
    );
    if (!html.includes('rel="canonical"')) {
      html = html.replace(
        /<meta name="robots" content="index, follow">/,
        `<meta name="robots" content="index, follow">\n  <link rel="canonical" href="${p.canonical}">`
      );
    }
    html = html.replace(/href="\/#tools"/g, 'href="/tools/"');
    write(p.file, html);
  }
  // terms nav unify
  let terms = read('terms.html');
  terms = terms.replace(/href="\/#tools"/g, 'href="/tools/"');
  write('terms.html', terms);
  console.log('✓ policy pages canonical/description');
}

function injectBreadcrumbSchema() {
  const blogDir = path.join(ROOT, 'blog');
  const files = fs.readdirSync(blogDir).filter((f) => /^post-\d+\.html$/.test(f));
  let n = 0;
  for (const file of files) {
    const rel = `blog/${file}`;
    let html = read(rel);
    if (html.includes('BreadcrumbList')) continue;
    if (!html.includes('post-breadcrumb') && !html.includes('application/ld+json')) continue;

    const titleMatch = html.match(/<title>([^|<]+)/);
    const title = titleMatch ? titleMatch[1].trim() : file;
    const url = `${SITE}/blog/${file}`;
    const breadcrumb = `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "홈", "item": "${SITE}/" },
      { "@type": "ListItem", "position": 2, "name": "블로그", "item": "${SITE}/blog/" },
      { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(title)}, "item": "${url}" }
    ]
  }
  </script>`;

    if (html.includes('application/ld+json')) {
      // insert after first ld+json block
      html = html.replace(
        /<\/script>(\s*<link rel="icon"|(\s*<style>|\s*<link rel="stylesheet"))/,
        `</script>${breadcrumb}$1`
      );
      // fallback: before </head>
      if (!html.includes('BreadcrumbList')) {
        html = html.replace('</head>', `${breadcrumb}\n</head>`);
      }
    } else {
      html = html.replace('</head>', `${breadcrumb}\n</head>`);
    }
    if (html.includes('BreadcrumbList')) {
      write(rel, html);
      n++;
    }
  }
  console.log(`✓ BreadcrumbList injected (${n} posts)`);
}

function patchVercel() {
  const v = {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    buildCommand: 'npm run build',
    outputDirectory: '.',
    redirects: [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.seungbak.com' }],
        destination: 'https://seungbak.com/:path*',
        permanent: true,
      },
      { source: '/blog/post-16.html', destination: '/blog/post-20.html', permanent: true },
      { source: '/blog/post-5.html', destination: '/blog/post-11.html', permanent: true },
      { source: '/blog/post-6.html', destination: '/blog/post-11.html', permanent: true },
      { source: '/blog/post-9.html', destination: '/blog/post-11.html', permanent: true },
    ],
  };
  write('vercel.json', JSON.stringify(v, null, 2) + '\n');
  console.log('✓ vercel.json www→apex redirect');
}

function updateVerifyScript() {
  const p = 'scripts/verify-noindex-tools.mjs';
  if (!fs.existsSync(path.join(ROOT, p))) return;
  write(
    p,
    `import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TOOLS = [
  "tools/index.html",
  "tools/bunyang-alarm/index.html",
  "tools/subscription-calculator/index.html",
  "tools/dday-calculator/index.html",
  "tools/realestate-map/index.html",
  "tools/severance-calculator/index.html",
  "tools/apt-calculator/index.html",
  "tools/salary-calculator/index.html",
  "tools/income-calculator/index.html",
];

console.log("=== 도구 페이지 index, follow 확인 ===");
let bad = 0;
for (const f of TOOLS) {
  const html = fs.readFileSync(path.join(ROOT, f), "utf8");
  const ok = /<meta name="robots" content="index,\\s*follow">/i.test(html);
  console.log(f + "\\t" + (ok ? "OK" : "FAIL"));
  if (!ok) bad++;
}
if (bad) process.exit(1);
console.log("all tools indexable");
`
  );
  console.log('✓ verify-noindex-tools.mjs → index 검증으로 변경');
}

async function main() {
  await makeOgImage();
  writeRobots();
  rebuildSitemap();
  buildRss();
  enableToolsIndex();
  patchHome();
  patchAbout();
  patchBlogIndex();
  patchPolicyPages();
  injectBreadcrumbSchema();
  patchVercel();
  updateVerifyScript();
  console.log('\nSEO basics applied.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
