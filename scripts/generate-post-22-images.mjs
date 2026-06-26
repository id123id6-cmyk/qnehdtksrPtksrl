/**
 * post-18~22 이미지 검증
 * 생성: node scripts/generate-blog-images-hybrid-18-22.mjs
 * 스타일: 인물 + 데이터(표·차트·숫자) + 부동산 사진 하이브리드
 */
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const FILES = [
  "blog/images/post-18/hero-loan-guide.png",
  "blog/images/post-18/loan-comparison.png",
  "blog/images/post-18/loan-decision-tree.png",
  "blog/images/post-18/loan-simulation.png",
  "blog/images/post-18/loan-process.png",
  "blog/images/post-18/cta-banner.png",
  "blog/images/post-19/youth-rent-worry.png",
  "blog/images/post-19/online-application.png",
  "blog/images/post-19/happy-support.png",
  "blog/images/post-20/youth-account-dream.png",
  "blog/images/post-20/interest-rate-benefit.png",
  "blog/images/post-20/home-ownership-key.png",
  "blog/images/post-21/loan-comparison-hero.png",
  "blog/images/post-21/loan-conditions-table.png",
  "blog/images/post-21/loan-choice-guide.png",
  "blog/images/post-22/no-house-hero.png",
  "blog/images/post-22/no-house-cases.png",
  "blog/images/post-22/no-house-strategy.png",
];

async function main() {
  let ok = true;
  for (const rel of FILES) {
    try {
      await access(path.join(ROOT, rel));
      console.log(`✓ ${rel}`);
    } catch {
      console.error(`✗ ${rel}`);
      ok = false;
    }
  }
  if (!ok) process.exit(1);
  console.log(`Done: ${FILES.length} hybrid images`);
}

main();
