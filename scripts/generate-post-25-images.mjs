/**
 * post-25 블로그 이미지 — AI 연출 + 글 제목·데이터 블렌드
 * 실행: node scripts/generate-post-25-images.mjs
 */
import { chromium } from "playwright";
import { mkdir, access } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "blog", "images", "post-25");
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
    file: "tax-guide-hero.png",
    src: "hero-post25.png",
    w: 1200,
    h: 630,
    html: (b64) => `
      <div style="width:1200px;height:630px;position:relative;overflow:hidden;">
        <img class="photo" src="data:image/png;base64,${b64}" style="width:100%;height:100%;object-position:center 35%;" alt="">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,0.5) 0%,transparent 35%,rgba(15,23,42,0.9) 100%);"></div>
        <div style="position:absolute;top:20px;left:24px;">
          <span style="background:#d97706;color:#fff;font-size:12px;font-weight:800;padding:5px 12px;border-radius:20px;">💰 부동산 세금</span>
          <span style="background:rgba(255,255,255,0.85);color:#64748b;font-size:11px;font-weight:600;padding:5px 10px;border-radius:20px;margin-left:6px;">승박 블로그</span>
        </div>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:28px 32px 32px;">
          <p style="font-size:13px;color:#fcd34d;font-weight:700;margin-bottom:8px;">2026 최신 세율 · 16분 읽기</p>
          <h2 style="font-size:32px;font-weight:800;color:#fff;line-height:1.28;margin-bottom:12px;">취득세·등록세<br>완벽 계산 가이드</h2>
          <p style="font-size:16px;color:#e2e8f0;margin-bottom:14px;">세율 · 감면 · 실전 예시</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <span style="background:#2563eb;color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:800;">1주택 1~3%</span>
            <span style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;">위택스 60일</span>
            <span style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;">7억 시뮬레이션</span>
          </div>
        </div>
      </div>`,
  },
  {
    file: "tax-rate-table.png",
    src: "hero-post25-table.png",
    w: 1200,
    h: 630,
    html: (b64) => `
      <div style="width:1200px;height:630px;display:flex;">
        <div style="width:42%;position:relative;">
          <img class="photo" src="data:image/png;base64,${b64}" style="width:100%;height:100%;object-position:center 25%;" alt="">
        </div>
        <div style="flex:1;background:#0f172a;padding:28px 32px;color:#fff;display:flex;flex-direction:column;justify-content:center;">
          <p style="font-size:13px;color:#fcd34d;font-weight:700;margin-bottom:10px;">2026 취득세율</p>
          <h2 style="font-size:26px;font-weight:800;margin-bottom:16px;">주택 수별<br>세율 한눈에</h2>
          <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;font-size:13px;color:#0f172a;">
            <thead><tr style="background:#d97706;color:#fff;">
              <th style="padding:10px 12px;text-align:left;">구분</th>
              <th style="padding:10px;">세율</th>
            </tr></thead>
            <tbody>
              <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 12px;font-weight:700;">1주택 6억↓</td><td style="padding:10px;text-align:center;">1%</td></tr>
              <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 12px;font-weight:700;">6~9억 누진</td><td style="padding:10px;text-align:center;">1~3%</td></tr>
              <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 12px;font-weight:700;">2주택 조정</td><td style="padding:10px;text-align:center;color:#dc2626;font-weight:800;">8%</td></tr>
              <tr><td style="padding:10px 12px;font-weight:700;">3주택+ 조정</td><td style="padding:10px;text-align:center;color:#dc2626;font-weight:800;">12%</td></tr>
            </tbody>
          </table>
        </div>
      </div>`,
  },
  {
    file: "tax-simulation.png",
    src: "hero-post25-simulation.png",
    w: 1200,
    h: 630,
    html: (b64) => `
      <div style="width:1200px;height:630px;position:relative;overflow:hidden;">
        <img class="photo" src="data:image/png;base64,${b64}" style="width:100%;height:100%;object-position:center 30%;" alt="">
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0.94) 0%,rgba(255,255,255,0.88) 42%,transparent 70%);"></div>
        <div style="position:absolute;left:32px;top:50%;transform:translateY(-50%);max-width:480px;">
          <span style="display:inline-block;background:#2563eb;color:#fff;font-size:12px;font-weight:800;padding:5px 12px;border-radius:20px;margin-bottom:14px;">✅ 실전 시뮬레이션</span>
          <h2 style="font-size:28px;font-weight:800;color:#0f172a;line-height:1.3;margin-bottom:16px;">7억 아파트<br>부대비용 총정리</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="background:#fff;border-radius:10px;padding:12px 16px;border-left:4px solid #d97706;box-shadow:0 2px 12px rgba(0,0,0,0.06);font-size:14px;"><b>취득세</b> 약 1,169만원 (1.67%)</div>
            <div style="background:#fff;border-radius:10px;padding:12px 16px;border-left:4px solid #2563eb;box-shadow:0 2px 12px rgba(0,0,0,0.06);font-size:14px;"><b>인지세·채권·법무사</b> 약 200~400만원</div>
            <div style="background:#fff;border-radius:10px;padding:12px 16px;border-left:4px solid #16a34a;box-shadow:0 2px 12px rgba(0,0,0,0.06);font-size:14px;"><b>위택스</b> 잔금일+60일 이내 신고</div>
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
