/**
 * post-21 블로그 이미지 생성 — 연출컷(인물 사진) + 섹션별 다른 레이아웃
 * 실행: node scripts/generate-post-21-images.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "blog", "images", "post-21");

const FONTS = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Pretendard', 'Noto Sans KR', sans-serif; overflow: hidden; }
  img.photo { display: block; object-fit: cover; }
`;

const templates = {
  /* 1. 신혼부부가 대출 상품 비교 — 좌측 연출컷 + 우측 카피 */
  "loan-comparison-hero.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;display:flex;background:#0f172a;overflow:hidden;">
        <div style="width:58%;height:100%;position:relative;">
          <img class="photo" src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&h=1100&fit=crop&q=85"
               width="700" height="630" alt=""
               style="width:100%;height:100%;object-position:center 25%;">
          <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent 55%,#0f172a 100%);"></div>
          <div style="position:absolute;bottom:32px;left:32px;display:flex;gap:12px;">
            <div style="background:rgba(37,99,235,0.92);color:#fff;padding:14px 20px;border-radius:12px;font-size:16px;font-weight:800;">디딤돌 2.85%~</div>
            <div style="background:rgba(5,150,105,0.92);color:#fff;padding:14px 20px;border-radius:12px;font-size:16px;font-weight:800;">보금자리 4.05%~</div>
          </div>
        </div>
        <div style="flex:1;padding:48px 44px 48px 28px;display:flex;flex-direction:column;justify-content:center;color:#fff;">
          <span style="display:inline-block;background:#d97706;color:#fff;font-size:14px;font-weight:700;padding:6px 14px;border-radius:20px;width:fit-content;margin-bottom:18px;">2026 정책대출 비교</span>
          <h2 style="font-size:40px;font-weight:800;line-height:1.28;margin-bottom:14px;">디딤돌 vs<br>보금자리론</h2>
          <p style="font-size:19px;color:#94a3b8;line-height:1.55;margin-bottom:28px;">부부가 함께 상담하며<br>나에게 맞는 대출을 고르는 순간</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <span style="background:rgba(37,99,235,0.35);border:1px solid #3b82f6;padding:10px 18px;border-radius:10px;font-size:15px;font-weight:700;color:#93c5fd;">저금리</span>
            <span style="background:rgba(5,150,105,0.35);border:1px solid #10b981;padding:10px 18px;border-radius:10px;font-size:15px;font-weight:700;color:#6ee7b7;">고한도</span>
          </div>
        </div>
      </div>`,
  },

  /* 2. 은행 상담 연출 + 비교표 오버레이 */
  "loan-conditions-table.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;position:relative;overflow:hidden;background:#1e293b;">
        <img class="photo" src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1400&h=800&fit=crop&q=85"
             width="1200" height="630" alt=""
             style="position:absolute;inset:0;width:100%;height:100%;object-position:center 30%;opacity:0.5;">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,0.55) 0%,rgba(15,23,42,0.92) 100%);"></div>

        <div style="position:relative;z-index:2;padding:36px 44px;height:100%;display:flex;flex-direction:column;">
          <p style="font-size:15px;color:#93c5fd;font-weight:700;margin-bottom:6px;">BANK CONSULTATION</p>
          <h2 style="font-size:32px;font-weight:800;color:#fff;margin-bottom:20px;">자격 조건 한눈에 비교</h2>
          <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.97);border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.3);font-size:16px;">
            <thead>
              <tr style="background:#2563eb;color:#fff;">
                <th style="padding:14px 18px;text-align:left;width:20%;">항목</th>
                <th style="padding:14px;text-align:center;">디딤돌</th>
                <th style="padding:14px;text-align:center;">보금자리론</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 18px;font-weight:700;">금리</td><td style="padding:12px;text-align:center;color:#2563eb;font-weight:800;">2.85~4.15%</td><td style="padding:12px;text-align:center;">4.05~4.35%</td></tr>
              <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;"><td style="padding:12px 18px;font-weight:700;">한도</td><td style="padding:12px;text-align:center;">3.2억</td><td style="padding:12px;text-align:center;color:#059669;font-weight:800;">4.2억</td></tr>
              <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:12px 18px;font-weight:700;">소득</td><td style="padding:12px;text-align:center;">6~7천만</td><td style="padding:12px;text-align:center;color:#059669;font-weight:800;">7천~1억</td></tr>
              <tr style="background:#f8fafc;"><td style="padding:12px 18px;font-weight:700;">면적</td><td style="padding:12px;text-align:center;">85㎡ 이하</td><td style="padding:12px;text-align:center;color:#059669;font-weight:800;">제한 없음</td></tr>
            </tbody>
          </table>
          <p style="margin-top:auto;font-size:14px;color:#94a3b8;text-align:center;">전문 상담사와 함께 조건을 꼼꼼히 확인하세요</p>
        </div>
      </div>`,
  },

  /* 3. 집 열쇠 전달 + 행복한 가족 연출 */
  "loan-choice-guide.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;position:relative;overflow:hidden;">
        <img class="photo" src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400&h=800&fit=crop&q=85"
             width="1200" height="630" alt=""
             style="position:absolute;inset:0;width:100%;height:100%;object-position:center 40%;">
        <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(6,78,59,0.88) 0%,rgba(6,95,70,0.65) 45%,rgba(15,23,42,0.4) 100%);"></div>

        <div style="position:absolute;top:36px;right:40px;z-index:3;">
          <img class="photo" src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=500&h=400&fit=crop&q=85"
               width="220" height="165" alt=""
               style="width:220px;height:165px;border-radius:16px;border:4px solid #fff;box-shadow:0 12px 40px rgba(0,0,0,0.35);object-fit:cover;">
        </div>

        <div style="position:relative;z-index:2;height:100%;padding:52px 56px;display:flex;flex-direction:column;justify-content:center;max-width:640px;color:#fff;">
          <span style="font-size:48px;margin-bottom:12px;">🔑</span>
          <h2 style="font-size:40px;font-weight:800;line-height:1.3;margin-bottom:14px;">내 상황에 맞는<br>대출을 선택하세요</h2>
          <p style="font-size:19px;color:#d1fae5;line-height:1.6;margin-bottom:28px;">올바른 선택이 우리 가족의<br>첫 번째 집 열쇠를 열어줍니다</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <span style="background:#fff;color:#065f46;padding:12px 22px;border-radius:10px;font-size:15px;font-weight:700;">HF 한도조회 5분</span>
            <span style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);padding:12px 22px;border-radius:10px;font-size:15px;font-weight:600;">월급쟁이 맞춤</span>
          </div>
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
