window.TVET = window.TVET || {};

TVET.Roles = (function () {
  "use strict";

  var KEY = "luxdev-tvet-role";
  var ROLES = [
    { id: "super", label: "Super user" },
    { id: "admin", label: "Admin" },
    { id: "datamanager", label: "Data manager" }
  ];

  function get() {
    try { return sessionStorage.getItem(KEY) || "super"; } catch (e) { return "super"; }
  }

  function set(role) {
    try { sessionStorage.setItem(KEY, role); } catch (e) {}
    apply();
  }

  function label(role) {
    var r = ROLES.filter(function (x) { return x.id === role; })[0];
    return r ? r.label : role;
  }

  function apply() {
    var role = get();
    document.body.classList.remove("role-super", "role-admin", "role-datamanager");
    document.body.classList.add("role-" + role);
    var sel = document.getElementById("roleSwitcher");
    if (sel) sel.value = role;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var sel = document.getElementById("roleSwitcher");
    if (sel) sel.addEventListener("change", function () { set(sel.value); });
    apply();
  });

  return { get: get, set: set, label: label, ROLES: ROLES, apply: apply };
})();
