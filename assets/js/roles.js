window.TVET = window.TVET || {};

TVET.Roles = (function () {
  "use strict";

  var KEY = "luxdev-tvet-role";

  var ROLES = [
    { id: "super", label: "Super user" },
    { id: "admin", label: "Admin" },
    { id: "datamanager", label: "Data manager" }
  ];

  /* The single source of truth for what each role may do. */
  var PERMISSIONS = {
    super:        { add: true,  edit: true,  delete: true,  import: true,  exportData: true,  manageUsers: true  },
    admin:        { add: true,  edit: true,  delete: true,  import: true,  exportData: true,  manageUsers: false },
    datamanager:  { add: true,  edit: true,  delete: false, import: false, exportData: false, manageUsers: false }
  };

  function get() {
    try { return sessionStorage.getItem(KEY) || "super"; } catch (e) { return "super"; }
  }

  function set(role) {
    if (!PERMISSIONS[role]) return;
    try { sessionStorage.setItem(KEY, role); } catch (e) {}
    apply();
  }

  function label(role) {
    role = role || get();
    var r = ROLES.filter(function (x) { return x.id === role; })[0];
    return r ? r.label : role;
  }

  /* The single function every part of the app should call before
     performing a sensitive action. Returns true/false, and shows
     a message if the action is blocked. */
  function can(action, opts) {
    opts = opts || {};
    var role = get();
    var allowed = !!(PERMISSIONS[role] && PERMISSIONS[role][action]);
    if (!allowed && opts.warn !== false) {
      alert(label(role) + " accounts cannot " + (opts.verb || action) + ".");
    }
    return allowed;
  }

  function apply() {
    var role = get();
    document.body.classList.remove("role-super", "role-admin", "role-datamanager");
    document.body.classList.add("role-" + role);

    var sel = document.getElementById("roleSwitcher");
    if (sel) sel.value = role;

    var badge = document.getElementById("roleBadge");
    if (badge) badge.textContent = label(role);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var sel = document.getElementById("roleSwitcher");
    if (sel) sel.addEventListener("change", function () { set(sel.value); });
    apply();
  });

  return {
    get: get, set: set, label: label, can: can, apply: apply,
    ROLES: ROLES, PERMISSIONS: PERMISSIONS
  };
})();
