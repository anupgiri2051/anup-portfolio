// theme.js — color themes for the website. Loaded in <head> so a saved theme is applied before the page paints.

// Quiet console on the public website: visitors see no messages from this site in Inspect → Console.
// Messages still show on localhost, in the admin portal, or when you add ?debug=1 to the address.
(function () {
    try {
        var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.protocol === "file:";
        var admin = /^\/admin(\/|\.html|$)/.test(location.pathname);
        var debug = /[?&]debug=1/.test(location.search);
        if (local || admin || debug || !window.console) return;
        var noop = function () {};
        ["log", "info", "warn", "error", "debug", "trace", "table", "dir", "group", "groupCollapsed", "groupEnd", "time", "timeEnd"].forEach(function (m) {
            if (typeof console[m] === "function") console[m] = noop;
        });
    } catch (e) {}
})();

(function () {
    var THEMES = {
        sky:     { name: "Sky blue",  vars: { "--acc": "#0ea5e9", "--acc-d": "#0284c7", "--acc-dd": "#0369a1", "--acc2": "#3b82f6", "--acc-rgb": "14,165,233", "--acc2-rgb": "59,130,246", "--acc-tint": "#e6f4fd", "--acc-tint2": "#f2f9fe", "--acc-l": "#38bdf8", "--acc-ll": "#7dd3fc", "--bg-page": "#e8f1f8", "--orb-a": "#a5d8f5", "--orb-b": "#bfe6fb", "--orb-c": "#cfe9ff" } },
        violet:  { name: "Violet",    vars: { "--acc": "#8b5cf6", "--acc-d": "#7c3aed", "--acc-dd": "#5b21b6", "--acc2": "#ec4899", "--acc-rgb": "139,92,246", "--acc2-rgb": "236,72,153", "--acc-tint": "#f0eafe", "--acc-tint2": "#f8f5ff", "--acc-l": "#a78bfa", "--acc-ll": "#c4b5fd", "--bg-page": "#efeaf8", "--orb-a": "#cdb9f5", "--orb-b": "#e0d1fa", "--orb-c": "#f3d1ea" } },
        emerald: { name: "Emerald",   vars: { "--acc": "#059669", "--acc-d": "#047857", "--acc-dd": "#065f46", "--acc2": "#0d9488", "--acc-rgb": "5,150,105", "--acc2-rgb": "13,148,136", "--acc-tint": "#dff6ec", "--acc-tint2": "#f0fbf6", "--acc-l": "#34d399", "--acc-ll": "#6ee7b7", "--bg-page": "#e6f4ee", "--orb-a": "#a7e3c9", "--orb-b": "#c4efdc", "--orb-c": "#cdeee6" } },
        rose:    { name: "Rose",      vars: { "--acc": "#e11d48", "--acc-d": "#be123c", "--acc-dd": "#9f1239", "--acc2": "#f97316", "--acc-rgb": "225,29,72", "--acc2-rgb": "249,115,22", "--acc-tint": "#fde6ec", "--acc-tint2": "#fff4f6", "--acc-l": "#fb7185", "--acc-ll": "#fda4af", "--bg-page": "#f8eaee", "--orb-a": "#f5b9c6", "--orb-b": "#fad0d9", "--orb-c": "#fde0d0" } },
        amber:   { name: "Amber",     vars: { "--acc": "#d97706", "--acc-d": "#b45309", "--acc-dd": "#92400e", "--acc2": "#ea580c", "--acc-rgb": "217,119,6", "--acc2-rgb": "234,88,12", "--acc-tint": "#fcefd8", "--acc-tint2": "#fffaf0", "--acc-l": "#fbbf24", "--acc-ll": "#fcd34d", "--bg-page": "#f8f0e2", "--orb-a": "#f5d29a", "--orb-b": "#f9e0b8", "--orb-c": "#fbd5c0" } }
    };

    function apply(name) {
        var key = THEMES[name] ? name : "sky";
        var root = document.documentElement;
        var vars = THEMES[key].vars;
        Object.keys(vars).forEach(function (k) { root.style.setProperty(k, vars[k]); });
        root.setAttribute("data-theme", key);
        try { window.dispatchEvent(new Event("themechange")); } catch (e) {}
    }

    window.THEMES = THEMES;
    window.applyTheme = apply;
    try {
        var saved = localStorage.getItem("siteTheme");
        if (saved && THEMES[saved]) apply(saved);
    } catch (e) {}

    /* ---------- light / dark mode (each visitor chooses; follows the device setting until they do) ---------- */
    var root = document.documentElement;
    var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

    function savedMode() {
        try { var m = localStorage.getItem("siteMode"); return m === "dark" || m === "light" ? m : null; } catch (e) { return null; }
    }
    function currentMode() { return savedMode() || (mq && mq.matches ? "dark" : "light"); }

    function syncButtons() {
        var dark = root.getAttribute("data-mode") === "dark";
        var btns = document.querySelectorAll("[data-mode-toggle]");
        for (var i = 0; i < btns.length; i++) {
            btns[i].setAttribute("aria-pressed", String(dark));
            btns[i].setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
            btns[i].title = dark ? "Light mode" : "Dark mode";
        }
    }

    function applyMode(mode) {
        root.setAttribute("data-mode", mode);
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            if (!meta.getAttribute("data-light")) meta.setAttribute("data-light", meta.getAttribute("content") || "");
            meta.setAttribute("content", mode === "dark" ? "#0b1220" : meta.getAttribute("data-light"));
        }
        syncButtons();
        try { window.dispatchEvent(new Event("themechange")); } catch (e) {}
    }

    applyMode(currentMode());
    if (mq) {
        var follow = function () { if (!savedMode()) applyMode(currentMode()); };
        if (mq.addEventListener) mq.addEventListener("change", follow); else if (mq.addListener) mq.addListener(follow);
    }

    window.toggleMode = function (ev) {
        var next = root.getAttribute("data-mode") === "dark" ? "light" : "dark";
        try { localStorage.setItem("siteMode", next); } catch (e) {}

        // circle that grows from the switch button (browsers with View Transitions)
        var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (document.startViewTransition && !calm) {
            var src = ev && ev.currentTarget && ev.currentTarget.getBoundingClientRect ? ev.currentTarget : document.querySelector("[data-mode-toggle]");
            var x = window.innerWidth / 2, y = 0;
            if (src) { var r = src.getBoundingClientRect(); if (r.width) { x = r.left + r.width / 2; y = r.top + r.height / 2; } }
            var end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
            var vt = document.startViewTransition(function () { applyMode(next); });
            vt.ready.then(function () {
                root.animate(
                    { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + end + "px at " + x + "px " + y + "px)"] },
                    { duration: 650, easing: "cubic-bezier(.4,0,.2,1)", pseudoElement: "::view-transition-new(root)" }
                );
            }).catch(function () {});
            return;
        }

        root.classList.add("mode-anim");
        applyMode(next);
        setTimeout(function () { root.classList.remove("mode-anim"); }, 450);
    };

    document.addEventListener("DOMContentLoaded", function () {
        var btns = document.querySelectorAll("[data-mode-toggle]");
        for (var i = 0; i < btns.length; i++) btns[i].addEventListener("click", window.toggleMode);
        syncButtons();
    });
})();
