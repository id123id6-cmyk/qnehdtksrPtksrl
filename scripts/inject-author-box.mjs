import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const blogDir = "blog";
const skip = new Set(["post-5.html", "post-6.html", "post-9.html", "post-16.html"]);
const marker = "post-author-box";

function parseDates(html) {
  const published =
    html.match(/"datePublished":\s*"([^"]+)"/)?.[1] ||
    html.match(/datetime="([^"]+)"[^>]*>[^<]*<\/time>/)?.[1] ||
    "";
  const modified = html.match(/"dateModified":\s*"([^"]+)"/)?.[1] || published;
  return { published, modified };
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function buildBlock(published, modified) {
  const pubDisplay = formatDate(published);
  const modDisplay = formatDate(modified);
  return `
          <div class="post-author-box" itemscope itemtype="https://schema.org/Person">
            <img src="/images/about/profile.jpg" alt="승박 프로필 사진" class="post-author-avatar" width="72" height="72" loading="lazy">
            <div class="post-author-info">
              <p class="post-author-label">글쓴이</p>
              <p class="post-author-name" itemprop="name">승박</p>
              <p class="post-author-bio" itemprop="description">비전공자 생산관리 직장인이 직접 조사·작성합니다. 부동산 정책과 계산기를 월급쟁이 눈높이로 정리하는 <a href="/about.html">seungbak.com</a> 운영자입니다.</p>
              <p class="post-author-links">
                <a href="/about.html">운영자 소개</a>
                <span class="post-meta-sep">·</span>
                <a href="/contact.html">문의하기</a>
                <span class="post-meta-sep">·</span>
                <a href="mailto:id123id6@gmail.com">id123id6@gmail.com</a>
              </p>
            </div>
          </div>

          <p class="post-updated-footer">
            <time datetime="${published}">최초 게시: ${pubDisplay}</time>
            <span class="post-meta-sep">·</span>
            <time datetime="${modified}">최종 수정: ${modDisplay}</time>
          </p>
`;
}

const files = readdirSync(blogDir)
  .filter((f) => /^post-\d+\.html$/.test(f) && !skip.has(f))
  .sort((a, b) => {
    const na = Number(a.match(/\d+/)[0]);
    const nb = Number(b.match(/\d+/)[0]);
    return na - nb;
  });

let updated = 0;
for (const file of files) {
  const path = join(blogDir, file);
  let html = readFileSync(path, "utf8");
  if (html.includes(marker)) continue;

  const { published, modified } = parseDates(html);
  const block = buildBlock(published, modified);

  const anchors = [
    /<nav class="post-nav"/,
    /<p class="post-disclaimer"/,
    /<!-- AdSense 광고 영역 \(승인 후 삽입\) -->\s*\n\s*<nav class="post-nav"/,
  ];

  let inserted = false;
  for (const re of anchors) {
    if (re.test(html)) {
      html = html.replace(re, block + "\n          $&");
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    html = html.replace(/<\/article>/, block + "\n        </article>");
  }

  writeFileSync(path, html);
  updated++;
  console.log("updated:", file, published, modified);
}

console.log("total updated:", updated, "/", files.length);
