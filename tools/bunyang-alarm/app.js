(function () {
  "use strict";

  var DATA_URL = "./data.json";
  var allItems = [];
  var regionSelect = document.getElementById("filter-region");
  var statusSelect = document.getElementById("filter-status");
  var grid = document.getElementById("card-grid");
  var emptyState = document.getElementById("empty-state");
  var metaEl = document.getElementById("data-meta");
  var banner = document.getElementById("status-banner");

  function todayYmd() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + m + day;
  }

  function normalizeDate(value) {
    if (!value) return "";
    var s = String(value).trim().replace(/[.\-/]/g, "");
    if (/^\d{8}$/.test(s)) return s;
    return "";
  }

  function formatDate(value) {
    var s = normalizeDate(value);
    if (!s) return "-";
    return s.slice(0, 4) + "." + s.slice(4, 6) + "." + s.slice(6, 8);
  }

  function formatYm(value) {
    var s = String(value || "").replace(/\D/g, "");
    if (s.length >= 6) return s.slice(0, 4) + "." + s.slice(4, 6);
    return value || "-";
  }

  function getStatus(item) {
    var today = todayYmd();
    var start = normalizeDate(item.RCEPT_BGNDE);
    var end = normalizeDate(item.RCEPT_ENDDE);
    if (!start || !end) return { key: "unknown", label: "일정미정" };
    if (today < start) return { key: "upcoming", label: "청약예정" };
    if (today > end) return { key: "closed", label: "마감" };
    return { key: "open", label: "접수중" };
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function populateRegions(items) {
    var set = {};
    items.forEach(function (it) {
      var name = (it.SUBSCRPT_AREA_CODE_NM || "").trim();
      if (name) set[name] = true;
    });
    var regions = Object.keys(set).sort();
    regionSelect.innerHTML = '<option value="">전체 지역</option>';
    regions.forEach(function (r) {
      var opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      regionSelect.appendChild(opt);
    });
  }

  function render(items) {
    grid.innerHTML = "";
    if (!items.length) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    var frag = document.createDocumentFragment();
    items.forEach(function (item) {
      var status = getStatus(item);
      var url = item.PBLANC_URL || "https://www.applyhome.co.kr/";
      var households = item.TOT_SUPLY_HSHLDCO;
      var householdsText =
        households === "" || households == null
          ? "-"
          : Number(households).toLocaleString("ko-KR") + "세대";

      var card = document.createElement("article");
      card.className = "bunyang-card";
      card.innerHTML =
        '<div class="bunyang-card-top">' +
        '<span class="bunyang-badge bunyang-badge--region">' +
        escapeHtml(item.SUBSCRPT_AREA_CODE_NM || "지역미상") +
        "</span>" +
        (item.HOUSE_DTL_SECD_NM
          ? '<span class="bunyang-badge bunyang-badge--type">' +
            escapeHtml(item.HOUSE_DTL_SECD_NM) +
            "</span>"
          : "") +
        '<span class="bunyang-badge bunyang-badge--' +
        status.key +
        '">' +
        status.label +
        "</span>" +
        "</div>" +
        '<h2 class="bunyang-card-title">' +
        escapeHtml(item.HOUSE_NM || "단지명 미상") +
        "</h2>" +
        '<p class="bunyang-card-addr">' +
        escapeHtml(item.HSSPLY_ADRES || "") +
        "</p>" +
        '<dl class="bunyang-dl">' +
        "<dt>접수기간</dt><dd>" +
        formatDate(item.RCEPT_BGNDE) +
        " ~ " +
        formatDate(item.RCEPT_ENDDE) +
        "</dd>" +
        "<dt>총 세대수</dt><dd>" +
        escapeHtml(householdsText) +
        "</dd>" +
        "<dt>입주예정</dt><dd>" +
        escapeHtml(formatYm(item.MVN_PREARNGE_YM)) +
        "</dd>" +
        "<dt>모집공고</dt><dd>" +
        formatDate(item.RCRIT_PBLANC_DE) +
        "</dd>" +
        "<dt>당첨발표</dt><dd>" +
        formatDate(item.PRZWNER_PRESNATN_DE) +
        "</dd>" +
        "</dl>" +
        '<div class="bunyang-card-actions">' +
        '<a class="bunyang-card-link" href="' +
        escapeHtml(url) +
        '" target="_blank" rel="noopener noreferrer">청약홈에서 자세히 보기</a>' +
        "</div>";
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  function applyFilters() {
    var region = regionSelect.value;
    var status = statusSelect.value;
    var filtered = allItems.filter(function (item) {
      if (region && (item.SUBSCRPT_AREA_CODE_NM || "") !== region) return false;
      if (status) {
        var st = getStatus(item).key;
        if (st !== status) return false;
      }
      return true;
    });
    render(filtered);
  }

  function setMeta(data) {
    var updated = data.updatedAt ? new Date(data.updatedAt) : null;
    var updatedText = updated && !isNaN(updated)
      ? updated.toLocaleString("ko-KR")
      : "-";
    metaEl.textContent =
      "공고 " +
      (data.count || (data.items && data.items.length) || 0) +
      "건 · 데이터 갱신 " +
      updatedText;
  }

  function showBanner(msg) {
    banner.hidden = false;
    banner.textContent = msg;
  }

  regionSelect.addEventListener("change", applyFilters);
  statusSelect.addEventListener("change", applyFilters);

  fetch(DATA_URL, { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("data.json HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      allItems = Array.isArray(data.items) ? data.items : [];
      populateRegions(allItems);
      setMeta(data);
      if (!allItems.length) {
        showBanner("아직 저장된 공고가 없습니다. GitHub Actions 갱신 후 다시 확인해 주세요.");
      }
      applyFilters();
    })
    .catch(function () {
      metaEl.textContent = "데이터를 불러오지 못했습니다";
      showBanner("data.json을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      emptyState.hidden = false;
      render([]);
    });
})();
