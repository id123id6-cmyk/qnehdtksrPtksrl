/**
 * 전용면적(㎡) → 면적 타입 추정 (내부 그룹·필터용)
 * UI 표시는 formatAreaDisplay 등 ㎡ 전용 함수 사용
 */
(function (global) {
  "use strict";

  const SQM_PER_PYEONG = 3.3058;

  /** 전용면적 구간 → 내부 타입 매핑 */
  const STANDARD_TYPES = [
    { exclMin: 0, exclMax: 33, supplySqm: 43, pyeong: 13 },
    { exclMin: 33, exclMax: 40, supplySqm: 51, pyeong: 16 },
    { exclMin: 40, exclMax: 44, supplySqm: 56, pyeong: 18 },
    { exclMin: 44, exclMax: 50, supplySqm: 66, pyeong: 20 },
    { exclMin: 50, exclMax: 60, supplySqm: 79.34, pyeong: 24 },
    { exclMin: 60, exclMax: 72, supplySqm: 95.87, pyeong: 29 },
    { exclMin: 72, exclMax: 85, supplySqm: 112.4, pyeong: 34 },
    { exclMin: 85, exclMax: 102, supplySqm: 132.23, pyeong: 40 },
    { exclMin: 102, exclMax: 135, supplySqm: 165.29, pyeong: 50 },
    { exclMin: 135, exclMax: Infinity, supplySqm: 198.35, pyeong: 60 },
  ];

  const PYEONG_BANDS = [
    { id: "band10", label: "40㎡ 미만", min: 0, max: 19 },
    { id: "band20", label: "40-60㎡", min: 20, max: 29 },
    { id: "band30", label: "60-85㎡", min: 30, max: 39 },
    { id: "band40", label: "85-102㎡", min: 40, max: 49 },
    { id: "band50", label: "102㎡+", min: 50, max: Infinity },
  ];

  const ESTIMATE_RATIO = 1.323;

  function formatSqm(sqm) {
    if (sqm == null || Number.isNaN(Number(sqm))) return "-";
    const n = Number(sqm);
    return Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.005
      ? `${Math.round(n)}`
      : n.toFixed(2).replace(/\.?0+$/, "");
  }

  function findType(exclSqm) {
    const excl = Number(exclSqm);
    if (!Number.isFinite(excl) || excl <= 0) return null;
    for (const t of STANDARD_TYPES) {
      if (excl >= t.exclMin && excl < t.exclMax) return t;
    }
    return null;
  }

  function getBandId(pyeong) {
    const p = Number(pyeong);
    if (!Number.isFinite(p)) return "other";
    for (const band of PYEONG_BANDS) {
      if (p >= band.min && p <= band.max) return band.id;
    }
    return "other";
  }

  function getBandLabel(bandId) {
    return PYEONG_BANDS.find((b) => b.id === bandId)?.label || "기타";
  }

  /**
   * @param {number} exclSqm 전용면적
   * @param {{ supplySqm?: number, pyeong?: number, source?: string }} override Phase 2 정밀값
   */
  function resolve(exclSqm, override) {
    if (exclSqm == null || Number.isNaN(Number(exclSqm))) {
      return {
        exclSqm: null,
        supplySqm: null,
        pyeong: null,
        band: "other",
        isStandard: false,
        source: "none",
      };
    }

    const excl = Number(exclSqm);

    if (override?.supplySqm != null && override?.pyeong != null) {
      const pyeong = Number(override.pyeong);
      return {
        exclSqm: excl,
        supplySqm: Number(override.supplySqm),
        pyeong,
        band: getBandId(pyeong),
        isStandard: true,
        source: override.source || "building_register",
      };
    }

    const type = findType(excl);
    if (type) {
      return {
        exclSqm: excl,
        supplySqm: type.supplySqm,
        pyeong: type.pyeong,
        band: getBandId(type.pyeong),
        isStandard: true,
        source: "estimate",
      };
    }

    const supplySqm = excl * ESTIMATE_RATIO;
    const pyeong = Math.round(supplySqm / SQM_PER_PYEONG);
    return {
      exclSqm: excl,
      supplySqm,
      pyeong,
      band: getBandId(pyeong),
      isStandard: false,
      source: "estimate",
    };
  }

  /** @deprecated 내부 필터용 — UI에 표시하지 말 것 */
  function toPyeong(exclSqm, override) {
    return resolve(exclSqm, override).pyeong;
  }

  /** @deprecated 내부용 */
  function pyeongFromSupply(supplySqm) {
    const s = Number(supplySqm);
    if (!Number.isFinite(s) || s <= 0) return null;
    return Math.round(s / SQM_PER_PYEONG);
  }

  function resolveForDisplay(exclSqm, areaGroupKey) {
    const lookup =
      areaGroupKey != null && Number.isFinite(Number(areaGroupKey))
        ? Number(areaGroupKey)
        : Number(exclSqm);
    return resolve(lookup);
  }

  /**
   * UI 카드·요약용 — DB 전용면적
   * @param {number} exclSqm 전용면적
   */
  function formatAreaDisplay(exclSqm) {
    const excl = Number(exclSqm);
    if (!Number.isFinite(excl)) return "-";
    return `전용 ${formatSqm(excl)}㎡`;
  }

  /** 테이블·마커 등 간단 표기 — 전용면적 ㎡만 */
  function formatExclSqm(exclSqm) {
    const excl = Number(exclSqm);
    if (!Number.isFinite(excl)) return "-";
    return `${formatSqm(excl)}㎡`;
  }

  /** @deprecated formatAreaDisplay 사용 */
  function formatApartmentCard(exclSqm) {
    return formatAreaDisplay(exclSqm);
  }

  function formatShort(exclSqm) {
    return formatExclSqm(exclSqm);
  }

  function formatDetail(exclSqm) {
    return formatAreaDisplay(exclSqm);
  }

  function formatChartTooltip(exclSqm, amountText) {
    const areaPart = formatAreaDisplay(exclSqm);
    if (!areaPart || areaPart === "-") return amountText || "";
    return amountText ? `${areaPart} · ${amountText}` : areaPart;
  }

  function formatTableCells(exclSqm) {
    return {
      area: formatExclSqm(exclSqm),
    };
  }

  /** 지도 필터용 면적대 band id */
  function sqmToCategory(exclSqm) {
    return resolve(exclSqm).band;
  }

  function filterByBand(transactions, bandId) {
    if (!bandId || bandId === "all") return transactions;
    return (transactions || []).filter(
      (tx) => resolve(tx.exclu_use_ar).band === bandId
    );
  }

  function getAvailableBands(transactions) {
    const bands = new Set();
    for (const tx of transactions || []) {
      const band = resolve(tx.exclu_use_ar).band;
      if (band && band !== "other") bands.add(band);
    }
    const order = PYEONG_BANDS.map((b) => b.id);
    return order.filter((id) => bands.has(id));
  }

  function dominantFromTransactions(transactions) {
    const counts = new Map();
    for (const tx of transactions || []) {
      const r = resolve(tx.exclu_use_ar);
      if (r.pyeong == null) continue;
      const key = `${r.pyeong}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let best = null;
    let bestN = 0;
    for (const [k, n] of counts) {
      if (n > bestN) {
        bestN = n;
        best = Number(k);
      }
    }
    if (best == null) return null;
    const sample = (transactions || []).find(
      (tx) => resolve(tx.exclu_use_ar).pyeong === best
    );
    return sample ? resolve(sample.exclu_use_ar) : { pyeong: best };
  }

  global.RealEstateMapPyeong = {
    SQM_PER_PYEONG,
    STANDARD_TYPES,
    PYEONG_BANDS,
    resolve,
    pyeongFromSupply,
    resolveForDisplay,
    formatAreaDisplay,
    formatExclSqm,
    formatApartmentCard,
    toPyeong,
    formatShort,
    formatDetail,
    formatChartTooltip,
    formatTableCells,
    sqmToCategory,
    filterByBand,
    getAvailableBands,
    getBandLabel,
    dominantFromTransactions,
    formatSqm,
  };
})(window);
