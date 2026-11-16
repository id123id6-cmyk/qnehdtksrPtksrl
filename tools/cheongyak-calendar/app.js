(function () {
  "use strict";

  var DATA_URL = "/tools/bunyang-alarm/data.json";
  var allItems = [];
  var monthMode = "this";
  var regionMode = "all";

  var listEl = document.getElementById("calendar-list");
  var emptyEl = document.getElementById("calendar-empty");
  var countEl = document.getElementById("calendar-count");
  var metaEl = document.getElementById("data-meta");
  var monthTabs = document.getElementById("month-tabs");
  var regionTabs = document.getElementById("region-tabs");

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function todayLocal() {
    var d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }

  function ymdParts(value) {
    if (!value) return null;
    var s = String(value).trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
    var dig = s.replace(/\D/g, "");
    if (dig.length === 8) {
      return {
        y: Number(dig.slice(0, 4)),
        m: Number(dig.slice(4, 6)),
        d: Number(dig.slice(6, 8)),
      };
    }
    return null;
  }

  function displayDate(value) {
    var p = ymdParts(value);
    if (!p) return "—";
    return p.y + "-" + pad2(p.m) + "-" + pad2(p.d);
  }

  function displayText(value) {
    if (value === null || value === undefined) return "—";
    var s = String(value).trim();
    return s ? s : "—";
  }

  function displayCount(value) {
    if (value === null || value === undefined || value === "") return "—";
    var n = Number(value);
    if (!isFinite(n)) return "—";
    return n.toLocaleString("ko-KR");
  }

  function monthKeyFromParts(p) {
    return p.y + "-" + pad2(p.m);
  }

  function shiftMonth(y, m, delta) {
    var dt = new Date(y, m - 1 + delta, 1);
    return { y: dt.getFullYear(), m: dt.getMonth() + 1 };
  }

  function targetMonthKey(mode) {
    var t = todayLocal();
    var base = { y: t.y, m: t.m };
    if (mode === "next") base = shiftMonth(t.y, t.m, 1);
    if (mode === "prev") base = shiftMonth(t.y, t.m, -1);
    return monthKeyFromParts(base);
  }

  function labelForMonth(mode) {
    var key = targetMonthKey(mode);
    var parts = key.split("-");
    return parts[0] + "년 " + Number(parts[1]) + "월";
  }

  function regionMatch(item, mode) {
    if (mode === "all") return true;
    var area = String(item.SUBSCRPT_AREA_CODE_NM || "").trim();
    if (mode === "서울") return area === "서울";
    if (mode === "경기") return area === "경기";
    if (mode === "인천") return area === "인천";
    if (mode === "부산") return area === "부산";
    if (mode === "그외") {
      return area !== "서울" && area !== "경기" && area !== "인천" && area !== "부산";
    }
    return true;
  }

  function daysUntil(endValue) {
    var p = ymdParts(endValue);
    if (!p) return null;
    var end = new Date(p.y, p.m - 1, p.d);
    var t = todayLocal();
    var today = new Date(t.y, t.m - 1, t.d);
    return Math.round((end.getTime() - today.getTime()) / 86400000);
  }

  function ddayBadge(item) {
    var days = daysUntil(item.RCEPT_ENDDE);
    if (days === null) return { text: "—", urgent: false, show: false };
    if (days < 0) return { text: "마감", urgent: false, show: true };
    if (days === 0) return { text: "D-Day", urgent: true, show: true };
    var urgent = days <= 3;
    return { text: "D-" + days, urgent: urgent, show: true };
  }

  function formatUpdatedAt(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return (
      d.getFullYear() +
      "-" +
      pad2(d.getMonth() + 1) +
      "-" +
      pad2(d.getDate()) +
      " " +
      pad2(d.getHours()) +
      ":" +
      pad2(d.getMinutes())
    );
  }

  function filteredItems() {
    var key = targetMonthKey(monthMode);
    return allItems
      .filter(function (item) {
        var p = ymdParts(item.RCEPT_BGNDE);
        if (!p) return false;
        if (monthKeyFromParts(p) !== key) return false;
        return regionMatch(item, regionMode);
      })
      .sort(function (a, b) {
        var as = String(a.RCEPT_BGNDE || "");
        var bs = String(b.RCEPT_BGNDE || "");
        if (as !== bs) return as < bs ? -1 : 1;
        var ae = String(a.RCEPT_ENDDE || "");
        var be = String(b.RCEPT_ENDDE || "");
        if (ae !== be) return ae < be ? -1 : 1;
        return String(a.HOUSE_NM || "").localeCompare(String(b.HOUSE_NM || ""), "ko");
      });
  }

  function renderMeta(data) {
    if (!metaEl) return;
    metaEl.textContent =
      "자료: 한국부동산원 청약홈 · 갱신 " + formatUpdatedAt(data && data.updatedAt);
  }

  function renderMonthLabels() {
    if (!monthTabs) return;
    var map = {
      this: "이번 달 (" + labelForMonth("this") + ")",
      next: "다음 달 (" + labelForMonth("next") + ")",
      prev: "지난 달 (" + labelForMonth("prev") + ")",
    };
    monthTabs.querySelectorAll("[data-month]").forEach(function (btn) {
      var mode = btn.getAttribute("data-month");
      if (map[mode]) btn.textContent = map[mode];
    });
  }

  function setActive(groupEl, attr, value) {
    if (!groupEl) return;
    groupEl.querySelectorAll("[" + attr + "]").forEach(function (btn) {
      var on = btn.getAttribute(attr) === value;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function renderList() {
    var items = filteredItems();
    if (countEl) countEl.textContent = items.length + "건";
    if (!listEl) return;
    listEl.innerHTML = "";

    if (!items.length) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    items.forEach(function (item) {
      var row = document.createElement("button");
      row.type = "button";
      row.className = "cal-row";
      var url = String(item.PBLANC_URL || "").trim();
      if (url) {
        row.addEventListener("click", function () {
          window.open(url, "_blank", "noopener,noreferrer");
        });
      } else {
        row.disabled = true;
        row.classList.add("is-disabled");
      }

      var badge = ddayBadge(item);
      var badgeHtml = badge.show
        ? '<span class="cal-dday' +
          (badge.urgent ? " is-urgent" : "") +
          '">' +
          badge.text +
          "</span>"
        : "";

      row.innerHTML =
        '<div class="cal-row-main">' +
        '<div class="cal-row-dates">' +
        "<strong>" +
        displayDate(item.RCEPT_BGNDE) +
        "</strong>" +
        '<span class="cal-tilde">→</span>' +
        "<span>" +
        displayDate(item.RCEPT_ENDDE) +
        "</span>" +
        badgeHtml +
        "</div>" +
        '<p class="cal-row-title">' +
        displayText(item.HOUSE_NM) +
        "</p>" +
        '<p class="cal-row-meta">' +
        "<span>" +
        displayText(item.SUBSCRPT_AREA_CODE_NM) +
        "</span>" +
        "<span>" +
        displayText(item.HOUSE_DTL_SECD_NM) +
        "</span>" +
        "<span>공급 " +
        displayCount(item.TOT_SUPLY_HSHLDCO) +
        "세대</span>" +
        "</p>" +
        "</div>" +
        '<div class="cal-row-side">' +
        '<span class="cal-side-label">당첨발표</span>' +
        "<strong>" +
        displayDate(item.PRZWNER_PRESNATN_DE) +
        "</strong>" +
        (url ? '<span class="cal-side-link">청약홈 공고 →</span>' : "") +
        "</div>";

      listEl.appendChild(row);
    });
  }

  function bindTabs() {
    if (monthTabs) {
      monthTabs.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-month]");
        if (!btn) return;
        monthMode = btn.getAttribute("data-month") || "this";
        setActive(monthTabs, "data-month", monthMode);
        renderList();
      });
    }
    if (regionTabs) {
      regionTabs.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-region]");
        if (!btn) return;
        regionMode = btn.getAttribute("data-region") || "all";
        setActive(regionTabs, "data-region", regionMode);
        renderList();
      });
    }
  }

  function init() {
    renderMonthLabels();
    setActive(monthTabs, "data-month", monthMode);
    setActive(regionTabs, "data-region", regionMode);
    bindTabs();

    fetch(DATA_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("load failed");
        return res.json();
      })
      .then(function (data) {
        allItems = Array.isArray(data.items) ? data.items : [];
        renderMeta(data);
        renderList();
      })
      .catch(function () {
        allItems = [];
        if (metaEl) metaEl.textContent = "자료: 한국부동산원 청약홈 · 갱신 —";
        if (countEl) countEl.textContent = "0건";
        if (emptyEl) {
          emptyEl.hidden = false;
          emptyEl.textContent = "일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
