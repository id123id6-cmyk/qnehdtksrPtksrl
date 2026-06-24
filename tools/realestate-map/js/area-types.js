/**
 * 전용면적 1자리(0.1㎡) 그룹 + 최소 거래수 흡수 + 면적대 필터
 */
(function (global) {
  "use strict";

  const MIN_GROUP_COUNT = 3;
  const YEARS_LOOKBACK = 5;

  const SQM_FILTER_BANDS = [
    { id: "under40", label: "40㎡ 미만", min: 0, max: 40 },
    { id: "40_60", label: "40-60㎡", min: 40, max: 60 },
    { id: "60_85", label: "60-85㎡", min: 60, max: 85 },
    { id: "85_102", label: "85-102㎡", min: 85, max: 102 },
    { id: "102plus", label: "102㎡ 이상", min: 102, max: Infinity },
  ];

  function roundArea1(exclSqm) {
    const n = Number(exclSqm);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 10) / 10;
  }

  function roundArea0(exclSqm) {
    const n = Number(exclSqm);
    if (!Number.isFinite(n)) return null;
    return Math.round(n);
  }

  function formatAreaSqm(areaGroup, decimals) {
    if (areaGroup == null || !Number.isFinite(Number(areaGroup))) return "-";
    const n = Number(areaGroup);
    if (decimals === 0) return `${Math.round(n)}`;
    const s = n.toFixed(1);
    return s.endsWith(".0") ? `${Math.round(n)}` : s;
  }

  function formatAreaTabLabel(areaGroup, withPyeong) {
    const sqm = `${formatAreaSqm(areaGroup, 1)}㎡`;
    if (!withPyeong) return sqm;
    const P = global.RealEstateMapPyeong;
    const pyeong = P?.resolve?.(areaGroup)?.pyeong;
    return pyeong != null ? `${sqm} (${pyeong}평)` : sqm;
  }

  function sqmToFilterBand(exclSqm) {
    const a = Number(exclSqm);
    if (!Number.isFinite(a)) return null;
    for (const band of SQM_FILTER_BANDS) {
      if (a >= band.min && a < band.max) return band.id;
    }
    return null;
  }

  function getFilterBandLabel(bandId) {
    return SQM_FILTER_BANDS.find((b) => b.id === bandId)?.label || bandId;
  }

  function getCutoffDateStr(years = YEARS_LOOKBACK) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    return d.toISOString().slice(0, 10);
  }

  function aggregateRawRows(rows) {
    const byGroup = new Map();

    for (const row of rows || []) {
      if (row.exclu_use_ar == null) continue;
      const areaGroup = roundArea1(row.exclu_use_ar);
      if (areaGroup == null) continue;
      const dealType = row.deal_type || "매매";
      const key = `${areaGroup}|${dealType}`;

      if (!byGroup.has(key)) {
        byGroup.set(key, {
          areaGroup,
          deal_type: dealType,
          count: 0,
          sumAmount: 0,
          minAmount: Infinity,
          maxAmount: -Infinity,
          sumExcl: 0,
          lastDealDate: null,
        });
      }
      const g = byGroup.get(key);
      g.count += 1;
      g.sumAmount += row.deal_amount || 0;
      g.minAmount = Math.min(g.minAmount, row.deal_amount || 0);
      g.maxAmount = Math.max(g.maxAmount, row.deal_amount || 0);
      g.sumExcl += Number(row.exclu_use_ar);
      const dd = row.deal_date || null;
      if (dd && (!g.lastDealDate || dd > g.lastDealDate)) g.lastDealDate = dd;
    }

    return [...byGroup.values()].map((g) => ({
      areaGroup: g.areaGroup,
      area_avg: g.count ? g.sumExcl / g.count : g.areaGroup,
      deal_type: g.deal_type,
      count: g.count,
      avg_price: g.count ? Math.round(g.sumAmount / g.count) : null,
      min_price: g.count ? g.minAmount : null,
      max_price: g.count ? g.maxAmount : null,
      last_deal_date: g.lastDealDate,
    }));
  }

  function mergeSmallGroups(rawAggregates) {
    const grouped = new Map();

    for (const row of rawAggregates) {
      const k = row.areaGroup;
      if (!grouped.has(k)) {
        grouped.set(k, {
          areaGroup: k,
          area_avg: 0,
          sumExclWeighted: 0,
          totalCount: 0,
          maemaeCount: 0,
          jeonseCount: 0,
          byDealType: {},
          memberAreas: [k],
        });
      }
      const g = grouped.get(k);
      g.totalCount += row.count;
      g.sumExclWeighted += row.area_avg * row.count;
      if (row.deal_type === "매매") g.maemaeCount += row.count;
      else if (row.deal_type === "전세") g.jeonseCount += row.count;
      g.byDealType[row.deal_type] = row;
    }

    let groups = [...grouped.values()].map((g) => ({
      ...g,
      area_avg: g.totalCount ? g.sumExclWeighted / g.totalCount : g.areaGroup,
    }));

    groups.sort((a, b) => a.areaGroup - b.areaGroup);

    let changed = true;
    while (changed) {
      changed = false;
      const small = groups.filter((g) => g.totalCount < MIN_GROUP_COUNT);
      if (!small.length) break;

      for (const s of small) {
        const idx = groups.findIndex((g) => g.areaGroup === s.areaGroup);
        if (idx < 0) continue;

        const left = groups[idx - 1] || null;
        const right = groups[idx + 1] || null;
        let target = null;

        if (left && right) {
          const dL = Math.abs(s.areaGroup - left.areaGroup);
          const dR = Math.abs(right.areaGroup - s.areaGroup);
          if (dL < dR) target = left;
          else if (dR < dL) target = right;
          else target = left.totalCount >= right.totalCount ? left : right;
        } else {
          target = left || right;
        }

        if (!target) continue;

        const merged = {
          areaGroup: target.areaGroup,
          area_avg:
            (target.area_avg * target.totalCount + s.area_avg * s.totalCount) /
            (target.totalCount + s.totalCount),
          totalCount: target.totalCount + s.totalCount,
          maemaeCount: target.maemaeCount + s.maemaeCount,
          jeonseCount: target.jeonseCount + s.jeonseCount,
          byDealType: { ...target.byDealType },
          memberAreas: [
            ...new Set([
              ...(target.memberAreas || [target.areaGroup]),
              ...(s.memberAreas || [s.areaGroup]),
            ]),
          ],
        };

        for (const [dt, row] of Object.entries(s.byDealType)) {
          if (!merged.byDealType[dt]) {
            merged.byDealType[dt] = { ...row };
          } else {
            const prev = merged.byDealType[dt];
            const total = prev.count + row.count;
            merged.byDealType[dt] = {
              ...prev,
              count: total,
              avg_price: Math.round(
                (prev.avg_price * prev.count + row.avg_price * row.count) / total
              ),
              min_price: Math.min(prev.min_price, row.min_price),
              max_price: Math.max(prev.max_price, row.max_price),
              last_deal_date:
                prev.last_deal_date > row.last_deal_date
                  ? prev.last_deal_date
                  : row.last_deal_date,
            };
          }
        }

        groups = groups.filter((g) => g.areaGroup !== s.areaGroup && g.areaGroup !== target.areaGroup);
        groups.push(merged);
        groups.sort((a, b) => a.areaGroup - b.areaGroup);
        changed = true;
        break;
      }
    }

    return groups.sort((a, b) => a.areaGroup - b.areaGroup);
  }

  function buildAreaTypesFromTransactions(transactions) {
    const raw = aggregateRawRows(transactions);
    const groups = mergeSmallGroups(raw);

    const areaSqmBands = new Set();
    for (const g of groups) {
      const band = sqmToFilterBand(g.area_avg);
      if (band) areaSqmBands.add(band);
    }

    let dominant = null;
    for (const g of groups) {
      if (!dominant || g.totalCount > dominant.totalCount) dominant = g;
    }

    return {
      groups,
      areaSqmBands: [...areaSqmBands],
      dominantArea: dominant?.area_avg ?? null,
      dominantAreaGroup: dominant?.areaGroup ?? null,
      dominantTradeCount: dominant?.totalCount ?? 0,
    };
  }

  function txMatchesAreaGroup(tx, areaGroup, groups) {
    if (areaGroup == null || areaGroup === "all") return true;
    const raw = roundArea1(tx.exclu_use_ar);
    if (raw == null) return false;

    const group = (groups || []).find(
      (g) => String(g.areaGroup) === String(areaGroup)
    );
    if (group?.memberAreas?.length) {
      return group.memberAreas.some((a) => a === raw);
    }

    return raw === Number(areaGroup);
  }

  function filterTransactionsByAreaGroup(transactions, areaGroup, groups) {
    if (areaGroup == null || areaGroup === "all") return transactions || [];
    return (transactions || []).filter((tx) =>
      txMatchesAreaGroup(tx, areaGroup, groups)
    );
  }

  function pickDominantGroupForBand(groups, bandId) {
    if (!bandId || bandId === "all") return null;
    const band = SQM_FILTER_BANDS.find((b) => b.id === bandId);
    if (!band) return null;
    let best = null;
    for (const g of groups || []) {
      const a = g.area_avg ?? g.areaGroup;
      if (a < band.min || a >= band.max) continue;
      if (!best || g.totalCount > best.totalCount) best = g;
    }
    return best;
  }

  function formatMarkerAreaLabel(apt, activeBandId) {
    const groups = apt.areaGroupMeta;
    let areaGroup = apt.dominantAreaGroup;
    let areaAvg = apt.dominantArea;

    if (activeBandId && activeBandId !== "all" && groups?.length) {
      const picked = pickDominantGroupForBand(groups, activeBandId);
      if (picked) {
        areaGroup = picked.areaGroup;
        areaAvg = picked.area_avg;
      } else {
        return "";
      }
    }

    if (areaGroup == null && areaAvg == null) {
      const p = apt.dominantPyeong ?? apt.jeonseDominantPyeong;
      return p != null ? `${p}평` : "";
    }

    const sqm = formatAreaSqm(areaGroup ?? areaAvg, 0);
    return sqm ? `${sqm}㎡` : "";
  }

  function formatMarkerTooltip(apt) {
    const name = apt.name || "";
    const areaAvg = apt.dominantArea;
    const excl = areaAvg != null ? formatAreaSqm(areaAvg, 2) : null;
    const P = global.RealEstateMapPyeong;
    const pyeong = areaAvg != null ? P?.resolve?.(areaAvg)?.pyeong : apt.dominantPyeong;
    const price = global.RealEstateMapMarker?.formatPrice?.(apt.avgPrice1Y);
    const count = apt.tradeCount1Y ?? 0;

    if (price) {
      const parts = [];
      if (excl) parts.push(`전용 ${excl}㎡`);
      if (pyeong) parts.push(`${pyeong}평`);
      parts.push(`매매 ${price}`);
      if (count) parts.push(`${count}건`);
      return `${name} — ${parts.join(" · ")}`;
    }

    const jeonse1y = apt.jeonseCount1Y ?? 0;
    if (jeonse1y > 0) return `${name} — 매매 없음 · 전세 ${jeonse1y}건`;
    return `${name} — 최근 1년 거래 없음`;
  }

  function summarizeAllGroups(groups) {
    return (groups || [])
      .map((g) => {
        const sqm = formatAreaSqm(g.areaGroup, 1);
        const parts = [];
        if (g.maemaeCount) parts.push(`매매 ${g.maemaeCount}건`);
        if (g.jeonseCount) parts.push(`전세 ${g.jeonseCount}건`);
        return `${sqm}㎡(${parts.join(", ") || `${g.totalCount}건`})`;
      })
      .join(", ");
  }

  global.RealEstateMapAreaTypes = {
    MIN_GROUP_COUNT,
    YEARS_LOOKBACK,
    SQM_FILTER_BANDS,
    roundArea1,
    roundArea0,
    formatAreaSqm,
    formatAreaTabLabel,
    sqmToFilterBand,
    getFilterBandLabel,
    getCutoffDateStr,
    aggregateRawRows,
    mergeSmallGroups,
    buildAreaTypesFromTransactions,
    txMatchesAreaGroup,
    filterTransactionsByAreaGroup,
    pickDominantGroupForBand,
    formatMarkerAreaLabel,
    formatMarkerTooltip,
    summarizeAllGroups,
  };
})(window);
