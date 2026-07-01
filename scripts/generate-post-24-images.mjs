/**
 * post-24 블로그 이미지 — AI 연출 + 글 제목·데이터 블렌드
 * 실행: node scripts/generate-post-24-images.mjs
 */
import { chromium } from "playwright";
import { mkdir, access } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "blog", "images", "post-24");
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
    file: "newlywed-hero.png",
    src: "hero-post24.png",
    w: 1200,
    h: 630,
    html: (b64) => `
      <div style="width:1200px;height:630px;position:relative;overflow:hidden;">
        <img class="photo" src="data:image/png;base64,${b64}" style="width:100%;height:100%;object-position:center 40%;" alt="">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,0.45) 0%,transparent 35%,rgba(15,23,42,0.9) 100%);"></div>
        <div style="position:absolute;top:20px;left:24px;">
          <span style="background:#db2777;color:#fff;font-size:12px;font-weight:800;padding:5px 12px;border-radius:20px;">💒 신혼 청약</span>
          <span style="background:rgba(255,255,255,0.85);color:#64748b;font-size:11px;font-weight:600;padding:5px 10px;border-radius:20px;margin-left:6px;">승박 블로그</span>
        </div>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:28px 32px 32px;">
          <p style="font-size:13px;color:#fbcfe8;font-weight:700;margin-bottom:8px;">2026 신혼부부 필수 가이드 · 15분 읽기</p>
          <h2 style="font-size:32px;font-weight:800;color:#fff;line-height:1.28;margin-bottom:12px;">신혼특공 vs 신혼희망타운<br>완벽 비교</h2>
          <p style="font-size:16px;color:#e2e8f0;margin-bottom:14px;">자격 · 물량 · 가점 · 맞춤 전략</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <span style="background:#2563eb;color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:800;">신혼특공 30%</span>
            <span style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;">신희타 60㎡ 이하</span>
            <span style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;">혼인 7년 이내</span>
          </div>
        </div>
      </div>`,
  },
  {
    file: "newlywed-comparison.png",
    src: "hero-post24-comparison.png",
    w: 1200,
    h: 630,
    html: (b64) => `
      <div style="width:1200px;height:630px;display:flex;">
        <div style="width:42%;position:relative;">
          <img class="photo" src="data:image/png;base64,${b64}" style="width:100%;height:100%;object-position:center 25%;" alt="">
        </div>
        <div style="flex:1;background:#1e1b4b;padding:28px 32px;color:#fff;display:flex;flex-direction:column;justify-content:center;">
          <p style="font-size:13px;color:#c4b5fd;font-weight:700;margin-bottom:10px;">핵심 비교표</p>
          <h2 style="font-size:26px;font-weight:800;margin-bottom:16px;">신혼특공 vs 신희타<br>한눈에 보기</h2>
          <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;font-size:13px;color:#0f172a;">
            <thead><tr style="background:#7c3aed;color:#fff;">
              <th style="padding:10px 12px;text-align:left;">항목</th>
              <th style="padding:10px;">신혼특공</th>
              <th style="padding:10px;">신희타</th>
            </tr></thead>
            <tbody>
              <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 12px;font-weight:700;">공급</td><td style="padding:10px;text-align:center;">공공+민영</td><td style="padding:10px;text-align:center;color:#7c3aed;font-weight:800;">공공 100%</td></tr>
              <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 12px;font-weight:700;">면적</td><td style="padding:10px;text-align:center;color:#7c3aed;font-weight:800;">85㎡ 이하</td><td style="padding:10px;text-align:center;">60㎡ 이하</td></tr>
              <tr><td style="padding:10px 12px;font-weight:700;">분양가</td><td style="padding:10px;text-align:center;">시세 80~90%</td><td style="padding:10px;text-align:center;color:#7c3aed;font-weight:800;">시세 70~80%</td></tr>
            </tbody>
          </table>
          <p style="font-size:12px;color:#a5b4fc;margin-top:12px;">소형+자녀 = 신희타 · 대형+시세차익 = 신혼특공</p>
        </div>
      </div>`,
  },
  {
    file: "newlywed-success.png",
    src: "hero-post24-success.png",
    w: 1200,
    h: 630,
    html: (b64) => `
      <div style="width:1200px;height:630px;position:relative;overflow:hidden;">
        <img class="photo" src="data:image/png;base64,${b64}" style="width:100%;height:100%;object-position:center 35%;" alt="">
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0.94) 0%,rgba(255,255,255,0.88) 40%,transparent 72%);"></div>
        <div style="position:absolute;left:32px;top:50%;transform:translateY(-50%);max-width:500px;">
          <span style="display:inline-block;background:#16a34a;color:#fff;font-size:12px;font-weight:800;padding:5px 12px;border-radius:20px;margin-bottom:14px;">✅ 신혼 청약 로드맵</span>
          <h2 style="font-size:28px;font-weight:800;color:#0f172a;line-height:1.3;margin-bottom:16px;">혼인 기간별<br>맞춤 전략</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="background:#fff;border-radius:10px;padding:12px 16px;border-left:4px solid #db2777;box-shadow:0 2px 12px rgba(0,0,0,0.06);font-size:14px;"><b>결혼 전</b> 청약통장 24회 납입</div>
            <div style="background:#fff;border-radius:10px;padding:12px 16px;border-left:4px solid #7c3aed;box-shadow:0 2px 12px rgba(0,0,0,0.06);font-size:14px;"><b>1~3년차</b> 신희타·신도시 사전청약</div>
            <div style="background:#fff;border-radius:10px;padding:12px 16px;border-left:4px solid #2563eb;box-shadow:0 2px 12px rgba(0,0,0,0.06);font-size:14px;"><b>4~7년차</b> 신혼특공·가점 관리</div>
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
