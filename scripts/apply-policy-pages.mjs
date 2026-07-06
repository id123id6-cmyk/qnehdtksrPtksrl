/**
 * 정책/소개 페이지 본문 스타일 통일
 * node scripts/apply-policy-pages.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function stripPageStyles(html) {
  return html.replace(/\s*<style>[\s\S]*?<\/style>\s*(?=<nav class="theme-nav">)/, "\n");
}

function addBodyClass(html) {
  if (html.includes('class="theme-policy-page"')) return html;
  return html.replace(/<body([^>]*)>/, (m, attrs) => {
    if (/class=/.test(attrs)) {
      return `<body${attrs.replace(/class="([^"]*)"/, 'class="$1 theme-policy-page"')}>`;
    }
    return `<body class="theme-policy-page"${attrs}>`;
  });
}

function commonReplacements(html) {
  return html
    .replace(/class="section-title"/g, 'class="theme-h2"')
    .replace(/class="card page-card"/g, 'class="theme-callout theme-prose"')
    .replace(/class="card legal-card"/g, 'class="theme-callout theme-prose"')
    .replace(/class="btn-primary"/g, 'class="theme-btn-primary"')
    .replace(/class="btn-outline"/g, 'class="theme-btn-secondary"')
    .replace(/style="color:#64748b;"/g, 'class="theme-muted"')
    .replace(/style="margin-top:16px;font-size:0.95rem;color:#64748b;line-height:1.55;"/g, 'class="theme-body-sm" style="margin-top:16px;"');
}

function transformDisclaimer(html) {
  html = stripPageStyles(html);
  html = addBodyClass(html);
  html = html.replace(
    /<section class="page-header">[\s\S]*?<\/section>/,
    `<section class="theme-page-hero" aria-labelledby="page-title">
      <div class="theme-page-container" style="padding-top:48px;padding-bottom:48px;">
        <h1 class="theme-h1" id="page-title">면책조항</h1>
        <p class="theme-page-hero-sub">정보의 한계와 책임 범위 안내</p>
      </div>
    </section>`
  );
  html = html.replace(
    /<section class="section">\s*<div class="container">/,
    `<section class="theme-section theme-section--white">
      <div class="theme-page-container">`
  );
  return commonReplacements(html);
}

function transformTerms(html) {
  html = stripPageStyles(html);
  html = addBodyClass(html);
  html = html.replace(
    /<section class="page-header">[\s\S]*?<\/section>/,
    `<section class="theme-page-hero" aria-labelledby="page-title">
      <div class="theme-page-container" style="padding-top:48px;padding-bottom:48px;">
        <h1 class="theme-h1" id="page-title">이용약관</h1>
        <p class="theme-page-hero-sub">seungbak.com 서비스 이용에 관한 약관입니다</p>
      </div>
    </section>`
  );
  html = html.replace(
    /<section class="section">\s*<div class="container legal-content">/,
    `<section class="theme-section theme-section--white">
      <div class="theme-page-container theme-prose">`
  );
  html = html.replace(/<h2>/g, '<h2 class="theme-h2">');
  return commonReplacements(html);
}

function transformPrivacy(html) {
  html = stripPageStyles(html);
  html = addBodyClass(html);
  html = html.replace(
    /<section class="privacy-hero"[\s\S]*?<\/section>/,
    `<section class="theme-page-hero" aria-labelledby="privacy-title">
      <div class="theme-page-container" style="padding-top:48px;padding-bottom:48px;">
        <h1 class="theme-h1" id="privacy-title">개인정보 처리방침</h1>
        <div class="theme-date-badges">
          <span>최종 개정일: 2026-07-02</span>
          <span>시행일: 2026-07-02</span>
        </div>
      </div>
    </section>`
  );
  html = html.replace(
    /<section class="section">\s*<div class="container legal-content">/,
    `<section class="theme-section theme-section--white">
      <div class="theme-page-container theme-prose">`
  );
  html = html
    .replace(/class="privacy-box"/g, 'class="theme-callout"')
    .replace(/class="privacy-table-wrap"/g, 'class="theme-table-wrap"')
    .replace(/class="privacy-table"/g, 'class="theme-table"')
    .replace(/class="legal-agency-list"/g, 'class="theme-agency-list"')
    .replace(/class="legal-intro"/g, 'class="theme-body"')
    .replace(/<h2>/g, '<h2 class="theme-h2">')
    .replace(/<h3>/g, '<h3 class="theme-h3">');
  return commonReplacements(html);
}

function transformContact(html) {
  html = stripPageStyles(html);
  html = addBodyClass(html);
  html = html.replace(
    /<section class="contact-hero"[\s\S]*?<\/section>/,
    `<section class="theme-page-hero" aria-labelledby="contact-hero-title">
      <div class="theme-page-container" style="padding-top:48px;padding-bottom:48px;">
        <h1 class="theme-h1" id="contact-hero-title">문의하기</h1>
        <p class="theme-page-hero-sub">언제든 편하게 연락주세요</p>
      </div>
    </section>`
  );
  html = html.replace(
    /<section class="section contact-section">\s*<div class="container">/,
    `<section class="theme-section theme-section--white">
      <div class="theme-page-container theme-prose">`
  );
  html = html
    .replace(/class="contact-email-box"/g, 'class="theme-email-box"')
    .replace(/class="contact-email-note"/g, 'class="theme-body-sm"')
    .replace(/class="contact-method-list"/g, 'class="theme-method-list"')
    .replace(/class="contact-check-list contact-check-list--ok"/g, 'class="theme-check-list theme-check-list--ok"')
    .replace(/class="contact-check-list contact-check-list--no"/g, 'class="theme-check-list theme-check-list--no"')
    .replace(/class="contact-note-box"/g, 'class="theme-callout theme-callout--note"')
    .replace(/class="contact-cta-row"/g, 'class="theme-cta-row"')
    .replace(/<h3>/g, '<h3 class="theme-h3">');
  return commonReplacements(html);
}

function transformAbout(html) {
  html = stripPageStyles(html);
  html = addBodyClass(html);
  html = html.replace(
    /<section class="about-hero"[\s\S]*?<\/section>/,
    `<section class="theme-page-hero" aria-labelledby="about-hero-title">
      <div class="theme-page-container" style="padding-top:48px;padding-bottom:48px;">
        <div class="theme-profile-wrap">
          <img src="/images/about/wizard-profile.png" alt="승박 마법사 캐릭터 프로필" width="500" height="500" loading="eager">
        </div>
        <h1 class="theme-h1" id="about-hero-title">안녕하세요, 승박입니다</h1>
        <p class="theme-page-hero-sub">월급쟁이의 부동산 보물지도</p>
        <p class="theme-page-hero-tagline">
          복잡한 부동산 정보를 누구나 무료로 쓸 수 있는 도구와 글로 정리하는 사이트입니다.
          청약·대출·시세·정책까지, 월급쟁이가 내집마련을 준비할 때 필요한 것을 한곳에 모았습니다.
        </p>
        <span class="theme-slogan">✨ 보물은 가까이 있다</span>
      </div>
    </section>`
  );

  const cards = html.match(/<div class="card page-card">[\s\S]*?<\/div>\s*(?=<div class="card page-card">|<\/div>\s*<\/section>)/g);
  if (!cards) {
    html = html.replace(
      /<section class="section about-section">\s*<div class="container">([\s\S]*?)<\/div>\s*<\/section>/,
      (_, inner) => {
        const blocks = inner.match(/<div class="card page-card">[\s\S]*?<\/div>(?=\s*(?:<div class="card page-card">|$))/g) || [];
        return blocks
          .map((block, i) => {
            const bg = i % 2 === 0 ? "theme-section--white" : "theme-section--beige";
            const body = block
              .replace('class="card page-card"', 'class="theme-callout theme-prose"')
              .replace(/class="section-title"/g, 'class="theme-h2"')
              .replace(/class="about-pain-list"/g, 'class="theme-pain-list"')
              .replace(/class="about-tools-grid"/g, 'class="theme-tools-grid"')
              .replace(/class="about-promise-list"/g, 'class="theme-check-list theme-check-list--ok"')
              .replace(/class="about-contact-list"/g, 'class="theme-method-list"')
              .replace(/class="about-cta-row"/g, 'class="theme-cta-row"')
              .replace(/class="btn-primary"/g, 'class="theme-btn-primary"')
              .replace(/class="btn-outline"/g, 'class="theme-btn-secondary"')
              .replace(/<h3>/g, '<h3 class="theme-h3">')
              .replace(/style="color:#64748b;"/g, 'class="theme-muted"');
            return `<section class="theme-section ${bg}"><div class="theme-page-container">${body}</div></section>`;
          })
          .join("\n");
      }
    );
  }

  html = html.replace(
    /<section class="section about-section">\s*<div class="container">([\s\S]*?)<\/div>\s*<\/section>/,
    (_, inner) => {
      const re = /<div class="card page-card">[\s\S]*?<\/div>(?=\s*(?:<div class="card page-card">|<\/div>\s*<\/section>|$))/g;
      const blocks = inner.match(re) || [];
      if (!blocks.length) return `<section class="theme-section theme-section--white"><div class="theme-page-container theme-prose">${inner}</div></section>`;
      return blocks
        .map((block, i) => {
          const bg = i % 2 === 0 ? "theme-section--white" : "theme-section--beige";
          const body = block
            .replace('class="card page-card"', 'class="theme-callout theme-prose"')
            .replace(/class="section-title"/g, 'class="theme-h2"')
            .replace(/class="about-pain-list"/g, 'class="theme-pain-list"')
            .replace(/class="about-tools-grid"/g, 'class="theme-tools-grid"')
            .replace(/class="about-promise-list"/g, 'class="theme-check-list theme-check-list--ok"')
            .replace(/class="about-contact-list"/g, 'class="theme-method-list"')
            .replace(/class="about-cta-row"/g, 'class="theme-cta-row"')
            .replace(/class="btn-primary"/g, 'class="theme-btn-primary"')
            .replace(/class="btn-outline"/g, 'class="theme-btn-secondary"')
            .replace(/<h3>/g, '<h3 class="theme-h3">')
            .replace(/style="color:#64748b;"/g, 'class="theme-muted"');
          return `<section class="theme-section ${bg}"><div class="theme-page-container">${body}</div></section>`;
        })
        .join("\n");
    }
  );

  return html;
}

const files = [
  { path: "about.html", fn: transformAbout },
  { path: "contact.html", fn: transformContact },
  { path: "privacy.html", fn: transformPrivacy },
  { path: "disclaimer.html", fn: transformDisclaimer },
  { path: "terms.html", fn: transformTerms },
];

for (const { path: file, fn } of files) {
  const full = path.join(ROOT, file);
  const out = fn(readFileSync(full, "utf8"));
  writeFileSync(full, out, "utf8");
  console.log("OK", file);
}
