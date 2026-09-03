/* ==========================================================================
   app.js — controller: shared state, view routing, events, import / export
   ========================================================================== */
(function () {
  "use strict";

  var D = TVET.Data, U = TVET.UI, $ = TVET.UI.$;
  var Store = TVET.Store;

  var PAGES = {
    exec: {
      title: "Executive dashboard",
      sub: "Programme position rolled up from every school record submitted.",
      sections: [
        ["sec-position", "Programme position"],
        ["sec-objectives", "Objectives"],
        ["sec-flags", "Flags and risks"],
        ["sec-provinces", "Provinces"],
        ["sec-schools", "School-by-school"],
        ["sec-budget", "Budget"],
        ["sec-partners", "Partners"],
        ["sec-portfolio", "Portfolio"]
      ]
    },
    school: {
      title: "School records",
      sub: "Add, edit and maintain the record for each of the 11 target schools.",
      sections: []
    }  };

  /* ---------------- shared state ---------------- */
  var app = {
    schools: [],
    view: "exec",

    commit: function () {
      Store.save(app.schools).then(function (ok) {
        $("saveStamp").textContent = ok
          ? Store.label() + " · " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
          : "Session only — export to keep";
      });
      TVET.School.render();
      TVET.Executive.render();
    }
  };

  window.TVET.App = app;

  /* ---------------- routing ---------------- */
  function setView(view) {
    app.view = view;
    $("viewExec").hidden = view !== "exec";
    $("viewSchool").hidden = view !== "school";
    $("pageTitle").textContent = PAGES[view].title;
    $("pageSub").textContent = PAGES[view].sub;
    $("btnAddTop").hidden = view !== "school";

    Array.prototype.forEach.call(document.querySelectorAll(".navlink"), function (b) {
      var on = b.dataset.view === view;
      b.classList.toggle("is-active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });

    renderSectionNav(view);
    closeSidebar();
    window.scrollTo(0, 0);
  }

  function renderSectionNav(view) {
    var host = $("sectionNav");
    var sections = PAGES[view].sections;
    if (!sections.length) { host.innerHTML = ""; return; }
    host.innerHTML = '<p class="sidebar__label">On this page</p>' +
      sections.map(function (s) {
        return '<button type="button" class="seclink" data-jump="' + s[0] + '">' +
               U.esc(s[1]) + '</button>';
      }).join("");
  }

  /* ---------------- sidebar (mobile) ---------------- */
  function openSidebar() {
    $("sidebar").classList.add("is-open");
    $("scrim").hidden = false;
    $("btnMenu").setAttribute("aria-expanded", "true");
  }
  function closeSidebar() {
    $("sidebar").classList.remove("is-open");
    $("scrim").hidden = true;
    $("btnMenu").setAttribute("aria-expanded", "false");
  }

  /* ---------------- import / export ---------------- */
  function exportJson() {
    var payload = {
      project: "Digital skills for quality TVET in Rwanda",
      reportingMonth: D.PROJECT.reportingMonth,
      exportedAt: new Date().toISOString(),
      schools: app.schools
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "tvet-school-records.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    U.toast("Exported " + app.schools.length + " records");
  }

  function importJson(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        var list = Array.isArray(parsed) ? parsed : parsed.schools;
        if (!Array.isArray(list)) throw new Error("unrecognised shape");
        app.schools = list.map(function (r) {
          return Object.assign(D.blank(), r, { id: r.id || D.uid() });
        });
        app.commit();
        U.toast("Imported " + app.schools.length + " records");
      } catch (e) {
        U.toast("That file could not be read as a school export.");
      }
    };
    reader.onerror = function () { U.toast("The file could not be opened."); };
    reader.readAsText(file);
  }

  /* ---------------- events ---------------- */
  document.addEventListener("click", function (e) {
    var nav = e.target.closest(".navlink");
    if (nav) { setView(nav.dataset.view); return; }

    var jump = e.target.closest("[data-jump]");
    if (jump) {
      var target = $(jump.dataset.jump);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      closeSidebar();
      return;
    }

    var act = e.target.closest("[data-act]");
    if (!act) return;

    switch (act.dataset.act) {
      case "add": TVET.School.openForm(null); break;
      case "edit": TVET.School.openForm(act.dataset.id); break;
      case "delete": TVET.School.remove(act.dataset.id); break;
      case "delete-current": TVET.School.remove(TVET.School.currentId()); break;
      case "save": TVET.School.save(); break;
      case "cancel": TVET.School.closeForm(); break;
      case "clear-filters": TVET.School.clearFilters(); break;
      case "go-school": setView("school"); break;
      case "seed":
        app.schools = D.seed();
        app.commit();
        U.toast("Loaded 11 placeholder sites");
        break;
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (TVET.School.isOpen()) TVET.School.closeForm();
      else closeSidebar();
    }
  });

  $("btnAddTop").addEventListener("click", function () { TVET.School.openForm(null); });
  $("btnPrint").addEventListener("click", function () { window.print(); });
  $("btnExport").addEventListener("click", exportJson);
  $("btnImport").addEventListener("click", function () { $("fileInput").click(); });
  $("fileInput").addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) importJson(e.target.files[0]);
    e.target.value = "";
  });
  $("btnMenu").addEventListener("click", function () {
    if ($("sidebar").classList.contains("is-open")) closeSidebar();
    else openSidebar();
  });
  $("scrim").addEventListener("click", closeSidebar);

  $("search").addEventListener("input", function (e) {
    TVET.School.setFilter("search", e.target.value);
  });
  $("filterProvince").addEventListener("change", function (e) {
    TVET.School.setFilter("province", e.target.value);
  });
  $("filterStatus").addEventListener("change", function (e) {
    TVET.School.setFilter("status", e.target.value);
  });

  /* ---------------- boot ---------------- */
  (async function boot() {
    TVET.School.init(app);
    TVET.Executive.init(app);

    var saved = await Store.load();
    app.schools = (saved && saved.length) ? saved : D.seed();

    $("saveStamp").textContent = Store.label();
    TVET.School.render();
    TVET.Executive.render();

    var gate = document.getElementById("entryGate");
    if (gate) {
      var choices = gate.querySelectorAll("[data-gate-view]");
      Array.prototype.forEach.call(choices, function (btn) {
        btn.addEventListener("click", function () {
          gate.hidden = true;
          setView(btn.dataset.gateView);
        });
      });
    } else {
      setView("exec");
    }
  })();
})();


