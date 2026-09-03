/* ==========================================================================
   store.js — persistence adapter
   Swap the two methods below for API calls when you put this on a server.
   Everything else in the app goes through this file and nothing else.
   ========================================================================== */
window.TVET = window.TVET || {};

TVET.Store = (function () {
  "use strict";

  var KEY = "luxdev-tvet-schools-v1";
  var memory = null;          // fallback when no persistent backend is present
  var backend = "memory";     // "artifact" | "local" | "memory"

  function detect() {
    if (window.storage && typeof window.storage.get === "function") return "artifact";
    try {
      var probe = "__tvet_probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return "local";
    } catch (e) {
      return "memory";
    }
  }

  backend = detect();

  return {
    backend: function () { return backend; },

    label: function () {
      if (backend === "artifact") return "Saved to this workspace";
      if (backend === "local") return "Saved in this browser";
      return "Session only — export to keep";
    },

    load: async function () {
      try {
        if (backend === "artifact") {
          var r = await window.storage.get(KEY);
          if (r && r.value) return JSON.parse(r.value);
        } else if (backend === "local") {
          var raw = window.localStorage.getItem(KEY);
          if (raw) return JSON.parse(raw);
        }
      } catch (e) {
        /* key absent, quota blocked, or corrupt payload — fall through to memory */
      }
      return memory;
    },

    save: async function (data) {
      memory = data;
      try {
        if (backend === "artifact") {
          await window.storage.set(KEY, JSON.stringify(data));
          return true;
        }
        if (backend === "local") {
          window.localStorage.setItem(KEY, JSON.stringify(data));
          return true;
        }
      } catch (e) {
        return false;
      }
      return false;
    }
  };
})();
