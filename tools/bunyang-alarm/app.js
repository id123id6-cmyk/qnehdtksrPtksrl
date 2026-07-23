(function () {
  "use strict";

  var DATA_URL = "./data.json";
  var IMAGE_FILES = [
    "./images/apt-1.jpg",
    "./images/apt-2.jpg",
    "./images/apt-3.jpg",
    "./images/apt-4.jpg",
    "./images/apt-5.jpg",
  ];

  var allItems = [];
  var regionSelect = document.getElementById("filter-region");
  var statusSelect = document.getElementById("filter-status");
  var grid = document.getElementById("card-grid");
  var emptyState = document.getElementById("empty-state");
  var metaEl = document.getElementById("data-meta");
  var banner = document.getElementById("status-banner");
  var modal = document.getElementById("bunyang-modal");
  var modalBody = document.getElementById("bunyang-modal-body");
  var lastFocus = null;

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

  function formatPhone(value) {
    var s = String(value || "").replace(/\D/g, "");
    if (!s) return "";
    if (s.length === 8) return s.slice(0, 4) + "-" + s.slice(4);
    if (s.length === 9) return s.slice(0, 2) + "-" + s.slice(2, 5) + "-" + s.slice(5);
    if (s.length === 10) {
      if (s.indexOf("02") === 0) {
        return s.slice(0, 2) + "-" + s.slice(2, 6) + "-" + s.slice(6);
      }
      return s.slice(0, 3) + "-" + s.slice(3, 6) + "-" + s.slice(6);
    }
    if (s.length === 11) {
      return s.slice(0, 3) + "-" + s.slice(3, 7) + "-" + s.slice(7);
    }
    return String(value);
  }

  function ymdToDate(ymd) {
    if (!ymd || ymd.length !== 8) return null;
    var y = Number(ymd.slice(0, 4));
    var m = Number(ymd.slice(4, 6)) - 1;
    var d = Number(ymd.slice(6, 8));
    var dt = new Date(y, m, d);
    if (isNaN(dt.getTime())) return null;
    return dt;
  }

  function daysBetween(aYmd, bYmd) {
    var a = ymdToDate(aYmd);
    var b = ymdToDate(bYmd);
    if (!a || !b) return null;
    var ms = b.getTime() - a.getTime();
    return Math.round(ms / 86400000);
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

  function getDdayBadge(item, status) {
    if (status.key === "closed") {
      return { text: "마감", show: true };
    }
    if (status.key === "open") {
      return { text: "접수중", show: true };
    }
    var today = todayYmd();
    var start = normalizeDate(item.RCEPT_BGNDE);
    var diff = daysBetween(today, start);
    if (diff == null) return { text: "", show: false };
    if (diff === 0) return { text: "D-Day", show: true };
    if (diff > 0) return { text: "D-" + diff, show: true };
    return { text: "접수중", show: true };
  }

  function hashString(str) {
    var h = 0;
    var s = String(str || "");
    for (var i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function pickImage(item, index) {
    var region = (item.SUBSCRPT_AREA_CODE_NM || "").trim();
    var name = item.HOUSE_NM || String(index);
    var seed = hashString(region + "|" + name);
    return IMAGE_FILES[seed % IMAGE_FILES.length];
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function householdsText(item) {
    var households = item.TOT_SUPLY_HSHLDCO;
    if (households === "" || households == null) return "-";
    return Number(households).toLocaleString("ko-KR") + "세대";
  }

  function locationText(item) {
    var region = item.SUBSCRPT_AREA_CODE_NM || "지역미상";
    var addr = item.HSSPLY_ADRES || "";
    var zip = item.HSSPLY_ZIP ? " (" + item.HSSPLY_ZIP + ")" : "";
    return addr ? region + " · " + addr + zip : region + zip;
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

  function detailRow(label, valueHtml) {
    if (!valueHtml || valueHtml === "-") return "";
    return (
      '<div class="bunyang-modal-row">' +
      "<dt>" +
      escapeHtml(label) +
      "</dt>" +
      "<dd>" +
      valueHtml +
      "</dd>" +
      "</div>"
    );
  }

  function buildModalHtml(item, index) {
    var status = getStatus(item);
    var dday = getDdayBadge(item, status);
    var img = pickImage(item, index);
    var url = item.PBLANC_URL || "https://www.applyhome.co.kr/";
    var phone = formatPhone(item.MDHS_TELNO);
    var homepage = (item.HMPG_ADRES || "").trim();
    if (homepage && !/^https?:\/\//i.test(homepage)) {
      homepage = "https://" + homepage;
    }

    var typeBits = [];
    if (item.HOUSE_DTL_SECD_NM) typeBits.push(item.HOUSE_DTL_SECD_NM);
    if (item.HOUSE_SECD_NM) typeBits.push(item.HOUSE_SECD_NM);
    if (item.RENT_SECD_NM) typeBits.push(item.RENT_SECD_NM);

    var contract =
      item.CNTRCT_CNCLS_BGNDE || item.CNTRCT_CNCLS_ENDDE
        ? formatDate(item.CNTRCT_CNCLS_BGNDE) +
          " ~ " +
          formatDate(item.CNTRCT_CNCLS_ENDDE)
        : "";

    return (
      '<div class="bunyang-modal-media">' +
      '<img src="' +
      escapeHtml(img) +
      '" alt="" width="960" height="540">' +
      '<span class="bunyang-overlay-badge bunyang-overlay-badge--status bunyang-overlay-badge--' +
      status.key +
      '">' +
      escapeHtml(status.label) +
      "</span>" +
      (dday.show
        ? '<span class="bunyang-overlay-badge bunyang-overlay-badge--dday">' +
          escapeHtml(dday.text) +
          "</span>"
        : "") +
      "</div>" +
      '<div class="bunyang-modal-content">' +
      '<div class="bunyang-modal-badges">' +
      typeBits
        .map(function (t) {
          return (
            '<span class="bunyang-type-badge">' + escapeHtml(t) + "</span>"
          );
        })
        .join("") +
      "</div>" +
      '<h2 class="bunyang-modal-title" id="bunyang-modal-title">' +
      escapeHtml(item.HOUSE_NM || "단지명 미상") +
      "</h2>" +
      '<dl class="bunyang-modal-dl">' +
      detailRow("📍 지역/주소", escapeHtml(locationText(item))) +
      detailRow("🏢 공급세대", escapeHtml(householdsText(item))) +
      detailRow("🗓 모집공고일", escapeHtml(formatDate(item.RCRIT_PBLANC_DE))) +
      detailRow(
        "🗓 청약접수",
        escapeHtml(
          formatDate(item.RCEPT_BGNDE) + " ~ " + formatDate(item.RCEPT_ENDDE)
        )
      ) +
      detailRow(
        "🏆 당첨발표",
        escapeHtml(formatDate(item.PRZWNER_PRESNATN_DE))
      ) +
      detailRow(
        "🏠 입주예정",
        escapeHtml(formatYm(item.MVN_PREARNGE_YM))
      ) +
      (contract ? detailRow("📝 계약기간", escapeHtml(contract)) : "") +
      detailRow("🏗 시행", escapeHtml(item.BSNS_MBY_NM || "")) +
      detailRow("🧱 시공", escapeHtml(item.CNSTRCT_ENTRPS_NM || "")) +
      (phone
        ? detailRow(
            "☎️ 문의",
            '<a href="tel:' +
              escapeHtml(String(item.MDHS_TELNO).replace(/\D/g, "")) +
              '">' +
              escapeHtml(phone) +
              "</a>"
          )
        : "") +
      (homepage
        ? detailRow(
            "🌐 홈페이지",
            '<a href="' +
              escapeHtml(homepage) +
              '" target="_blank" rel="noopener noreferrer">' +
              escapeHtml(homepage.replace(/^https?:\/\//i, "")) +
              "</a>"
          )
        : "") +
      detailRow("📰 신문", escapeHtml(item.NSPRC_NM || "")) +
      "</dl>" +
      '<div class="bunyang-modal-actions">' +
      '<a class="bunyang-modal-link" href="' +
      escapeHtml(url) +
      '" target="_blank" rel="noopener noreferrer">청약홈에서 자세히 보기</a>' +
      "</div>" +
      "</div>"
    );
  }

  function openModal(item, index, triggerEl) {
    if (!modal || !modalBody) return;
    lastFocus = triggerEl || document.activeElement;
    modalBody.innerHTML = buildModalHtml(item, index);
    modal.hidden = false;
    document.body.classList.add("bunyang-modal-open");
    requestAnimationFrame(function () {
      modal.classList.add("is-open");
      var closeBtn = modal.querySelector(".bunyang-modal-close");
      if (closeBtn) closeBtn.focus();
    });
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("bunyang-modal-open");
    var panel = modal.querySelector(".bunyang-modal-panel");
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      modal.hidden = true;
      if (modalBody) modalBody.innerHTML = "";
      if (lastFocus && typeof lastFocus.focus === "function") {
        try {
          lastFocus.focus();
        } catch (e) {}
      }
    }
    if (panel) {
      panel.addEventListener("transitionend", finish, { once: true });
      setTimeout(finish, 280);
    } else {
      finish();
    }
  }

  function render(items) {
    grid.innerHTML = "";
    if (!items.length) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    var frag = document.createDocumentFragment();
    items.forEach(function (item, index) {
      var status = getStatus(item);
      var dday = getDdayBadge(item, status);
      var url = item.PBLANC_URL || "https://www.applyhome.co.kr/";
      var img = pickImage(item, index);

      var card = document.createElement("article");
      card.className = "bunyang-card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute(
        "aria-label",
        (item.HOUSE_NM || "단지") + " 상세 보기"
      );
      card.innerHTML =
        '<div class="bunyang-card-media">' +
        '<img src="' +
        escapeHtml(img) +
        '" alt="" loading="lazy" width="640" height="400">' +
        '<span class="bunyang-overlay-badge bunyang-overlay-badge--status bunyang-overlay-badge--' +
        status.key +
        '">' +
        escapeHtml(status.label) +
        "</span>" +
        (dday.show
          ? '<span class="bunyang-overlay-badge bunyang-overlay-badge--dday">' +
            escapeHtml(dday.text) +
            "</span>"
          : "") +
        "</div>" +
        '<div class="bunyang-card-body">' +
        (item.HOUSE_DTL_SECD_NM
          ? '<span class="bunyang-type-badge">' +
            escapeHtml(item.HOUSE_DTL_SECD_NM) +
            "</span>"
          : "") +
        '<h2 class="bunyang-card-title">' +
        escapeHtml(item.HOUSE_NM || "단지명 미상") +
        "</h2>" +
        '<p class="bunyang-card-addr">📍 ' +
        escapeHtml(locationText(item).replace(/\s*\(\d+\)$/, "")) +
        "</p>" +
        '<ul class="bunyang-info-list">' +
        '<li><span class="ico" aria-hidden="true">🏢</span><span>' +
        escapeHtml(householdsText(item)) +
        "</span></li>" +
        '<li><span class="ico" aria-hidden="true">🗓</span><span>접수 ' +
        formatDate(item.RCEPT_BGNDE) +
        " ~ " +
        formatDate(item.RCEPT_ENDDE) +
        "</span></li>" +
        '<li><span class="ico" aria-hidden="true">🏠</span><span>입주예정 ' +
        escapeHtml(formatYm(item.MVN_PREARNGE_YM)) +
        "</span></li>" +
        "</ul>" +
        '<p class="bunyang-card-hint">클릭하면 상세 정보를 볼 수 있어요</p>' +
        '<div class="bunyang-card-actions">' +
        '<a class="bunyang-card-link" href="' +
        escapeHtml(url) +
        '" target="_blank" rel="noopener noreferrer">청약홈에서 자세히 보기</a>' +
        "</div>" +
        "</div>";

      card.addEventListener("click", function (e) {
        if (e.target.closest("a")) return;
        openModal(item, index, card);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          if (e.target.closest("a")) return;
          e.preventDefault();
          openModal(item, index, card);
        }
      });
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
    var rank = { open: 0, upcoming: 1, unknown: 2, closed: 3 };
    filtered.sort(function (a, b) {
      var ra = rank[getStatus(a).key] ?? 9;
      var rb = rank[getStatus(b).key] ?? 9;
      if (ra !== rb) return ra - rb;
      return String(b.RCRIT_PBLANC_DE || "").localeCompare(
        String(a.RCRIT_PBLANC_DE || "")
      );
    });
    render(filtered);
  }

  function setMeta(data) {
    var updated = data.updatedAt ? new Date(data.updatedAt) : null;
    var updatedText =
      updated && !isNaN(updated) ? updated.toLocaleString("ko-KR") : "-";
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

  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target.closest("[data-modal-close]")) closeModal();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && !modal.hidden) {
      e.preventDefault();
      closeModal();
    }
  });

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
        showBanner(
          "아직 저장된 공고가 없습니다. GitHub Actions 갱신 후 다시 확인해 주세요."
        );
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
