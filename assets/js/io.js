window.TVET = window.TVET || {};

TVET.IO = (function () {
  "use strict";

  function download(filename, content, mime) {
    try {
      var blob = new Blob([content], { type: mime || "application/octet-stream" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (err) {
      alert("Download failed: " + err.message);
    }
  }

  function toCSV(rows) {
    if (!rows || !rows.length) return "";
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

  function exportSchoolJSON(school) {
    try {
      download((school.id || "school") + "-export.json", JSON.stringify(school, null, 2), "application/json");
    } catch (err) { alert("Export failed: " + err.message); }
  }

  function downloadSchoolCSV(school) {
    try {
      download((school.id || "school") + "-report.csv", toCSV([school]), "text/csv");
    } catch (err) { alert("Download failed: " + err.message); }
  }

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
    reader.onerror = function () { alert("Could not open that file."); };
    reader.readAsText(file);
    fileInputEl.value = "";
  }

  function downloadAllCSV(schools) {
    try {
      if (!schools || !schools.length) { alert("There is nothing to download yet."); return; }
      download("tvet-all-schools.csv", toCSV(schools), "text/csv");
    } catch (err) { alert("CSV download failed: " + err.message); }
  }

  function downloadAllJSON(schools) {
    try {
      if (!schools || !schools.length) { alert("There is nothing to export yet."); return; }
      download("tvet-all-schools.json", JSON.stringify(schools, null, 2), "application/json");
    } catch (err) { alert("JSON export failed: " + err.message); }
  }

  function downloadAllPDF(schools, title) {
    try {
      if (!schools || !schools.length) { alert("There is nothing to export yet."); return; }

      var esc = function (v) { return (v === null || v === undefined) ? "" : String(v); };
      var cols = [
        ["name", "School"], ["district", "District"], ["province", "Province"],
        ["status", "Status"], ["studentsEnrolled", "Students"],
        ["teachersTrained", "Trained"], ["teachersTotal", "Teachers"],
        ["computersInstalled", "Installed"], ["computersDelivered", "Delivered"],
        ["connectivity", "Network"], ["power", "Power"], ["reportingMonth", "Month"]
      ];
      var rowsHtml = schools.map(function (s) {
        return "<tr>" + cols.map(function (c) { return "<td>" + esc(s[c[0]]) + "</td>"; }).join("") + "</tr>";
      }).join("");
      var headHtml = "<tr>" + cols.map(function (c) { return "<th>" + c[1] + "</th>"; }).join("") + "</tr>";

      var htmlDoc =
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
        "</body></html>";

      var blob = new Blob([htmlDoc], { type: "text/html" });
      var url = URL.createObjectURL(blob);
      var win = window.open(url, "_blank");

      if (!win) {
        alert("Your browser blocked the PDF preview popup. Please allow popups for this site (look for a blocked-popup icon in the address bar), then click Download PDF again.");
      }
    } catch (err) {
      alert("PDF generation failed: " + err.message);
    }
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
