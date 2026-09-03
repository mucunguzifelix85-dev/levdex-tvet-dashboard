window.TVET = window.TVET || {};

TVET.IO = (function () {
  "use strict";

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime || "application/octet-stream" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function toCSV(rows) {
    if (!rows.length) return "";
    var headers = Object.keys(rows[0]);
    var esc = function (v) {
      v = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    var lines = [headers.join(",")];
    rows.forEach(function (r) {
      lines.push(headers.map(function (h) { return esc(r[h]); }).join(","));
    });
    return lines.join("\r\n");
  }

  /* -------- School: export single record as JSON -------- */
  function exportSchoolJSON(school) {
    download(
      (school.id || "school") + "-export.json",
      JSON.stringify(school, null, 2),
      "application/json"
    );
  }

  /* -------- School: download single record as CSV -------- */
  function downloadSchoolCSV(school) {
    download(
      (school.id || "school") + "-report.csv",
      toCSV([school]),
      "text/csv"
    );
  }

  /* -------- School: import a JSON/CSV file, return parsed object/array -------- */
  function importFile(fileInputEl, onLoaded) {
    var file = fileInputEl.files && fileInputEl.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var text = e.target.result;
      try {
        if (file.name.toLowerCase().endsWith(".json")) {
          onLoaded(JSON.parse(text));
        } else {
          // naive CSV -> array of objects
          var lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
          var headers = lines[0].split(",");
          var rows = lines.slice(1).map(function (line) {
            var cells = line.split(",");
            var obj = {};
            headers.forEach(function (h, i) { obj[h] = cells[i]; });
            return obj;
          });
          onLoaded(rows);
        }
      } catch (err) {
        alert("Could not read file: " + err.message);
      }
    };
    reader.readAsText(file);
    fileInputEl.value = ""; // allow re-selecting the same file later
  }

  /* -------- Executive: download all schools as CSV -------- */
  function downloadAllCSV(schools) {
    download("tvet-all-schools.csv", toCSV(schools), "text/csv");
  }

  /* -------- Executive: download all schools as JSON -------- */
  function downloadAllJSON(schools) {
    download("tvet-all-schools.json", JSON.stringify(schools, null, 2), "application/json");
  }

  function downloadAllPDF(schools, title) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("PDF library did not load. Check your internet connection and try again.");
      return;
    }
    if (!schools || !schools.length) {
      alert("There is nothing to export yet.");
      return;
    }
    var doc = new window.jspdf.jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(title || "TVET School Records", 14, 15);
    doc.setFontSize(9);
    doc.text("Generated " + new Date().toLocaleString(), 14, 21);

    var cols = ["name", "district", "province", "status", "studentsEnrolled",
                "teachersTrained", "teachersTotal", "computersInstalled",
                "computersDelivered", "connectivity", "power", "reportingMonth"];
    var head = [["School", "District", "Province", "Status", "Students",
                 "Trained", "Teachers", "Installed", "Delivered", "Network", "Power", "Month"]];
    var body = schools.map(function (s) {
      return cols.map(function (c) { return s[c] === undefined || s[c] === null ? "" : String(s[c]); });
    });

    doc.autoTable({ head: head, body: body, startY: 26, styles: { fontSize: 7 } });
    doc.save((title || "tvet-records").replace(/\s+/g, "-").toLowerCase() + ".pdf");
  }

  return {
    exportSchoolJSON: exportSchoolJSON,
    downloadSchoolCSV: downloadSchoolCSV,
    importFile: importFile,
    downloadAllCSV: downloadAllCSV,
    downloadAllJSON: downloadAllJSON,
    downloadAllPDF: downloadAllPDF
  };
})();

