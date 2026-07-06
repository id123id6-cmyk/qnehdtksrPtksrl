/**
 * 시세통 스타일 통합 상단 툴바 — 메뉴·검색 단축키
 */
(function (global) {
  "use strict";

  function init(options = {}) {
    if (init._done) return;
    init._done = true;

    const menuBtn = document.getElementById("toolbar-menu-btn");
    const searchBtn = document.getElementById("toolbar-search-btn");

    menuBtn?.addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar-panel");
      if (window.RealEstateMapSidebar?.isMobile?.()) {
        window.RealEstateMapSidebar.openBottomSheet?.();
        return;
      }
      if (sidebar) {
        sidebar.classList.toggle("is-toolbar-open");
      }
      if (typeof options.onMenuClick === "function") options.onMenuClick();
    });

    searchBtn?.addEventListener("click", () => {
      if (window.RealEstateMapSidebar?.isMobile?.()) {
        window.RealEstateMapSidebar.openSearchFloat?.();
        return;
      }
      const input = document.getElementById("search-input");
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  global.RealEstateMapToolbar = { init };
})(window);
