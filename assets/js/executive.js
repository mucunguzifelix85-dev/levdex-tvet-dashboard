?/* ==========================================================================
   executive.js — the read-only side: everything computed from school records
   Nothing here is hardcoded except budget and portfolio, which schools
   do not report on.
   ========================================================================== */
window.TVET = window.TVET || {};

TVET.Executive = (function () {
  "use strict";

  var D = TVET.Data, U = TVET.UI, $ = TVET.UI.$;
  var app = null;
  var MAX_FLAGS = 8;

  function init(appRef) { app = appRef; }

  function renderEmpty() {
    var msg = '<div class="emptystate"><h3>Nothing to roll up yet</h3>' +
      '<p>This view fills in as schools submit records on the school dashboard.</p>' +
      '<button class="btn btn--primary" type="button" data-act="go-school">Open school records</button></div>';
    $("execKpis").innerHTML = "";
    $("execProgress").innerHTML = msg;
    $("execDonut").innerHTML = "";
    $("execFlags").innerHTML = "";
    $("execProvinceChart").innerHTML = "";
    $("execProvinceTable").innerHTML = "";
    $("execSchools").innerHTML = "";
  }

  function renderTimeline() {
    var p = D.PROJECT;
    var share = Math.round((p.elapsedMonths / p.months) * 100);
    $("elapsedFill").style.width = share + "%";
    $("elapsedText").textContent = p.elapsedMonths + " of " + p.months + " months · " + share + "% elapsed";
  }

  function renderKpis(t) {
    $("execKpis").innerHTML =
      U.kpi(t.schools + " / " + D.TARGET_SCHOOLS, "Schools reporting",
            Object.keys(t.provinces).length + " of 5 provinces covered",
            t.schools < D.TARGET_SCHOOLS) +
      U.kpi(U.fmt(t.enrolled), "Students reached",
            D.pct(t.female, t.enrolled) + "% female · " + U.fmt(t.inclusion) + " under inclusion criteria") +
      U.kpi(D.pct(t.tTrained, t.tTotal) + "%", "Teachers trained",
            U.fmt(t.tTrained) + " of " + U.fmt(t.tTotal) + " in post · " + U.fmt(t.tCert) + " certified") +
      U.kpi(D.pct(t.installed, t.delivered) + "%", "Equipment installed",
            U.fmt(t.installed) + " of " + U.fmt(t.delivered) + " computers · " + U.fmt(t.labs) + " labs");
  }

  function renderProgress(t) {
    $("execProgress").innerHTML = '<h3 class="card__title">Objectives</h3><div class="proglist">' +
      U.progress("1 · ICT infrastructure", "Computers installed against delivered",
                 D.pct(t.installed, t.delivered),
                 U.fmt(t.installed) + " of " + U.fmt(t.delivered)) +
      U.progress("2 · Teacher capacity", "Teachers trained in blended learning",
                 D.pct(t.tTrained, t.tTotal),
                 U.fmt(t.tTrained) + " of " + U.fmt(t.tTotal)) +
      U.progress("3 · Data systems", "Schools using the Quality Monitoring Dashboard",
                 D.pct(t.monitoring, t.schools),
                 t.monitoring + " of " + t.schools + " schools") +
      U.progress("Student reach", "Students active on the TVET Skills Portal",
                 D.pct(t.portal, t.enrolled),
                 U.fmt(t.portal) + " of " + U.fmt(t.enrolled), true) +
      '</div>';
  }

  function renderDonut(t) {
    $("execDonut").innerHTML = U.donut([
      { label: "On track", value: t.onTrack, color: U.STATUS_COLOR["on-track"] },
      { label: "Watch", value: t.watch, color: U.STATUS_COLOR["watch"] },
      { label: "At risk", value: t.atRisk, color: U.STATUS_COLOR["at-risk"] }
    ], String(t.schools), "schools");
  }

  function renderFlags() {
    var all = D.flags(app.schools);
    var host = $("execFlags");

    if (!all.length) {
      host.innerHTML = '<h3 class="card__title">Open flags</h3>' +
        '<p class="allclear">No flags raised. Every reporting school is within thresholds.</p>';
      return;
    }

    var high = all.filter(function (f) { return f.sev === "high"; }).length;
    var shown = all.slice(0, MAX_FLAGS);

    host.innerHTML =
      '<h3 class="card__title">Open flags · ' + all.length + ' (' + high + ' high)</h3>' +
      '<ul class="flaglist">' + shown.map(function (f) {
        return '<li class="sev-' + f.sev + '"><b>' + U.esc(f.subject) + '</b> — <span>' +
               U.esc(f.why) + '</span></li>';
      }).join("") + '</ul>' +
      (all.length > MAX_FLAGS
        ? '<p class="flaglist__more">' + (all.length - MAX_FLAGS) +
          ' further flags — see the school-by-school table below.</p>'
        : "");
  }

  function renderProvinces() {
    var rows = D.provinceRollup(app.schools);

    $("execProvinceChart").innerHTML =
      '<h3 class="card__title">Schools per province</h3>' +
      U.hbars(rows.map(function (r) {
        return { label: r.province.replace(" Province", ""), value: r.count };
      }), Math.max.apply(null, rows.map(function (r) { return r.count; }).concat([1])));

    var html = '<table class="table" style="min-width:520px"><thead><tr>' +
      '<th>Province</th><th class="right">Schools</th><th class="right">Students</th>' +
      '<th class="right">Trained</th><th class="right">Installed</th>' +
      '</tr></thead><tbody>';

    rows.forEach(function (r) {
      html += '<tr>' +
        '<td>' + U.esc(r.province) + '</td>' +
        '<td class="right num">' + r.count + '</td>' +
        '<td class="right num">' + (r.count ? U.fmt(r.enrolled) : "—") + '</td>' +
        '<td class="right num">' + (r.tTotal ? D.pct(r.tTrained, r.tTotal) + "%" : "—") + '</td>' +
        '<td class="right num">' + (r.delivered ? D.pct(r.installed, r.delivered) + "%" : "—") + '</td>' +
        '</tr>';
    });

    $("execProvinceTable").innerHTML = html + '</tbody></table>';
  }

  function renderSchools() {
    var ranked = app.schools.slice().sort(function (a, b) {
      return D.delivery(b) - D.delivery(a);
    });

    var scopeSel = document.getElementById("execDownloadScope");
    if (scopeSel) {
      var prevVal = scopeSel.value;
      scopeSel.innerHTML = '<option value="">All schools</option>' +
        ranked.map(function (s) {
          return '<option value="' + s.id + '">' + U.esc(s.name || "Untitled school") + '</option>';
        }).join("");
      if (prevVal && ranked.some(function (s) { return s.id === prevVal; })) {
        scopeSel.value = prevVal;
      }
    }

    var html = '<table class="table"><thead><tr>' +
      '<th>School</th><th>Province</th><th class="right">Students</th>' +
      '<th class="right">Trained</th><th class="right">Installed</th>' +
      '<th>Infrastructure</th><th class="right">Delivery score</th><th>Status</th>' +
      '</tr></thead><tbody>';

    ranked.forEach(function (s) {
      var score = D.delivery(s);
      html += '<tr>' +
        '<td><div class="rowtitle">' + U.esc(s.name || "Untitled school") + '</div>' +
          '<div class="rowsub">' + U.esc(s.district || "District not set") + '</div></td>' +
        '<td class="muted">' + U.esc(s.province) + '</td>' +
        '<td class="right num">' + U.fmt(s.studentsEnrolled) + '</td>' +
        '<td class="right num">' + D.pct(D.n(s.teachersTrained), D.n(s.teachersTotal)) + '%</td>' +
        '<td class="right num">' + D.pct(D.n(s.computersInstalled), D.n(s.computersDelivered)) + '%</td>' +
        '<td class="muted nowrap">' + U.esc(s.connectivity) + ' network · ' + U.esc(s.power) + ' power</td>' +
        '<td class="right"><span class="num">' + score + '%</span>' + U.miniBar(score) + '</td>' +
        '<td>' + U.statusTag(s.status) + '</td>' +
        '</tr>';
    });

    $("execSchools").innerHTML = html + '</tbody></table>';
  }

  function render() {
    renderTimeline();
    if (!app.schools.length) { renderEmpty(); return; }
    var t = D.totals(app.schools);
    renderKpis(t);
    renderProgress(t);
    renderDonut(t);
    renderFlags();
    renderProvinces();
    renderSchools();
  }

  return { init: init, render: render };
})();

/* ---------------- download all ---------------- */
document.addEventListener("DOMContentLoaded", function () {
  var downloadBtn = document.getElementById("btnExecDownload");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      TVET.IO.downloadAllCSV(TVET.App.schools);
    });
  }
  var downloadPdfBtn = document.getElementById("btnExecDownloadPDF");
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", function () {
      TVET.IO.downloadAllPDF(TVET.App.schools, "Executive Report");
    });
  }

  function scopedSchools() {
    var sel = document.getElementById("execDownloadScope");
    var id = sel ? sel.value : "";
    if (!id) return TVET.App.schools;
    return TVET.App.schools.filter(function (s) { return s.id === id; });
  }
  function scopedTitle() {
    var sel = document.getElementById("execDownloadScope");
    var id = sel ? sel.value : "";
    if (!id) return "Executive Report - All Schools";
    var opt = sel.options[sel.selectedIndex];
    return opt ? opt.textContent : "School Report";
  }

  var scopeCsvBtn = document.getElementById("btnExecSchoolDownloadCSV");
  if (scopeCsvBtn) {
    scopeCsvBtn.addEventListener("click", function () {
      TVET.IO.downloadAllCSV(scopedSchools());
    });
  }
  var scopePdfBtn = document.getElementById("btnExecSchoolDownloadPDF");
  if (scopePdfBtn) {
    scopePdfBtn.addEventListener("click", function () {
      TVET.IO.downloadAllPDF(scopedSchools(), scopedTitle());
    });
  }
});
