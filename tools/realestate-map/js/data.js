/**
 * 단지 데이터 + 최근 1년 평균 거래가 로드
 */
(function (global) {
  "use strict";

  let tradeStatsCache = null;
  let areaCategoriesCache = null;

  function getSqmCategory(sqm) {
    const Pyeong = global.RealEstateMapPyeong;
    if (Pyeong?.sqmToCategory) return Pyeong.sqmToCategory(sqm);
    return "other";
  }

  function accumulateAreaMeta(map, apartmentId, exclSqm) {
    if (!map.has(apartmentId)) {
      map.set(apartmentId, { bands: new Set(), pyeongCounts: new Map() });
    }
    const entry = map.get(apartmentId);
    const resolved = global.RealEstateMapPyeong?.resolve(exclSqm);
    if (!resolved?.pyeong) return;
    if (resolved.band) entry.bands.add(resolved.band);
    const key = String(resolved.pyeong);
    entry.pyeongCounts.set(key, (entry.pyeongCounts.get(key) || 0) + 1);
  }

  async function fetchTradeStatsForApartments(supabase, apartmentIds) {
    if (!apartmentIds.length) {
      return { avgMap: new Map(), countMap: new Map() };
    }

    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const sums = new Map();
    const idChunkSize = 150;

    for (let i = 0; i < apartmentIds.length; i += idChunkSize) {
      const idChunk = apartmentIds.slice(i, i + idChunkSize);
      let from = 0;
      const pageSize = 2000;

      while (true) {
        const { data, error } = await supabase
          .from("transactions")
          .select("apartment_id, deal_amount")
          .eq("deal_type", "매매")
          .gte("deal_date", cutoffStr)
          .in("apartment_id", idChunk)
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
    }

    const avgMap = new Map();
    const countMap = new Map();
    for (const [id, { sum, count }] of sums) {
      avgMap.set(id, Math.round(sum / count));
      countMap.set(id, count);
    }

    return { avgMap, countMap };
  }

  async function fetchRentCountsForApartments(supabase, apartmentIds) {
    const jeonseMap = new Map();
    const wolseMap = new Map();
    if (!apartmentIds.length) return { jeonseMap, wolseMap };

    const idChunkSize = 150;
    for (let i = 0; i < apartmentIds.length; i += idChunkSize) {
      const idChunk = apartmentIds.slice(i, i + idChunkSize);
      let from = 0;
      const pageSize = 2000;

      while (true) {
        const { data, error } = await supabase
          .from("transactions")
          .select("apartment_id, deal_type")
          .in("apartment_id", idChunk)
          .in("deal_type", ["전세", "월세"])
          .range(from, from + pageSize - 1);

        if (error) throw new Error(`전월세 통계 조회 실패: ${error.message}`);
        if (!data?.length) break;

        for (const row of data) {
          if (row.deal_type === "전세") {
            jeonseMap.set(row.apartment_id, (jeonseMap.get(row.apartment_id) || 0) + 1);
          } else if (row.deal_type === "월세") {
            wolseMap.set(row.apartment_id, (wolseMap.get(row.apartment_id) || 0) + 1);
          }
        }

        if (data.length < pageSize) break;
        from += pageSize;
      }
    }

    return { jeonseMap, wolseMap };
  }

  async function fetchAreaCategoriesForApartments(supabase, apartmentIds) {
    if (!apartmentIds.length) return new Map();

    const map = new Map();
    const idChunkSize = 150;

    for (let i = 0; i < apartmentIds.length; i += idChunkSize) {
      const idChunk = apartmentIds.slice(i, i + idChunkSize);
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("transactions")
          .select("apartment_id, exclu_use_ar")
          .eq("deal_type", "매매")
          .not("exclu_use_ar", "is", null)
          .in("apartment_id", idChunk)
          .range(from, from + pageSize - 1);

        if (error) throw new Error(`평형 데이터 조회 실패: ${error.message}`);
        if (!data?.length) break;

        for (const row of data) {
          accumulateAreaMeta(map, row.apartment_id, row.exclu_use_ar);
        }

        if (data.length < pageSize) break;
        from += pageSize;
      }
    }

    return map;
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
        accumulateAreaMeta(map, row.apartment_id, row.exclu_use_ar);
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
      jeonseCount: 0,
      wolseCount: 0,
      areaCategories: [],
    }));
  }

  async function enrichApartmentsWithStats(supabase, apartments) {
    const ids = apartments.map((apt) => apt.id);
    const [{ avgMap, countMap }, areaMap] = await Promise.all([
      fetchTradeStatsForApartments(supabase, ids),
      fetchAreaCategoriesForApartments(supabase, ids),
    ]);

    return apartments.map((apt) => ({
      ...apt,
      avgPrice1Y: avgMap.get(apt.id) ?? null,
      tradeCount1Y: countMap.get(apt.id) ?? 0,
      areaCategories: [...(areaMap.get(apt.id)?.bands || [])],
      dominantPyeong: (() => {
        const meta = areaMap.get(apt.id);
        if (!meta?.pyeongCounts?.size) return null;
        let best = null;
        let n = 0;
        for (const [p, c] of meta.pyeongCounts) {
          if (c > n) {
            n = c;
            best = Number(p);
          }
        }
        return best;
      })(),
    }));
  }

  let statsPrefetchPromise = null;

  function prefetchDistrictStats(supabase) {
    if (!statsPrefetchPromise) {
      statsPrefetchPromise = Promise.all([
        fetchTradeStats1Y(supabase),
        fetchAreaCategories(supabase),
      ]);
    }
    return statsPrefetchPromise;
  }

  async function loadDistrictForMap(supabase, sigunguCode) {
    const basic = await loadDistrictBasic(supabase, sigunguCode);
    const ids = basic.map((apt) => apt.id);
    const [{ avgMap, countMap }, { jeonseMap, wolseMap }] = await Promise.all([
      fetchTradeStatsForApartments(supabase, ids),
      fetchRentCountsForApartments(supabase, ids),
    ]);

    return basic.map((apt) => ({
      ...apt,
      avgPrice1Y: avgMap.get(apt.id) ?? null,
      tradeCount1Y: countMap.get(apt.id) ?? 0,
      jeonseCount: jeonseMap.get(apt.id) ?? 0,
      wolseCount: wolseMap.get(apt.id) ?? 0,
      areaCategories: [],
    }));
  }

  async function attachAreaCategories(supabase, apartments) {
    const ids = apartments.map((apt) => apt.id);
    const areaMap = await fetchAreaCategoriesForApartments(supabase, ids);
    for (const apt of apartments) {
      const meta = areaMap.get(apt.id);
      apt.areaCategories = meta ? [...meta.bands] : [];
      let best = null;
      let n = 0;
      if (meta?.pyeongCounts) {
        for (const [p, c] of meta.pyeongCounts) {
          if (c > n) {
            n = c;
            best = Number(p);
          }
        }
      }
      apt.dominantPyeong = best;
    }
    return apartments;
  }

  async function attachRentCounts(supabase, apartments) {
    const ids = apartments.map((apt) => apt.id);
    const { jeonseMap, wolseMap } = await fetchRentCountsForApartments(supabase, ids);
    for (const apt of apartments) {
      apt.jeonseCount = jeonseMap.get(apt.id) ?? 0;
      apt.wolseCount = wolseMap.get(apt.id) ?? 0;
    }
    return apartments;
  }

  async function loadDistrictFull(supabase, sigunguCode) {
    const list = await loadDistrictForMap(supabase, sigunguCode);
    await attachAreaCategories(supabase, list);
    return list;
  }

  async function loadApartmentsWithPrices(supabase, sigunguCode) {
    return loadDistrictFull(supabase, sigunguCode);
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
    loadDistrictForMap,
    loadDistrictFull,
    attachAreaCategories,
    attachRentCounts,
    prefetchDistrictStats,
    enrichApartmentsWithStats,
    loadDistrict,
    loadSearchIndex,
    loadAllDistrictApartments,
    getCategoryStats,
  };
})(window);
