/**
 * Phase 2 STEP 2 PART B — 획일적 제목 7편 개편
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve("blog");
const MODIFIED = "2026-07-09";
const MODIFIED_KR = "2026년 7월 9일";

const POSTS = [
  {
    file: "post-28.html",
    old: "2026 종합부동산세 완벽 정리 (과세 대상·세율·계산·1주택 공제)",
    new: "종부세 12억 공제 받는 법, 부부공동명의 진짜 유리한가?",
    oldFooterDate: "2026-07-03",
    oldFooterKr: "2026년 7월 3일",
  },
  {
    file: "post-27.html",
    old: "2026 양도소득세 비과세 요건 완벽 정리 (1가구 1주택·실거주·보유기간)",
    new: "1가구 1주택 양도세 비과세, 저도 헷갈렸던 3가지",
    oldFooterDate: "2026-07-03",
    oldFooterKr: "2026년 7월 3일",
  },
  {
    file: "post-26.html",
    old: "2026 생애최초 취득세 감면 완벽 정리 (200만원 혜택·자격·신청법)",
    new: "생애최초 취득세 감면 200만원, 신청하다 놓친 조건들",
    oldFooterDate: "2026-07-02",
    oldFooterKr: "2026년 7월 2일",
  },
  {
    file: "post-25.html",
    old: "2026 취득세·등록세 완벽 계산 가이드 (세율·감면·실전 예시)",
    new: "취득세 계산할 때 다들 실수하는 부분 (2026 기준)",
    oldFooterDate: "2026-07-02",
    oldFooterKr: "2026년 7월 2일",
  },
  {
    file: "post-24.html",
    old: "2026 신혼부부 특별공급 vs 신혼희망타운 완벽 비교 (자격·물량·가점·전략)",
    new: "신혼특공 vs 신혼희망타운, 저희 부부는 이렇게 골랐어요",
    oldFooterDate: "2026-07-01",
    oldFooterKr: "2026년 7월 1일",
  },
  {
    file: "post-22.html",
    old: "2026 무주택 기간 인정 기준 완벽 정리 (이혼·상속·소형주택·지방거주 케이스별)",
    new: "무주택 기간, 이혼·상속·소형주택 어떻게 계산될까?",
    oldFooterDate: "2026-06-26",
    oldFooterKr: "2026년 6월 26일",
  },
  {
    file: "post-21.html",
    old: "2026 보금자리론 vs 디딤돌 대출 완벽 비교 (한도·금리·자격 총정리)",
    new: "보금자리론 vs 디딤돌, 월급쟁이는 뭐가 더 유리할까?",
    oldFooterDate: "2026-06-26",
    oldFooterKr: "2026년 6월 26일",
  },
];

function updatePost({ file, old, new: title, oldFooterDate, oldFooterKr }) {
  const fp = path.join(ROOT, file);
  let html = readFileSync(fp, "utf8");

  html = html.replace(
    `<title>${old} | 승박</title>`,
    `<title>${title} | 승박</title>`
  );
  html = html.replace(
    `<meta property="og:title" content="${old}">`,
    `<meta property="og:title" content="${title}">`
  );
  html = html.replace(
    `"headline": "${old}"`,
    `"headline": "${title}"`
  );
  html = html.replace(
    `<h1>${old}</h1>`,
    `<h1>${title}</h1>`
  );
  html = html.replace(
    /"dateModified": "[^"]+"/,
    `"dateModified": "${MODIFIED}"`
  );
  html = html.replace(
    `<time datetime="${oldFooterDate}">최종 수정: ${oldFooterKr}</time>`,
    `<time datetime="${MODIFIED}">최종 수정: ${MODIFIED_KR}</time>`
  );

  writeFileSync(fp, html, "utf8");
  console.log("updated:", file);
}

for (const post of POSTS) updatePost(post);

// blog/index.html card titles + img alt
let indexHtml = readFileSync(path.join(ROOT, "index.html"), "utf8");
for (const { old, new: title } of POSTS) {
  indexHtml = indexHtml.replace(
    `<h3 class="blog-card-title">${old}</h3>`,
    `<h3 class="blog-card-title">${title}</h3>`
  );
  indexHtml = indexHtml.replace(
    `alt="${old}"`,
    `alt="${title}"`
  );
}
writeFileSync(path.join(ROOT, "index.html"), indexHtml, "utf8");
console.log("updated: index.html");

// sitemap lastmod
let sitemap = readFileSync("sitemap.xml", "utf8");
for (const { file } of POSTS) {
  const slug = file.replace(".html", "");
  sitemap = sitemap.replace(
    new RegExp(
      `(<loc>https://seungbak\\.com/blog/${slug}\\.html</loc>\\s*\\n\\s*<lastmod>)[^<]+(</lastmod>)`,
      "m"
    ),
    `$1${MODIFIED}$2`
  );
}
writeFileSync("sitemap.xml", sitemap, "utf8");
console.log("updated: sitemap.xml");
