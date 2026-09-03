/* ==========================================================================
   ui.js — shared helpers: escaping, formatting, toast, chart builders
   Charts are hand-built SVG/CSS so the app has no third-party dependencies.
   ========================================================================== */
window.TVET = window.TVET || {};

TVET.UI = (function () {
  "use strict";

  var STATUS_LABEL = { "on-track": "On track", "watch": "Watch", "at-risk": "At risk" };
  var STATUS_CLASS = { "on-track": "tag--ok", "watch": "tag--watch", "at-risk": "tag--risk" };
  var STATUS_COLOR = { "on-track": "#17795E", "watch": "#9C6100", "at-risk": "#B33F26" };

  function $(id) { return document.getElementById(id); }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmt(v) { return Number(v || 0).toLocaleString("en-US"); }

  function statusTag(status) {
    return '<span class="tag ' + (STATUS_CLASS[status] || "tag--watch") + '"><i></i>' +
           (STATUS_LABEL[status] || status) + '</span>';
  }

  function kpi(value, key, detail, alert) {
    return '<div class="kpi' + (alert ? " kpi--alert" : "") + '">' +
      '<div class="kpi__v num">' + esc(value) + '</div>' +
      '<div class="kpi__k">' + esc(key) + '</div>' +
      '<div class="kpi__d">' + esc(detail) + '</div></div>';
  }

  function progress(title, sub, value, detail, alt) {
    var v = Math.max(0, Math.min(100, value));
    return '<div class="prog"><h3>' + esc(title) + '</h3>' +
      '<div class="prog__meta"><span>' + esc(sub) + '</span>' +
      '<span class="num">' + v + '% · ' + esc(detail) + '</span></div>' +
      '<div class="track' + (alt ? " track--alt" : "") + '"><span style="width:' + v + '%"></span></div></div>';
  }

  function miniBar(value) {
    var v = Math.max(0, Math.min(100, value));
    return '<div class="track track--mini"><span style="width:' + v + '%"></span></div>';
  }

  /* ---------- donut ---------- */
  function donut(segments, centreValue, centreLabel) {
    var size = 158, r = 62, cx = size / 2, cy = size / 2, stroke = 22;
    var circ = 2 * Math.PI * r;
    var total = segments.reduce(function (a, s) { return a + s.value; }, 0);
    var offset = 0;
    var arcs = "";

    if (total === 0) {
      arcs = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" ' +
             'stroke="#EDEAE3" stroke-width="' + stroke + '"/>';
    } else {
      segments.forEach(function (s) {
        if (s.value <= 0) return;
        var len = (s.value / total) * circ;
        arcs += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" ' +
          'stroke="' + s.color + '" stroke-width="' + stroke + '" ' +
          'stroke-dasharray="' + len.toFixed(2) + ' ' + (circ - len).toFixed(2) + '" ' +
          'stroke-dashoffset="' + (-offset).toFixed(2) + '"/>';
        offset += len;
      });
    }

    var svg = '<svg class="donut" viewBox="0 0 ' + size + ' ' + size + '" role="img" ' +
      'aria-label="' + esc(centreLabel) + ': ' + esc(centreValue) + '">' +
      '<g transform="rotate(-90 ' + cx + ' ' + cy + ')">' + arcs + '</g>' +
      '<text class="donut__hole" x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle" ' +
        'font-size="30" fill="#14202E">' + esc(centreValue) + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 22) + '" text-anchor="middle" font-size="11" ' +
        'fill="#6E7B88" font-family="Inter, sans-serif">' + esc(centreLabel) + '</text>' +
      '</svg>';

    var legend = '<div class="legend">' + segments.map(function (s) {
      return '<div><i style="background:' + s.color + '"></i>' + esc(s.label) +
             '<b>' + s.value + '</b></div>';
    }).join("") + '</div>';

    return svg + legend;
  }

  /* ---------- horizontal bars ---------- */
  function hbars(rows, maxValue, suffix) {
    var max = maxValue || Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    return '<div class="hbars">' + rows.map(function (r) {
      var w = max > 0 ? Math.round((r.value / max) * 100) : 0;
      var empty = r.value === 0;
      return '<div class="hbar__row">' +
        '<span>' + esc(r.label) + '</span>' +
        '<div class="hbar__track"><div class="hbar__fill' + (empty ? " hbar__fill--empty" : "") +
          '" style="width:' + (empty ? 100 : w) + '%"></div></div>' +
        '<span class="hbar__val">' + r.value + (suffix || "") + '</span>' +
        '</div>';
    }).join("") + '</div>';
  }

  /* ---------- toast ---------- */
  var toastTimer = null;
  function toast(message) {
    var el = $("toast");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2800);
  }

  return {
    $: $, esc: esc, fmt: fmt,
    STATUS_LABEL: STATUS_LABEL, STATUS_COLOR: STATUS_COLOR,
    statusTag: statusTag, kpi: kpi, progress: progress, miniBar: miniBar,
    donut: donut, hbars: hbars, toast: toast
  };
})();
