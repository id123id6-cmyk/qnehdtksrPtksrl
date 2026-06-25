/**
 * post-19 블로그 이미지 생성 — 연출컷(인물 사진) + 섹션별 다른 레이아웃
 * 실행: node scripts/generate-post-19-images.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "blog", "images", "post-19");

const FONTS = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Pretendard', 'Noto Sans KR', sans-serif; overflow: hidden; }
  img.photo { display: block; object-fit: cover; }
`;

const templates = {
  /* 1. 원룸 소파에서 월세 고민 — 풀배경 + 플로팅 지출 카드 */
  "youth-rent-worry.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;position:relative;overflow:hidden;background:#1e293b;">
        <img class="photo" src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1400&h=800&fit=crop&q=85"
             width="1200" height="630" alt=""
             style="position:absolute;inset:0;width:100%;height:100%;object-position:center 30%;opacity:0.7;">
        <div style="position:absolute;inset:0;background:linear-gradient(105deg,rgba(15,23,42,0.92) 0%,rgba(15,23,42,0.55) 45%,rgba(15,23,42,0.25) 100%);"></div>

        <div style="position:relative;z-index:2;height:100%;display:flex;align-items:center;padding:48px 56px;gap:40px;">
          <div style="flex:1;color:#fff;">
            <span style="display:inline-block;background:#ef4444;color:#fff;font-size:13px;font-weight:700;padding:6px 14px;border-radius:20px;margin-bottom:16px;">2026 청년월세지원</span>
            <h2 style="font-size:42px;font-weight:800;line-height:1.28;margin-bottom:14px;">월세 부담,<br>혼자 감당하지 마세요</h2>
            <p style="font-size:20px;color:#cbd5e1;line-height:1.55;">만 19~34세 청년 월 최대 <b style="color:#fff;">20만원</b> 지원</p>
          </div>
          <div style="width:340px;background:rgba(255,255,255,0.97);border-radius:20px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,0.35);">
            <p style="font-size:14px;color:#64748b;">이번 달 고정지출</p>
            <p style="font-size:40px;font-weight:800;color:#0f172a;margin:6px 0;">월세 55만원</p>
            <p style="font-size:15px;color:#ef4444;">+ 관리비 12만원</p>
            <div style="margin-top:20px;padding:14px;background:#fef2f2;border-radius:12px;border-left:4px solid #ef4444;">
              <p style="font-size:14px;color:#991b1b;font-weight:600;">통장 잔액이 또 빠르게 줄어듭니다…</p>
            </div>
          </div>
        </div>
      </div>`,
  },

  /* 2. 집에서 스마트폰으로 온라인 신청 — 우측 인물 + 좌측 폰 UI */
  "online-application.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;display:flex;background:#eff6ff;overflow:hidden;">
        <div style="width:42%;padding:44px 36px;display:flex;flex-direction:column;justify-content:center;align-items:center;">
          <div style="width:280px;background:#1e293b;border-radius:32px;padding:14px;box-shadow:0 24px 56px rgba(37,99,235,0.3);">
            <div style="background:#fff;border-radius:24px;padding:24px 18px;min-height:480px;display:flex;flex-direction:column;">
              <p style="font-size:12px;color:#64748b;text-align:center;">복지로 · 마이홈포털</p>
              <h3 style="font-size:20px;font-weight:800;color:#2563eb;text-align:center;margin:10px 0 20px;">청년월세지원<br>신청하기</h3>
              <div style="background:#eff6ff;border-radius:10px;padding:14px;margin-bottom:10px;font-size:13px;color:#334155;">✓ 자격 확인 완료</div>
              <div style="background:#eff6ff;border-radius:10px;padding:14px;margin-bottom:10px;font-size:13px;color:#334155;">✓ 서류 업로드</div>
              <div style="background:#2563eb;border-radius:10px;padding:16px;margin-top:auto;text-align:center;font-size:16px;font-weight:700;color:#fff;">신청 제출 →</div>
            </div>
          </div>
        </div>
        <div style="flex:1;position:relative;">
          <img class="photo" src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=900&h=1100&fit=crop&q=85"
               width="700" height="630" alt=""
               style="width:100%;height:100%;object-position:center 20%;">
          <div style="position:absolute;inset:0;background:linear-gradient(90deg,#eff6ff 0%,transparent 18%);"></div>
          <div style="position:absolute;bottom:40px;right:40px;background:rgba(37,99,235,0.92);color:#fff;padding:18px 26px;border-radius:14px;max-width:320px;">
            <p style="font-size:22px;font-weight:800;margin-bottom:6px;">온라인 10분 신청</p>
            <p style="font-size:15px;color:#bfdbfe;">2026.3.30 ~ 5.29 · 주민센터 방문 불필요</p>
          </div>
        </div>
      </div>`,
  },

  /* 3. 지원금 입금 후 안도하는 청년 — 시네마틱 하단 배너 */
  "happy-support.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;position:relative;overflow:hidden;">
        <img class="photo" src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1400&h=800&fit=crop&q=85"
             width="1200" height="630" alt=""
             style="position:absolute;inset:0;width:100%;height:100%;object-position:center 35%;">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.05) 0%,rgba(6,78,59,0.15) 40%,rgba(6,95,70,0.9) 100%);"></div>

        <div style="position:absolute;top:32px;right:40px;z-index:2;background:rgba(255,255,255,0.97);border-radius:18px;padding:22px 28px;box-shadow:0 12px 40px rgba(0,0,0,0.2);min-width:280px;">
          <p style="font-size:13px;color:#64748b;">입금 알림</p>
          <p style="font-size:34px;font-weight:800;color:#059669;margin:4px 0;">+ 200,000원</p>
          <p style="font-size:15px;color:#334155;">청년월세특별지원금</p>
          <p style="font-size:13px;color:#94a3b8;margin-top:6px;">2026.07.20 입금</p>
        </div>

        <div style="position:absolute;bottom:0;left:0;right:0;z-index:2;padding:36px 48px 44px;color:#fff;">
          <h2 style="font-size:40px;font-weight:800;line-height:1.25;margin-bottom:10px;text-shadow:0 2px 12px rgba(0,0,0,0.25);">매월 20일,<br>내 통장으로 입금</h2>
          <p style="font-size:20px;color:#d1fae5;">월 20만원 × 24개월 = <b>최대 480만원</b></p>
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
    const status = await page.evaluate(() =>
      [...document.images].map((img) => ({
        src: img.src.slice(-40),
        ok: img.complete && img.naturalWidth > 0,
      }))
    );
    console.warn("  ⚠ 일부 이미지 로드 지연:", status);
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
