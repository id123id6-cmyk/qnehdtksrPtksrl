/**
 * post-18 블로그 이미지 생성 — 연출컷(인물 사진) + 섹션별 다른 레이아웃
 * 실행: node scripts/generate-post-18-images.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "blog", "images", "post-18");

const FONTS = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Pretendard', 'Noto Sans KR', sans-serif; overflow: hidden; }
  img.photo { display: block; object-fit: cover; }
`;

const templates = {
  /* 1. 신혼부부·가족 내집마련 희망 — 좌측 풀사진 + 우측 타이틀 */
  "hero-loan-guide.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;display:flex;background:#0f172a;overflow:hidden;">
        <div style="width:55%;height:100%;position:relative;">
          <img class="photo" src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&h=1100&fit=crop&q=85"
               width="660" height="630" alt=""
               style="width:100%;height:100%;object-position:center 30%;">
          <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent 50%,#0f172a 100%);"></div>
        </div>
        <div style="flex:1;padding:48px 44px;display:flex;flex-direction:column;justify-content:center;color:#fff;">
          <span style="font-size:16px;color:#93c5fd;font-weight:700;margin-bottom:14px;">승박 · 부동산 가이드</span>
          <h1 style="font-size:44px;font-weight:800;line-height:1.25;margin-bottom:16px;">2026 생애최초<br>주택대출 완벽 가이드</h1>
          <p style="font-size:20px;color:#94a3b8;margin-bottom:28px;">디딤돌 · 보금자리 · 신생아특례</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <span style="background:#2563eb;padding:10px 18px;border-radius:10px;font-size:15px;font-weight:700;">🏠 내집마련</span>
            <span style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);padding:10px 18px;border-radius:10px;font-size:15px;">💰 저금리</span>
            <span style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);padding:10px 18px;border-radius:10px;font-size:15px;">👨‍👩‍👧 가족</span>
          </div>
        </div>
      </div>`,
  },

  /* 2. 은행 상담 + 3대 대출 비교 카드 */
  "loan-comparison.png": {
    width: 1200,
    height: 800,
    html: `
      <div style="width:1200px;height:800px;position:relative;overflow:hidden;background:#0f172a;">
        <img class="photo" src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1400&h=900&fit=crop&q=85"
             width="1200" height="800" alt=""
             style="position:absolute;inset:0;width:100%;height:100%;object-position:center 25%;opacity:0.45;">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,0.75) 0%,rgba(15,23,42,0.88) 100%);"></div>

        <div style="position:relative;z-index:2;padding:44px 48px;height:100%;display:flex;flex-direction:column;">
          <h2 style="text-align:center;font-size:36px;font-weight:800;color:#fff;margin-bottom:8px;">3대 생애최초 대출 비교</h2>
          <p style="text-align:center;font-size:18px;color:#94a3b8;margin-bottom:36px;">전문가 상담하며 나에게 맞는 대출을 골라보세요</p>
          <div style="display:flex;gap:22px;justify-content:center;margin-top:auto;margin-bottom:auto;">
            <div style="flex:1;max-width:340px;background:rgba(255,255,255,0.95);border-radius:18px;padding:26px;border-top:5px solid #2563eb;box-shadow:0 12px 40px rgba(0,0,0,0.25);">
              <h3 style="font-size:24px;color:#2563eb;margin-bottom:14px;">디딤돌</h3>
              <p style="font-size:17px;color:#334155;line-height:1.75;"><b>한도</b> 최대 3억<br><b>금리</b> 2.45~3.55%<br><b>소득</b> 7천만 이하</p>
            </div>
            <div style="flex:1;max-width:340px;background:rgba(255,255,255,0.95);border-radius:18px;padding:26px;border-top:5px solid #16a34a;box-shadow:0 12px 40px rgba(0,0,0,0.25);">
              <h3 style="font-size:24px;color:#16a34a;margin-bottom:14px;">보금자리론</h3>
              <p style="font-size:17px;color:#334155;line-height:1.75;"><b>한도</b> 최대 4억<br><b>금리</b> 3.5~4.2%<br><b>소득</b> 7천만 이하</p>
            </div>
            <div style="flex:1;max-width:340px;background:rgba(255,255,255,0.97);border-radius:18px;padding:26px;border-top:5px solid #ea580c;box-shadow:0 16px 48px rgba(234,88,12,0.3);position:relative;">
              <span style="position:absolute;top:-12px;right:16px;background:#ea580c;color:#fff;font-size:13px;font-weight:800;padding:6px 14px;border-radius:20px;">BEST 2026</span>
              <h3 style="font-size:24px;color:#ea580c;margin-bottom:14px;">신생아 특례</h3>
              <p style="font-size:17px;color:#334155;line-height:1.75;"><b>한도</b> 최대 5억<br><b>금리</b> 1.6~3.3%<br><b>소득</b> 1.3억 이하</p>
            </div>
          </div>
        </div>
      </div>`,
  },

  /* 3. 부부가 함께 고민 — 세로형 좌측 사진 + 우측 플로우 */
  "loan-decision-tree.png": {
    width: 1000,
    height: 1200,
    html: `
      <div style="width:1000px;height:1200px;display:flex;flex-direction:column;background:#fff;">
        <div style="height:420px;position:relative;overflow:hidden;">
          <img class="photo" src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1000&h=500&fit=crop&q=80"
               width="1000" height="420" alt=""
               style="width:100%;height:100%;object-position:center 30%;">
          <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,#eff6ff 100%);"></div>
          <div style="position:absolute;bottom:28px;left:36px;">
            <h2 style="font-size:34px;font-weight:800;color:#0f172a;">나에게 맞는 대출 찾기</h2>
            <p style="font-size:17px;color:#475569;margin-top:8px;">함께 상의하며 최적의 선택을</p>
          </div>
        </div>
        <div style="flex:1;padding:32px 40px 48px;background:linear-gradient(180deg,#eff6ff,#fff);display:flex;flex-direction:column;align-items:center;">
          <div style="background:#2563eb;color:#fff;padding:18px 36px;border-radius:12px;font-size:20px;font-weight:700;margin-bottom:14px;">시작: 무주택 생애최초?</div>
          <div style="font-size:26px;color:#94a3b8;margin:6px 0;">↓</div>
          <div style="background:#fff;border:2px solid #bfdbfe;padding:16px 28px;border-radius:12px;font-size:18px;width:85%;text-align:center;margin:8px 0;">2세 이하 자녀 있나요?</div>
          <div style="font-size:26px;color:#94a3b8;">↓ YES</div>
          <div style="background:#fff7ed;border:3px solid #ea580c;padding:20px;border-radius:12px;width:88%;text-align:center;margin:8px 0;">
            <strong style="font-size:22px;color:#ea580c;">신생아 특례 대출</strong>
            <p style="font-size:16px;color:#64748b;margin-top:6px;">금리 최저 · 한도 5억</p>
          </div>
          <div style="background:#fff;border:2px solid #bfdbfe;padding:16px 28px;border-radius:12px;font-size:18px;margin:16px 0;width:85%;text-align:center;">자녀 있나요? (2세↑)</div>
          <div style="font-size:26px;color:#94a3b8;">↓ YES</div>
          <div style="background:#f0fdf4;border:3px solid #16a34a;padding:20px;border-radius:12px;width:88%;text-align:center;margin:8px 0;">
            <strong style="font-size:22px;color:#16a34a;">보금자리론</strong>
          </div>
          <div style="background:#fff;border:2px solid #bfdbfe;padding:16px 28px;border-radius:12px;font-size:18px;margin:16px 0;width:85%;text-align:center;">연소득 6천만 이하?</div>
          <div style="font-size:26px;color:#94a3b8;">↓ YES</div>
          <div style="background:#eff6ff;border:3px solid #2563eb;padding:20px;border-radius:12px;width:88%;text-align:center;">
            <strong style="font-size:22px;color:#2563eb;">디딤돌 대출</strong>
          </div>
        </div>
      </div>`,
  },

  /* 4. 노트북으로 대출 한도 계산 — 스플릿 레이아웃 */
  "loan-simulation.png": {
    width: 1200,
    height: 700,
    html: `
      <div style="width:1200px;height:700px;display:flex;background:#f8fafc;overflow:hidden;">
        <div style="width:48%;position:relative;">
          <img class="photo" src="https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=900&h=800&fit=crop&q=85"
               width="576" height="700" alt=""
               style="width:100%;height:100%;object-position:center 25%;">
          <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent 70%,#f8fafc 100%);"></div>
        </div>
        <div style="flex:1;padding:40px 44px 40px 20px;display:flex;flex-direction:column;justify-content:center;">
          <h2 style="font-size:30px;font-weight:800;color:#0f172a;margin-bottom:28px;">실제 대출 한도 시뮬레이션</h2>
          <div style="display:flex;flex-direction:column;gap:20px;">
            <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.06);border-left:5px solid #2563eb;">
              <p style="font-size:15px;color:#64748b;">연봉 4,500만 · 무자녀</p>
              <h3 style="font-size:22px;color:#2563eb;margin:8px 0;">디딤돌 대출</h3>
              <p style="font-size:36px;font-weight:800;color:#0f172a;">약 2.5억</p>
              <p style="font-size:16px;color:#475569;margin-top:8px;">월 상환액 약 <b>95만원</b> (30년·3%)</p>
            </div>
            <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:2px solid #ea580c;border-left:5px solid #ea580c;">
              <p style="font-size:15px;color:#64748b;">연봉 6,000만 · 1세 자녀</p>
              <h3 style="font-size:22px;color:#ea580c;margin:8px 0;">신생아 특례</h3>
              <p style="font-size:36px;font-weight:800;color:#0f172a;">최대 5억</p>
              <p style="font-size:16px;color:#475569;margin-top:8px;">월 상환액 약 <b>138만원</b> (30년·2%)</p>
            </div>
          </div>
        </div>
      </div>`,
  },

  /* 5. 은행에서 서류 작성 — 하단 5단계 스텝 */
  "loan-process.png": {
    width: 1200,
    height: 600,
    html: `
      <div style="width:1200px;height:600px;position:relative;overflow:hidden;">
        <img class="photo" src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1400&h=700&fit=crop&q=80"
             width="1200" height="600" alt=""
             style="position:absolute;inset:0;width:100%;height:100%;object-position:center 40%;">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0.88) 0%,rgba(255,255,255,0.95) 55%,rgba(255,255,255,0.98) 100%);"></div>

        <div style="position:relative;z-index:2;padding:36px 40px;height:100%;display:flex;flex-direction:column;">
          <h2 style="font-size:32px;font-weight:800;color:#0f172a;text-align:center;margin-bottom:36px;">대출 신청 5단계</h2>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-top:auto;">
            ${[
              ["1", "자격 확인", "소득·자산·무주택"],
              ["2", "매매계약", "부동산 계약 체결"],
              ["3", "대출 신청", "은행·기금 접수"],
              ["4", "심사·승인", "서류·DSR 심사"],
              ["5", "잔금 실행", "대출 실행·입주"],
            ]
              .map(
                ([n, title, desc], i) => `
            ${i > 0 ? '<div style="font-size:24px;color:#cbd5e1;padding-top:28px;">→</div>' : ""}
            <div style="flex:1;text-align:center;background:rgba(255,255,255,0.85);border-radius:14px;padding:18px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
              <div style="width:48px;height:48px;background:#2563eb;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;margin:0 auto 10px;">${n}</div>
              <strong style="font-size:16px;color:#0f172a;display:block;margin-bottom:4px;">${title}</strong>
              <span style="font-size:13px;color:#64748b;">${desc}</span>
            </div>`
              )
              .join("")}
          </div>
        </div>
      </div>`,
  },

  /* 6. 가족과 새집 앞 — 와이드 CTA 배너 */
  "cta-banner.png": {
    width: 1200,
    height: 400,
    html: `
      <div style="width:1200px;height:400px;position:relative;overflow:hidden;">
        <img class="photo" src="https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1400&h=500&fit=crop&q=85"
             width="1200" height="400" alt=""
             style="position:absolute;inset:0;width:100%;height:100%;object-position:center 50%;">
        <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(29,78,216,0.88) 0%,rgba(37,99,235,0.75) 50%,rgba(29,78,216,0.85) 100%);"></div>

        <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:36px 60px;color:#fff;">
          <h2 style="font-size:36px;font-weight:800;margin-bottom:10px;text-shadow:0 2px 8px rgba(0,0,0,0.2);">지금 바로 시작하세요</h2>
          <p style="font-size:19px;color:#bfdbfe;margin-bottom:28px;">급여 · D-Day · 실거래가 지도 · 청약통장</p>
          <div style="display:flex;gap:20px;">
            ${[
              ["💰", "급여"],
              ["📅", "D-Day"],
              ["🗺️", "지도"],
              ["🏠", "청약"],
            ]
              .map(
                ([icon, label]) => `
            <div style="background:rgba(255,255,255,0.18);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.3);border-radius:14px;padding:16px 24px;min-width:120px;">
              <div style="font-size:30px;margin-bottom:6px;">${icon}</div>
              <span style="font-size:16px;font-weight:700;">${label}</span>
            </div>`
              )
              .join("")}
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
