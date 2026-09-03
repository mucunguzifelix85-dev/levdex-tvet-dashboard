window.TVET = window.TVET || {};

TVET.Attendance = (function () {
  "use strict";

  var U = TVET.UI;
  var KEY = "luxdev-tvet-attendance-v1";
  var state = { trainees: [], sessions: [], attendance: {} };
  var currentSessionId = null;

  function uid() { return "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) state = JSON.parse(raw);
    } catch (e) {}
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function schools() { return (TVET.App && TVET.App.schools) || []; }

  function schoolOptions() {
    return '<option value="">Select school</option>' +
      schools().map(function (s) {
        return '<option value="' + s.id + '">' + U.esc(s.name || "Untitled school") + '</option>';
      }).join("");
  }

  function schoolName(id) {
    var s = schools().filter(function (x) { return x.id === id; })[0];
    return s ? (s.name || "Untitled school") : "Unknown school";
  }

  /* ================= build DOM: nav link, School panel, Executive rollup ================= */
  function buildUI() {
    var nav = document.querySelector('nav.sidebar__nav[aria-label="Dashboards"]') ||
              document.querySelector('nav.sidebar__nav');
    if (nav && !document.querySelector('[data-view="attendance"]')) {
      var navBtn = document.createElement("button");
      navBtn.type = "button";
      navBtn.className = "navlink";
      navBtn.setAttribute("data-view", "attendance");
      navBtn.innerHTML =
        '<span class="navlink__icon" aria-hidden="true">' +
          '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">' +
            '<rect x="4" y="3" width="12" height="14" rx="1.5"/><path d="M7.5 8.5l2 2 3-3.5"/>' +
          '</svg>' +
        '</span><span>Training attendance</span>';
      nav.appendChild(navBtn);
    }

    var main = document.getElementById("main");
    if (main && !document.getElementById("viewAttendance")) {
      var view = document.createElement("div");
      view.className = "view";
      view.id = "viewAttendance";
      view.hidden = true;
      view.innerHTML =
        '<section class="block">' +
          '<div class="block__head"><h2>Register a teacher or student</h2>' +
          '<p>Add each person once. A supervisor then ticks who is present for every training session below.</p></div>' +
          '<div class="card"><div class="fields">' +
            '<div class="field"><label for="attendanceTraineeName">Full name</label><input id="attendanceTraineeName" type="text" placeholder="Full name"></div>' +
            '<div class="field"><label for="attendanceTraineeRole">Role</label><select id="attendanceTraineeRole"><option value="teacher">Teacher</option><option value="student">Student</option></select></div>' +
            '<div class="field"><label for="attendanceTraineeSchool">School</label><select id="attendanceTraineeSchool">' + schoolOptions() + '</select></div>' +
            '<div class="field"><label for="attendanceTraineePhone">Phone (optional)</label><input id="attendanceTraineePhone" type="text" placeholder="Phone"></div>' +
            '<div class="field"><label for="attendanceTraineeEmail">Email (optional)</label><input id="attendanceTraineeEmail" type="email" placeholder="Email"></div>' +
          '</div>' +
          '<button type="button" class="btn btn--primary" data-attendance-act="add-trainee" style="margin-top:12px;">Add to roster</button>' +
          '</div>' +
          '<div class="card card--flush"><div id="attendanceRoster"></div></div>' +
        '</section>' +

        '<section class="block">' +
          '<div class="block__head"><h2>Start a training session</h2>' +
          '<p>Create a session for a school and date, then tick attendance below.</p></div>' +
          '<div class="card"><div class="fields">' +
            '<div class="field"><label for="attendanceSessionTitle">Session title</label><input id="attendanceSessionTitle" type="text" placeholder="e.g. Blended learning refresher"></div>' +
            '<div class="field"><label for="attendanceSessionSchool">School</label><select id="attendanceSessionSchool">' + schoolOptions() + '</select></div>' +
            '<div class="field"><label for="attendanceSessionDate">Date</label><input id="attendanceSessionDate" type="date"></div>' +
          '</div>' +
          '<button type="button" class="btn btn--primary" data-attendance-act="start-session" style="margin-top:12px;">Start session</button>' +
          '</div>' +
        '</section>' +

        '<section class="block">' +
          '<div class="block__head"><h2>Take attendance</h2>' +
          '<p>Choose a session, then tick who is present. Anyone left unticked is recorded as absent.</p></div>' +
          '<div class="card">' +
            '<div class="field"><label for="attendanceOpenSession">Session</label><select id="attendanceOpenSession"></select></div>' +
            '<div id="attendanceSheet" style="margin-top:14px;"></div>' +
            '<button type="button" class="btn btn--primary" data-attendance-act="save-attendance" style="margin-top:12px;">Save attendance</button>' +
          '</div>' +
        '</section>' +

        '<section class="block">' +
          '<div class="block__head"><h2>Session history</h2></div>' +
          '<div class="card card--flush"><div id="attendanceHistory"></div></div>' +
        '</section>' +

        '<footer class="pagefoot"><p class="pagefoot__note">Confidential — for internal and donor briefing use.</p></footer>';
      main.appendChild(view);
    }

    var execView = document.getElementById("viewExec");
    if (execView && !document.getElementById("sec-attendance")) {
      var sec = document.createElement("section");
      sec.className = "block";
      sec.id = "sec-attendance";
      sec.innerHTML =
        '<div class="block__head"><h2>Training attendance</h2>' +
        '<p>Who attended training, by session and school, as recorded by school supervisors.</p></div>' +
        '<div class="card card--flush"><div id="execAttendance" style="padding:16px;"></div></div>';
      var pagefoot = execView.querySelector(".pagefoot");
      if (pagefoot) execView.insertBefore(sec, pagefoot);
      else execView.appendChild(sec);
    }
  }

  /* ================= roster ================= */
  function addTrainee(data) {
    if (!data.name || !data.name.trim()) { alert("Full name is required."); return; }
    if (!data.schoolId) { alert("Please select a school."); return; }
    state.trainees.push({
      id: uid(), name: data.name.trim(),
      role: data.role === "student" ? "student" : "teacher",
      schoolId: data.schoolId,
      phone: (data.phone || "").trim(),
      email: (data.email || "").trim()
    });
    persist();
    renderRoster();
    renderSessionAttendance();
  }

  function removeTrainee(id) {
    if (!window.confirm("Remove this person from the roster? Past attendance history is kept.")) return;
    state.trainees = state.trainees.filter(function (t) { return t.id !== id; });
    persist();
    renderRoster();
  }

  function renderRoster() {
    var host = document.getElementById("attendanceRoster");
    if (!host) return;
    if (!state.trainees.length) {
      host.innerHTML = '<p class="allclear" style="padding:16px;">No one registered yet. Add a teacher or student above.</p>';
      return;
    }
    var html = '<table class="table"><thead><tr><th>Name</th><th>Role</th><th>School</th><th>Contact</th><th></th></tr></thead><tbody>';
    state.trainees.forEach(function (t) {
      html += '<tr><td>' + U.esc(t.name) + '</td>' +
        '<td class="muted">' + (t.role === "student" ? "Student" : "Teacher") + '</td>' +
        '<td class="muted">' + U.esc(schoolName(t.schoolId)) + '</td>' +
        '<td class="muted">' + U.esc(t.phone || t.email || "—") + '</td>' +
        '<td><button type="button" class="iconbtn" data-attendance-act="remove-trainee" data-id="' + t.id + '" aria-label="Remove">' +
        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 5l10 10M15 5L5 15"/></svg></button></td></tr>';
    });
    host.innerHTML = html + '</tbody></table>';
  }

  /* ================= sessions ================= */
  function startSession(data) {
    if (!data.title || !data.title.trim()) { alert("Give the training session a title."); return; }
    if (!data.schoolId) { alert("Please select a school."); return; }
    if (!data.date) { alert("Please choose a date."); return; }
    var session = { id: uid(), title: data.title.trim(), date: data.date, schoolId: data.schoolId };
    state.sessions.unshift(session);
    state.attendance[session.id] = {};
    persist();
    currentSessionId = session.id;
    renderSessionPicker();
    renderSessionAttendance();
    renderSessionHistory();
  }

  function setPresence(sessionId, traineeId, present) {
    if (!state.attendance[sessionId]) state.attendance[sessionId] = {};
    state.attendance[sessionId][traineeId] = present;
  }

  function sessionCounts(sessionId) {
    var record = state.attendance[sessionId] || {};
    var session = state.sessions.filter(function (s) { return s.id === sessionId; })[0];
    if (!session) return { present: 0, absent: 0 };
    var roster = state.trainees.filter(function (t) { return t.schoolId === session.schoolId; });
    var present = 0;
    roster.forEach(function (t) { if (record[t.id]) present++; });
    return { present: present, absent: roster.length - present };
  }

  function renderSessionPicker() {
    var sel = document.getElementById("attendanceOpenSession");
    if (!sel) return;
    if (!state.sessions.length) { sel.innerHTML = '<option value="">No sessions yet</option>'; return; }
    sel.innerHTML = state.sessions.map(function (s) {
      return '<option value="' + s.id + '">' + U.esc(s.title) + ' — ' + U.esc(schoolName(s.schoolId)) + ' (' + U.esc(s.date) + ')</option>';
    }).join("");
    if (currentSessionId) sel.value = currentSessionId;
  }

  function renderSessionAttendance() {
    var host = document.getElementById("attendanceSheet");
    if (!host) return;
    if (!currentSessionId && state.sessions.length) currentSessionId = state.sessions[0].id;
    var session = state.sessions.filter(function (s) { return s.id === currentSessionId; })[0];
    if (!session) { host.innerHTML = '<p class="allclear">Start a session above to take attendance.</p>'; return; }

    var roster = state.trainees.filter(function (t) { return t.schoolId === session.schoolId; });
    if (!roster.length) {
      host.innerHTML = '<p class="allclear">No one is registered for ' + U.esc(schoolName(session.schoolId)) + ' yet.</p>';
      return;
    }
    var record = state.attendance[session.id] || {};
    var html = '<table class="table"><thead><tr><th>Name</th><th>Role</th><th class="right">Present</th></tr></thead><tbody>';
    roster.forEach(function (t) {
      var checked = record[t.id] ? " checked" : "";
      html += '<tr><td>' + U.esc(t.name) + '</td><td class="muted">' + (t.role === "student" ? "Student" : "Teacher") +
        '</td><td class="right"><input type="checkbox" data-attendance-tick="' + t.id + '"' + checked + '></td></tr>';
    });
    host.innerHTML = html + '</tbody></table>';
  }

  function renderSessionHistory() {
    var host = document.getElementById("attendanceHistory");
    if (!host) return;
    if (!state.sessions.length) { host.innerHTML = '<p class="allclear" style="padding:16px;">No sessions recorded yet.</p>'; return; }
    var html = '<table class="table"><thead><tr><th>Session</th><th>School</th><th>Date</th><th class="right">Present</th><th class="right">Absent</th></tr></thead><tbody>';
    state.sessions.forEach(function (s) {
      var c = sessionCounts(s.id);
      html += '<tr><td>' + U.esc(s.title) + '</td><td class="muted">' + U.esc(schoolName(s.schoolId)) +
        '</td><td class="muted">' + U.esc(s.date) + '</td><td class="right num">' + c.present +
        '</td><td class="right num">' + c.absent + '</td></tr>';
    });
    host.innerHTML = html + '</tbody></table>';
  }

  function renderExecutiveRollup() {
    var host = document.getElementById("execAttendance");
    if (!host) return;
    if (!state.sessions.length) {
      host.innerHTML = '<p class="allclear">No training sessions have been recorded by any school yet.</p>';
      return;
    }
    var totalPresent = 0, totalAbsent = 0;
    state.sessions.forEach(function (s) {
      var c = sessionCounts(s.id);
      totalPresent += c.present; totalAbsent += c.absent;
    });
    var html = '<p class="muted" style="margin:0 0 14px;">' + state.sessions.length + ' session' +
      (state.sessions.length === 1 ? "" : "s") + ' recorded · ' + totalPresent + ' present · ' + totalAbsent + ' absent</p>' +
      '<table class="table"><thead><tr><th>Session</th><th>School</th><th>Date</th><th class="right">Present</th><th class="right">Absent</th></tr></thead><tbody>';
    state.sessions.forEach(function (s) {
      var c = sessionCounts(s.id);
      html += '<tr><td>' + U.esc(s.title) + '</td><td class="muted">' + U.esc(schoolName(s.schoolId)) +
        '</td><td class="muted">' + U.esc(s.date) + '</td><td class="right num">' + c.present +
        '</td><td class="right num">' + c.absent + '</td></tr>';
    });
    host.innerHTML = html + '</tbody></table>';
  }

  function refreshAll() {
    var traineeSel = document.getElementById("attendanceTraineeSchool");
    var sessionSel = document.getElementById("attendanceSessionSchool");
    if (traineeSel) { var tv = traineeSel.value; traineeSel.innerHTML = schoolOptions(); traineeSel.value = tv; }
    if (sessionSel) { var sv = sessionSel.value; sessionSel.innerHTML = schoolOptions(); sessionSel.value = sv; }
    renderRoster();
    renderSessionPicker();
    renderSessionAttendance();
    renderSessionHistory();
    renderExecutiveRollup();
  }

  document.addEventListener("DOMContentLoaded", function () {
    load();
    buildUI();
    refreshAll();

    document.addEventListener("click", function (e) {
      var addBtn = e.target.closest('[data-attendance-act="add-trainee"]');
      if (addBtn) {
        addTrainee({
          name: document.getElementById("attendanceTraineeName").value,
          role: document.getElementById("attendanceTraineeRole").value,
          schoolId: document.getElementById("attendanceTraineeSchool").value,
          phone: document.getElementById("attendanceTraineePhone").value,
          email: document.getElementById("attendanceTraineeEmail").value
        });
        document.getElementById("attendanceTraineeName").value = "";
        document.getElementById("attendanceTraineePhone").value = "";
        document.getElementById("attendanceTraineeEmail").value = "";
        return;
      }
      var removeBtn = e.target.closest('[data-attendance-act="remove-trainee"]');
      if (removeBtn) { removeTrainee(removeBtn.dataset.id); return; }

      var startBtn = e.target.closest('[data-attendance-act="start-session"]');
      if (startBtn) {
        startSession({
          title: document.getElementById("attendanceSessionTitle").value,
          date: document.getElementById("attendanceSessionDate").value,
          schoolId: document.getElementById("attendanceSessionSchool").value
        });
        document.getElementById("attendanceSessionTitle").value = "";
        return;
      }

      var saveBtn = e.target.closest('[data-attendance-act="save-attendance"]');
      if (saveBtn) {
        if (!currentSessionId) return;
        var boxes = document.querySelectorAll("[data-attendance-tick]");
        boxes.forEach(function (b) { setPresence(currentSessionId, b.getAttribute("data-attendance-tick"), b.checked); });
        persist();
        renderSessionHistory();
        renderExecutiveRollup();
        if (TVET.UI && TVET.UI.toast) TVET.UI.toast("Attendance saved");
        return;
      }

      var toExec = e.target.closest('[data-view="exec"], [data-gate-view="exec"]');
      if (toExec) setTimeout(renderExecutiveRollup, 60);

      var toAttendance = e.target.closest('[data-view="attendance"]');
      if (toAttendance) setTimeout(refreshAll, 60);
    });

    document.addEventListener("change", function (e) {
      if (e.target.id === "attendanceOpenSession") {
        currentSessionId = e.target.value;
        renderSessionAttendance();
      }
    });
  });

  return { refresh: refreshAll, renderExecutiveRollup: renderExecutiveRollup };
})();
