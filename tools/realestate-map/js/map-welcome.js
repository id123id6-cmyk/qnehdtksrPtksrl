/**
 * 지도 도움말 팝업 — "다시 보지 않기"만 localStorage 사용
 */
(function (global) {
  "use strict";

  const DISMISS_KEY = "seungbak_map_help_dismissed";

  function isDontShowAgain() {
    try {
      return localStorage.getItem(DISMISS_KEY) === "true";
    } catch {
      return false;
    }
  }

  function setDontShowAgain(value) {
    try {
      if (value) {
        localStorage.setItem(DISMISS_KEY, "true");
      } else {
        localStorage.removeItem(DISMISS_KEY);
      }
    } catch {
      /* private browsing 등 */
    }
  }

  /** 페이지 진입 시 자동 표시 여부 (다시 보지 않기 체크 시에만 숨김) */
  function shouldAutoShowOnLoad() {
    return !isDontShowAgain();
  }

  global.RealEstateMapWelcome = {
    DISMISS_KEY,
    isDontShowAgain,
    setDontShowAgain,
    shouldAutoShowOnLoad,
    /** 도움말 버튼 등 수동 열기 — 항상 허용 */
    shouldShowWelcome: () => true,
  };
})(window);
