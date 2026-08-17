# AdSense noindex (도구 페이지) — 승인 후 복구법

애드센스 블로그 중심 심사를 위해 도구 9페이지에 `noindex, follow`를 적용하고 sitemap에서 tools/ URL을 제외했습니다.

## 승인 후 복구

1. **9개 도구 페이지** `<head>`에서 아래 한 줄 삭제(또는 `index, follow`로 변경):
   ```html
   <meta name="robots" content="noindex, follow">
   ```
   - tools/index.html
   - tools/bunyang-alarm/index.html
   - tools/subscription-calculator/index.html
   - tools/dday-calculator/index.html
   - tools/realestate-map/index.html
   - tools/severance-calculator/index.html
   - tools/apt-calculator/index.html
   - tools/salary-calculator/index.html
   - tools/income-calculator/index.html

2. **sitemap 복원**
   ```bash
   cp backup/sitemap.full.xml sitemap.xml
   ```
   (백업 파일은 `backup/sitemap.full.xml` — Git에만 있고 Vercel 배포에는 포함되지 않음)

3. robots.txt는 변경 없음(Disallow 없음).
