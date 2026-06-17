/**
 * 도구 캐러셀 — 마우스 드래그로 가로 스크롤 (클릭은 유지)
 */
(function () {
  "use strict";

  var DRAG_THRESHOLD = 10;

  document.querySelectorAll(".tools-scroll").forEach(function (el) {
    var isDown = false;
    var startX = 0;
    var scrollStart = 0;
    var hasDragged = false;

    el.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      isDown = true;
      hasDragged = false;
      startX = e.pageX;
      scrollStart = el.scrollLeft;
      el.classList.add("is-dragging");
    });

    function endDrag() {
      if (!isDown) return;
      isDown = false;
      el.classList.remove("is-dragging");
    }

    window.addEventListener("mouseup", endDrag);
    el.addEventListener("mouseleave", endDrag);

    el.addEventListener("mousemove", function (e) {
      if (!isDown) return;
      var delta = e.pageX - startX;
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      hasDragged = true;
      e.preventDefault();
      el.scrollLeft = scrollStart - delta;
    });

    el.querySelectorAll("a.tool-card").forEach(function (link) {
      link.addEventListener("click", function (e) {
        if (hasDragged) {
          e.preventDefault();
          hasDragged = false;
        }
      });
    });

    el.addEventListener("dragstart", function (e) {
      e.preventDefault();
    });
  });
})();
