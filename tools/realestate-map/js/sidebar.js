/**
 * 모바일 사이드바 → 바텀시트 + 플로팅 검색
 */
(function (global) {
  "use strict";

  const MOBILE_MQ = "(max-width: 768px)";

  let panel = null;
  let backdrop = null;
  let handle = null;
  let closeBtn = null;
  let fab = null;
  let searchFloat = null;
  let onRelayout = () => {};
  let touchStartY = 0;

  function isMobile() {
    return window.matchMedia(MOBILE_MQ).matches;
  }

  function openBottomSheet() {
    if (!panel || !isMobile()) return;
    panel.classList.add("is-open");
    panel.classList.remove("is-collapsed");
    if (backdrop) {
      backdrop.hidden = false;
      requestAnimationFrame(() => backdrop.classList.add("is-visible"));
    }
    document.body.classList.add("bottom-sheet-open");
    onRelayout();
  }

  function closeBottomSheet() {
    if (!panel) return;
    panel.classList.remove("is-open");
    if (backdrop) {
      backdrop.classList.remove("is-visible");
      window.setTimeout(() => {
        if (!panel.classList.contains("is-open")) backdrop.hidden = true;
      }, 280);
    }
    document.body.classList.remove("bottom-sheet-open");
    closeSearchFloat();
    onRelayout();
  }

  function openSearchFloat() {
    if (!searchFloat || !isMobile()) return;
    searchFloat.hidden = false;
    document.body.classList.add("mobile-search-open");
    const input = document.getElementById("mobile-search-input");
    if (input) {
      requestAnimationFrame(() => input.focus());
    }
  }

  function closeSearchFloat() {
    if (!searchFloat) return;
    searchFloat.hidden = true;
    document.body.classList.remove("mobile-search-open");
    const input = document.getElementById("mobile-search-input");
    if (input) input.blur();
  }

  function toggleSearchFloat() {
    if (!searchFloat) return;
    if (searchFloat.hidden) openSearchFloat();
    else closeSearchFloat();
  }

  function bindTouchDismiss() {
    if (!handle || !panel) return;

    handle.addEventListener(
      "touchstart",
      (e) => {
        touchStartY = e.touches[0]?.clientY ?? 0;
      },
      { passive: true }
    );

    handle.addEventListener(
      "touchend",
      (e) => {
        const endY = e.changedTouches[0]?.clientY ?? 0;
        if (endY - touchStartY > 48) closeBottomSheet();
      },
      { passive: true }
    );
  }

  function init(options) {
    panel = document.getElementById("sidebar-panel");
    backdrop = document.getElementById("bottomSheetBackdrop");
    handle = document.getElementById("bottomSheetHandle");
    closeBtn = document.getElementById("bottomSheetClose");
    fab = document.getElementById("mobileSearchFab");
    searchFloat = document.getElementById("mobileSearchFloat");
    onRelayout = options?.onRelayout || (() => {});

    backdrop?.addEventListener("click", closeBottomSheet);
    closeBtn?.addEventListener("click", closeBottomSheet);
    handle?.addEventListener("click", closeBottomSheet);

    fab?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSearchFloat();
    });

    document.addEventListener("click", (e) => {
      if (!document.body.classList.contains("mobile-search-open")) return;
      if (
        searchFloat?.contains(e.target) ||
        fab?.contains(e.target)
      ) {
        return;
      }
      closeSearchFloat();
    });

    bindTouchDismiss();

    window.matchMedia(MOBILE_MQ).addEventListener("change", () => {
      if (!isMobile()) {
        closeBottomSheet();
        closeSearchFloat();
        panel?.classList.remove("is-open", "is-collapsed");
      }
      onRelayout();
    });
  }

  global.RealEstateMapSidebar = {
    init,
    isMobile,
    openBottomSheet,
    closeBottomSheet,
    openSearchFloat,
    closeSearchFloat,
    toggleSearchFloat,
  };
})(window);
