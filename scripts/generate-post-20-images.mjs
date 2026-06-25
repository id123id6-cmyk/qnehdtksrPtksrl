/**
 * post-20 블로그 이미지 생성 — 연출컷(인물 사진) + 섹션별 다른 레이아웃
 * 실행: node scripts/generate-post-20-images.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "blog", "images", "post-20");

const FONTS = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Pretendard', 'Noto Sans KR', sans-serif; overflow: hidden; }
  img.photo { display: block; object-fit: cover; }
`;

const templates = {
  /* 1. 카페에서 청약통장 앱 보는 청년 — 좌측 풀사진 + 우측 카피 */
  "youth-account-dream.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;display:flex;background:#0f172a;position:relative;overflow:hidden;">
        <div style="width:58%;height:100%;position:relative;">
          <img class="photo" src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=900&h=1100&fit=crop&q=85"
               width="700" height="630" alt=""
               style="width:100%;height:100%;object-position:center 20%;">
          <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent 55%,#0f172a 100%);"></div>
          <div style="position:absolute;bottom:32px;left:32px;background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);padding:16px 22px;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
            <p style="font-size:13px;color:#64748b;">모바일 가입 · 9개 은행</p>
            <p style="font-size:20px;font-weight:800;color:#2563eb;margin-top:4px;">📱 오늘부터 시작</p>
          </div>
        </div>
        <div style="flex:1;padding:48px 44px 48px 28px;display:flex;flex-direction:column;justify-content:center;color:#fff;">
          <span style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:700;padding:6px 14px;border-radius:20px;width:fit-content;margin-bottom:18px;">2026 청년 필수</span>
          <h2 style="font-size:40px;font-weight:800;line-height:1.28;margin-bottom:14px;">청년만 받는<br>특별 우대 통장</h2>
          <p style="font-size:19px;color:#94a3b8;line-height:1.55;margin-bottom:28px;">청약통장 가입하고<br>미래의 집을 준비하는 청년</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <span style="background:rgba(37,99,235,0.35);border:1px solid #3b82f6;padding:10px 18px;border-radius:10px;font-size:22px;font-weight:800;color:#93c5fd;">최고 4.5%</span>
            <span style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);padding:10px 18px;border-radius:10px;font-size:16px;font-weight:600;color:#e2e8f0;">+ 대출 2.2%</span>
          </div>
        </div>
      </div>`,
  },

  /* 2. 은행 창구 상담 연출 — 풀배경 사진 + 플로팅 금리 카드 */
  "interest-rate-benefit.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;position:relative;overflow:hidden;background:#1e293b;">
        <img class="photo" src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1400&h=800&fit=crop&q=85"
             width="1200" height="630" alt=""
             style="position:absolute;inset:0;width:100%;height:100%;object-position:center 30%;opacity:0.55;">
        <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(15,23,42,0.85) 0%,rgba(30,58,138,0.55) 50%,rgba(15,23,42,0.75) 100%);"></div>

        <div style="position:relative;z-index:2;height:100%;padding:40px 52px;display:flex;flex-direction:column;">
          <p style="font-size:15px;color:#93c5fd;font-weight:700;letter-spacing:0.05em;">BANK CONSULTATION</p>
          <h2 style="font-size:38px;font-weight:800;color:#fff;margin:10px 0 8px;">우대금리, 직접 비교해 보세요</h2>
          <p style="font-size:18px;color:#cbd5e1;margin-bottom:28px;">은행 상담 · 서류 준비 · 가입까지 한 번에</p>

          <div style="display:flex;gap:20px;align-items:flex-end;margin-top:auto;">
            <div style="background:rgba(255,255,255,0.12);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2);border-radius:16px;padding:22px 28px;text-align:center;min-width:180px;">
              <p style="font-size:14px;color:#94a3b8;margin-bottom:6px;">일반 청약통장</p>
              <p style="font-size:36px;font-weight:800;color:#cbd5e1;">2.8%</p>
            </div>
            <div style="background:linear-gradient(145deg,#2563eb,#1d4ed8);border-radius:20px;padding:28px 36px;text-align:center;box-shadow:0 16px 48px rgba(37,99,235,0.45);transform:scale(1.08);">
              <p style="font-size:14px;color:#bfdbfe;margin-bottom:6px;">청년주택드림 ✨</p>
              <p style="font-size:52px;font-weight:800;color:#fff;line-height:1;">4.5%</p>
              <p style="font-size:15px;color:#93c5fd;margin-top:8px;font-weight:700;">+1.7%p 우대</p>
            </div>
            <div style="background:rgba(255,255,255,0.92);border-radius:16px;padding:20px 24px;max-width:280px;">
              <p style="font-size:15px;color:#334155;line-height:1.6;"><b style="color:#2563eb;">비과세</b> 이자 500만원<br><b style="color:#2563eb;">소득공제</b> 최대 240만원</p>
            </div>
          </div>
        </div>
      </div>`,
  },

  /* 3. 신축 아파트 앞 열쇠 전달 — 시네마틱 와이드 + 하단 배너 */
  "home-ownership-key.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;position:relative;overflow:hidden;">
        <img class="photo" src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400&h=800&fit=crop&q=85"
             width="1200" height="630" alt=""
             style="position:absolute;inset:0;width:100%;height:100%;object-position:center 40%;">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.15) 40%,rgba(6,78,59,0.88) 100%);"></div>

        <div style="position:absolute;top:36px;left:40px;z-index:2;">
          <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,0.95);padding:10px 20px;border-radius:40px;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
            <span style="font-size:28px;">🔑</span>
            <span style="font-size:17px;font-weight:800;color:#065f46;">청약 당첨 → 내집마련</span>
          </div>
        </div>

        <div style="position:absolute;bottom:0;left:0;right:0;z-index:2;padding:36px 48px 44px;color:#fff;">
          <h2 style="font-size:42px;font-weight:800;line-height:1.25;margin-bottom:12px;text-shadow:0 2px 12px rgba(0,0,0,0.3);">드디어 받은 집 열쇠,<br>저금리 대출까지 연결</h2>
          <p style="font-size:20px;color:#d1fae5;margin-bottom:24px;">청년주택드림대출 · 최저 2.2% · 최대 3억 · 40년</p>
          <div style="display:flex;gap:14px;">
            <span style="background:#059669;padding:12px 22px;border-radius:10px;font-size:16px;font-weight:700;">청약통장</span>
            <span style="font-size:22px;line-height:1.6;">→</span>
            <span style="background:#2563eb;padding:12px 22px;border-radius:10px;font-size:16px;font-weight:700;">당첨</span>
            <span style="font-size:22px;line-height:1.6;">→</span>
            <span style="background:#fff;color:#065f46;padding:12px 22px;border-radius:10px;font-size:16px;font-weight:700;">2.2% 대출</span>
          </div>
        </div>

        <img class="photo" src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop&q=85"
             width="200" height="150" alt=""
             style="position:absolute;bottom:120px;right:56px;width:200px;height:150px;border-radius:16px;border:4px solid #fff;box-shadow:0 12px 40px rgba(0,0,0,0.35);z-index:3;object-fit:cover;">
      </div>`,
  },
};

async function waitForImages(page) {
  await page.waitForFunction(
    () => [...document.images].every((img) => img.complete && img.naturalWidth > 0),
    { timeout: 30000 }
  );
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const [filename, { width, height, html }] of Object.entries(templates)) {
    await page.setViewportSize({ width, height });
    await page.setContent(
      `<!DOCTYPE html><html><head><style>${FONTS}</style></head><body>${html}</body></html>`,
      { waitUntil: "networkidle" }
    );
    await waitForImages(page);
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(OUT, filename),
      type: "png",
      clip: { x: 0, y: 0, width, height },
    });
    console.log(`✓ ${filename}`);
  }

  await browser.close();
  console.log(`Done: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
