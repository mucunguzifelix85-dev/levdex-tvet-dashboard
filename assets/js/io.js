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
    if (!schools || !schools.length) {
      alert("There is nothing to export yet.");
      return;
    }
    var esc = function (v) { return (v === null || v === undefined) ? "" : String(v); };
    var cols = [
      ["name", "School"], ["district", "District"], ["province", "Province"],
      ["status", "Status"], ["studentsEnrolled", "Students"],
      ["teachersTrained", "Trained"], ["teachersTotal", "Teachers"],
      ["computersInstalled", "Installed"], ["computersDelivered", "Delivered"],
      ["connectivity", "Network"], ["power", "Power"], ["reportingMonth", "Month"]
    ];
    var rowsHtml = schools.map(function (s) {
      return "<tr>" + cols.map(function (c) {
        return "<td>" + esc(s[c[0]]) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    var headHtml = "<tr>" + cols.map(function (c) {
      return "<th>" + c[1] + "</th>";
    }).join("") + "</tr>";

    var win = window.open("", "_blank");
    win.document.write(
      "<html><head><title>" + esc(title) + "</title><style>" +
      "body{font-family:Arial,sans-serif;padding:20px;}" +
      "h1{font-size:18px;margin-bottom:4px;}" +
      "p{font-size:11px;color:#555;margin-top:0;}" +
      "table{border-collapse:collapse;width:100%;font-size:10px;}" +
      "th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;}" +
      "th{background:#f0f0f0;}" +
      "@media print{@page{size:landscape;}}" +
      "</style></head><body>" +
      "<h1>" + esc(title || "TVET School Records") + "</h1>" +
      "<p>Generated " + new Date().toLocaleString() + "</p>" +
      "<table><thead>" + headHtml + "</thead><tbody>" + rowsHtml + "</tbody></table>" +
      "<script>window.onload = function(){ window.print(); };<\/script>" +
      "</body></html>"
    );
    win.document.close();
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


