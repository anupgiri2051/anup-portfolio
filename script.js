let siteTitle = document.title || "Anup Giri";
let pageLabel = ""; // "About", "Gallery"... shown in the browser tab before the site title

// Browser tab title: "<photo> | <site>" in the lightbox, "<page> · <site>" on a page, "<site>" on home
function updateTitle() {
    const lb = document.getElementById("lightbox-modal");
    if (lb && lb.style.display === "flex") return;
    document.title = pageLabel ? pageLabel + " · " + siteTitle : siteTitle;
}

document.addEventListener("DOMContentLoaded", () => {
    setupMobileMenu();
    setupCleanRouting();
    loadGallery();
    setupContactForm();
    setupLightbox();
    syncSiteSettings();
    countVisit();
    setupGalleryTools();
    initPopup();
    loadProjects();
    syncAnnouncement();
    syncMaintenance();
    syncContent();
});

// Dynamic Clean URL Routing (/about, /gallery, /contact, /)
function setupCleanRouting() {
    const routeLinks = document.querySelectorAll("[data-path]");

    routeLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetPath = link.getAttribute("data-path");
            navigateTo(targetPath);
        });
    });

    window.addEventListener("popstate", () => {
        handleCurrentRoute(window.location.pathname);
    });

    // Handle initial URL path on load
    handleCurrentRoute(window.location.pathname, true);
}

function navigateTo(path) {
    if (window.location.pathname !== path) {
        // pushState is blocked when the page is opened as a local file; routing still works
        try { history.pushState(null, null, path); } catch (e) {}
    }
    handleCurrentRoute(path);
    if (window.closeMobileMenu) window.closeMobileMenu();
}

// Gallery and About are their own views: hidden on the home page, shown after clicking them
function setView(name) {
    const views = ["gallery", "about", "projects"];
    const was = views.find(v => document.body.classList.contains("view-" + v)) || "home";
    views.forEach(v => document.body.classList.toggle("view-" + v, name === v));
    if (name !== was) {
        window.scrollTo(0, 0);
        // replay the page entrance animation
        document.body.classList.remove("page-in");
        void document.body.offsetWidth;
        document.body.classList.add("page-in");
    }
}

const PAGE_LABELS = { gallery: "Gallery", about: "About", projects: "Projects", home: "" };

function handleCurrentRoute(path, initial) {
    const view = /^\/gallery(\/|$)/.test(path) ? "gallery" : /^\/about\/?$/.test(path) ? "about" : /^\/projects\/?$/.test(path) ? "projects" : "home";
    setView(view);
    pageLabel = PAGE_LABELS[view] || (/^\/contact\/?$/.test(path) ? "Contact" : "");
    updateTitle();
    const canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.href = "https://anupgiri.com" + (view === "home" ? "/" : "/" + view);
    // /gallery/<photo-id> opens that photo (shareable link, back button closes it)
    const photo = path.match(/^\/gallery\/([^\/]+)\/?$/);
    if (photo) {
        openPhotoById(decodeURIComponent(photo[1]), initial);
        return;
    }
    closeLightbox(false);
    path = path.length > 1 ? path.replace(/\/+$/, "") : path;

    // Unknown address (typo, old link, /index.html): show the home page and tidy the URL
    if (!["/", "", "/about", "/projects", "/gallery", "/contact"].includes(path)) {
        try { history.replaceState(null, null, "/"); } catch (e) {}
        path = "/";
    }

    if (path === "/" || path === "") {
        // Scroll completely to top for Home so no content is hidden under navbar
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
        return;
    }

    const sectionMap = {
        "/about": "about-section",
        "/projects": "projects-section",
        "/gallery": "gallery-section",
        "/contact": "contact-section"
    };

    const targetId = sectionMap[path];
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
        targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

// Photos opened by URL (/gallery/<id>)
let photoCache = {};
let photoOrder = [];
let currentCat = "";
let currentPhotoId = null;
let pendingPhoto = null;

function openPhotoById(id, scrollToGallery) {
    if (scrollToGallery) {
        const sec = document.getElementById("gallery-section");
        if (sec) sec.scrollIntoView();
    }
    if (photoCache[id]) {
        pendingPhoto = null;
        openLightbox(photoCache[id].url, photoCache[id].title, id);
    } else {
        pendingPhoto = id; // opens as soon as the gallery has loaded
    }
}

// Firestore Gallery Listener
function loadGallery() {
    const galleryContainer = document.getElementById("gallery-container");
    if (!galleryContainer) return;

    // loading placeholders until the first data arrives
    galleryContainer.innerHTML = Array.from({ length: 6 }, () => '<div class="gallery-skel"></div>').join("");

    db.collection("photos").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        photoCache = {};
        photoOrder = [];
        if (snapshot.empty) {
            updateGalleryCount(0, 0);
            buildCategoryChips();
            if (pendingPhoto && !snapshot.metadata.fromCache) { pendingPhoto = null; try { history.replaceState(null, null, "/gallery"); } catch (e) {} }
            galleryContainer.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">No photos in gallery yet.</p>`;
            return;
        }

        galleryContainer.innerHTML = "";

        snapshot.forEach(doc => {
            const data = doc.data();
            photoCache[doc.id] = data;
            photoOrder.push(doc.id);

            let when = "";
            try { when = data.createdAt ? data.createdAt.toDate().toLocaleDateString(undefined, { month: "short", year: "numeric" }) : ""; } catch (e) {}

            const item = document.createElement("div");
            item.className = "gallery-item";
            item.tabIndex = 0;
            item.setAttribute("role", "button");
            item.setAttribute("aria-label", "Open photo: " + (data.title || "Untitled"));
            item.dataset.title = (data.title || "").toLowerCase();
            item.dataset.cat = (data.category || "").trim().toLowerCase();
            item.style.animationDelay = Math.min(galleryContainer.children.length, 12) * 0.06 + "s";
            item.innerHTML = `
                <img src="${esc(data.url)}" alt="${esc(data.title)}" loading="lazy" decoding="async">
                <span class="gallery-open" aria-hidden="true">${icon("maximize")}</span>
                <div class="gallery-item-title"><span>${esc(data.title)}</span>${when ? `<small>${esc(when)}</small>` : ""}</div>
            `;

            const open = () => navigateTo("/gallery/" + encodeURIComponent(doc.id));
            item.addEventListener("click", open);
            item.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
            });

            galleryContainer.appendChild(item);
        });

        buildCategoryChips();
        applyGalleryFilter();

        if (pendingPhoto) {
            if (photoCache[pendingPhoto]) {
                openPhotoById(pendingPhoto, false);
            } else if (!snapshot.metadata.fromCache) {
                pendingPhoto = null;
                try { history.replaceState(null, null, "/gallery"); } catch (e) {}
            }
        }
    }, err => {
        console.error("Gallery error:", err);
        galleryContainer.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">Photos could not be loaded right now. Please refresh in a moment.</p>`;
    });
}

// Gallery toolbar: photo count, search by title, layout switch (mosaic / masonry)
function updateGalleryCount(shown, total) {
    const el = document.getElementById("gallery-count");
    if (!el) return;
    if (!total) { el.textContent = ""; return; }
    el.textContent = shown === total
        ? total + (total === 1 ? " photo" : " photos")
        : shown + " of " + total + " photos";
}

function applyGalleryFilter() {
    const grid = document.getElementById("gallery-container");
    const search = document.getElementById("gallery-search");
    if (!grid) return;
    const q = search ? search.value.trim().toLowerCase() : "";
    const items = grid.querySelectorAll(".gallery-item");
    let shown = 0;
    items.forEach(it => {
        const match = (!q || it.dataset.title.includes(q)) && (!currentCat || it.dataset.cat === currentCat);
        it.classList.toggle("is-hidden", !match);
        if (match) shown++;
    });
    let msg = grid.querySelector(".gallery-empty");
    if (items.length && !shown) {
        if (!msg) {
            msg = document.createElement("p");
            msg.className = "gallery-empty";
            msg.textContent = "No photos match your search.";
            grid.appendChild(msg);
        }
    } else if (msg) {
        msg.remove();
    }
    updateGalleryCount(shown, items.length);
    if (window.refreshCarousel) window.refreshCarousel(); // keep the 3D ring in sync with search and categories
}

function buildCategoryChips() {
    const box = document.getElementById("gallery-cats");
    if (!box) return;
    const names = new Map();
    Object.values(photoCache).forEach(p => { const c = (p.category || "").trim(); if (c) names.set(c.toLowerCase(), c); });
    if (!names.size) { box.hidden = true; box.innerHTML = ""; currentCat = ""; return; }
    if (currentCat && !names.has(currentCat)) currentCat = "";
    box.hidden = false;
    box.innerHTML = "";
    const make = (label, key) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.setAttribute("aria-pressed", String(currentCat === key));
        b.addEventListener("click", () => {
            currentCat = key;
            box.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", "false"));
            b.setAttribute("aria-pressed", "true");
            applyGalleryFilter();
        });
        box.appendChild(b);
    };
    make("All", "");
    [...names].sort((a, b) => a[1].localeCompare(b[1])).forEach(([k, v]) => make(v, k));
}

function setupGalleryTools() {
    const grid = document.getElementById("gallery-container");
    if (!grid) return;
    const buttons = document.querySelectorAll(".layout-toggle button");
    const setLayout = (layout) => {
        grid.dataset.layout = layout;
        buttons.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.layout === layout)));
        try { localStorage.setItem("galleryLayout", layout); } catch (e) {}
        if (window.refreshCarousel) requestAnimationFrame(window.refreshCarousel);
    };
    let saved = "mosaic";
    try { saved = localStorage.getItem("galleryLayout") || "mosaic"; } catch (e) {}
    setLayout(["masonry", "carousel"].includes(saved) ? saved : "mosaic");
    buttons.forEach(b => b.addEventListener("click", () => setLayout(b.dataset.layout)));

    const search = document.getElementById("gallery-search");
    if (search) search.addEventListener("input", applyGalleryFilter);
}

// Social links (icons are drawn from the settings saved in the admin panel)
const SOCIAL_ICONS = {
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    github: '<path d="M9 19c-4 1.5-4-2-6-2m12 4v-3.5a3 3 0 00-.8-2.3c2.8-.3 5.8-1.4 5.8-6.2A4.8 4.8 0 0019 5.8 4.5 4.5 0 0018.9 2S17.7 1.7 15 3.5a13.4 13.4 0 00-6 0C6.3 1.7 5.1 2 5.1 2A4.5 4.5 0 005 5.8 4.8 4.8 0 003.7 9.5c0 4.8 3 5.9 5.8 6.2A3 3 0 009 18v3"/>',
    linkedin: '<path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z"/>',
    facebook: '<path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>',
    youtube: '<path d="M22.5 6.4a2.8 2.8 0 00-2-2C18.8 4 12 4 12 4s-6.8 0-8.5.4a2.8 2.8 0 00-2 2C1 8.1 1 12 1 12s0 3.9.5 5.6a2.8 2.8 0 002 2C5.2 20 12 20 12 20s6.8 0 8.5-.4a2.8 2.8 0 002-2c.5-1.7.5-5.6.5-5.6s0-3.9-.5-5.6z"/><path d="M9.7 15.5l5.8-3.5-5.8-3.5z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'
};

function renderSocials(s) {
    const https = (u) => typeof u === "string" && /^https:\/\//i.test(u);
    const items = [{ key: "instagram", label: "Instagram", href: https(s.instagram) ? s.instagram : "https://www.instagram.com/me_anupgiri/" }];
    [["github", "GitHub"], ["linkedin", "LinkedIn"], ["facebook", "Facebook"], ["youtube", "YouTube"]].forEach(([key, label]) => {
        if (https(s[key])) items.push({ key, label, href: s[key] });
    });
    if (typeof s.publicEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.publicEmail)) {
        items.push({ key: "mail", label: "Email", href: "mailto:" + s.publicEmail });
    }
    document.querySelectorAll("[data-socials]").forEach(box => {
        const skipInstagram = box.dataset.socials === "no-instagram";
        box.replaceChildren();
        items.forEach(it => {
            if (skipInstagram && it.key === "instagram") return;
            const a = document.createElement("a");
            a.href = it.href;
            a.setAttribute("aria-label", it.label);
            a.title = it.label;
            if (it.key !== "mail") { a.target = "_blank"; a.rel = "noopener"; }
            a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + SOCIAL_ICONS[it.key] + "</svg>";
            box.appendChild(a);
        });
    });
}

// Site settings edited in the admin panel (intro text, status, location, CV, social links)
function syncSiteSettings() {
    renderSocials({});
    db.collection("settings").doc("site").onSnapshot(doc => {
        const s = doc.exists ? (doc.data() || {}) : {};
        const each = (sel, fn) => document.querySelectorAll(sel).forEach(fn);
        const https = (u) => typeof u === "string" && /^https:\/\//i.test(u);
        if (s.intro) each('[data-site="intro"]', el => { el.textContent = s.intro; });
        if (s.location) each('[data-site="location"]', el => { if (!el.dataset.override) el.textContent = s.location; });
        each('[data-site="status"]', el => { el.textContent = s.status || ""; el.hidden = !s.status; });
        each("[data-site-cv]", a => { a.hidden = !https(s.cvUrl); if (https(s.cvUrl)) a.href = s.cvUrl; });
        if (https(s.instagram)) {
            each("[data-site-instagram]", a => { a.href = s.instagram; });
            const handle = "@" + s.instagram.replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop();
            each('[data-site="instagram-handle"]', el => { el.textContent = handle; });
        }
        renderSocials(s);
    }, () => {});
}

// Thin bar at the top of the page, managed from the admin panel
function syncAnnouncement() {
    db.collection("settings").doc("announce").onSnapshot(doc => {
        const old = document.getElementById("announce");
        if (old) old.remove();
        if (!doc.exists) return;
        const a = doc.data() || {};
        if (!a.enabled || !a.text) return;
        const t = a.updatedAt;
        const stamp = String(t && t.toMillis ? t.toMillis() : (t || 0));
        try { if (localStorage.getItem("announceOff") === stamp) return; } catch (e) {}

        const bar = document.createElement("div");
        bar.id = "announce";
        bar.className = "announce";
        bar.setAttribute("role", "region");
        bar.setAttribute("aria-label", "Announcement");
        const msg = document.createElement("span");
        msg.textContent = a.text;
        bar.appendChild(msg);
        if (a.linkUrl && a.linkText && /^https:\/\//i.test(a.linkUrl)) {
            const l = document.createElement("a");
            l.href = a.linkUrl;
            l.rel = "noopener";
            l.textContent = a.linkText;
            bar.appendChild(l);
        }
        const x = document.createElement("button");
        x.type = "button";
        x.setAttribute("aria-label", "Dismiss announcement");
        x.innerHTML = icon("x");
        x.addEventListener("click", () => { try { localStorage.setItem("announceOff", stamp); } catch (e) {} bar.remove(); });
        bar.appendChild(x);
        const skip = document.querySelector(".skip");
        if (skip) skip.after(bar); else document.body.prepend(bar);
    }, () => {});
}

// "Be right back" screen while maintenance mode is on (visitors only; the admin portal still works)
function syncMaintenance() {
    const preview = /[?&]maintenance-preview=1/.test(window.location.search);
    db.collection("settings").doc("maintenance").onSnapshot(doc => {
        const old = document.getElementById("maint");
        if (old) old.remove();
        document.body.classList.remove("maint-on");
        const m = doc.exists ? (doc.data() || {}) : {};
        if (!m.enabled && !preview) return;

        const ov = document.createElement("div");
        ov.id = "maint";
        ov.className = "maint";
        ov.setAttribute("role", "dialog");
        ov.setAttribute("aria-modal", "true");
        ov.setAttribute("aria-labelledby", "maint-title");
        const card = document.createElement("div");
        card.className = "maint-card";
        card.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>';
        const h = document.createElement("h1");
        h.id = "maint-title";
        h.textContent = "We’ll be right back";
        const p = document.createElement("p");
        p.textContent = m.message || "I’m updating the website. Please check back soon.";
        card.append(h, p);
        if (preview && !m.enabled) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "maint-close";
            b.textContent = "Close preview";
            b.addEventListener("click", () => { ov.remove(); document.body.classList.remove("maint-on"); });
            card.appendChild(b);
        }
        ov.appendChild(card);
        document.body.appendChild(ov);
        document.body.classList.add("maint-on");
    }, () => {});
}

// Portfolio projects (managed from the admin panel)
function projectCard(p) {
    const card = document.createElement("article");
    card.className = "project-card";
    const media = document.createElement("div");
    media.className = "project-media";
    if (p.imageUrl) {
        const img = document.createElement("img");
        img.src = p.imageUrl;
        img.alt = p.title || "";
        img.loading = "lazy";
        media.appendChild(img);
    } else {
        media.classList.add("ph");
        media.textContent = (p.title || "?").trim().charAt(0).toUpperCase();
    }
    const body = document.createElement("div");
    body.className = "project-body";
    const h = document.createElement("h3");
    h.textContent = p.title || "Untitled";
    body.appendChild(h);
    if (p.description) { const d = document.createElement("p"); d.textContent = p.description; body.appendChild(d); }
    if (p.tags && p.tags.length) {
        const ul = document.createElement("ul");
        ul.className = "tags";
        p.tags.forEach(t => { const li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
        body.appendChild(ul);
    }
    if (p.url && /^https:\/\//i.test(p.url)) {
        const a = document.createElement("a");
        a.className = "project-link";
        a.href = p.url;
        a.target = "_blank";
        a.rel = "noopener";
        setLabel(a, "external", "View project", true);
        body.appendChild(a);
    }
    card.append(media, body);
    return card;
}

function loadProjects() {
    const page = document.getElementById("projects-container");
    const home = document.getElementById("home-projects-grid");
    if (!page && !home) return;
    db.collection("projects").orderBy("order", "asc").onSnapshot(snap => {
        const list = [];
        snap.forEach(d => list.push(d.data()));
        const has = list.length > 0;
        const nav = document.getElementById("nav-projects");
        const section = document.getElementById("home-projects");
        if (nav) nav.hidden = !has;
        if (section) section.hidden = !has;
        if (page) {
            page.innerHTML = "";
            if (has) list.forEach(p => {
                const card = projectCard(p);
                card.dataset.tags = "|" + (p.tags || []).map(t => String(t).toLowerCase()).join("|") + "|";
                page.appendChild(card);
            });
            else page.innerHTML = '<p class="gallery-empty" style="grid-column:1/-1">Projects are coming soon.</p>';
            buildProjectTags(list);
        }
        if (home) {
            home.innerHTML = "";
            list.slice(0, 3).forEach(p => home.appendChild(projectCard(p)));
        }
    }, () => {});
}

// Tag buttons above the projects (All, HTML, Firebase...) to filter the cards
let projectTag = "";
function buildProjectTags(list) {
    const box = document.getElementById("project-tags");
    if (!box) return;
    const names = new Map();
    list.forEach(p => (p.tags || []).forEach(t => { const k = String(t).trim().toLowerCase(); if (k && !names.has(k)) names.set(k, String(t).trim()); }));
    if (names.size < 2) { box.hidden = true; box.innerHTML = ""; projectTag = ""; filterProjects(); return; }
    if (projectTag && !names.has(projectTag)) projectTag = "";
    box.hidden = false;
    box.innerHTML = "";
    const make = (label, key) => {
        const b = document.createElement("button");
        b.type = "button";
        b.innerHTML = (key ? "" : icon("filter")) + "<span></span>";
        b.lastChild.textContent = label;
        b.setAttribute("aria-pressed", String(projectTag === key));
        b.addEventListener("click", () => {
            projectTag = key;
            box.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
            filterProjects();
        });
        box.appendChild(b);
    };
    make("All", "");
    [...names].slice(0, 14).forEach(([k, v]) => make(v, k));
    filterProjects();
}
function filterProjects() {
    document.querySelectorAll("#projects-container .project-card").forEach(c => {
        c.hidden = !!projectTag && !(c.dataset.tags || "").includes("|" + projectTag + "|");
    });
}

// Counts one visit per browser session (shown in the admin overview)
function countVisit() {
    if (window.location.protocol === "file:") return;
    try {
        if (sessionStorage.getItem("visitCounted")) return;
        sessionStorage.setItem("visitCounted", "1");
    } catch (e) {}
    db.collection("stats").doc("visits")
        .set({ count: firebase.firestore.FieldValue.increment(1) }, { merge: true })
        .catch(() => {});
    const day = new Date().toISOString().slice(0, 10);
    db.collection("statsDaily").doc(day)
        .set({ count: firebase.firestore.FieldValue.increment(1), day: day }, { merge: true })
        .catch(() => {});
}

// Contact Form Handler (validation, spam trap, 60 second cooldown)
function setupContactForm() {
    const contactForm = document.getElementById("contact-form");
    const statusMsg = document.getElementById("contact-status");
    const submitBtn = document.getElementById("contact-submit-btn");
    const COOLDOWN_MS = 60000;

    if (!contactForm) return;

    const say = (text, ok) => {
        statusMsg.classList.toggle("ok", !!ok);
        statusMsg.classList.toggle("bad", !ok && !!text);
        statusMsg.textContent = text;
    };

    // live character counter under the message box
    const msgBox = document.getElementById("contact-message");
    const counter = document.getElementById("contact-count");
    const count = () => {
        if (!counter) return;
        const n = msgBox.value.length;
        counter.textContent = n + " / 2000";
        counter.classList.toggle("warn", n > 1800);
    };
    msgBox.addEventListener("input", count);
    contactForm.addEventListener("reset", () => setTimeout(count, 0));

    contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nameEl = document.getElementById("contact-name");
        const name = nameEl ? nameEl.value.trim().slice(0, 80) : "";
        const email = document.getElementById("contact-email").value.trim();
        const message = document.getElementById("contact-message").value.trim();
        const trap = document.getElementById("contact-website");

        // Hidden field only bots fill in, or a form sent within 3 seconds of opening the page
        // (people can't type that fast): pretend it worked, send nothing
        if ((trap && trap.value) || performance.now() < 3000) {
            say("Your message has been sent successfully!", true);
            contactForm.reset();
            return;
        }

        if (!email || !message) { say("Please fill in all fields."); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say("Please enter a valid email address."); return; }
        if (message.length < 5) { say("Please write a slightly longer message."); return; }
        if (message.length > 2000) { say("Please keep your message under 2000 characters."); return; }

        let last = 0;
        try { last = Number(localStorage.getItem("lastMessageAt")) || 0; } catch (err) {}
        const wait = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
        if (wait > 0) { say(`Please wait ${wait} seconds before sending another message.`); return; }

        try {
            submitBtn.disabled = true;
            setLabel(submitBtn, "refresh", "Sending...");
            submitBtn.classList.add("busy");

            const base = { email: email, message: message, read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
            try {
                await db.collection("messages").add(name ? { ...base, name: name } : base);
            } catch (err) {
                // Older Firestore rules don't allow a "name" field yet: send it inside the message instead
                if (!name || err.code !== "permission-denied") throw err;
                await db.collection("messages").add({ ...base, message: ("From: " + name + "\n\n" + message).slice(0, 2000) });
            }

            try { localStorage.setItem("lastMessageAt", String(Date.now())); } catch (err) {}
            say("Your message has been sent successfully!", true);
            siteToast("Message sent. Thank you!");
            contactForm.reset();
        } catch (err) {
            console.error("Error sending message:", err);
            say("Failed to send message. Please try again.");
            siteToast("Message not sent. Please try again.", "error");
        } finally {
            submitBtn.disabled = false;
            setLabel(submitBtn, "send", "Send message", true);
            submitBtn.classList.remove("busy");
        }
    });
}

// Lightbox Setup
function setupLightbox() {
    const modal = document.getElementById("lightbox-modal");
    const closeBtn = document.getElementById("lightbox-close");

    if (!modal || !closeBtn) return;

    closeBtn.addEventListener("click", () => closeLightbox());

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeLightbox();
    });

    document.addEventListener("keydown", (e) => {
        if (modal.style.display !== "flex") return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") stepPhoto(-1);
        if (e.key === "ArrowRight") stepPhoto(1);
        if (e.key === "Tab") { // keep keyboard focus inside the photo viewer
            const f = [...modal.querySelectorAll("button,a[href]")].filter(el => el.offsetParent !== null);
            if (!f.length) return;
            const i = f.indexOf(document.activeElement);
            e.preventDefault();
            f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
        }
    });

    // share the photo's own address (phone share sheet, or copy to clipboard)
    const share = document.getElementById("lightbox-share");
    if (share) {
        const shareLabel = (t, ic) => setLabel(share, ic || (navigator.share ? "share" : "link"), t);
        if (navigator.share) shareLabel("Share");
        share.addEventListener("click", async (e) => {
            e.stopPropagation();
            const url = location.href;
            const label = navigator.share ? "Share" : "Copy link";
            try {
                if (navigator.share) { await navigator.share({ title: document.title, url }); return; }
                await navigator.clipboard.writeText(url);
                shareLabel("Link copied", "check");
                siteToast("Photo link copied");
            } catch (err) {
                if (err && err.name === "AbortError") return; // closed the share sheet
                shareLabel("Could not copy", "alert");
            }
            setTimeout(() => shareLabel(label), 2000);
        });
    }
    const dl = document.getElementById("lightbox-download");
    if (dl) dl.addEventListener("click", (e) => e.stopPropagation());

    // slideshow: next photo every 3.5 seconds
    const play = document.getElementById("lightbox-play");
    if (play) play.addEventListener("click", (e) => { e.stopPropagation(); slideTimer ? stopSlideshow() : startSlideshow(); });

    // full screen
    const full = document.getElementById("lightbox-full");
    if (full) {
        if (!modal.requestFullscreen) full.hidden = true;
        full.addEventListener("click", (e) => {
            e.stopPropagation();
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
            else modal.requestFullscreen().catch(() => {});
        });
        document.addEventListener("fullscreenchange", () => {
            const on = document.fullscreenElement === modal;
            full.innerHTML = icon(on ? "minimize" : "maximize");
            full.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
        });
    }

    const prev = document.getElementById("lightbox-prev");
    const next = document.getElementById("lightbox-next");
    if (prev) prev.addEventListener("click", (e) => { e.stopPropagation(); stepPhoto(-1); });
    if (next) next.addEventListener("click", (e) => { e.stopPropagation(); stepPhoto(1); });

    // swipe left / right on touch screens
    let startX = null;
    modal.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    modal.addEventListener("touchend", (e) => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        startX = null;
        if (Math.abs(dx) > 50) stepPhoto(dx < 0 ? 1 : -1);
    }, { passive: true });
}

function openLightbox(url, title, id) {
    const modal = document.getElementById("lightbox-modal");
    const img = document.getElementById("lightbox-img");
    const caption = document.getElementById("lightbox-caption");

    if (!modal || !img || !caption) return;

    const wasOpen = modal.style.display === "flex";
    if (!wasOpen) lightboxOpener = document.activeElement;
    currentPhotoId = id || null;
    if (wasOpen) { // slide the new photo in from the side you moved to
        img.classList.remove("swap-next", "swap-prev");
        void img.offsetWidth;
        img.classList.add(lbDir < 0 ? "swap-prev" : "swap-next");
    }
    img.src = url;
    img.alt = title || "";
    caption.textContent = title;
    modal.style.display = "flex";
    document.body.classList.add("lb-open");
    document.title = title + " | " + siteTitle;
    if (!wasOpen) { const c = document.getElementById("lightbox-close"); if (c) c.focus(); }

    const dl = document.getElementById("lightbox-download");
    if (dl) {
        dl.href = url;
        dl.download = (String(title || "photo").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "photo") + ".jpg";
    }

    // counter and previous/next buttons (hidden when there is only one photo)
    const idx = photoOrder.indexOf(currentPhotoId);
    const count = document.getElementById("lightbox-count");
    const many = photoOrder.length > 1 && idx > -1;
    if (count) count.textContent = idx > -1 ? (idx + 1) + " / " + photoOrder.length : "";
    ["lightbox-prev", "lightbox-next"].forEach(bid => {
        const btn = document.getElementById(bid);
        if (btn) btn.style.display = many ? "" : "none";
    });

    // load the next and previous photos in the background so arrows feel instant
    if (many) [1, -1].forEach(d => {
        const p = photoCache[photoOrder[(idx + d + photoOrder.length) % photoOrder.length]];
        if (p && p.url) { const pre = new Image(); pre.src = p.url; }
    });
}
let lightboxOpener = null;
let lbDir = 1;
let slideTimer = null;

function startSlideshow() {
    const play = document.getElementById("lightbox-play");
    if (photoOrder.length < 2) return;
    slideTimer = setInterval(() => stepPhoto(1), 3500);
    if (play) { play.innerHTML = icon("pause"); play.setAttribute("aria-label", "Pause slideshow"); play.classList.add("on"); }
}
function stopSlideshow() {
    const play = document.getElementById("lightbox-play");
    clearInterval(slideTimer);
    slideTimer = null;
    if (play) { play.innerHTML = icon("play"); play.setAttribute("aria-label", "Play slideshow"); play.classList.remove("on"); }
}

function stepPhoto(dir) {
    const n = photoOrder.length;
    const i = photoOrder.indexOf(currentPhotoId);
    if (n < 2 || i < 0) return;
    lbDir = dir;
    navigateTo("/gallery/" + encodeURIComponent(photoOrder[(i + dir + n) % n]));
}

// updateUrl=false when the route change itself is closing the photo
function closeLightbox(updateUrl = true) {
    const modal = document.getElementById("lightbox-modal");
    if (!modal || modal.style.display !== "flex") return;

    modal.style.display = "none";
    document.body.classList.remove("lb-open");
    stopSlideshow();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    currentPhotoId = null;
    if (updateUrl && /^\/gallery\/[^\/]+/.test(window.location.pathname)) {
        try { history.pushState(null, null, "/gallery"); } catch (e) {}
        pageLabel = "Gallery";
    }
    updateTitle();
    if (lightboxOpener && lightboxOpener.focus && document.contains(lightboxOpener)) lightboxOpener.focus();
    lightboxOpener = null;
}

// Mobile Menu Navigation
function setupMobileMenu() {
    const menuBtn = document.getElementById("mobile-menu-btn");
    const navLinks = document.getElementById("nav-links");

    if (!menuBtn || !navLinks) return;

    const set = (open) => {
        navLinks.classList.toggle("open", open);
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        menuBtn.innerHTML = icon(open ? "x" : "menu");
    };
    window.closeMobileMenu = () => set(false);

    menuBtn.addEventListener("click", () => set(!navLinks.classList.contains("open")));
    document.addEventListener("click", (e) => {
        if (navLinks.classList.contains("open") && !navLinks.contains(e.target) && !menuBtn.contains(e.target)) set(false);
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && navLinks.classList.contains("open")) { set(false); menuBtn.focus(); }
    });
    window.addEventListener("resize", () => { if (window.innerWidth > 820) set(false); });
}

document.addEventListener("DOMContentLoaded", () => {
    trackScroll();
    const topBtn = document.getElementById("f-top-btn");
    if (topBtn) topBtn.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
    if (!rolesStarted) startRoles(DEFAULT_ROLES);
    watchConnection();
    setupShortcuts();
});

/* ---------- small notifications in the corner ---------- */
function siteToast(text, type = "ok") {
    let box = document.getElementById("site-toasts");
    if (!box) {
        box = document.createElement("div");
        box.id = "site-toasts";
        box.className = "site-toasts";
        box.setAttribute("aria-live", "polite");
        document.body.appendChild(box);
    }
    const t = document.createElement("div");
    t.className = "site-toast " + type;
    t.innerHTML = icon(type === "error" ? "alert" : type === "info" ? "wifi-off" : "check");
    const span = document.createElement("span");
    span.textContent = text;
    t.appendChild(span);
    box.appendChild(t);
    setTimeout(() => t.classList.add("out"), 3400);
    setTimeout(() => t.remove(), 3900);
}

/* ---------- rotating words under the name (typing effect) ---------- */
const DEFAULT_ROLES = ["Web Developer", "AI Explorer", "BCA Student", "IT Enthusiast"];
let rolesStarted = false, rolesKey = "", rolesRun = 0;
function startRoles(list) {
    const el = document.getElementById("role-word");
    if (!el || !list.length) return;
    const key = list.join("|");
    if (key === rolesKey) return;
    rolesKey = key; rolesStarted = true;
    const run = ++rolesRun;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    el.textContent = list[0];
    if (list.length < 2) return;
    (async () => {
        let i = 0;
        while (run === rolesRun) {
            await wait(2200);
            if (run !== rolesRun) return;
            i = (i + 1) % list.length;
            if (calm) { el.textContent = list[i]; continue; }
            while (el.textContent.length) { if (run !== rolesRun) return; el.textContent = el.textContent.slice(0, -1); await wait(40); }
            for (const ch of list[i]) { if (run !== rolesRun) return; el.textContent += ch; await wait(70); }
        }
    })();
}

/* ---------- offline / back online notice ---------- */
function watchConnection() {
    addEventListener("offline", () => siteToast("You are offline. Showing saved content.", "info"));
    addEventListener("online", () => siteToast("Back online"));
}

/* ---------- keyboard: "/" searches the gallery ---------- */
function setupShortcuts() {
    document.addEventListener("keydown", (e) => {
        if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        e.preventDefault();
        if (!document.body.classList.contains("view-gallery")) navigateTo("/gallery");
        setTimeout(() => { const s = document.getElementById("gallery-search"); if (s) s.focus(); }, 60);
    });
}

function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Scroll progress line + highlight the nav link of the section in view
function trackScroll() {
    const bar = document.getElementById("bar");
    const links = document.querySelectorAll("#nav-links a");
    const map = { "home": "/", "about-section": "/about", "projects-section": "/projects", "gallery-section": "/gallery", "contact-section": "/contact" };
    const onScroll = () => {
        const d = document.documentElement;
        bar.style.width = (scrollY / (d.scrollHeight - innerHeight || 1)) * 100 + "%";
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (e.isIntersecting) links.forEach(a => a.classList.toggle("active", a.dataset.path === map[e.target.id]));
    }), { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
}

/* ---------- Home page popup (photos and videos managed from the admin panel) ---------- */
function parsePopupVideo(raw) {
    let u;
    try { u = new URL(String(raw).trim()); } catch (e) { return null; }
    if (u.protocol !== "https:") return null;
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
        if (u.pathname === "/watch") id = u.searchParams.get("v");
        else { const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/); if (m) id = m[1]; }
    }
    if (id && /^[\w-]{6,}$/.test(id)) return { kind: "iframe", src: "https://www.youtube-nocookie.com/embed/" + id + "?rel=0" };
    if (host === "vimeo.com") { const m = u.pathname.match(/^\/(\d+)/); if (m) return { kind: "iframe", src: "https://player.vimeo.com/video/" + m[1] }; }
    if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) return { kind: "file", src: u.href };
    return null;
}

function popupAlreadySeen(freq, stamp) {
    try {
        if (localStorage.getItem("popupOff") === stamp) return true; // visitor chose "don't show again"
        if (freq === "always") return false;
        if (freq === "session") return sessionStorage.getItem("popupSeenSession") === stamp;
        const raw = JSON.parse(localStorage.getItem("popupSeen") || "null");
        if (!raw || raw.stamp !== stamp) return false;
        return freq === "daily" ? Date.now() - raw.t < 86400000 : true; // "once"
    } catch (e) { return false; }
}

function initPopup() {
    const preview = /[?&]popup-preview=1/.test(window.location.search);
    const fresh = (q) => q.get({ source: "server" }).catch(() => q.get());

    Promise.all([
        fresh(db.collection("settings").doc("popup")),
        fresh(db.collection("popupSlides").orderBy("order", "asc"))
    ]).then(([cfgDoc, slidesSnap]) => {
        const cfg = cfgDoc.exists ? (cfgDoc.data() || {}) : {};
        const slides = [];
        slidesSnap.forEach(d => slides.push(d.data()));
        if (!preview && !cfg.enabled) return;
        if (!slides.length && !cfg.title && !cfg.text) return;

        const t = cfg.updatedAt;
        const stamp = String(t && t.toMillis ? t.toMillis() : (t || 0));
        const freq = cfg.frequency || "session";
        if (!preview && popupAlreadySeen(freq, stamp)) return;

        setTimeout(() => {
            const lb = document.getElementById("lightbox-modal");
            if (!preview && lb && lb.style.display === "flex") return; // don't cover an opened photo
            if (document.getElementById("pop-overlay")) return;
            if (!preview) {
                try {
                    sessionStorage.setItem("popupSeenSession", stamp);
                    localStorage.setItem("popupSeen", JSON.stringify({ stamp, t: Date.now() }));
                } catch (e) {}
            }
            showPopup(cfg, slides, stamp, preview);
        }, 1200);
    }).catch(err => console.warn("Popup not loaded:", err));
}

function showPopup(cfg, slides, stamp, preview) {
    const opener = document.activeElement;
    const ov = document.createElement("div");
    ov.id = "pop-overlay";
    ov.className = "pop-overlay";

    const card = document.createElement("div");
    card.className = "pop-card" + (slides.length ? "" : " no-media");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-label", cfg.title || "Announcement");

    const closeBtn = document.createElement("button");
    closeBtn.className = "pop-close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = icon("x");
    card.appendChild(closeBtn);

    if (preview) {
        const tag = document.createElement("span");
        tag.className = "pop-preview-tag";
        tag.textContent = "Preview";
        card.appendChild(tag);
    }

    let index = 0;
    let stage = null, dots = [];
    const renderSlide = (i) => {
        index = (i + slides.length) % slides.length;
        const sl = slides[index];
        stage.replaceChildren();
        stage.classList.toggle("is-photo", sl.type === "photo");
        if (sl.type === "photo") {
            // soft blurred copy of the photo fills the empty space around tall or wide pictures
            const bg = document.createElement("div");
            bg.className = "pop-blur";
            bg.style.backgroundImage = 'url("' + String(sl.url).replace(/["\\\n\r]/g, "") + '")';
            const img = document.createElement("img");
            img.src = sl.url;
            img.alt = cfg.title || "";
            stage.append(bg, img);
        } else {
            const v = parsePopupVideo(sl.url);
            if (v && v.kind === "iframe") {
                const f = document.createElement("iframe");
                f.src = v.src;
                f.title = "Video";
                f.allow = "accelerometer; encrypted-media; picture-in-picture; fullscreen";
                f.allowFullscreen = true;
                f.referrerPolicy = "strict-origin-when-cross-origin";
                stage.appendChild(f);
            } else if (v && v.kind === "file") {
                const vid = document.createElement("video");
                vid.src = v.src;
                vid.controls = true;
                vid.playsInline = true;
                vid.preload = "metadata";
                stage.appendChild(vid);
            }
        }
        dots.forEach((d, k) => d.setAttribute("aria-current", k === index ? "true" : "false"));
    };

    if (slides.length) {
        const media = document.createElement("div");
        media.className = "pop-media";
        stage = document.createElement("div");
        stage.className = "pop-stage";
        media.appendChild(stage);
        if (slides.length > 1) {
            const prev = document.createElement("button");
            prev.className = "pop-nav pop-prev"; prev.type = "button"; prev.setAttribute("aria-label", "Previous"); prev.innerHTML = icon("chevron-left");
            prev.addEventListener("click", () => renderSlide(index - 1));
            const next = document.createElement("button");
            next.className = "pop-nav pop-next"; next.type = "button"; next.setAttribute("aria-label", "Next"); next.innerHTML = icon("chevron-right");
            next.addEventListener("click", () => renderSlide(index + 1));
            const dotBox = document.createElement("div");
            dotBox.className = "pop-dots";
            slides.forEach((_, k) => {
                const d = document.createElement("button");
                d.type = "button"; d.setAttribute("aria-label", "Go to item " + (k + 1));
                d.addEventListener("click", () => renderSlide(k));
                dots.push(d); dotBox.appendChild(d);
            });
            media.append(prev, next, dotBox);
        }
        card.appendChild(media);
        renderSlide(0);
    }

    const body = document.createElement("div");
    body.className = "pop-body";
    if (cfg.title) { const h = document.createElement("h3"); h.textContent = cfg.title; body.appendChild(h); }
    if (cfg.text) { const p = document.createElement("p"); p.textContent = cfg.text; body.appendChild(p); }
    const actions = document.createElement("div");
    actions.className = "pop-actions";
    if (cfg.buttonUrl && cfg.buttonText && /^https:\/\//i.test(cfg.buttonUrl)) {
        const a = document.createElement("a");
        a.className = "pop-cta";
        a.href = cfg.buttonUrl;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = cfg.buttonText;
        actions.appendChild(a);
    }
    if (actions.children.length) body.appendChild(actions);
    if (body.children.length) card.appendChild(body);

    ov.appendChild(card);
    document.body.appendChild(ov);
    document.body.classList.add("pop-open");
    closeBtn.focus();

    function close() {
        document.removeEventListener("keydown", onKey);
        ov.remove(); // also stops any playing video
        document.body.classList.remove("pop-open");
        if (opener && opener.focus) opener.focus();
    }
    function onKey(e) {
        if (e.key === "Escape") close();
        else if (e.key === "ArrowLeft" && slides.length > 1) renderSlide(index - 1);
        else if (e.key === "ArrowRight" && slides.length > 1) renderSlide(index + 1);
        else if (e.key === "Tab") {
            const f = [...card.querySelectorAll("button:not([disabled]),a[href]")];
            if (!f.length) return;
            const i = f.indexOf(document.activeElement);
            e.preventDefault();
            f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
        }
    }
    closeBtn.addEventListener("click", close);
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    document.addEventListener("keydown", onKey);
}


/* ---------- Editable page content, images and theme (managed in the admin "Content" section) ---------- */
const DEF_TEXT = { greeting: "Hello, I’m", name: "Anup Giri", btn1: "Say Hello!", btn2: "View gallery" };
let termSignature = "[]"; // "[]" = no edited lines, keep the default terminal

function remember(el, key) {
    if (el && el.dataset[key] === undefined) el.dataset[key] = el.textContent;
    return el ? el.dataset[key] : "";
}

function applyContent(c) {
    const $$ = (sel) => document.querySelectorAll(sel);
    const str = (v) => (typeof v === "string" ? v.trim() : "");

    // heading + buttons
    $$('[data-site="hero-title"]').forEach(h1 => {
        const nm = document.createElement("span");
        nm.className = "grad";
        nm.textContent = str(c.heroName) || DEF_TEXT.name;
        h1.replaceChildren(document.createTextNode(str(c.heroGreeting) || DEF_TEXT.greeting), document.createElement("br"), nm);
    });
    $$('[data-site="btn-primary"]').forEach(a => { a.textContent = str(c.btnPrimary) || DEF_TEXT.btn1; });
    $$('[data-site="btn-secondary"]').forEach(a => { a.textContent = str(c.btnSecondary) || DEF_TEXT.btn2; });

    // rotating words under the name (comma separated in the admin)
    const roles = str(c.heroRoles).split(",").map(x => x.trim()).filter(Boolean).slice(0, 8);
    startRoles(roles.length ? roles : DEFAULT_ROLES);

    // home stat cards
    $$("[data-stat]").forEach(card => {
        const i = Number(card.dataset.stat);
        const o = (Array.isArray(c.stats) && c.stats[i]) || {};
        const b = card.querySelector("b"), sp = card.querySelector("span");
        const defV = remember(b, "def"), defL = remember(sp, "def");
        if (str(o.value)) { b.removeAttribute("data-count"); b.dataset.override = "1"; b.textContent = o.value.trim(); }
        else if (b.dataset.override) { delete b.dataset.override; b.textContent = defV; }
        sp.textContent = str(o.label) || defL;
    });

    // about page
    $$('[data-site="about-bio"]').forEach(p => { p.textContent = str(c.aboutBio); p.hidden = !str(c.aboutBio); });
    $$("[data-fact]").forEach(card => {
        const i = Number(card.dataset.fact);
        const o = (Array.isArray(c.facts) && c.facts[i]) || {};
        const dt = card.querySelector("dt"), dd = card.querySelector("dd");
        const last = dt.lastChild;
        if (last && last.nodeType === 3) {
            if (dt.dataset.def === undefined) dt.dataset.def = last.nodeValue;
            last.nodeValue = str(o.label) || dt.dataset.def;
        }
        dd.textContent = str(o.value) || remember(dd, "def");
    });

    // skill cards + their pop-up details
    const keys = ["ai", "it", "web"];
    window.siteTopics = {};
    keys.forEach((key, i) => {
        const o = (Array.isArray(c.skills) && c.skills[i]) || {};
        const art = document.querySelector('.skills article[data-topic="' + key + '"]');
        if (!art) return;
        const h3 = art.querySelector("h3"), p = art.querySelector("p");
        h3.textContent = str(o.title) || remember(h3, "def");
        p.textContent = str(o.summary) || remember(p, "def");
        window.siteTopics[key] = {
            intro: str(o.intro),
            items: Array.isArray(o.items) ? o.items.map(str).filter(Boolean) : [],
            tags: Array.isArray(o.tags) ? o.tags.map(str).filter(Boolean) : [],
            goal: str(o.goal)
        };
    });

    // home terminal
    const body = document.querySelector(".term-body");
    if (body) {
        if (body.dataset.def === undefined) body.dataset.def = body.innerHTML;
        const lines = Array.isArray(c.terminal) ? c.terminal.filter(l => l && str(l.cmd)) : [];
        const sig = JSON.stringify(lines);
        if (sig !== termSignature) {
            termSignature = sig;
            if (lines.length) {
                body.replaceChildren();
                lines.forEach(l => {
                    const cmd = document.createElement("p");
                    const pr = document.createElement("span");
                    pr.className = "pr"; pr.textContent = "$";
                    cmd.append(pr, str(l.cmd));
                    body.appendChild(cmd);
                    if (str(l.out)) { const out = document.createElement("p"); out.className = "out"; out.textContent = str(l.out); body.appendChild(out); }
                });
                const end = document.createElement("p");
                const pr = document.createElement("span");
                pr.className = "pr"; pr.textContent = "$";
                const cur = document.createElement("i");
                cur.className = "cur";
                end.append(pr, cur);
                body.appendChild(end);
            } else {
                body.innerHTML = body.dataset.def;
            }
            if (window.startTerminal) window.startTerminal();
        }
    }

    // contact + footer text
    $$('[data-site="contact-text"]').forEach(el => { el.textContent = str(c.contactText) || remember(el, "def"); });
    $$('[data-site="footer-text"]').forEach(el => { el.textContent = str(c.footerText) || remember(el, "def"); });

    // "My journey" timeline on the About page (education, milestones)
    const tl = document.getElementById("timeline");
    if (tl) {
        if (tl.dataset.def === undefined) tl.dataset.def = tl.innerHTML;
        const steps = Array.isArray(c.journey) ? c.journey.filter(s => s && str(s.title)) : [];
        if (steps.length) {
            tl.replaceChildren();
            steps.forEach(s => {
                const li = document.createElement("li");
                if (str(s.when)) { const w = document.createElement("span"); w.className = "tl-when"; w.textContent = str(s.when); li.appendChild(w); }
                const h = document.createElement("h4"); h.textContent = str(s.title); li.appendChild(h);
                if (str(s.place)) { const p = document.createElement("p"); p.className = "tl-where"; p.textContent = str(s.place); li.appendChild(p); }
                if (str(s.text)) { const p = document.createElement("p"); p.textContent = str(s.text); li.appendChild(p); }
                tl.appendChild(li);
            });
        } else if (tl.innerHTML !== tl.dataset.def) {
            tl.innerHTML = tl.dataset.def;
        }
    }

    // browser title + search description
    if (!document.documentElement.dataset.defTitle) document.documentElement.dataset.defTitle = siteTitle;
    siteTitle = str(c.pageTitle) || document.documentElement.dataset.defTitle;
    updateTitle();
    const desc = str(c.metaDescription);
    if (desc) {
        ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'].forEach(sel => {
            const m = document.querySelector(sel); if (m) m.setAttribute("content", desc);
        });
    }
    if (str(c.pageTitle)) {
        ['meta[property="og:title"]', 'meta[name="twitter:title"]'].forEach(sel => {
            const m = document.querySelector(sel); if (m) m.setAttribute("content", c.pageTitle.trim());
        });
    }

    // color theme (cached so the next visit has no flash)
    if (window.applyTheme) {
        const theme = window.THEMES && window.THEMES[c.theme] ? c.theme : "sky";
        window.applyTheme(theme);
        try { if (theme === "sky") localStorage.removeItem("siteTheme"); else localStorage.setItem("siteTheme", theme); } catch (e) {}
    }
}

function syncContent() {
    db.collection("settings").doc("content").onSnapshot(doc => {
        applyContent(doc.exists ? (doc.data() || {}) : {});
    }, () => {});

    // profile photo (home page) and feature image (About page) uploaded in the admin
    db.collection("settings").doc("images").onSnapshot(doc => {
        const im = doc.exists ? (doc.data() || {}) : {};
        [[".photo-card img", im.profile], [".robot img", im.feature]].forEach(([sel, url]) => {
            const img = document.querySelector(sel);
            if (!img) return;
            if (!img.dataset.def) img.dataset.def = img.getAttribute("src");
            img.src = (typeof url === "string" && url.startsWith("data:image/")) ? url : img.dataset.def;
        });
    }, () => {});
}
