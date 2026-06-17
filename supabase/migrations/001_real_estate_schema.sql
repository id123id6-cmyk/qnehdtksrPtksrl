-- =============================================================================
-- 승박 부동산 실거래 DB 스키마 (v1)
-- Supabase SQL Editor에서 전체 실행
-- RLS: 개발 단계 — 정책 미적용 (테이블 기본값, RLS 비활성)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 공통: 거래 유형 (매매 / 전월세 확장)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_type_enum') THEN
    CREATE TYPE deal_type_enum AS ENUM ('매매', '전세', '월세');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. apartments — 아파트 단지 마스터
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apartments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                          -- 단지명 (aptNm)
  sigungu_code  CHAR(5) NOT NULL,                     -- 법정동코드 앞 5자리 (LAWD_CD)
  dong          TEXT,                                   -- 읍·면·동 (umdNm)
  jibun         TEXT,                                   -- 지번
  build_year    SMALLINT,                             -- 준공년도 (buildYear)
  latitude      DOUBLE PRECISION,                     -- 위도 (카카오 지오코딩 후 채움)
  longitude     DOUBLE PRECISION,                     -- 경도
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 동일 단지 중복 방지 (국토부 API 기준 자연키)
  CONSTRAINT apartments_natural_key_unique
    UNIQUE (sigungu_code, name, dong, jibun)
);

COMMENT ON TABLE public.apartments IS '아파트 단지 마스터 (부동산 자산)';
COMMENT ON COLUMN public.apartments.sigungu_code IS '시군구 법정동코드 5자리, 예: 11680';
COMMENT ON COLUMN public.apartments.latitude IS '카카오 지오코딩으로 채움, NULL 허용';

-- -----------------------------------------------------------------------------
-- 2. transactions — 실거래 내역
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id  UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  deal_amount   INTEGER NOT NULL,                     -- 거래금액 (만원)
  deal_year     SMALLINT NOT NULL,
  deal_month    SMALLINT NOT NULL CHECK (deal_month BETWEEN 1 AND 12),
  deal_day      SMALLINT NOT NULL CHECK (deal_day BETWEEN 1 AND 31),
  deal_date     DATE GENERATED ALWAYS AS (
                  make_date(deal_year::INT, deal_month::INT, deal_day::INT)
                ) STORED,                             -- 조회·정렬용
  exclu_use_ar  NUMERIC(10, 2),                     -- 전용면적 (㎡)
  floor         SMALLINT,                             -- 층
  deal_type     deal_type_enum NOT NULL DEFAULT '매매',
  rent_deposit  INTEGER,                            -- 월세 확장: 보증금 (만원)
  monthly_rent  INTEGER,                            -- 월세 확장: 월세 (만원)
  source        TEXT NOT NULL DEFAULT 'molit',      -- 데이터 출처
  source_id     TEXT,                               -- API 원본 식별자 (선택)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 동일 거래 중복 적재 방지
  CONSTRAINT transactions_dedup_unique
    UNIQUE (apartment_id, deal_type, deal_year, deal_month, deal_day, deal_amount, floor, exclu_use_ar)
);

COMMENT ON TABLE public.transactions IS '부동산 실거래 내역 (매매·전월세)';
COMMENT ON COLUMN public.transactions.deal_amount IS '단위: 만원 (국토부 dealAmount 그대로)';
COMMENT ON COLUMN public.transactions.rent_deposit IS '전월세 API 연동 시 사용';

-- -----------------------------------------------------------------------------
-- 3. coordinates_cache — 주소 → 좌표 캐시
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coordinates_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address       TEXT NOT NULL,                        -- 전체 주소 (정규화 권장)
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  provider      TEXT NOT NULL DEFAULT 'kakao',      -- geocoding 제공자
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT coordinates_cache_address_unique UNIQUE (address)
);

COMMENT ON TABLE public.coordinates_cache IS '지오코딩 결과 캐시 (API 호출 절감)';

-- -----------------------------------------------------------------------------
-- 인덱스
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_apartments_sigungu_code
  ON public.apartments (sigungu_code);

CREATE INDEX IF NOT EXISTS idx_apartments_name
  ON public.apartments (name);

CREATE INDEX IF NOT EXISTS idx_apartments_sigungu_name
  ON public.apartments (sigungu_code, name);

CREATE INDEX IF NOT EXISTS idx_apartments_geo
  ON public.apartments (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_apartment_id
  ON public.transactions (apartment_id);

CREATE INDEX IF NOT EXISTS idx_transactions_deal_date
  ON public.transactions (deal_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_deal_ym
  ON public.transactions (deal_year, deal_month);

CREATE INDEX IF NOT EXISTS idx_transactions_deal_type
  ON public.transactions (deal_type);

CREATE INDEX IF NOT EXISTS idx_transactions_sigungu_via_apt
  ON public.transactions (apartment_id, deal_date DESC);

CREATE INDEX IF NOT EXISTS idx_coordinates_cache_created
  ON public.coordinates_cache (created_at DESC);

-- -----------------------------------------------------------------------------
-- updated_at 자동 갱신 (apartments)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apartments_updated_at ON public.apartments;
CREATE TRIGGER trg_apartments_updated_at
  BEFORE UPDATE ON public.apartments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 개발 단계: RLS 비활성 (정책 없음)
-- 프로덕션 전환 시 ENABLE + 정책 추가 예정
-- -----------------------------------------------------------------------------
ALTER TABLE public.apartments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinates_cache DISABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- [향후 확장] 주식 자산 — 참고용 (지금은 실행하지 않음)
-- 부동산(apartments)과 병렬 구조로 stocks 마스터 + stock_prices 시계열 추가 예정
--
-- CREATE TABLE public.stocks (
--   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   symbol      TEXT NOT NULL UNIQUE,       -- 종목코드
--   name        TEXT NOT NULL,
--   market      TEXT,                       -- KOSPI / KOSDAQ
--   created_at  TIMESTAMPTZ DEFAULT now()
-- );
--
-- CREATE TABLE public.stock_prices (
--   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   stock_id    UUID REFERENCES public.stocks(id),
--   price_date  DATE NOT NULL,
--   close_price NUMERIC(12, 2),
--   UNIQUE (stock_id, price_date)
-- );
-- -----------------------------------------------------------------------------
