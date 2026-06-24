/**
 * post-18 블로그 이미지 생성 (Playwright HTML → PNG)
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
  body { font-family: 'Pretendard', 'Noto Sans KR', sans-serif; }
`;

const templates = {
  "hero-loan-guide.png": {
    width: 1200,
    height: 630,
    html: `
      <div style="width:1200px;height:630px;background:linear-gradient(135deg,#dbeafe 0%,#eff6ff 50%,#f0f9ff 100%);display:flex;flex-direction:column;justify-content:center;padding:60px 80px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-80px;right:-60px;width:320px;height:320px;background:rgba(37,99,235,0.08);border-radius:50%;"></div>
        <div style="position:absolute;bottom:-100px;left:200px;width:400px;height:400px;background:rgba(37,99,235,0.06);border-radius:50%;"></div>
        <span style="font-size:22px;font-weight:700;color:#2563eb;margin-bottom:16px;">승박 · 부동산 가이드</span>
        <h1 style="font-size:52px;font-weight:800;color:#0f172a;line-height:1.25;margin-bottom:20px;">2026 생애최초<br>주택대출 완벽 가이드</h1>
        <p style="font-size:28px;color:#475569;font-weight:600;">디딤돌 · 보금자리 · 신생아특례 한 번에</p>
        <div style="display:flex;gap:24px;margin-top:36px;">
          <span style="background:#2563eb;color:#fff;padding:14px 24px;border-radius:12px;font-size:20px;font-weight:700;">🏠 내집마련</span>
          <span style="background:#fff;color:#2563eb;padding:14px 24px;border-radius:12px;font-size:20px;font-weight:700;border:2px solid #bfdbfe;">💰 저금리</span>
          <span style="background:#fff;color:#2563eb;padding:14px 24px;border-radius:12px;font-size:20px;font-weight:700;border:2px solid #bfdbfe;">👨‍👩‍👧 가족</span>
        </div>
      </div>`,
  },
  "loan-comparison.png": {
    width: 1200,
    height: 800,
    html: `
      <div style="width:1200px;height:800px;background:#f8fafc;padding:48px;">
        <h2 style="text-align:center;font-size:36px;color:#0f172a;margin-bottom:40px;">3대 생애최초 대출 비교</h2>
        <div style="display:flex;gap:24px;justify-content:center;">
          <div style="flex:1;background:#fff;border-radius:16px;padding:28px;border-top:6px solid #2563eb;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
            <div style="font-size:40px;margin-bottom:12px;">🏦</div>
            <h3 style="font-size:26px;color:#2563eb;margin-bottom:16px;">디딤돌</h3>
            <p style="font-size:18px;color:#334155;line-height:1.7;"><b>한도</b> 최대 3억<br><b>금리</b> 2.45~3.55%<br><b>소득</b> 7천만 이하</p>
          </div>
          <div style="flex:1;background:#fff;border-radius:16px;padding:28px;border-top:6px solid #16a34a;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
            <div style="font-size:40px;margin-bottom:12px;">🏡</div>
            <h3 style="font-size:26px;color:#16a34a;margin-bottom:16px;">보금자리론</h3>
            <p style="font-size:18px;color:#334155;line-height:1.7;"><b>한도</b> 최대 4억<br><b>금리</b> 3.5~4.2%<br><b>소득</b> 7천만 이하</p>
          </div>
          <div style="flex:1;background:#fff;border-radius:16px;padding:28px;border-top:6px solid #ea580c;box-shadow:0 4px 20px rgba(0,0,0,0.06);position:relative;">
            <span style="position:absolute;top:-12px;right:16px;background:#ea580c;color:#fff;font-size:14px;font-weight:800;padding:6px 14px;border-radius:20px;">BEST 2026</span>
            <div style="font-size:40px;margin-bottom:12px;">👶</div>
            <h3 style="font-size:26px;color:#ea580c;margin-bottom:16px;">신생아 특례</h3>
            <p style="font-size:18px;color:#334155;line-height:1.7;"><b>한도</b> 최대 5억<br><b>금리</b> 1.6~3.3%<br><b>소득</b> 1.3억 이하</p>
          </div>
        </div>
      </div>`,
  },
  "loan-decision-tree.png": {
    width: 1000,
    height: 1200,
    html: `
      <div style="width:1000px;height:1200px;background:linear-gradient(180deg,#eff6ff,#fff);padding:48px;display:flex;flex-direction:column;align-items:center;">
        <h2 style="font-size:34px;color:#0f172a;margin-bottom:40px;">나에게 맞는 대출 찾기</h2>
        <div style="background:#2563eb;color:#fff;padding:20px 40px;border-radius:12px;font-size:22px;font-weight:700;margin-bottom:16px;">시작: 무주택 생애최초?</div>
        <div style="font-size:28px;color:#94a3b8;">↓</div>
        <div style="background:#fff;border:2px solid #bfdbfe;padding:18px 32px;border-radius:12px;font-size:20px;margin:12px 0;width:80%;text-align:center;">2세 이하 자녀 있나요?</div>
        <div style="font-size:28px;color:#94a3b8;">↓ YES</div>
        <div style="background:#fff7ed;border:3px solid #ea580c;padding:22px;border-radius:12px;width:85%;text-align:center;margin:8px 0;">
          <strong style="font-size:24px;color:#ea580c;">신생아 특례 대출</strong>
          <p style="font-size:17px;color:#64748b;margin-top:8px;">금리 최저 · 한도 5억</p>
        </div>
        <div style="background:#fff;border:2px solid #bfdbfe;padding:18px 32px;border-radius:12px;font-size:20px;margin:20px 0;width:80%;text-align:center;">자녀 있나요? (2세↑)</div>
        <div style="font-size:28px;color:#94a3b8;">↓ YES</div>
        <div style="background:#f0fdf4;border:3px solid #16a34a;padding:22px;border-radius:12px;width:85%;text-align:center;margin:8px 0;">
          <strong style="font-size:24px;color:#16a34a;">보금자리론</strong>
        </div>
        <div style="background:#fff;border:2px solid #bfdbfe;padding:18px 32px;border-radius:12px;font-size:20px;margin:20px 0;width:80%;text-align:center;">연소득 6천만 이하?</div>
        <div style="font-size:28px;color:#94a3b8;">↓ YES</div>
        <div style="background:#eff6ff;border:3px solid #2563eb;padding:22px;border-radius:12px;width:85%;text-align:center;">
          <strong style="font-size:24px;color:#2563eb;">디딤돌 대출</strong>
        </div>
      </div>`,
  },
  "loan-simulation.png": {
    width: 1200,
    height: 700,
    html: `
      <div style="width:1200px;height:700px;background:#f8fafc;padding:48px;">
        <h2 style="font-size:34px;color:#0f172a;text-align:center;margin-bottom:36px;">실제 대출 한도 시뮬레이션</h2>
        <div style="display:flex;gap:32px;justify-content:center;">
          <div style="width:520px;background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
            <p style="font-size:18px;color:#64748b;">연봉 4,500만 · 무자녀</p>
            <h3 style="font-size:28px;color:#2563eb;margin:12px 0;">디딤돌 대출</h3>
            <p style="font-size:42px;font-weight:800;color:#0f172a;">약 2.5억</p>
            <div style="height:24px;background:#e2e8f0;border-radius:12px;margin:16px 0;overflow:hidden;"><div style="width:50%;height:100%;background:#2563eb;border-radius:12px;"></div></div>
            <p style="font-size:18px;color:#475569;">월 상환액 약 <b>95만원</b> (30년·금리 3%)</p>
          </div>
          <div style="width:520px;background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 16px rgba(0,0,0,0.06);border:2px solid #ea580c;">
            <p style="font-size:18px;color:#64748b;">연봉 6,000만 · 1세 자녀</p>
            <h3 style="font-size:28px;color:#ea580c;margin:12px 0;">신생아 특례</h3>
            <p style="font-size:42px;font-weight:800;color:#0f172a;">최대 5억</p>
            <div style="height:24px;background:#e2e8f0;border-radius:12px;margin:16px 0;overflow:hidden;"><div style="width:100%;height:100%;background:#ea580c;border-radius:12px;"></div></div>
            <p style="font-size:18px;color:#475569;">월 상환액 약 <b>138만원</b> (30년·금리 2%)</p>
          </div>
        </div>
        <p style="text-align:center;margin-top:28px;font-size:22px;color:#2563eb;font-weight:700;">내 한도는? → D-Day 계산기에서 확인</p>
      </div>`,
  },
  "loan-process.png": {
    width: 1200,
    height: 600,
    html: `
      <div style="width:1200px;height:600px;background:#fff;padding:48px 40px;">
        <h2 style="font-size:34px;color:#0f172a;text-align:center;margin-bottom:48px;">대출 신청 5단계</h2>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          ${[
            ["1", "📋", "자격 확인", "소득·자산·무주택"],
            ["2", "📝", "매매계약", "부동산 계약 체결"],
            ["3", "🏦", "대출 신청", "은행·기금 접수"],
            ["4", "🔍", "심사·승인", "서류·DSR 심사"],
            ["5", "✅", "잔금 실행", "대출 실행·입주"],
          ]
            .map(
              ([n, icon, title, desc]) => `
          <div style="flex:1;text-align:center;">
            <div style="width:56px;height:56px;background:#2563eb;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;margin:0 auto 12px;">${n}</div>
            <div style="font-size:32px;margin-bottom:8px;">${icon}</div>
            <strong style="font-size:18px;color:#0f172a;display:block;margin-bottom:6px;">${title}</strong>
            <span style="font-size:14px;color:#64748b;">${desc}</span>
          </div>`
            )
            .join('<div style="font-size:28px;color:#cbd5e1;padding-top:24px;">→</div>')}
        </div>
      </div>`,
  },
  "cta-banner.png": {
    width: 1200,
    height: 400,
    html: `
      <div style="width:1200px;height:400px;background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:48px 60px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
        <h2 style="font-size:38px;color:#fff;font-weight:800;margin-bottom:12px;">지금 바로 시작하세요</h2>
        <p style="font-size:20px;color:#bfdbfe;margin-bottom:32px;">급여 · D-Day · 실거래가 지도 · 청약통장</p>
        <div style="display:flex;gap:28px;">
          ${[
            ["💰", "급여"],
            ["📅", "D-Day"],
            ["🗺️", "지도"],
            ["🏠", "청약"],
          ]
            .map(
              ([icon, label]) => `
          <div style="background:rgba(255,255,255,0.15);border-radius:16px;padding:20px 28px;min-width:140px;">
            <div style="font-size:36px;margin-bottom:8px;">${icon}</div>
            <span style="font-size:18px;color:#fff;font-weight:700;">${label}</span>
          </div>`
            )
            .join("")}
        </div>
      </div>`,
  },
};

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
    await page.waitForTimeout(500);
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
