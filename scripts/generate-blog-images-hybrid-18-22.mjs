/**
 * post-18~22 블로그 이미지 — 글마다 다른 레이아웃
 * 히어로(썸네일): AI 연출 사진 + 글 제목·데이터 오버레이 혼합
 * 본문 이미지: Playwright — 레이아웃 13종 각각 다름
 *
 * 실행 순서:
 *   1) 히어로 PNG를 assets/에 준비 (GenerateImage)
 *   2) node scripts/generate-blog-images-hybrid-18-22.mjs
 */
import { chromium } from "playwright";
import { mkdir, access } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(
  process.env.USERPROFILE || "C:\\Users\\2606",
  ".cursor",
  "projects",
  "c-Users-2606-Desktop-260608",
  "assets"
);

const FONTS = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Pretendard', 'Noto Sans KR', sans-serif; overflow: hidden; }
  img.photo { display: block; object-fit: cover; }
`;

const APT = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=600&fit=crop&q=85";
const APT2 = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=600&fit=crop&q=85";
const APT3 = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=600&fit=crop&q=85";
const ROOM = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=600&fit=crop&q=85";
const KEYS = "https://images.unsplash.com/photo-1560184897-ae75f418493e?w=1200&h=600&fit=crop&q=85";

const HERO_BLENDS = [
  {
    dest: "post-22/no-house-hero.png",
    src: "hero-post22.png",
    overlay: `
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(15,23,42,0.15) 55%,rgba(15,23,42,0.82) 100%);"></div>
      <div style="position:absolute;top:20px;left:24px;display:flex;gap:8px;align-items:center;">
        <span style="background:rgba(255,255,255,0.92);color:#1d4ed8;font-size:12px;font-weight:800;padding:5px 12px;border-radius:20px;">🏠 청약·부동산</span>
        <span style="background:rgba(255,255,255,0.75);color:#64748b;font-size:11px;font-weight:600;padding:5px 10px;border-radius:20px;">승박 블로그</span>
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;padding:28px 32px 32px;">
        <p style="font-size:13px;color:#93c5fd;font-weight:700;margin-bottom:8px;">2026.06.26 · 13분 읽기</p>
        <h2 style="font-size:34px;font-weight:800;color:#fff;line-height:1.3;margin-bottom:14px;text-shadow:0 2px 12px rgba(0,0,0,0.3);">무주택 기간 인정 기준<br><span style="font-size:22px;font-weight:700;color:#e2e8f0;">이혼·상속·소형주택 케이스별</span></h2>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <span style="background:#2563eb;color:#fff;padding:8px 14px;border-radius:10px;font-size:14px;font-weight:800;">가점 32점</span>
          <span style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:#fff;padding:8px 14px;border-radius:10px;font-size:14px;font-weight:600;">1년 = +2점</span>
          <span style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:#fff;padding:8px 14px;border-radius:10px;font-size:14px;">만 30세 기준</span>
        </div>
      </div>`,
  },
  {
    dest: "post-21/loan-comparison-hero.png",
    src: "hero-post21.png",
    overlay: `
      <div style="position:absolute;inset:0;background:linear-gradient(105deg,rgba(15,23,42,0.92) 0%,rgba(15,23,42,0.75) 38%,transparent 62%);"></div>
      <div style="position:absolute;top:20px;left:24px;">
        <span style="background:#d97706;color:#fff;font-size:12px;font-weight:800;padding:5px 12px;border-radius:20px;">🏠 부동산 대출</span>
      </div>
      <div style="position:absolute;left:28px;top:50%;transform:translateY(-52%);max-width:480px;">
        <h2 style="font-size:36px;font-weight:800;color:#fff;line-height:1.28;margin-bottom:16px;">보금자리론 vs<br>디딤돌 대출</h2>
        <p style="font-size:15px;color:#94a3b8;margin-bottom:18px;line-height:1.5;">한도·금리·자격 총정리</p>
        <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.96);border-radius:12px;overflow:hidden;font-size:13px;">
          <tr style="background:#f1f5f9;"><td style="padding:10px 14px;font-weight:700;">디딤돌</td><td style="padding:10px;text-align:center;color:#2563eb;font-weight:800;">2.85%~</td><td style="padding:10px;text-align:center;">3.2억</td></tr>
          <tr><td style="padding:10px 14px;font-weight:700;">보금자리</td><td style="padding:10px;text-align:center;color:#16a34a;font-weight:800;">4.05%~</td><td style="padding:10px;text-align:center;">4.2억</td></tr>
        </table>
      </div>`,
  },
  {
    dest: "post-20/youth-account-dream.png",
    src: "hero-post20.png",
    overlay: `
      <div style="position:absolute;inset:0;background:linear-gradient(270deg,transparent 40%,rgba(255,255,255,0.88) 58%,rgba(255,255,255,0.95) 100%);"></div>
      <div style="position:absolute;left:28px;top:50%;transform:translateY(-50%);max-width:520px;">
        <span style="display:inline-block;background:#2563eb;color:#fff;font-size:12px;font-weight:800;padding:5px 12px;border-radius:20px;margin-bottom:14px;">🏠 청약·대출</span>
        <h2 style="font-size:32px;font-weight:800;color:#0f172a;line-height:1.3;margin-bottom:10px;">청년주택드림<br>청약통장 2026</h2>
        <p style="font-size:15px;color:#64748b;margin-bottom:16px;">가입조건 · 전환 · 대출 연계</p>
        <div style="display:flex;align-items:baseline;gap:8px;">
          <span style="font-size:64px;font-weight:900;color:#2563eb;line-height:1;">4.5</span>
          <span style="font-size:28px;font-weight:800;color:#2563eb;">%</span>
          <span style="font-size:14px;color:#64748b;margin-left:8px;">우대금리</span>
        </div>
        <p style="font-size:13px;color:#475569;margin-top:10px;">만 19~34세 · 연소득 5천만 이하</p>
      </div>`,
  },
  {
    dest: "post-19/youth-rent-worry.png",
    src: "hero-post19.png",
    overlay: `
      <div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(15,23,42,0.88) 0%,transparent 45%);"></div>
      <div style="position:absolute;top:20px;right:24px;text-align:right;">
        <span style="background:#16a34a;color:#fff;font-size:12px;font-weight:800;padding:5px 12px;border-radius:20px;">🏠 청년 정책</span>
      </div>
      <div style="position:absolute;bottom:24px;left:28px;right:28px;">
        <h2 style="font-size:32px;font-weight:800;color:#fff;line-height:1.3;margin-bottom:12px;">청년월세지원사업 2026</h2>
        <p style="font-size:15px;color:#cbd5e1;margin-bottom:16px;">신청자격 · 소득기준 · 온라인 신청</p>
        <div style="display:flex;gap:12px;">
          <div style="background:rgba(255,255,255,0.95);border-radius:12px;padding:14px 20px;">
            <p style="font-size:12px;color:#64748b;">월 지원</p>
            <p style="font-size:28px;font-weight:800;color:#16a34a;">20만원</p>
          </div>
          <div style="background:rgba(255,255,255,0.95);border-radius:12px;padding:14px 20px;">
            <p style="font-size:12px;color:#64748b;">최장</p>
            <p style="font-size:28px;font-weight:800;color:#0f172a;">24개월</p>
          </div>
          <div style="background:rgba(255,255,255,0.95);border-radius:12px;padding:14px 20px;">
            <p style="font-size:12px;color:#64748b;">총 혜택</p>
            <p style="font-size:28px;font-weight:800;color:#2563eb;">480만</p>
          </div>
        </div>
      </div>`,
  },
  {
    dest: "post-18/hero-loan-guide.png",
    src: "hero-post18.png",
    overlay: `
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,0.55) 0%,transparent 35%,rgba(15,23,42,0.2) 70%,rgba(15,23,42,0.85) 100%);"></div>
      <div style="position:absolute;top:22px;left:24px;right:24px;">
        <span style="background:rgba(255,255,255,0.9);color:#1e40af;font-size:12px;font-weight:800;padding:5px 12px;border-radius:20px;">🏢 부동산 가이드</span>
        <h2 style="font-size:30px;font-weight:800;color:#fff;margin-top:14px;line-height:1.3;text-shadow:0 2px 10px rgba(0,0,0,0.4);">생애최초 주택구입 대출<br><span style="font-size:18px;font-weight:600;">디딤돌 · 보금자리 · 신생아특례</span></h2>
      </div>
      <div style="position:absolute;bottom:22px;left:24px;right:24px;display:flex;gap:10px;">
        <div style="flex:1;background:rgba(37,99,235,0.92);border-radius:12px;padding:14px;text-align:center;color:#fff;">
          <p style="font-size:12px;opacity:0.85;">디딤돌</p>
          <p style="font-size:22px;font-weight:800;">2.85%~</p>
        </div>
        <div style="flex:1;background:rgba(22,163,74,0.92);border-radius:12px;padding:14px;text-align:center;color:#fff;">
          <p style="font-size:12px;opacity:0.85;">보금자리</p>
          <p style="font-size:22px;font-weight:800;">4.05%~</p>
        </div>
        <div style="flex:1;background:rgba(234,88,12,0.92);border-radius:12px;padding:14px;text-align:center;color:#fff;">
          <p style="font-size:12px;opacity:0.85;">신생아특례</p>
          <p style="font-size:22px;font-weight:800;">1.8%~</p>
        </div>
      </div>`,
  },
];

/** 본문용 — 레이아웃 13종 전부 다름 */
const BODY_TEMPLATES = {
  /* ── post-18 (5종) ── */
  "post-18/loan-comparison.png": {
    width: 1200,
    height: 800,
    html: `
      <div style="width:1200px;height:800px;background:linear-gradient(160deg,#0f172a,#1e3a5f);padding:40px;display:flex;flex-direction:column;">
        <h2 style="font-size:34px;font-weight:800;color:#fff;text-align:center;margin-bottom:6px;">3대 생애최초 대출</h2>
        <p style="text-align:center;color:#94a3b8;font-size:16px;margin-bottom:32px;">금리 · 한도 · 소득 데이터</p>
        <div style="display:flex;gap:20px;flex:1;align-items:stretch;">
          <div style="flex:1;background:linear-gradient(180deg,#1d4ed8,#2563eb);border-radius:20px;padding:28px;color:#fff;display:flex;flex-direction:column;justify-content:center;">
            <p style="font-size:14px;opacity:0.8;">디딤돌</p>
            <p style="font-size:42px;font-weight:800;">2.85%</p>
            <p style="font-size:16px;margin-top:8px;">한도 3.2억 · 7천만</p>
          </div>
          <div style="flex:1;background:linear-gradient(180deg,#15803d,#16a34a);border-radius:20px;padding:28px;color:#fff;display:flex;flex-direction:column;justify-content:center;">
            <p style="font-size:14px;opacity:0.8;">보금자리</p>
            <p style="font-size:42px;font-weight:800;">4.05%</p>
            <p style="font-size:16px;margin-top:8px;">한도 4.2억 · 1억</p>
          </div>
          <div style="flex:1;background:linear-gradient(180deg,#c2410c,#ea580c);border-radius:20px;padding:28px;color:#fff;display:flex;flex-direction:column;justify-content:center;position:relative;">
            <span style="position:absolute;top:16px;right:16px;background:#fff;color:#ea580c;font-size:11px;font-weight:800;padding:4px 10px;border-radius:12px;">BEST</span>
            <p style="font-size:14px;opacity:0.8;">신생아특례</p>
            <p style="font-size:42px;font-weight:800;">1.8%</p>
            <p style="font-size:16px;margin-top:8px;">한도 4억 · 1.3억</p>
          </div>
        </div>
        <div style="height:100px;margin-top:24px;border-radius:14px;overflow:hidden;opacity:0.7;">
          <img class="photo" src="${APT2}" style="width:100%;height:100%;" alt="">
        </div>
      </div>`,
  },

  "post-18/loan-decision-tree.png": {
    width: 1000,
    height: 1200,
    html: `
      <div style="width:1000px;height:1200px;background:#fafafa;display:flex;flex-direction:column;">
        <div style="background:#2563eb;color:#fff;padding:32px;text-align:center;">
          <h2 style="font-size:30px;font-weight:800;">어떤 대출이 맞을까?</h2>
          <p style="font-size:15px;opacity:0.85;margin-top:8px;">선택 플로우차트</p>
        </div>
        <div style="flex:1;padding:36px 48px;display:flex;flex-direction:column;align-items:center;gap:0;">
          <div style="width:100%;background:#fff;border:2px solid #e2e8f0;border-radius:14px;padding:20px;text-align:center;font-size:18px;font-weight:700;">무주택 생애최초?</div>
          <div style="width:3px;height:28px;background:#cbd5e1;"></div>
          <div style="width:85%;background:#fff7ed;border:3px solid #ea580c;border-radius:14px;padding:22px;text-align:center;">
            <p style="font-size:13px;color:#ea580c;font-weight:700;">2세 이하 자녀</p>
            <p style="font-size:22px;font-weight:800;color:#ea580c;">신생아 특례</p>
            <p style="font-size:14px;color:#64748b;margin-top:6px;">1.8% · 4억</p>
          </div>
          <div style="width:3px;height:28px;background:#cbd5e1;"></div>
          <div style="width:85%;background:#f0fdf4;border:3px solid #16a34a;border-radius:14px;padding:22px;text-align:center;">
            <p style="font-size:22px;font-weight:800;color:#16a34a;">보금자리론</p>
            <p style="font-size:14px;color:#64748b;margin-top:6px;">4.2억 · 면적 무제한</p>
          </div>
          <div style="width:3px;height:28px;background:#cbd5e1;"></div>
          <div style="width:85%;background:#eff6ff;border:3px solid #2563eb;border-radius:14px;padding:22px;text-align:center;">
            <p style="font-size:22px;font-weight:800;color:#2563eb;">디딤돌</p>
            <p style="font-size:14px;color:#64748b;margin-top:6px;">2.85% · 3.2억</p>
          </div>
        </div>
        <div style="height:160px;"><img class="photo" src="${APT}" style="width:100%;height:100%;" alt=""></div>
      </div>`,
  },

  "post-18/loan-simulation.png": {
    width: 1200,
    height: 700,
    html: `
      <div style="width:1200px;height:700px;background:#fff;display:flex;flex-direction:column;">
        <div style="padding:28px 40px 16px;">
          <h2 style="font-size:28px;font-weight:800;">연봉별 대출 한도 시뮬레이션</h2>
        </div>
        <div style="flex:1;display:flex;padding:0 40px 32px;gap:32px;align-items:flex-end;">
          <div style="flex:1;text-align:center;">
            <div style="height:180px;background:linear-gradient(180deg,#93c5fd,#2563eb);border-radius:12px 12px 0 0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:16px;">
              <span style="font-size:28px;font-weight:800;color:#fff;">2.5억</span>
            </div>
            <p style="font-size:14px;font-weight:700;margin-top:10px;">연봉 4,500만</p>
            <p style="font-size:12px;color:#64748b;">월 95만원</p>
          </div>
          <div style="flex:1;text-align:center;">
            <div style="height:280px;background:linear-gradient(180deg,#fdba74,#ea580c);border-radius:12px 12px 0 0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:16px;">
              <span style="font-size:32px;font-weight:800;color:#fff;">5억</span>
            </div>
            <p style="font-size:14px;font-weight:700;margin-top:10px;">연봉 6,000만·1세</p>
            <p style="font-size:12px;color:#64748b;">월 138만원</p>
          </div>
          <div style="flex:1;text-align:center;">
            <div style="height:120px;background:linear-gradient(180deg,#cbd5e1,#64748b);border-radius:12px 12px 0 0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:16px;">
              <span style="font-size:24px;font-weight:800;color:#fff;">2억</span>
            </div>
            <p style="font-size:14px;font-weight:700;margin-top:10px;">연봉 3,500만</p>
            <p style="font-size:12px;color:#64748b;">월 78만원</p>
          </div>
        </div>
      </div>`,
  },

  "post-18/loan-process.png": {
    width: 1200,
    height: 600,
    html: `
      <div style="width:1200px;height:600px;position:relative;">
        <img class="photo" src="${APT3}" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.25;" alt="">
        <div style="position:relative;z-index:2;padding:40px;height:100%;display:flex;flex-direction:column;justify-content:center;">
          <h2 style="font-size:30px;font-weight:800;text-align:center;margin-bottom:40px;">대출 신청 5단계</h2>
          <div style="display:flex;align-items:center;justify-content:center;gap:0;">
            ${[
              ["1", "자격확인", "#2563eb"],
              ["2", "매매계약", "#3b82f6"],
              ["3", "대출신청", "#6366f1"],
              ["4", "심사승인", "#8b5cf6"],
              ["5", "잔금실행", "#a855f7"],
            ]
              .map(
                ([n, label, c], i) => `
              ${i > 0 ? '<div style="width:40px;height:3px;background:#cbd5e1;"></div>' : ""}
              <div style="text-align:center;">
                <div style="width:56px;height:56px;background:${c};color:#fff;border-radius:50%;line-height:56px;font-size:22px;font-weight:800;margin:0 auto 8px;">${n}</div>
                <span style="font-size:13px;font-weight:700;">${label}</span>
              </div>`
              )
              .join("")}
          </div>
        </div>
      </div>`,
  },

  "post-18/cta-banner.png": {
    width: 1200,
    height: 400,
    html: `
      <div style="width:1200px;height:400px;display:flex;">
        <div style="flex:1;background:#1d4ed8;padding:36px 40px;color:#fff;display:flex;flex-direction:column;justify-content:center;">
          <h2 style="font-size:32px;font-weight:800;">승박 부동산 도구</h2>
          <p style="font-size:16px;color:#bfdbfe;margin:10px 0 20px;">무료 계산기로 바로 확인</p>
          <div style="display:flex;gap:16px;">
            <span style="background:rgba(255,255,255,0.2);padding:10px 18px;border-radius:10px;font-size:15px;font-weight:700;">💰 급여</span>
            <span style="background:rgba(255,255,255,0.2);padding:10px 18px;border-radius:10px;font-size:15px;font-weight:700;">📅 D-Day</span>
            <span style="background:rgba(255,255,255,0.2);padding:10px 18px;border-radius:10px;font-size:15px;font-weight:700;">🗺️ 지도</span>
            <span style="background:rgba(255,255,255,0.2);padding:10px 18px;border-radius:10px;font-size:15px;font-weight:700;">🏠 청약</span>
          </div>
        </div>
        <div style="width:42%;"><img class="photo" src="${KEYS}" style="width:100%;height:100%;" alt=""></div>
      </div>`,
  },

  /* ── post-19 (2종) ── */
  "post-19/online-application.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;padding:40px;gap:48px;">
        <div style="width:280px;height:520px;background:#0f172a;border-radius:36px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
          <div style="background:#fff;border-radius:24px;height:100%;padding:24px;display:flex;flex-direction:column;">
            <p style="font-size:12px;color:#64748b;">청년월세지원</p>
            <p style="font-size:22px;font-weight:800;color:#16a34a;margin:8px 0;">신청하기</p>
            <div style="flex:1;display:flex;flex-direction:column;gap:10px;margin-top:16px;">
              <div style="background:#f0fdf4;padding:12px;border-radius:10px;font-size:13px;">✓ 만 19~34세</div>
              <div style="background:#f0fdf4;padding:12px;border-radius:10px;font-size:13px;">✓ 소득 5천만↓</div>
              <div style="background:#16a34a;color:#fff;padding:14px;border-radius:10px;text-align:center;font-weight:700;margin-top:auto;">제출</div>
            </div>
          </div>
        </div>
        <div>
          <h2 style="font-size:32px;font-weight:800;margin-bottom:16px;">온라인 신청 3분</h2>
          <p style="font-size:16px;color:#64748b;line-height:1.7;margin-bottom:24px;">복지로 · LH 통합플랫폼<br>24시간 접수 가능</p>
          <div style="display:flex;gap:16px;">
            <div style="background:#fff;padding:20px 28px;border-radius:14px;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
              <p style="font-size:13px;color:#64748b;">월 지원</p>
              <p style="font-size:36px;font-weight:800;color:#16a34a;">20만</p>
            </div>
            <div style="background:#fff;padding:20px 28px;border-radius:14px;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
              <p style="font-size:13px;color:#64748b;">최대</p>
              <p style="font-size:36px;font-weight:800;color:#0f172a;">24개월</p>
            </div>
          </div>
        </div>
      </div>`,
  },

  "post-19/happy-support.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;display:flex;">
        <div style="width:50%;background:#ecfdf5;padding:48px;display:flex;flex-direction:column;justify-content:center;">
          <p style="font-size:14px;color:#16a34a;font-weight:700;">BEFORE → AFTER</p>
          <h2 style="font-size:30px;font-weight:800;margin:12px 0 28px;">월세 부담 비교</h2>
          <div style="margin-bottom:20px;">
            <p style="font-size:13px;color:#64748b;margin-bottom:6px;">지원 전</p>
            <div style="height:36px;width:85%;background:#fca5a5;border-radius:8px;display:flex;align-items:center;padding:0 14px;font-weight:700;color:#7f1d1d;">월 55만원</div>
          </div>
          <div>
            <p style="font-size:13px;color:#64748b;margin-bottom:6px;">지원 후 (−20만)</p>
            <div style="height:36px;width:55%;background:#86efac;border-radius:8px;display:flex;align-items:center;padding:0 14px;font-weight:700;color:#14532d;">월 35만원</div>
          </div>
        </div>
        <div style="width:50%;"><img class="photo" src="${ROOM}" style="width:100%;height:100%;" alt=""></div>
      </div>`,
  },

  /* ── post-20 (2종) ── */
  "post-20/interest-rate-benefit.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;background:linear-gradient(135deg,#1e3a5f 0%,#0f172a 100%);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
        <p style="position:absolute;font-size:280px;font-weight:900;color:rgba(255,255,255,0.04);top:50%;left:50%;transform:translate(-50%,-50%);">4.5</p>
        <div style="text-align:center;z-index:2;">
          <p style="font-size:18px;color:#93c5fd;font-weight:700;">청년주택드림청약통장</p>
          <p style="font-size:120px;font-weight:900;color:#fff;line-height:1;">4.5<span style="font-size:48px;">%</span></p>
          <p style="font-size:20px;color:#94a3b8;margin-top:12px;">우대금리 · 일반 3.1% 대비 <b style="color:#4ade80;">+1.4%p</b></p>
        </div>
      </div>`,
  },

  "post-20/home-ownership-key.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;display:flex;">
        <div style="width:45%;position:relative;">
          <img class="photo" src="${KEYS}" style="width:100%;height:100%;" alt="">
          <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3));"></div>
        </div>
        <div style="flex:1;padding:48px;background:#fff;display:flex;flex-direction:column;justify-content:center;">
          <h2 style="font-size:30px;font-weight:800;margin-bottom:24px;">통장 → 내집마련</h2>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
            <div style="width:48px;height:48px;background:#eff6ff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;">1</div>
            <div><p style="font-weight:700;">청약통장 가입</p><p style="font-size:13px;color:#64748b;">만 19~34세</p></div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
            <div style="width:48px;height:48px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;">2</div>
            <div><p style="font-weight:700;">청약 당첨</p><p style="font-size:13px;color:#64748b;">가점제·특공</p></div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="width:48px;height:48px;background:#fff7ed;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;">3</div>
            <div><p style="font-weight:700;">청년드림대출 2.2%</p><p style="font-size:13px;color:#64748b;">잔금 연계</p></div>
          </div>
        </div>
      </div>`,
  },

  /* ── post-21 (2종) ── */
  "post-21/loan-conditions-table.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;position:relative;">
        <img class="photo" src="${APT}" style="position:absolute;inset:0;width:100%;height:100%;filter:blur(3px);opacity:0.35;" alt="">
        <div style="position:relative;z-index:2;padding:40px 48px;height:100%;display:flex;align-items:center;justify-content:center;">
          <table style="width:92%;border-collapse:collapse;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.15);font-size:16px;">
            <thead><tr style="background:#0f172a;color:#fff;">
              <th style="padding:16px 20px;text-align:left;">항목</th>
              <th style="padding:16px;">디딤돌</th>
              <th style="padding:16px;">보금자리론</th>
            </tr></thead>
            <tbody>
              <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:14px 20px;font-weight:700;">금리</td><td style="padding:14px;text-align:center;color:#2563eb;font-weight:800;">2.85~4.15%</td><td style="padding:14px;text-align:center;">4.05~4.35%</td></tr>
              <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;"><td style="padding:14px 20px;font-weight:700;">한도</td><td style="padding:14px;text-align:center;">3.2억</td><td style="padding:14px;text-align:center;color:#16a34a;font-weight:800;">4.2억</td></tr>
              <tr><td style="padding:14px 20px;font-weight:700;">면적</td><td style="padding:14px;text-align:center;">85㎡↓</td><td style="padding:14px;text-align:center;color:#16a34a;">제한없음</td></tr>
            </tbody>
          </table>
        </div>
      </div>`,
  },

  "post-21/loan-choice-guide.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;background:#f8fafc;padding:36px;">
        <h2 style="font-size:26px;font-weight:800;text-align:center;margin-bottom:28px;">내 상황별 추천 매트릭스</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;height:calc(100% - 70px);">
          <div style="background:#eff6ff;border-radius:16px;padding:24px;border:2px solid #2563eb;">
            <p style="font-size:13px;color:#2563eb;font-weight:700;">소득 6천↓ · 85㎡↓</p>
            <p style="font-size:28px;font-weight:800;color:#2563eb;margin-top:8px;">디딤돌</p>
            <p style="font-size:14px;color:#64748b;margin-top:8px;">저금리 우선</p>
          </div>
          <div style="background:#f0fdf4;border-radius:16px;padding:24px;border:2px solid #16a34a;">
            <p style="font-size:13px;color:#16a34a;font-weight:700;">소득 7천~1억</p>
            <p style="font-size:28px;font-weight:800;color:#16a34a;margin-top:8px;">보금자리</p>
            <p style="font-size:14px;color:#64748b;margin-top:8px;">고한도·대형</p>
          </div>
          <div style="background:#fff7ed;border-radius:16px;padding:24px;border:2px solid #ea580c;">
            <p style="font-size:13px;color:#ea580c;font-weight:700;">2세↓ 자녀</p>
            <p style="font-size:28px;font-weight:800;color:#ea580c;margin-top:8px;">신생아특례</p>
            <p style="font-size:14px;color:#64748b;margin-top:8px;">최저금리</p>
          </div>
          <div style="background:#faf5ff;border-radius:16px;padding:24px;border:2px solid #9333ea;">
            <p style="font-size:13px;color:#9333ea;font-weight:700;">85㎡ 초과</p>
            <p style="font-size:28px;font-weight:800;color:#9333ea;margin-top:8px;">보금자리</p>
            <p style="font-size:14px;color:#64748b;margin-top:8px;">면적 제한 없음</p>
          </div>
        </div>
      </div>`,
  },

  /* ── post-22 (2종) ── */
  "post-22/no-house-cases.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;background:#fff;padding:32px 40px;">
        <h2 style="font-size:26px;font-weight:800;margin-bottom:24px;">케이스별 무주택 인정</h2>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;">
          ${[
            ["이혼", "본인 명의 없으면 무주택", "#2563eb"],
            ["상속", "지분 ½↓·미거주", "#d97706"],
            ["소형주택", "60㎡·공시 1.3억↓", "#16a34a"],
            ["매도 후", "익일부터 재산정", "#7c3aed"],
            ["분양권", "2018.12 이후 유주택", "#dc2626"],
            ["지방주택", "소형저가 충족 시", "#0891b2"],
          ]
            .map(
              ([title, desc, c]) => `
            <div style="background:#f8fafc;border-radius:12px;padding:16px;border-left:4px solid ${c};">
              <p style="font-size:15px;font-weight:800;color:${c};">${title}</p>
              <p style="font-size:12px;color:#64748b;margin-top:6px;line-height:1.4;">${desc}</p>
            </div>`
            )
            .join("")}
        </div>
        <div style="display:flex;gap:12px;align-items:center;background:#eff6ff;border-radius:12px;padding:16px 20px;">
          <span style="font-size:14px;font-weight:700;color:#1e40af;">가점표</span>
          <span style="font-size:13px;">5~6년 → <b>12점</b></span>
          <span style="color:#cbd5e1;">|</span>
          <span style="font-size:13px;">10~11년 → <b>22점</b></span>
          <span style="color:#cbd5e1;">|</span>
          <span style="font-size:13px;">15년↑ → <b style="color:#16a34a;">32점</b></span>
        </div>
      </div>`,
  },

  "post-22/no-house-strategy.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;background:linear-gradient(180deg,#eff6ff,#fff);padding:40px 48px;">
        <h2 style="font-size:26px;font-weight:800;margin-bottom:32px;">무주택 기간 늘리기 로드맵</h2>
        <div style="position:relative;padding-left:40px;">
          <div style="position:absolute;left:18px;top:8px;bottom:8px;width:4px;background:linear-gradient(180deg,#2563eb,#16a34a);border-radius:2px;"></div>
          ${[
            ["만 30세 / 혼인일", "산정 시작일 확인", "#2563eb"],
            ["세대분리", "부모 동거 시 유주택 해소", "#3b82f6"],
            ["소형주택 처분", "민영 일반공급 자격", "#6366f1"],
            ["15년 무주택", "32점 만점 달성", "#16a34a"],
          ]
            .map(
              ([title, desc, c]) => `
            <div style="position:relative;margin-bottom:28px;padding-left:24px;">
              <div style="position:absolute;left:-30px;top:4px;width:20px;height:20px;background:${c};border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px ${c};"></div>
              <p style="font-size:16px;font-weight:800;">${title}</p>
              <p style="font-size:13px;color:#64748b;margin-top:4px;">${desc}</p>
            </div>`
            )
            .join("")}
        </div>
      </div>`,
  },
};

async function waitForImages(page) {
  try {
    await page.waitForFunction(
      () => [...document.images].every((img) => img.complete && img.naturalWidth > 0),
      { timeout: 45000 }
    );
  } catch {
    await page.waitForTimeout(2000);
  }
}

async function blendHeroes(page) {
  const W = 1200;
  const H = 630;

  for (const { dest, src, overlay } of HERO_BLENDS) {
    const outPath = path.join(ROOT, "blog", "images", dest);
    await mkdir(path.dirname(outPath), { recursive: true });

    let b64;
    const assetPath = path.join(ASSETS, src);
    try {
      await access(assetPath);
      b64 = readFileSync(assetPath).toString("base64");
    } catch {
      b64 = readFileSync(outPath).toString("base64");
      console.warn(`  ⚠ ${src} → 기존 이미지로 블렌드`);
    }

    const html = `
      <div style="width:${W}px;height:${H}px;position:relative;overflow:hidden;">
        <img class="photo" src="data:image/png;base64,${b64}" style="width:100%;height:100%;object-fit:cover;object-position:center 35%;" alt="">
        ${overlay}
      </div>`;

    await page.setViewportSize({ width: W, height: H });
    await page.setContent(
      `<!DOCTYPE html><html><head><style>${FONTS}</style></head><body>${html}</body></html>`,
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForTimeout(300);
    await page.screenshot({ path: outPath, type: "png", clip: { x: 0, y: 0, width: W, height: H } });
    console.log(`✓ [BLEND] ${dest}`);
  }
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await blendHeroes(page);
  for (const [relPath, { width, height, html }] of Object.entries(BODY_TEMPLATES)) {
    const outPath = path.join(ROOT, "blog", "images", relPath);
    await mkdir(path.dirname(outPath), { recursive: true });
    await page.setViewportSize({ width, height });
    await page.setContent(
      `<!DOCTYPE html><html><head><style>${FONTS}</style></head><body>${html}</body></html>`,
      { waitUntil: "networkidle" }
    );
    await waitForImages(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: outPath, type: "png", clip: { x: 0, y: 0, width, height } });
    console.log(`✓ [HTML] ${relPath}`);
  }

  await browser.close();
  console.log("Done: blended heroes (5) + body images (13 layouts)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
