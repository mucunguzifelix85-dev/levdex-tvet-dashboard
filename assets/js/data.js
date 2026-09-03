/* ==========================================================================
   data.js — model, seed records, validation, derived metrics
   ========================================================================== */
window.TVET = window.TVET || {};

TVET.Data = (function () {
  "use strict";

  var PROVINCES = ["Kigali City", "Northern Province", "Southern Province",
                   "Eastern Province", "Western Province"];
  var TARGET_SCHOOLS = 11;

  /* project window: May 2024 – Jan 2028, reporting month August 2026 */
  var PROJECT = {
    start: "2024-05", end: "2028-01", months: 44,
    reportingMonth: "2026-08", elapsedMonths: 28
  };

  function uid() { return "s_" + Math.random().toString(36).slice(2, 9); }

  function blank() {
    return {
      id: uid(),
      name: "", district: "", province: "Kigali City",
      focal: "", email: "", reportingMonth: PROJECT.reportingMonth,
      computersDelivered: 0, computersInstalled: 0, labs: 0,
      connectivity: "intermittent", power: "intermittent",
      teachersTotal: 0, teachersTrained: 0, teachersCertified: 0,
      studentsEnrolled: 0, studentsFemale: 0, studentsInclusion: 0, portalActive: 0,
      dataSubmitted: "", monitoringAdopted: "no",
      status: "on-track", notes: ""
    };
  }

  /* Placeholder sites so the executive view has something to roll up.
     Replace with real school records — names are deliberately generic. */
  var SEED = [
    ["Site 01 placeholder","Gasabo","Kigali City",180,168,4,"stable","reliable",42,34,29,980,486,31,940,"2026-08-21","yes","on-track"],
    ["Site 02 placeholder","Musanze","Northern Province",160,140,3,"intermittent","intermittent",38,27,21,845,401,24,610,"2026-08-18","yes","watch"],
    ["Site 03 placeholder","Huye","Southern Province",150,150,3,"stable","reliable",35,31,28,790,398,19,735,"2026-08-20","yes","on-track"],
    ["Site 04 placeholder","Rwamagana","Eastern Province",150,96,2,"intermittent","unreliable",33,18,11,720,332,15,380,"2026-07-29","no","at-risk"],
    ["Site 05 placeholder","Rubavu","Western Province",160,151,3,"stable","intermittent",40,30,24,880,455,27,690,"2026-08-19","yes","on-track"],
    ["Site 06 placeholder","Kicukiro","Kigali City",170,162,4,"stable","reliable",44,38,33,1010,512,35,905,"2026-08-22","yes","on-track"],
    ["Site 07 placeholder","Burera","Northern Province",140,88,2,"none","unreliable",30,12,6,655,298,12,210,"2026-06-30","no","at-risk"],
    ["Site 08 placeholder","Nyamagabe","Southern Province",150,131,3,"intermittent","intermittent",34,24,17,760,366,21,505,"2026-08-15","no","watch"],
    ["Site 09 placeholder","Kayonza","Eastern Province",150,142,3,"stable","reliable",36,29,25,805,392,18,700,"2026-08-20","yes","on-track"],
    ["Site 10 placeholder","Karongi","Western Province",140,118,2,"intermittent","intermittent",31,21,15,690,341,16,430,"2026-08-12","yes","watch"],
    ["Site 11 placeholder","Nyarugenge","Kigali City",170,158,4,"stable","reliable",41,35,30,955,478,29,880,"2026-08-21","yes","on-track"]
  ];

  function seed() {
    return SEED.map(function (r) {
      var s = blank();
      s.name = r[0]; s.district = r[1]; s.province = r[2];
      s.computersDelivered = r[3]; s.computersInstalled = r[4]; s.labs = r[5];
      s.connectivity = r[6]; s.power = r[7];
      s.teachersTotal = r[8]; s.teachersTrained = r[9]; s.teachersCertified = r[10];
      s.studentsEnrolled = r[11]; s.studentsFemale = r[12]; s.studentsInclusion = r[13];
      s.portalActive = r[14]; s.dataSubmitted = r[15]; s.monitoringAdopted = r[16];
      s.status = r[17];
      s.focal = "To be assigned";
      return s;
    });
  }

  /* ---------- numbers ---------- */
  function n(v) { var x = Number(v); return isFinite(x) && x > 0 ? x : 0; }
  function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

  /* Delivery score: equal weight on installation, training and student reach. */
  function delivery(s) {
    var install = pct(n(s.computersInstalled), n(s.computersDelivered));
    var trained = pct(n(s.teachersTrained), n(s.teachersTotal));
    var reach = pct(n(s.portalActive), n(s.studentsEnrolled));
    return Math.round((install + trained + reach) / 3);
  }

  function monthsSince(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return 0;
    var ref = new Date(2026, 7, 31); // end of the August 2026 reporting month
    return (ref.getFullYear() - d.getFullYear()) * 12 + (ref.getMonth() - d.getMonth());
  }

  /* ---------- validation ---------- */
  function validate(d) {
    var problems = [];
    if (!d.name) problems.push("Enter the school name.");
    if (d.email && d.email.indexOf("@") === -1) problems.push("The contact email is not a valid address.");
    if (d.computersInstalled > d.computersDelivered)
      problems.push("Computers installed cannot exceed computers delivered.");
    if (d.teachersTrained > d.teachersTotal)
      problems.push("Teachers trained cannot exceed teachers in post.");
    if (d.teachersCertified > d.teachersTrained)
      problems.push("Teachers certified cannot exceed teachers trained.");
    if (d.studentsFemale > d.studentsEnrolled)
      problems.push("Female students cannot exceed total enrolment.");
    if (d.studentsInclusion > d.studentsEnrolled)
      problems.push("Students under inclusion criteria cannot exceed total enrolment.");
    if (d.portalActive > d.studentsEnrolled)
      problems.push("Portal-active students cannot exceed total enrolment.");
    return problems;
  }

  /* ---------- aggregation ---------- */
  function totals(schools) {
    var t = {
      schools: schools.length, delivered: 0, installed: 0, labs: 0,
      tTotal: 0, tTrained: 0, tCert: 0,
      enrolled: 0, female: 0, inclusion: 0, portal: 0,
      stableConn: 0, reliablePower: 0, monitoring: 0,
      onTrack: 0, watch: 0, atRisk: 0, provinces: {}
    };
    schools.forEach(function (s) {
      t.delivered += n(s.computersDelivered);
      t.installed += n(s.computersInstalled);
      t.labs += n(s.labs);
      t.tTotal += n(s.teachersTotal);
      t.tTrained += n(s.teachersTrained);
      t.tCert += n(s.teachersCertified);
      t.enrolled += n(s.studentsEnrolled);
      t.female += n(s.studentsFemale);
      t.inclusion += n(s.studentsInclusion);
      t.portal += n(s.portalActive);
      if (s.connectivity === "stable") t.stableConn++;
      if (s.power === "reliable") t.reliablePower++;
      if (s.monitoringAdopted === "yes") t.monitoring++;
      if (s.status === "on-track") t.onTrack++;
      else if (s.status === "watch") t.watch++;
      else t.atRisk++;
      t.provinces[s.province] = (t.provinces[s.province] || 0) + 1;
    });
    return t;
  }

  function provinceRollup(schools) {
    return PROVINCES.map(function (p) {
      var group = schools.filter(function (s) { return s.province === p; });
      var g = group.reduce(function (a, s) {
        a.enrolled += n(s.studentsEnrolled);
        a.tTotal += n(s.teachersTotal);
        a.tTrained += n(s.teachersTrained);
        a.delivered += n(s.computersDelivered);
        a.installed += n(s.computersInstalled);
        return a;
      }, { enrolled: 0, tTotal: 0, tTrained: 0, delivered: 0, installed: 0 });
      g.province = p;
      g.count = group.length;
      return g;
    });
  }

  /* Flags are derived, never stored — they recompute whenever a record changes. */
  function flags(schools) {
    var out = [];
    if (schools.length < TARGET_SCHOOLS) {
      out.push({ sev: "high", subject: "Programme coverage",
        why: (TARGET_SCHOOLS - schools.length) + " of the 11 target schools have no record on file." });
    }
    schools.forEach(function (s) {
      var name = s.name || "Untitled school";
      if (s.power === "unreliable" || s.connectivity === "none") {
        out.push({ sev: "high", subject: name,
          why: "Power is " + s.power + " and connectivity is " + s.connectivity +
               " — installed equipment is at risk of going unused." });
      }
      if (n(s.teachersTotal) && pct(n(s.teachersTrained), n(s.teachersTotal)) < 50) {
        out.push({ sev: "med", subject: name,
          why: "Only " + pct(n(s.teachersTrained), n(s.teachersTotal)) +
               "% of teachers are trained in blended learning." });
      }
      if (n(s.computersDelivered) && pct(n(s.computersInstalled), n(s.computersDelivered)) < 75) {
        out.push({ sev: "med", subject: name,
          why: (n(s.computersDelivered) - n(s.computersInstalled)) +
               " delivered computers are still not installed." });
      }
      if (!s.dataSubmitted) {
        out.push({ sev: "med", subject: name, why: "No data submission recorded." });
      } else if (monthsSince(s.dataSubmitted) >= 1) {
        out.push({ sev: "high", subject: name,
          why: "Last data submission was " + s.dataSubmitted + " — reporting has lapsed." });
      }
      if (s.monitoringAdopted === "no") {
        out.push({ sev: "med", subject: name,
          why: "The Quality Monitoring Dashboard is not yet in use at this school." });
      }
    });
    return out;
  }

  return {
    PROVINCES: PROVINCES,
    TARGET_SCHOOLS: TARGET_SCHOOLS,
    PROJECT: PROJECT,
    uid: uid, blank: blank, seed: seed,
    n: n, pct: pct, delivery: delivery, monthsSince: monthsSince,
    validate: validate, totals: totals, provinceRollup: provinceRollup, flags: flags
  };
})();
