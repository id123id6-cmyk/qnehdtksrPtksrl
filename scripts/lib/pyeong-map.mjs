/**
 * 공급면적 기준 평형 매핑 (Node/브라우저 공용 — pyeong.js와 동기화)
 */
export const SQM_PER_PYEONG = 3.3058;

export const STANDARD_TYPES = [
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

export const PYEONG_BANDS = [
  { id: "band10", label: "10평대", min: 0, max: 19 },
  { id: "band20", label: "20평대", min: 20, max: 29 },
  { id: "band30", label: "30평대", min: 30, max: 39 },
  { id: "band40", label: "40평대", min: 40, max: 49 },
  { id: "band50", label: "50평대+", min: 50, max: Infinity },
];

const ESTIMATE_RATIO = 1.323;

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

export function getBandLabel(bandId) {
  return PYEONG_BANDS.find((b) => b.id === bandId)?.label || "기타";
}

export function resolveArea(exclSqm, override) {
  if (exclSqm == null || Number.isNaN(Number(exclSqm))) {
    return { exclSqm: null, supplySqm: null, pyeong: null, band: "other", isStandard: false };
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

export function dominantFromTransactions(transactions) {
  const counts = new Map();
  for (const tx of transactions || []) {
    const r = resolveArea(tx.exclu_use_ar);
    if (r.pyeong == null) continue;
    const key = String(r.pyeong);
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
    (tx) => resolveArea(tx.exclu_use_ar).pyeong === best
  );
  return sample ? resolveArea(sample.exclu_use_ar) : { pyeong: best };
}
