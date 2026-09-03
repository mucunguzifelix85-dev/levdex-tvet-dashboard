/* ==========================================================================
   school.js â€” the data-entry side: list, filters, create / edit / delete
   ========================================================================== */
window.TVET = window.TVET || {};

TVET.School = (function () {
  "use strict";

  var D = TVET.Data, U = TVET.UI, $ = TVET.UI.$;
  var app = null;               // injected on init
  var filters = { search: "", province: "", status: "" };
  var editingId = null;

  /* ---------------- list ---------------- */
  function visible() {
    var q = filters.search.trim().toLowerCase();
    return app.schools.filter(function (s) {
      if (filters.province && s.province !== filters.province) return false;
      if (filters.status && s.status !== filters.status) return false;
      if (q && (s.name + " " + s.district).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function renderKpis() {
    var t = D.totals(app.schools);
    $("schoolKpis").innerHTML =
      U.kpi(t.schools + " / " + D.TARGET_SCHOOLS, "Records on file",
            Object.keys(t.provinces).length + " of 5 provinces represented",
            t.schools < D.TARGET_SCHOOLS) +
      U.kpi(t.onTrack, "On track", "schools reporting no blockers") +
      U.kpi(t.watch, "Watch", "schools needing attention this cycle") +
      U.kpi(t.atRisk, "At risk", "schools requiring escalation", t.atRisk > 0);
  }

  function renderList() {
    var host = $("listHost");
    var rows = visible();

    if (!app.schools.length) {
      host.innerHTML =
        '<div class="emptystate"><h3>No school records yet</h3>' +
        '<p>Add the first school, or load 11 placeholder sites to see how the executive dashboard behaves with data in it.</p>' +
        '<button class="btn btn--primary" type="button" data-act="add">Add school record</button>' +
        '<button class="btn" type="button" data-act="seed">Load placeholder data</button></div>';
      return;
    }

    if (!rows.length) {
      host.innerHTML =
        '<div class="emptystate"><h3>Nothing matches those filters</h3>' +
        '<p>Clear the search and filters to see all ' + app.schools.length + ' records.</p>' +
        '<button class="btn" type="button" data-act="clear-filters">Clear filters</button></div>';
      return;
    }

    var html = '<table class="table"><thead><tr>' +
      '<th>School</th><th>Province</th>' +
      '<th class="right">Computers installed</th><th class="right">Teachers trained</th>' +
      '<th class="right">Students</th><th class="right">Last report</th>' +
      '<th>Status</th><th class="right">Actions</th>' +
      '</tr></thead><tbody>';

    rows.forEach(function (s) {
      var inst = D.pct(D.n(s.computersInstalled), D.n(s.computersDelivered));
      var trained = D.pct(D.n(s.teachersTrained), D.n(s.teachersTotal));
      var lapsed = s.dataSubmitted && D.monthsSince(s.dataSubmitted) >= 1;

      html += '<tr>' +
        '<td><div class="rowtitle">' + U.esc(s.name || "Untitled school") + '</div>' +
          '<div class="rowsub">' + U.esc(s.district || "District not set") + '</div></td>' +
        '<td class="muted">' + U.esc(s.province) + '</td>' +
        '<td class="right"><span class="num">' + U.fmt(s.computersInstalled) + ' / ' +
          U.fmt(s.computersDelivered) + '</span>' + U.miniBar(inst) + '</td>' +
        '<td class="right"><span class="num">' + U.fmt(s.teachersTrained) + ' / ' +
          U.fmt(s.teachersTotal) + '</span>' + U.miniBar(trained) + '</td>' +
        '<td class="right num">' + U.fmt(s.studentsEnrolled) + '</td>' +
        '<td class="right ' + (lapsed ? "" : "muted") + '">' +
          (s.dataSubmitted ? U.esc(s.dataSubmitted) : "Not reported") + '</td>' +
        '<td>' + U.statusTag(s.status) + '</td>' +
        '<td><div class="rowactions">' +
          '<button class="btn btn--sm" type="button" data-act="edit" data-id="' + s.id + '">Edit</button>' +
          '<button class="btn btn--sm btn--danger" type="button" data-act="delete" data-id="' + s.id + '">Delete</button>' +
        '</div></td></tr>';
    });

    html += '</tbody></table>' +
      '<p class="tablefoot">Showing ' + rows.length + ' of ' + app.schools.length +
      ' records Â· target is ' + D.TARGET_SCHOOLS + ' schools.</p>';

    host.innerHTML = html;
  }

  function render() { renderKpis(); renderList(); }

  /* ---------------- form ---------------- */
  function options(list, current) {
    return list.map(function (o) {
      var value = typeof o === "string" ? o : o[0];
      var label = typeof o === "string" ? o : o[1];
      return '<option value="' + U.esc(value) + '"' +
             (value === current ? " selected" : "") + '>' + U.esc(label) + '</option>';
    }).join("");
  }

  function textField(id, label, value, type, extra) {
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      '<input id="' + id + '" type="' + (type || "text") + '" value="' + U.esc(value) + '" ' +
      (extra || "") + '></div>';
  }

  function selectField(id, label, list, current) {
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      '<select id="' + id + '">' + options(list, current) + '</select></div>';
  }

  function openForm(id) {
    editingId = id || null;
    var s = editingId
      ? app.schools.filter(function (x) { return x.id === editingId; })[0]
      : D.blank();
    if (!s) return;

    $("modalTitle").textContent = editingId ? "Edit school record" : "New school record";
    $("btnSave").textContent = editingId ? "Save changes" : "Add school";
    $("btnDeleteCurrent").hidden = !editingId;

    $("modalBody").innerHTML =
      '<fieldset><legend>School identity</legend><div class="fields">' +
        textField("f_name", "School name", s.name, "text", 'required') +
        textField("f_district", "District", s.district) +
        selectField("f_province", "Province", D.PROVINCES, s.province) +
        textField("f_focal", "Focal point", s.focal) +
        textField("f_email", "Contact email", s.email, "email") +
        textField("f_month", "Reporting month", s.reportingMonth, "month") +
      '</div></fieldset>' +

      '<fieldset><legend>Objective 1 Â· ICT infrastructure</legend><div class="fields">' +
        textField("f_delivered", "Computers delivered", s.computersDelivered, "number", 'min="0"') +
        textField("f_installed", "Computers installed", s.computersInstalled, "number", 'min="0"') +
        textField("f_labs", "Equipped computer labs", s.labs, "number", 'min="0"') +
        selectField("f_conn", "Internet connectivity",
          [["stable","Stable"],["intermittent","Intermittent"],["none","None"]], s.connectivity) +
        selectField("f_power", "Power reliability",
          [["reliable","Reliable"],["intermittent","Intermittent"],["unreliable","Unreliable"]], s.power) +
      '</div></fieldset>' +

      '<fieldset><legend>Objective 2 Â· Teacher capacity</legend><div class="fields">' +
        textField("f_tTotal", "TVET teachers in post", s.teachersTotal, "number", 'min="0"') +
        textField("f_tTrained", "Teachers trained in blended learning", s.teachersTrained, "number", 'min="0"') +
        textField("f_tCert", "Teachers certified", s.teachersCertified, "number", 'min="0"') +
      '</div></fieldset>' +

      '<fieldset><legend>Students, inclusion and reach</legend><div class="fields">' +
        textField("f_enrolled", "Students enrolled", s.studentsEnrolled, "number", 'min="0"') +
        textField("f_female", "Female students", s.studentsFemale, "number", 'min="0"') +
        textField("f_incl", "Students under inclusion criteria", s.studentsInclusion, "number", 'min="0"') +
        textField("f_portal", "Students active on the TVET Skills Portal", s.portalActive, "number", 'min="0"') +
      '</div></fieldset>' +

      '<fieldset><legend>Objective 3 Â· Data reporting</legend><div class="fields">' +
        textField("f_submitted", "Last data submission", s.dataSubmitted, "date") +
        selectField("f_monitor", "Quality Monitoring Dashboard in use",
          [["yes","Yes"],["no","No"]], s.monitoringAdopted) +
        selectField("f_status", "Overall status",
          [["on-track","On track"],["watch","Watch"],["at-risk","At risk"]], s.status) +
        '<div class="field field--wide"><label for="f_notes">Notes for the reporting month</label>' +
          '<textarea id="f_notes">' + U.esc(s.notes) + '</textarea></div>' +
      '</div></fieldset>' +
      '<div id="formError" hidden></div>';

    $("modal").hidden = false;
    document.body.style.overflow = "hidden";
    var first = $("f_name");
    if (first) first.focus();
  }

  function closeForm() {
    $("modal").hidden = true;
    document.body.style.overflow = "";
    editingId = null;
  }

  function readForm() {
    return {
      name: $("f_name").value.trim(),
      district: $("f_district").value.trim(),
      province: $("f_province").value,
      focal: $("f_focal").value.trim(),
      email: $("f_email").value.trim(),
      reportingMonth: $("f_month").value,
      computersDelivered: D.n($("f_delivered").value),
      computersInstalled: D.n($("f_installed").value),
      labs: D.n($("f_labs").value),
      connectivity: $("f_conn").value,
      power: $("f_power").value,
      teachersTotal: D.n($("f_tTotal").value),
      teachersTrained: D.n($("f_tTrained").value),
      teachersCertified: D.n($("f_tCert").value),
      studentsEnrolled: D.n($("f_enrolled").value),
      studentsFemale: D.n($("f_female").value),
      studentsInclusion: D.n($("f_incl").value),
      portalActive: D.n($("f_portal").value),
      dataSubmitted: $("f_submitted").value,
      monitoringAdopted: $("f_monitor").value,
      status: $("f_status").value,
      notes: $("f_notes").value.trim()
    };
  }

  function save() {
    var d = readForm();
    var problems = D.validate(d);
    var box = $("formError");

    if (problems.length) {
      box.hidden = false;
      box.className = "formerror";
      box.innerHTML = "<ul>" + problems.map(function (p) {
        return "<li>" + U.esc(p) + "</li>";
      }).join("") + "</ul>";
      box.scrollIntoView({ block: "nearest" });
      return;
    }

    if (editingId) {
      app.schools = app.schools.map(function (s) {
        return s.id === editingId ? Object.assign({}, s, d) : s;
      });
      U.toast("Saved " + d.name);
    } else {
      app.schools.push(Object.assign(D.blank(), d));
      U.toast("Added " + d.name);
    }

    closeForm();
    app.commit();
  }

  function remove(id) {
    var target = app.schools.filter(function (s) { return s.id === id; })[0];
    if (!target) return;
    if (!window.confirm("Delete the record for " + (target.name || "this school") +
        "? This cannot be undone.")) return;
    app.schools = app.schools.filter(function (s) { return s.id !== id; });
    if (editingId === id) closeForm();
    U.toast("Deleted " + (target.name || "record"));
    app.commit();
  }

  function setFilter(kind, value) {
    filters[kind] = value;
    renderList();
  }

  function clearFilters() {
    filters = { search: "", province: "", status: "" };
    $("search").value = "";
    $("filterProvince").value = "";
    $("filterStatus").value = "";
    renderList();
  }

  function init(appRef) { app = appRef; }

  return {
    init: init, render: render,
    openForm: openForm, closeForm: closeForm, save: save, remove: remove,
    setFilter: setFilter, clearFilters: clearFilters,
    isOpen: function () { return !$("modal").hidden; },
    currentId: function () { return editingId; }
  };
})();

/* ---------------- import / export / download ---------------- */
document.addEventListener("DOMContentLoaded", function () {
  var importBtn = document.getElementById("btnSchoolImport");
  var fileInput = document.getElementById("schoolImportFile");
  var exportBtn = document.getElementById("btnSchoolExport");
  var downloadBtn = document.getElementById("btnSchoolDownload");

  if (importBtn && fileInput) {
    importBtn.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      TVET.IO.importFile(fileInput, function (data) {
        var list = Array.isArray(data) ? data : (data && data.schools) || [];
        if (!list.length) { alert("No records found in that file."); return; }
        TVET.App.schools = list.map(function (r) {
          return Object.assign(TVET.Data.blank(), r, { id: r.id || TVET.Data.uid() });
        });
        TVET.App.commit();
      });
    });
  }
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      TVET.IO.downloadAllJSON(TVET.App.schools);
    });
  }
  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      TVET.IO.downloadAllCSV(TVET.App.schools);
    });
  }
  var downloadPdfBtn = document.getElementById("btnSchoolDownloadPDF");
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", function () {
      TVET.IO.downloadAllPDF(TVET.App.schools, "School Records");
    });
  }
});
