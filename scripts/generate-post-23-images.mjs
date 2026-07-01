/**
 * post-23 블로그 이미지 — AI 연출 + 글 제목·데이터 블렌드
 * 실행: node scripts/generate-post-23-images.mjs
 */
import { chromium } from "playwright";
import { mkdir, access } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "blog", "images", "post-23");
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

function loadB64(name) {
  return readFileSync(path.join(ASSETS, name)).toString("base64");
}

const IMAGES = [
  {
    file: "policy-2026-hero.png",
    src: "hero-post23.png",
    w: 1200,
    h: 630,
    html: (b64) => `
      <div style="width:1200px;height:630px;position:relative;overflow:hidden;">
        <img class="photo" src="data:image/png;base64,${b64}" style="width:100%;height:100%;object-position:center 35%;" alt="">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,0.5) 0%,transparent 30%,rgba(15,23,42,0.88) 100%);"></div>
        <div style="position:absolute;top:20px;left:24px;">
          <span style="background:#dc2626;color:#fff;font-size:12px;font-weight:800;padding:5px 12px;border-radius:20px;">📋 부동산 정책</span>
          <span style="background:rgba(255,255,255,0.8);color:#64748b;font-size:11px;font-weight:600;padding:5px 10px;border-radius:20px;margin-left:6px;">승박 블로그</span>
        </div>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:28px 32px 32px;">
          <p style="font-size:13px;color:#fca5a5;font-weight:700;margin-bottom:8px;">2026.07 시행 임박 · 14분 읽기</p>
          <h2 style="font-size:34px;font-weight:800;color:#fff;line-height:1.28;margin-bottom:12px;">2026년 7월<br>부동산 정책 총정리</h2>
          <p style="font-size:16px;color:#e2e8f0;margin-bottom:14px;">스트레스 DSR 3단계 · 규제 · 공급</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <span style="background:#2563eb;color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:800;">DSR +1.5%p</span>
            <span style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;">청년월세 연장</span>
            <span style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;">공적임대 110만호</span>
          </div>
        </div>
      </div>`,
  },
  {
    file: "policy-dsr-changes.png",
    src: "hero-post23-dsr.png",
    w: 1200,
    h: 630,
    html: (b64) => `
      <div style="width:1200px;height:630px;display:flex;">
        <div style="width:42%;position:relative;">
          <img class="photo" src="data:image/png;base64,${b64}" style="width:100%;height:100%;object-position:center 20%;" alt="">
        </div>
        <div style="flex:1;background:#0f172a;padding:32px 36px;color:#fff;display:flex;flex-direction:column;justify-content:center;">
          <p style="font-size:13px;color:#93c5fd;font-weight:700;margin-bottom:10px;">스트레스 DSR 3단계</p>
          <h2 style="font-size:28px;font-weight:800;margin-bottom:18px;">2단계 vs 3단계<br>대출 한도 비교</h2>
          <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;font-size:14px;color:#0f172a;">
            <thead><tr style="background:#2563eb;color:#fff;">
              <th style="padding:11px 14px;text-align:left;">연소득 5천만</th>
              <th style="padding:11px;">2단계</th>
              <th style="padding:11px;">3단계</th>
            </tr></thead>
            <tbody>
              <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:11px 14px;font-weight:700;">주담대 한도</td><td style="padding:11px;text-align:center;">약 2.4억</td><td style="padding:11px;text-align:center;color:#dc2626;font-weight:800;">약 2.2억</td></tr>
              <tr><td style="padding:11px 14px;font-weight:700;">가산금리</td><td style="padding:11px;text-align:center;">1.0%p</td><td style="padding:11px;text-align:center;color:#dc2626;font-weight:800;">1.5%p</td></tr>
            </tbody>
          </table>
          <p style="font-size:13px;color:#94a3b8;margin-top:14px;">전 업권 적용 · 신용대출 포함</p>
        </div>
      </div>`,
  },
  {
    file: "policy-checklist.png",
    src: "hero-post23-checklist.png",
    w: 1200,
    h: 630,
    html: (b64) => `
      <div style="width:1200px;height:630px;position:relative;overflow:hidden;">
        <img class="photo" src="data:image/png;base64,${b64}" style="width:100%;height:100%;object-position:center 30%;" alt="">
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0.88) 42%,transparent 70%);"></div>
        <div style="position:absolute;left:32px;top:50%;transform:translateY(-50%);max-width:480px;">
          <span style="display:inline-block;background:#16a34a;color:#fff;font-size:12px;font-weight:800;padding:5px 12px;border-radius:20px;margin-bottom:14px;">✅ 월급쟁이 체크리스트</span>
          <h2 style="font-size:30px;font-weight:800;color:#0f172a;line-height:1.3;margin-bottom:16px;">7월 전에<br>꼭 확인할 3가지</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="background:#fff;border-radius:10px;padding:12px 16px;border-left:4px solid #2563eb;box-shadow:0 2px 12px rgba(0,0,0,0.06);font-size:14px;"><b>①</b> 스트레스 DSR 한도 재계산</div>
            <div style="background:#fff;border-radius:10px;padding:12px 16px;border-left:4px solid #16a34a;box-shadow:0 2px 12px rgba(0,0,0,0.06);font-size:14px;"><b>②</b> 청약 가점·신도시 일정</div>
            <div style="background:#fff;border-radius:10px;padding:12px 16px;border-left:4px solid #d97706;box-shadow:0 2px 12px rgba(0,0,0,0.06);font-size:14px;"><b>③</b> 청년월세·정책대출 자격</div>
          </div>
        </div>
      </div>`,
  },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const { file, src, w, h, html } of IMAGES) {
    await access(path.join(ASSETS, src));
    const b64 = loadB64(src);
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(
      `<!DOCTYPE html><html><head><style>${FONTS}</style></head><body>${html(b64)}</body></html>`,
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(OUT, file),
      type: "png",
      clip: { x: 0, y: 0, width: w, height: h },
    });
    console.log(`✓ ${file}`);
  }

  await browser.close();
  console.log(`Done: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
