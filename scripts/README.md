# scripts

로컬 개발·API 테스트용 Node 스크립트입니다.

## 사전 준비

1. `.env.local.example` → `.env.local` 복사
2. 공공데이터포털에서 발급한 **전체** API 키 입력 (`...` 없이)

## 국토부 API 테스트

```bash
node scripts/test-molit-api.mjs
```

옵션:

```bash
node scripts/test-molit-api.mjs --lawd 11680 --ym 202405
```

- `lawd`: 법정동코드 앞 5자리 (예: 11680 강남구)
- `ym`: 계약년월 `YYYYMM`

성공 시 `resultCode: 000` 과 샘플 거래 3건이 출력됩니다.

## 국토부 → Supabase 적재

```bash
npm install @supabase/supabase-js
node scripts/import-molit-to-supabase.mjs --lawd 11680 --months 12
```

사전 조건:

1. `.env.local`에 `MOLIT_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET`
2. Supabase SQL Editor에서 `supabase/migrations/001_real_estate_schema.sql` 실행 완료

## 환경 변수

| 변수 | 용도 |
|------|------|
| `MOLIT_API_KEY` | 아파트 매매 실거래 |
| `MOLIT_RENT_KEY` | 전월세 실거래 (추후) |
| `MOLIT_DONG_KEY` | 법정동코드 (추후) |
