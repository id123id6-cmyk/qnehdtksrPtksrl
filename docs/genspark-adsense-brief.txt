# seungbak.com — 젠스파크 젠팀용 사이트 브리프 (AdSense 승인 협업)

작성일: 2026-11-16  
도메인: https://seungbak.com/  
운영자: 승박 (생산관리 직장인)  
연락: id123id6@gmail.com / Instagram @seungbak.tools  
목적: 지금까지 만든 사이트 구조·콘텐츠·기술 현황을 정리해, **Google AdSense 승인**을 함께 준비하기 위한 공유 문서

---

## 1. 한 줄 요약

**월급쟁이 눈높이의 한국어 부동산·세금·청약·노후 정보 사이트**입니다.  
핵심 자산은 (1) **무료 계산/조회 도구**와 (2) **초보용 장문 블로그**이며, 광고 수익(AdSense)으로 운영 지속을 목표로 합니다.

---

## 2. 사이트 포지션 (AdSense 심사 관점)

| 항목 | 내용 |
|------|------|
| 타깃 | 무주택·사회초년생·월급쟁이 |
| 언어 | 한국어 (ko-KR) |
| 콘텐츠 성격 | 정보 제공 / 계산 보조 (투자 권유·특정 상품 판매 아님) |
| 차별점 | 실거래가 지도 + 계산기 + 제도 해설 글이 한 도메인에 묶여 있음 |
| 운영자 실명성 | about 페이지, 작성자 박스, 이메일·인스타 공개 |
| 정책 페이지 | privacy / terms / disclaimer / contact 완비 |

AdSense에서 자주 걸리는 **“가치 낮은 콘텐츠(low value content)”** 를 피하려고,  
중복 글 정리·테마 무관 글 목록 제외·세금/제도 장문 글(표·FAQ·출처·면책) 강화 작업을 이미 진행했습니다.

---

## 3. 기술 구조

```
seungbak.com
├── index.html              # 홈 (히어로 + 도구 CTA + 최신 글 6개)
├── about.html / contact.html
├── privacy.html / terms.html / disclaimer.html
├── glossary.html
├── ads.txt / robots.txt / sitemap.xml / llms.txt
├── vercel.json             # 배포·캐시·영구 리다이렉트
├── blog/
│   ├── index.html          # 블로그 목록
│   ├── posts.json          # 목록용 메타 (count 기준)
│   ├── rss.xml
│   ├── post-*.html         # 개별 글 (정적 HTML)
│   └── images/post-N/      # 히어로·썸네일
└── tools/
    ├── realestate-map/     # 실거래가 지도 (핵심 도구)
    ├── bunyang-alarm/      # 분양·청약 알리미
    ├── subscription-calculator/
    ├── salary-calculator/
    ├── income-calculator/
    ├── apt-calculator/
    ├── dday-calculator/
    └── severance-calculator/
```

### 스택·배포
- **정적 사이트** (HTML / CSS / JS). 별도 백엔드 서버 없음(도구는 클라이언트 계산 위주).
- **호스팅**: Vercel (`vercel.json`으로 헤더·리다이렉트 관리)
- **저장소**: GitHub → main 푸시 시 자동 배포
- **도메인**: `seungbak.com` (www → non-www 영구 리다이렉트)

### 추적·광고 준비 (이미 심어둔 것)
- **Google Analytics 4**: `G-Y7SC73P9JW`
- **Microsoft Clarity**: `xbdrgqw1pj`
- **AdSense 계정 메타/스크립트**: `ca-pub-8232968272801958`
- **ads.txt**: `google.com, pub-8232968272801958, DIRECT, f08c47fec0942fa0`
- 개인정보처리방침에 AdSense·쿠키 고지 포함

> 참고: 일부 글에는 “승인 후 삽입”용 광고 자리 주석이 있습니다.  
> 승인 전에도 AdSense 코드/ads.txt는 사이트 전역에 준비된 상태입니다.

---

## 4. 주요 페이지 역할

### 홈 `/`
- 브랜드·한 줄 가치 제안
- 실거래가 지도 / 계산 도구로 바로 이동
- 최신 블로그 카드 **6개** 고정 노출
- Organization / WebSite JSON-LD

### 도구 `/tools/`
실제 사용자가 “계산·조회”하는 유틸리티. AdSense 심사에서 **도구형 유용성**을 어필할 수 있는 핵심입니다.

| 도구 | URL | 역할 |
|------|-----|------|
| 실거래가 지도 | `/tools/realestate-map/` | 서울·경기 등 단지·실거래 조회 (사이트 대표 기능) |
| 분양 알리미 | `/tools/bunyang-alarm/` | 청약·분양 일정 / D-Day |
| 청약 가점 계산기 | `/tools/subscription-calculator/` | 민영 청약 가점 |
| 월급 실수령액 | `/tools/salary-calculator/` | 세후 월급 감 |
| 필요 연봉 | `/tools/income-calculator/` | 집값 대비 필요 연봉 |
| 아파트 계산기 | `/tools/apt-calculator/` | 대출·상환 감 |
| D-day | `/tools/dday-calculator/` | 일정 카운트 |
| 퇴직금 | `/tools/severance-calculator/` | 퇴직금·퇴직소득 감 |

### 블로그 `/blog/`
- 목록 기준 게시글 **약 40편** (`posts.json` count)
- 카테고리 예: 부동산 세금, 청약, 대출, 노후/연금, 절세, 실전 체크리스트, 운영자 에세이
- 최근 방향: **세금·제도 장문 정리** (표 4개+, FAQ, 출처, 정부안/현행 분리, 면책문구)
- 대표 최신 글 예:
  - post-57: 월세 세액공제 2026 (최대 170만원, 정부안 미확정 명시)
  - post-56: 주택임대소득 과세 기준 2026
  - post-55: 기초연금 수급자격
  - post-54: 건강보험 피부양자 탈락 기준
  - post-53: 1주택 양도세 비과세

### 신뢰·정책 페이지
- `/about.html` — 운영자 소개 (비전공자 직장인, 직접 조사·작성)
- `/contact.html` — 문의
- `/privacy.html` — 개인정보·AdSense·Analytics 고지
- `/terms.html` — 이용약관
- `/disclaimer.html` — 면책 (투자·세무 자문 아님)
- `/glossary.html` — 용어집

---

## 5. SEO / 크롤러 준비 상태

이미 갖춰 둔 것:
- `sitemap.xml` (개별 글 URL 포함)
- `robots.txt` (Allow + Sitemap 명시)
- `blog/rss.xml`
- 페이지별 `canonical`, `meta robots`
- OG / Twitter 카드
- 글별 JSON-LD (`Article` + `BreadcrumbList`)
- `llms.txt` / `llms-full.txt` (AI 검색용 요약)

중복·테마 정리로 넣은 **영구 리다이렉트** 예 (`vercel.json`):
- `post-5`, `post-6`, `post-9` → `post-11`
- `post-16` → `post-20`

일부 테마 무관·저품질로 판단한 글은 **목록에서 제외 + noindex** 처리한 이력이 있습니다.  
(파일은 남아 있어도 검색/목록 노출을 줄여 “thin content” 리스크를 낮추는 목적)

---

## 6. 콘텐츠 작성 규칙 (지금까지의 운영 기준)

젠팀이 글을 보강·추가할 때 맞춰 주시면 좋은 기준입니다.

1. **사실과 미확정 분리**  
   - 국세청·청약홈·기재부 등 공식 수치만 “확정”으로 씀  
   - 세제개편안 등은 반드시 **정부안 / 국회 미통과** 명시
2. **장문·구조화**  
   - H2 다수, 표(`post-table`), FAQ, 계산 예시, 내부링크 3개 전후
3. **쉬운 말**  
   - 사회초년생이 읽는다고 가정
4. **면책**  
   - 세무 대리면책, 투자 권유 금지, 개인 상황 상이 고지
5. **이미지**  
   - 히어로·썸네일 실제 해상도 맞춤, alt 한국어
6. **템플릿**  
   - `blog/post-56.html` / `post-57.html` 구조 재사용  
   - GA4 / AdSense / Clarity 스크립트는 head에서 유지
7. **발행 시 6곳 업데이트** (관례)  
   - `blog/post-N.html`  
   - `blog/index.html` 카드  
   - `blog/posts.json` (+ count)  
   - `blog/rss.xml`  
   - 루트 `index.html` 최신글 6개 유지  
   - `sitemap.xml`에 URL 1개만 추가 (전체 재생성 금지)

---

## 7. AdSense 승인용으로 이미 한 일 / 남은 일

### 이미 한 일
- AdSense pub ID · ads.txt · privacy 고지 준비
- 홈·도구·블로그·소개·정책 페이지 구성
- 중복 페이지 정리 및 영구 리다이렉트
- 가치 낮은 글 목록 제외 / noindex
- 세금·제도 장문 글 강화 (표·FAQ·출처·면책)
- GA4 / Clarity로 방문 측정 가능 상태

### 젠팀과 같이 하면 좋은 일 (제안)
1. **AdSense 심사 체크리스트로 전 페이지 감사**  
   - 내비게이션 일관성, 모바일 가독성, 광고 자리(승인 후) 과도함 여부  
   - “클릭 유도·유도성 문구” 점검
2. **콘텐츠 밀도·독창성 강화**  
   - thin/유사 글 추가 정리  
   - 도구 사용법과 연결된 실전 가이드 글 (지도·계산기 ↔ 블로그 내부링크)
3. **트래픽·색인 상태 점검**  
   - Search Console / Naver 서치어드바이저 색인·커버리지  
   - 핵심 URL이 실제로 검색·유입되는지
4. **승인 재신청 타이밍·카피**  
   - 사이트 설명 문구, 카테고리, 심사 메모에 넣을 “유용성 한 줄” 정리
5. **승인 후 광고 UX**  
   - 본문 중간/하단 슬롯, CLS 방지, 모바일 과다 광고 방지

---

## 8. 젠팀에 바로 넘길 때 쓸 수 있는 짧은 소개 멘트

아래 문단을 그대로 붙여 쓰셔도 됩니다.

> seungbak.com은 월급쟁이 대상의 한국어 부동산·세금·청약 정보 사이트입니다.  
> Vercel 정적 호스팅으로, 실거래가 지도·청약/연봉/퇴직 계산기 등 무료 도구와  
> 제도 해설형 블로그(약 40편)를 운영 중입니다.  
> AdSense(ca-pub-8232968272801958)와 ads.txt·개인정보처리방침은 이미 준비돼 있고,  
> 중복/저품질 글 정리와 장문 세금 콘텐츠 강화까지 진행했습니다.  
> 목표는 Google AdSense 승인입니다. 사이트 구조·콘텐츠·SEO 상태를 함께 점검하고  
> 승인에 필요한 보강 작업을 같이 진행하고 싶습니다.

---

## 9. 빠른 확인 링크

- 홈: https://seungbak.com/
- 소개: https://seungbak.com/about.html
- 블로그: https://seungbak.com/blog/
- 실거래가 지도: https://seungbak.com/tools/realestate-map/
- 개인정보처리방침: https://seungbak.com/privacy.html
- ads.txt: https://seungbak.com/ads.txt
- sitemap: https://seungbak.com/sitemap.xml
- RSS: https://seungbak.com/blog/rss.xml
- 최근 글 예: https://seungbak.com/blog/post-57.html

---

## 10. 참고 — 로컬 레포에서 보면 좋은 파일

| 파일 | 이유 |
|------|------|
| `index.html` | 홈 구성 |
| `blog/posts.json` | 공개 목록·카운트 |
| `blog/post-57.html` | 최신 장문 글 템플릿 참고 |
| `tools/realestate-map/index.html` | 핵심 도구 |
| `ads.txt` / `privacy.html` | AdSense 준비 증거 |
| `vercel.json` | 배포·리다이렉트 |
| `llms.txt` | 사이트 한 장 요약 |

---

문의·협업 시 이 문서 + 위 링크만 전달하면, 젠팀이 현재 사이트 상태를 빠르게 파악할 수 있습니다.
