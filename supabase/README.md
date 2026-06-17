# Supabase DB 스키마

부동산 실거래 데이터 저장용 PostgreSQL 스키마입니다.

## 파일

| 파일 | 설명 |
|------|------|
| `migrations/001_real_estate_schema.sql` | apartments, transactions, coordinates_cache 생성 |

## 테이블 요약

### `apartments` — 단지 마스터
- 국토부 `aptNm`, `umdNm`, `jibun`, `buildYear` 등 매핑
- `(sigungu_code, name, dong, jibun)` 유니크 → 중복 단지 방지
- `latitude` / `longitude`는 지오코딩 후 업데이트

### `transactions` — 실거래
- `deal_amount` 단위: **만원**
- `deal_type`: 매매 / 전세 / 월세 (ENUM)
- `deal_date`: year·month·day에서 자동 생성 (검색·정렬용)
- 동일 거래 중복 적재 방지 UNIQUE 제약

### `coordinates_cache` — 좌표 캐시
- `address` 유니크 → 카카오 지오코딩 API 호출 최소화

## Supabase SQL Editor 실행 방법

### 1단계: Supabase 대시보드 접속
1. [https://supabase.com/dashboard](https://supabase.com/dashboard) 로그인
2. 프로젝트 선택 (URL: `qzvklixtqtuzjsepcglb.supabase.co`)

### 2단계: SQL Editor 열기
1. 왼쪽 메뉴 **SQL Editor** 클릭
2. **New query** 선택

### 3단계: 쿼리 붙여넣기
1. 로컬 파일 `supabase/migrations/001_real_estate_schema.sql` 전체 복사
2. SQL Editor에 붙여넣기

### 4단계: 실행
1. 우측 하단 **Run** (또는 `Ctrl+Enter`)
2. `Success. No rows returned` 메시지 확인

### 5단계: 테이블 생성 확인
1. 왼쪽 **Table Editor** 메뉴
2. `apartments`, `transactions`, `coordinates_cache` 3개 테이블 표시 확인

### 6단계: (선택) 구조 확인 쿼리

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('apartments', 'transactions', 'coordinates_cache');
```

## RLS (Row Level Security)

- 현재: **비활성** (`DISABLE ROW LEVEL SECURITY`)
- 서비스 공개 전: 정책 추가 + RLS 활성화 예정

## 다음 단계 (예정)

1. `scripts/import-molit-to-supabase.mjs` — 강남구 API → DB 적재
2. 카카오 지오코딩 → `coordinates_cache` + `apartments` 좌표 업데이트
3. 주식 자산: `stocks` / `stock_prices` 테이블 추가 (SQL 하단 주석 참고)
