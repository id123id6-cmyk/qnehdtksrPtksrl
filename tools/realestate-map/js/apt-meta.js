/**
 * 단지 부가 메타 (세대수 등) — DB 스키마 외 클라이언트 보강
 * 공공데이터·단지 공식 자료 기준 스냅샷 (선택적 매칭)
 */
(function (global) {
  "use strict";

  /** @type {Record<string, { household_count?: number }>} */
  const META_BY_NAME = {
    금호어울림: { household_count: 357 },
    은마: { household_count: 434 },
    "은마아파트": { household_count: 434 },
  };

  function enrichApartmentMeta(apt) {
    if (!apt?.name) return apt;
    if (apt.household_count != null) return apt;

    for (const [key, meta] of Object.entries(META_BY_NAME)) {
      if (apt.name.includes(key)) {
        return { ...apt, ...meta };
      }
    }
    return apt;
  }

  function enrichApartmentList(apartments) {
    if (!Array.isArray(apartments)) return apartments;
    return apartments.map(enrichApartmentMeta);
  }

  global.RealEstateMapAptMeta = {
    enrichApartmentMeta,
    enrichApartmentList,
  };
})(window);
