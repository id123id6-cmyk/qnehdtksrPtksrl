(function () {
  "use strict";

  var GRID_ID = "hr-blog-grid";
  var DATA_URL = "/blog/posts.json";
  var LIMIT = 6;

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cardHtml(post) {
    var href = post.href || "/blog/" + (post.slug || "");
    var img = post.image || "";
    var alt = post.alt || post.title || "";
    return (
      '<a href="' +
      escapeHtml(href) +
      '" class="hr-blog-card">' +
      '<div class="hr-blog-thumb">' +
      '<img src="' +
      escapeHtml(img) +
      '" alt="' +
      escapeHtml(alt) +
      '" loading="lazy">' +
      "</div>" +
      '<div class="hr-blog-body">' +
      '<span class="hr-blog-tag">' +
      escapeHtml(post.tag || "") +
      "</span>" +
      '<h3 class="hr-blog-title">' +
      escapeHtml(post.title || "") +
      "</h3>" +
      '<p class="hr-blog-excerpt">' +
      escapeHtml(post.excerpt || "") +
      "</p>" +
      '<time class="hr-blog-date" datetime="' +
      escapeHtml(post.date || "") +
      '">' +
      escapeHtml(post.date || "") +
      "</time>" +
      "</div>" +
      "</a>"
    );
  }

  function pickLatest(posts) {
    return (posts || [])
      .slice()
      .sort(function (a, b) {
        var d = String(b.date || "").localeCompare(String(a.date || ""));
        if (d !== 0) return d;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      })
      .slice(0, LIMIT);
  }

  var grid = document.getElementById(GRID_ID);
  if (!grid) return;

  fetch(DATA_URL, { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("posts.json " + res.status);
      return res.json();
    })
    .then(function (data) {
      var list = Array.isArray(data) ? data : data.posts;
      var latest = pickLatest(list);
      if (!latest.length) return;
      grid.innerHTML = latest.map(cardHtml).join("");
    })
    .catch(function () {
      // 하드코딩 fallback 유지
    });
})();
