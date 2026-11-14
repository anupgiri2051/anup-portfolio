// icons.js — one modern line-icon set for the website and the admin portal.
// In HTML:  <i data-icon="send"></i>   (filled in automatically when the page loads)
// In code:  icon("send")               (returns the <svg> markup as a string)
(function () {
    var P = function (d) { return '<path d="' + d + '"/>'; };
    var C = function (x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"/>'; };
    var R = function (x, y, w, h, r) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r || 0) + '"/>'; };

    var ICONS = {
        "menu": P("M4 6h16M4 12h16M4 18h16"),
        "x": P("M18 6L6 18M6 6l12 12"),
        "chevron-left": P("M15 18l-6-6 6-6"),
        "chevron-right": P("M9 18l6-6-6-6"),
        "arrow-left": P("M19 12H5M12 19l-7-7 7-7"),
        "arrow-right": P("M5 12h14M12 5l7 7-7 7"),
        "arrow-up": P("M12 19V5M5 12l7-7 7 7"),
        "arrow-up-right": P("M7 17L17 7M7 7h10v10"),
        "external": P("M15 3h6v6M10 14L21 3M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"),
        "home": P("M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"),
        "user": C(12, 8, 4) + P("M4 21c0-4 4-7 8-7s8 3 8 7"),
        "folder": P("M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"),
        "image": R(3, 4, 18, 16, 2) + C(9, 10, 1.6) + P("M21 16l-5-5-8 9"),
        "mail": R(3, 5, 18, 14, 2) + P("M3 7l9 6 9-6"),
        "send": P("M22 2L11 13M22 2l-7 20-4-9-9-4z"),
        "message": P("M21 11.5a8.4 8.4 0 01-9 8.4 8.5 8.5 0 01-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0112.5 3 8.5 8.5 0 0121 11.5z"),
        "sun": C(12, 12, 4) + P("M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"),
        "moon": P("M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"),
        "download": P("M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"),
        "upload": P("M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"),
        "share": C(18, 5, 3) + C(6, 12, 3) + C(18, 19, 3) + P("M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"),
        "link": P("M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"),
        "copy": R(9, 9, 13, 13, 2) + P("M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"),
        "check": P("M20 6L9 17l-5-5"),
        "check-check": P("M18 6L7 17l-5-5M22 10l-7.5 7.5L13 16"),
        "alert": C(12, 12, 10) + P("M12 8v4M12 16h.01"),
        "trash": P("M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"),
        "pencil": P("M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"),
        "tag": P("M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8zM7 7h.01"),
        "reply": P("M9 17l-5-5 5-5M20 18v-2a4 4 0 00-4-4H4"),
        "eye": P("M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z") + C(12, 12, 3),
        "eye-off": P("M17.9 17.9A10 10 0 0112 20c-7 0-11-8-11-8a18 18 0 015.1-5.9M9.9 4.2A9 9 0 0112 4c7 0 11 8 11 8a18 18 0 01-2.2 3.2M14.1 14.1a3 3 0 01-4.2-4.2M1 1l22 22"),
        "logout": P("M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"),
        "login": P("M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"),
        "play": P("M7 4l13 8-13 8z"),
        "pause": R(6, 4, 4, 16, 1) + R(14, 4, 4, 16, 1),
        "maximize": P("M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3"),
        "minimize": P("M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3"),
        "search": C(11, 11, 7) + P("M21 21l-4.3-4.3"),
        "plus": P("M12 5v14M5 12h14"),
        "save": P("M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8"),
        "command": P("M18 3a3 3 0 00-3 3v12a3 3 0 103-3H6a3 3 0 103 3V6a3 3 0 10-3 3h12a3 3 0 000-6z"),
        "wifi-off": P("M1 1l22 22M16.7 11.1A11 11 0 0119 12.6M5 12.6a11 11 0 015.2-2.5M10.7 5.1A16 16 0 0122.6 9M1.4 9a16 16 0 014.3-2.7M8.5 16.1a5 5 0 017 0M12 20h.01"),
        "sparkles": P("M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"),
        "file": P("M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5"),
        "clock": C(12, 12, 10) + P("M12 6v6l4 2"),
        "key": C(7.5, 15.5, 5.5) + P("M11.5 11.5L21 2M15.5 7.5l3 3L22 7l-3-3"),
        "grid": R(3, 3, 7, 7, 1.5) + R(14, 3, 7, 7, 1.5) + R(3, 14, 7, 7, 1.5) + R(14, 14, 7, 7, 1.5),
        "columns": R(3, 3, 7, 18, 1.5) + R(14, 3, 7, 10, 1.5) + R(14, 16, 7, 5, 1.5),
        "refresh": P("M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5"),
        "filter": P("M22 3H2l8 9.5V19l4 2v-8.5z"),
        "code": P("M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"),
        "star": P("M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"),
        "info": C(12, 12, 10) + P("M12 16v-4M12 8h.01")
    };

    function icon(name, cls) {
        var inner = ICONS[name];
        if (!inner) return "";
        return '<svg class="icon' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + inner + "</svg>";
    }

    // fill every <i data-icon="..."> inside root (also used for elements added later)
    function hydrate(root) {
        var els = (root || document).querySelectorAll("[data-icon]");
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.getAttribute("data-icon-done") === el.getAttribute("data-icon")) continue;
            el.innerHTML = icon(el.getAttribute("data-icon"));
            el.setAttribute("data-icon-done", el.getAttribute("data-icon"));
            el.setAttribute("aria-hidden", "true");
        }
    }

    // put an icon + text into a button or link (keeps the icon when the text changes)
    function setLabel(el, name, text, after) {
        if (!el) return;
        var span = '<span class="lbl">' + String(text).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }) + "</span>";
        el.innerHTML = name ? (after ? span + icon(name) : icon(name) + span) : span;
    }

    window.ICONS = ICONS;
    window.icon = icon;
    window.hydrateIcons = hydrate;
    window.setLabel = setLabel;
    document.addEventListener("DOMContentLoaded", function () { hydrate(document); });
})();
