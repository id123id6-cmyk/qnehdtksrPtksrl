/**
 * 단지 데이터 + 최근 1년 평균 거래가 로드
 */
(function (global) {
  "use strict";

  let tradeStatsCache = null;
  let areaCategoriesCache = null;

  function getSqmCategory(sqm) {
    const Filter = global.RealEstateMapFilter;
    if (Filter?.sqmToCategory) return Filter.sqmToCategory(sqm);
    const pyeong = Number(sqm) / 3.3058;
    if (pyeong < 20) return "small";
    if (pyeong < 30) return "mid_small";
    if (pyeong < 40) return "mid";
    if (pyeong < 50) return "large";
    return "xlarge";
  }

  async function fetchTradeStats1Y(supabase) {
    if (tradeStatsCache) return tradeStatsCache;

    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const sums = new Map();
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("transactions")
        .select("apartment_id, deal_amount")
        .eq("deal_type", "매매")
        .gte("deal_date", cutoffStr)
        .range(from, from + pageSize - 1);

      if (error) throw new Error(`거래 통계 조회 실패: ${error.message}`);
      if (!data?.length) break;

      for (const row of data) {
        const prev = sums.get(row.apartment_id) || { sum: 0, count: 0 };
        prev.sum += row.deal_amount;
        prev.count += 1;
        sums.set(row.apartment_id, prev);
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }

    const avgMap = new Map();
    const countMap = new Map();
    for (const [id, { sum, count }] of sums) {
      avgMap.set(id, Math.round(sum / count));
      countMap.set(id, count);
    }

    tradeStatsCache = { avgMap, countMap };
    return tradeStatsCache;
  }

  async function fetchAreaCategories(supabase) {
    if (areaCategoriesCache) return areaCategoriesCache;

    const map = new Map();
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("transactions")
        .select("apartment_id, exclu_use_ar")
        .eq("deal_type", "매매")
        .not("exclu_use_ar", "is", null)
        .range(from, from + pageSize - 1);

      if (error) throw new Error(`평형 데이터 조회 실패: ${error.message}`);
      if (!data?.length) break;

      for (const row of data) {
        const cat = getSqmCategory(row.exclu_use_ar);
        if (!map.has(row.apartment_id)) map.set(row.apartment_id, new Set());
        map.get(row.apartment_id).add(cat);
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }

    areaCategoriesCache = map;
    return areaCategoriesCache;
  }

  async function loadDistrictBasic(supabase, sigunguCode) {
    const { data, error } = await supabase
      .from("apartments")
      .select("id, name, dong, jibun, build_year, latitude, longitude, sigungu_code")
      .eq("sigungu_code", sigunguCode)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("dong")
      .order("name");

    if (error) throw new Error(`단지 데이터 조회 실패: ${error.message}`);

    return (data || []).map((apt) => ({
      ...apt,
      sigungu_code: apt.sigungu_code || sigunguCode,
      avgPrice1Y: null,
      tradeCount1Y: 0,
      areaCategories: [],
    }));
  }

  async function enrichApartmentsWithStats(supabase, apartments) {
    const [{ avgMap, countMap }, areaMap] = await Promise.all([
      fetchTradeStats1Y(supabase),
      fetchAreaCategories(supabase),
    ]);

    return apartments.map((apt) => ({
      ...apt,
      avgPrice1Y: avgMap.get(apt.id) ?? null,
      tradeCount1Y: countMap.get(apt.id) ?? 0,
      areaCategories: [...(areaMap.get(apt.id) || [])],
    }));
  }

  async function loadApartmentsWithPrices(supabase, sigunguCode) {
    const basic = await loadDistrictBasic(supabase, sigunguCode);
    return enrichApartmentsWithStats(supabase, basic);
  }

  async function loadDistrict(supabase, sigunguCode) {
    return loadApartmentsWithPrices(supabase, sigunguCode);
  }

  async function loadSearchIndex(supabase) {
    const rows = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("apartments")
        .select("id, name, sigungu_code, dong")
        .not("latitude", "is", null)
        .order("sigungu_code")
        .order("name")
        .range(from, from + pageSize - 1);

      if (error) throw new Error(`검색 인덱스 조회 실패: ${error.message}`);
      if (!data?.length) break;
      rows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      sigungu_code: row.sigungu_code,
      dong: row.dong,
    }));
  }

  async function loadAllDistrictApartments(supabase, sigunguCodes, batchSize = 5) {
    const byCode = {};
    for (let i = 0; i < sigunguCodes.length; i += batchSize) {
      const batch = sigunguCodes.slice(i, i + batchSize);
      const entries = await Promise.all(
        batch.map(async (code) => {
          const list = await loadApartmentsWithPrices(supabase, code);
          return [code, list];
        })
      );
      for (const [code, list] of entries) {
        byCode[code] = list;
      }
    }
    const all = sigunguCodes.flatMap((code) => byCode[code] || []);
    return { byCode, all };
  }

  function getCategoryStats(apartments) {
    const stats = { low: 0, mid: 0, high: 0, none: 0 };
    const Marker = global.RealEstateMapMarker;
    if (!Marker) return stats;

    for (const apt of apartments) {
      const cat = Marker.getPriceCategory(apt.avgPrice1Y).label;
      stats[cat] = (stats[cat] || 0) + 1;
    }
    return stats;
  }

  global.RealEstateMapData = {
    loadApartmentsWithPrices,
    loadDistrictBasic,
    enrichApartmentsWithStats,
    loadDistrict,
    loadSearchIndex,
    loadAllDistrictApartments,
    getCategoryStats,
  };
})(window);
