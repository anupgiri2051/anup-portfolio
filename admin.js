// Admin portal: Firebase Authentication, dashboard (stats, chart, recent messages), photos,
// message inbox, site settings and account (change password, auto sign-out).

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = id => document.getElementById(id);

const IDLE_MS = 30 * 60 * 1000;
const VIEWS = { overview: "Overview", photos: "Photos", projects: "Projects", popup: "Popup", messages: "Messages", settings: "Site settings", account: "Account" };
const IDLE_EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"];

let unsubs = [];
let started = false;
let allMessages = [];
let settingsLoaded = false;
let idleTimer = null;
let popupLoaded = false;
let slides = [];
let annLoaded = false;
let maintLoaded = false;
let projects = [];
let editingProject = null;

document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    initNav();
    setupImagePreview();
    setupDropzone();
    setupUploadForm();
    setupSettingsForm();
    setupMessageTools();
    setupPasswordForm();
    setupPopupTools();
    setupProjectForm();
    setupAnnouncementTools();
    setupBackup();
});

/* ---------- small UI helpers ---------- */
function toast(message, type = "ok") {
    const t = document.createElement("div");
    t.className = "toast " + type;
    t.textContent = message;
    $("toasts").appendChild(t);
    setTimeout(() => t.classList.add("out"), 3200);
    setTimeout(() => t.remove(), 3700);
}

// Pop-up dialog: confirm (returns true/null) or text input (returns the text/null)
function ask({ title, text = "", ok = "OK", danger = false, input = null }) {
    return new Promise(resolve => {
        const ov = $("dlg"), inp = $("dlg-input"), okB = $("dlg-ok"), cancel = $("dlg-cancel");
        const opener = document.activeElement;
        $("dlg-title").textContent = title;
        $("dlg-text").textContent = text;
        $("dlg-text").hidden = !text;
        okB.textContent = ok;
        okB.classList.toggle("danger", danger);
        inp.hidden = !input;
        if (input) { inp.value = input.value || ""; inp.maxLength = input.max || 200; }
        ov.hidden = false;
        (input ? inp : okB).focus();
        if (input) inp.select();

        const done = value => {
            ov.hidden = true;
            document.removeEventListener("keydown", key);
            ov.onclick = okB.onclick = cancel.onclick = null;
            if (opener && opener.focus) opener.focus();
            resolve(value);
        };
        const key = e => {
            if (e.key === "Escape") done(null);
            else if (e.key === "Enter" && input && document.activeElement === inp) { e.preventDefault(); done(inp.value.trim()); }
            else if (e.key === "Tab") {
                const f = [...ov.querySelectorAll("input:not([hidden]),button")];
                const i = f.indexOf(document.activeElement);
                e.preventDefault();
                f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
            }
        };
        okB.onclick = () => done(input ? inp.value.trim() : true);
        cancel.onclick = () => done(null);
        ov.onclick = e => { if (e.target === ov) done(null); };
        document.addEventListener("keydown", key);
    });
}

/* ---------- navigation ---------- */
function currentView() {
    // old links such as /admin#messages are still understood
    const hash = (location.hash || "").slice(1);
    if (VIEWS[hash]) return hash;
    const m = location.pathname.match(/^\/admin\/([a-z]+)\/?$/);
    return m && VIEWS[m[1]] ? m[1] : "overview";
}

function viewPath(view) {
    return "/admin/" + view;
}

function showView(view) {
    document.querySelectorAll(".view").forEach(el => { el.hidden = el.id !== "view-" + view; });
    document.querySelectorAll(".sb-nav a").forEach(a => a.classList.toggle("active", a.dataset.view === view));
    $("page-title").textContent = VIEWS[view];
    document.body.classList.remove("sb-open");
    window.scrollTo(0, 0);
}

function setPath(target, replace) {
    try { history[replace ? "replaceState" : "pushState"](null, "", target); } catch (e) {}
}

function go(view) {
    const target = viewPath(view);
    if (location.pathname !== target || location.hash) setPath(target, false);
    showView(view);
}

function initNav() {
    document.querySelectorAll("[data-view]").forEach(a =>
        a.addEventListener("click", e => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let "open in new tab" work
            e.preventDefault();
            go(a.dataset.view);
        }));
    window.addEventListener("popstate", () => showView(currentView()));
    $("menu-btn").addEventListener("click", () => document.body.classList.toggle("sb-open"));
    $("sb-scrim").addEventListener("click", () => document.body.classList.remove("sb-open"));

    // tidy the address bar: /admin -> /admin/overview, /admin#messages -> /admin/messages, unknown -> overview
    const view = currentView();
    if (location.pathname !== viewPath(view) || location.hash) setPath(viewPath(view), true);
    showView(view);
}

/* ---------- authentication ---------- */
function authError(code) {
    switch (code) {
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
        case "auth/wrong-password":
        case "auth/user-not-found":
        case "auth/invalid-email":
            return "Wrong email or password.";
        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";
        case "auth/network-request-failed":
            return "Network error. Check your connection, or turn off ad blockers for this site.";
        case "auth/operation-not-allowed":
            return "Email/password sign-in is not enabled in Firebase yet (Authentication → Sign-in method).";
        case "auth/user-disabled":
            return "This account is disabled in Firebase.";
        case "auth/unauthorized-domain":
            return "This website address is not allowed in Firebase (Authentication → Settings → Authorized domains).";
        case "auth/invalid-api-key":
        case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
            return "The Firebase API key is not valid. Check firebase-config.js.";
        default:
            if (/requests-from-referer|referer/i.test(code || "")) {
                return "This website address is blocked by the Firebase API key restrictions (Google Cloud → Credentials).";
            }
            return "Could not sign in (" + (code || "unknown error") + "). Please try again.";
    }
}

function initAuth() {
    const errorMsg = $("login-error");

    $("toggle-pass").addEventListener("click", () => {
        const p = $("admin-password");
        const show = p.type === "password";
        p.type = show ? "text" : "password";
        $("toggle-pass").textContent = show ? "Hide" : "Show";
        $("toggle-pass").setAttribute("aria-label", show ? "Hide password" : "Show password");
    });

    if (!auth) {
        errorMsg.textContent = "Authentication is not available. Check that firebase-auth-compat.js is loaded.";
        return;
    }

    auth.onAuthStateChanged(user => (user ? showDashboard(user) : showLoginModal()));

    $("login-form").addEventListener("submit", async e => {
        e.preventDefault();
        const btn = $("login-btn");
        errorMsg.textContent = "";
        errorMsg.style.color = "";
        btn.disabled = true;
        try {
            await auth.signInWithEmailAndPassword($("admin-email").value.trim(), $("admin-password").value);
            $("admin-password").value = "";
        } catch (err) {
            console.error("Sign-in error:", err.code, err.message);
            errorMsg.textContent = authError(err.code);
        } finally {
            btn.disabled = false;
        }
    });

    $("reset-pass").addEventListener("click", async () => {
        const email = $("admin-email").value.trim();
        errorMsg.style.color = "";
        if (!email) { errorMsg.textContent = "Type your email first, then click “Forgot password?”."; return; }
        try {
            await auth.sendPasswordResetEmail(email);
            errorMsg.style.color = "#16a34a";
            errorMsg.textContent = "Password reset email sent. Check your inbox (and spam).";
        } catch (err) {
            errorMsg.textContent = authError(err.code);
        }
    });

    const logout = () => auth.signOut();
    $("logout-btn").addEventListener("click", logout);
    $("logout-btn-2").addEventListener("click", logout);
}

function greeting() {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function showDashboard(user) {
    $("login-modal").style.display = "none";
    $("admin-dashboard").style.display = "block";
    const email = user.email || "";
    $("user-email").textContent = email;
    $("user-avatar").textContent = (email[0] || "A").toUpperCase();
    $("acc-email").textContent = email;
    let last = "–";
    try { last = user.metadata && user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : "–"; } catch (e) {}
    $("acc-last").textContent = last;
    $("greeting").textContent = greeting() + "!";
    startIdleWatch();
    showView(currentView());
    if (started) return;
    started = true;
    loadStats();
    loadAdminGallery();
    loadMessages();
    loadSettings();
    loadPopup();
    loadSlides();
    loadProjects();
    loadVisits();
}

function showLoginModal() {
    $("login-modal").style.display = "flex";
    $("admin-dashboard").style.display = "none";
    stopIdleWatch();
    unsubs.forEach(fn => fn());
    unsubs = [];
    started = false;
    settingsLoaded = false;
    popupLoaded = false;
    annLoaded = false;
    maintLoaded = false;
    allMessages = [];
    slides = [];
    projects = [];
}

// Automatic sign-out after 30 minutes without activity
function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => {
        await auth.signOut();
        const m = $("login-error");
        m.style.color = "";
        m.textContent = "You were signed out after 30 minutes of inactivity.";
    }, IDLE_MS);
}
function startIdleWatch() {
    IDLE_EVENTS.forEach(ev => window.addEventListener(ev, resetIdle, { passive: true }));
    resetIdle();
}
function stopIdleWatch() {
    clearTimeout(idleTimer);
    IDLE_EVENTS.forEach(ev => window.removeEventListener(ev, resetIdle));
}

function listen(query, onData, onError) {
    unsubs.push(query.onSnapshot(onData, onError || (err => console.error("Listener error:", err))));
}

function setStat(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
}

/* ---------- overview ---------- */
function loadStats() {
    listen(db.collection("stats").doc("visits"),
        doc => setStat("stat-visits", doc.exists ? (doc.data().count || 0) : 0),
        () => setStat("stat-visits", "–"));
}

function messageTime(m) {
    try { return m.createdAt ? m.createdAt.toDate() : null; } catch (e) { return null; }
}
function messageDate(m) {
    const d = messageTime(m);
    return d ? d.toLocaleString() : "Recently";
}

function drawBars(box, labels, counts) {
    if (!box) return;
    const max = Math.max(1, ...counts);
    box.innerHTML = "";
    counts.forEach((c, i) => {
        const col = document.createElement("div");
        col.className = "bar";
        const n = document.createElement("b");
        n.textContent = c;
        const track = document.createElement("div");
        track.className = "track";
        const fill = document.createElement("i");
        fill.style.height = (c / max * 100) + "%";
        track.appendChild(fill);
        const label = document.createElement("span");
        label.textContent = labels[i];
        col.append(n, track, label);
        box.appendChild(col);
    });
}

function renderChart() {
    const days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (6 - i));
        return d;
    });
    const counts = days.map(() => 0);
    allMessages.forEach(m => {
        const t = messageTime(m);
        if (!t) return;
        const i = days.findIndex(d => t >= d && t < new Date(d.getTime() + 86400000));
        if (i > -1) counts[i]++;
    });
    drawBars($("chart7"), days.map(d => d.toLocaleDateString(undefined, { weekday: "short" })), counts);
    setStat("chart-total", counts.reduce((a, b) => a + b, 0));
}

// Visits per day for the last 14 days (the website adds one visit per browser session)
function loadVisits() {
    const box = $("chart14");
    listen(db.collection("statsDaily").orderBy("day", "desc").limit(14), snap => {
        const byDay = {};
        snap.forEach(d => { const x = d.data(); byDay[x.day] = x.count || 0; });
        const days = [...Array(14)].map((_, i) => {
            const d = new Date();
            d.setUTCDate(d.getUTCDate() - (13 - i));
            return d;
        });
        const counts = days.map(d => byDay[d.toISOString().slice(0, 10)] || 0);
        drawBars(box, days.map(d => String(d.getUTCDate())), counts);
        setStat("visits-total", counts.reduce((a, b) => a + b, 0));
    }, () => {
        box.innerHTML = `<p class="empty" style="width:100%">Daily visits will show here once the latest Firestore rules are published.</p>`;
    });
}

function renderRecent() {
    const box = $("recent-messages");
    if (!box) return;
    if (!allMessages.length) { box.innerHTML = `<p class="empty">No messages yet.</p>`; return; }
    box.innerHTML = "";
    allMessages.slice(0, 5).forEach(m => {
        const a = document.createElement("a");
        a.href = "/admin/messages";
        a.addEventListener("click", e => { e.preventDefault(); go("messages"); });
        const who = document.createElement("strong");
        if (!m.read) { const dot = document.createElement("span"); dot.className = "dot"; who.appendChild(dot); }
        who.append(m.email || "(no email)");
        const text = document.createElement("p");
        text.textContent = m.message || "";
        const when = document.createElement("small");
        when.textContent = messageDate(m);
        a.append(who, text, when);
        box.appendChild(a);
    });
}

/* ---------- site settings, announcement bar, maintenance mode ---------- */
const SITE_FIELDS = {
    intro: "set-intro", location: "set-location", status: "set-status", cvUrl: "set-cv",
    instagram: "set-instagram", github: "set-github", linkedin: "set-linkedin",
    facebook: "set-facebook", youtube: "set-youtube", publicEmail: "set-email"
};
const URL_LABELS = { cvUrl: "CV", instagram: "Instagram", github: "GitHub", linkedin: "LinkedIn", facebook: "Facebook", youtube: "YouTube" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function loadSettings() {
    listen(db.collection("settings").doc("site"), doc => {
        if (settingsLoaded) return; // don't overwrite what is being typed
        settingsLoaded = true;
        const s = doc.exists ? doc.data() : {};
        Object.entries(SITE_FIELDS).forEach(([key, id]) => { $(id).value = s[key] || ""; });
    });
    listen(db.collection("settings").doc("announce"), doc => {
        if (annLoaded) return;
        annLoaded = true;
        const a = doc.exists ? doc.data() : {};
        $("ann-enabled").checked = !!a.enabled;
        $("ann-text").value = a.text || "";
        $("ann-link-text").value = a.linkText || "";
        $("ann-link-url").value = a.linkUrl || "";
    });
    listen(db.collection("settings").doc("maintenance"), doc => {
        if (maintLoaded) return;
        maintLoaded = true;
        const m = doc.exists ? doc.data() : {};
        $("maint-enabled").checked = !!m.enabled;
        $("maint-message").value = m.message || "";
    });
}

function setupSettingsForm() {
    const status = $("settings-status");
    $("settings-form").addEventListener("submit", async e => {
        e.preventDefault();
        const payload = {};
        Object.entries(SITE_FIELDS).forEach(([key, id]) => { payload[key] = $(id).value.trim(); });
        for (const key of Object.keys(URL_LABELS)) {
            if (payload[key] && !/^https:\/\//i.test(payload[key])) {
                status.style.color = "var(--danger)";
                status.textContent = `The ${URL_LABELS[key]} link must start with https://`;
                return;
            }
        }
        if (payload.publicEmail && !EMAIL_RE.test(payload.publicEmail)) {
            status.style.color = "var(--danger)";
            status.textContent = "Enter a valid public email address.";
            return;
        }
        const btn = $("settings-btn");
        btn.disabled = true;
        try {
            await db.collection("settings").doc("site").set({
                ...payload,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            status.style.color = "var(--ok)";
            status.textContent = "Settings saved.";
            toast("Settings saved");
        } catch (err) {
            console.error(err);
            status.style.color = "var(--danger)";
            status.textContent = "Could not save. Check your Firestore rules.";
            toast("Could not save settings", "error");
        } finally {
            btn.disabled = false;
        }
    });
}

function setupAnnouncementTools() {
    const say = (el, text, ok) => { el.style.color = ok ? "var(--ok)" : "var(--danger)"; el.textContent = text; };

    $("ann-form").addEventListener("submit", async e => {
        e.preventDefault();
        const status = $("ann-status");
        const enabled = $("ann-enabled").checked;
        const text = $("ann-text").value.trim();
        const linkText = $("ann-link-text").value.trim();
        const linkUrl = $("ann-link-url").value.trim();
        if (enabled && !text) { say(status, "Write the announcement message first."); return; }
        if (linkUrl && !/^https:\/\//i.test(linkUrl)) { say(status, "The link address must start with https://"); return; }
        if (linkUrl && !linkText) { say(status, "Add link text, or clear the link address."); return; }
        const btn = $("ann-save");
        btn.disabled = true;
        try {
            await db.collection("settings").doc("announce").set({
                enabled, text, linkText, linkUrl,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            say(status, enabled ? "Saved. The announcement bar is ON." : "Saved. The announcement bar is OFF.", true);
            toast("Announcement saved");
        } catch (err) {
            console.error(err);
            say(status, "Could not save. Check your Firestore rules.");
        } finally {
            btn.disabled = false;
        }
    });

    $("maint-form").addEventListener("submit", async e => {
        e.preventDefault();
        const status = $("maint-status");
        const btn = $("maint-save");
        btn.disabled = true;
        try {
            await db.collection("settings").doc("maintenance").set({
                enabled: $("maint-enabled").checked,
                message: $("maint-message").value.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            say(status, $("maint-enabled").checked ? "Saved. Visitors now see the maintenance screen." : "Saved. Maintenance mode is OFF.", true);
            toast($("maint-enabled").checked ? "Maintenance mode ON" : "Maintenance mode OFF");
        } catch (err) {
            console.error(err);
            say(status, "Could not save. Check your Firestore rules.");
        } finally {
            btn.disabled = false;
        }
    });

    $("maint-preview").addEventListener("click", () => window.open("/?maintenance-preview=1", "_blank", "noopener"));
}

/* ---------- photos ---------- */
function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

function setupImagePreview() {
    const fileInput = $("photo-file");
    const wrapper = $("preview-wrapper");
    const box = $("image-preview");
    fileInput.addEventListener("change", e => {
        const files = Array.from(e.target.files);
        box.innerHTML = "";
        wrapper.style.display = files.length ? "block" : "none";
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = evt => {
                const img = document.createElement("img");
                img.src = evt.target.result;
                img.alt = "";
                box.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });
}

function setupDropzone() {
    const dz = $("dropzone");
    const input = $("photo-file");
    ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
    dz.addEventListener("drop", e => {
        const files = [...e.dataTransfer.files].filter(f => f.type.startsWith("image/"));
        if (!files.length) return;
        const dt = new DataTransfer();
        files.forEach(f => dt.items.add(f));
        input.files = dt.files;
        input.dispatchEvent(new Event("change"));
    });
}

function setupUploadForm() {
    const form = $("upload-form");
    const status = $("upload-status");
    const btn = $("upload-btn");
    const bar = $("upload-progress");

    form.addEventListener("submit", async e => {
        e.preventDefault();
        const title = $("photo-title").value.trim();
        const files = Array.from($("photo-file").files);
        if (!title || !files.length) {
            status.style.color = "var(--danger)";
            status.textContent = "Please provide a title and select at least one image.";
            return;
        }
        try {
            btn.disabled = true;
            bar.hidden = false;
            bar.firstElementChild.style.width = "0%";
            let done = 0;
            btn.textContent = `Uploading 0/${files.length}...`;
            for (let i = 0; i < files.length; i++) {
                const name = files.length > 1 ? `${title} - ${i + 1}` : title;
                const url = await compressImage(files[i]);
                await db.collection("photos").add({
                    title: name,
                    url,
                    category: $("photo-cat").value.trim().slice(0, 30),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                done++;
                btn.textContent = `Uploading ${done}/${files.length}...`;
                bar.firstElementChild.style.width = (done / files.length * 100) + "%";
            }
            status.style.color = "var(--ok)";
            status.textContent = `${done} photo(s) uploaded successfully!`;
            toast(`${done} photo(s) uploaded`);
            form.reset();
            $("preview-wrapper").style.display = "none";
            $("image-preview").innerHTML = "";
        } catch (err) {
            console.error("Upload error:", err);
            status.style.color = "var(--danger)";
            status.textContent = "Upload failed. Please try again.";
            toast("Upload failed", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = "Upload photos";
            setTimeout(() => { bar.hidden = true; }, 1200);
        }
    });
}

function loadAdminGallery() {
    const grid = $("admin-gallery-grid");
    listen(db.collection("photos").orderBy("createdAt", "desc"), snapshot => {
        setStat("stat-photos", snapshot.size);
        setStat("nav-photos", snapshot.size || "");
        const cats = new Set();
        snapshot.forEach(d => { const c = d.data().category; if (c) cats.add(c); });
        $("cat-list").innerHTML = [...cats].map(c => `<option value="${esc(c)}"></option>`).join("");
        if (snapshot.empty) {
            grid.innerHTML = `<p class="empty" style="grid-column:1/-1">No photos uploaded yet.</p>`;
            return;
        }
        grid.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement("div");
            card.className = "admin-card";

            const img = document.createElement("img");
            img.src = data.url;
            img.alt = data.title || "";
            img.loading = "lazy";

            const info = document.createElement("div");
            info.className = "admin-card-info";
            const title = document.createElement("h4");
            title.textContent = data.title || "Untitled";
            const actions = document.createElement("div");
            actions.className = "card-actions";

            const rename = document.createElement("button");
            rename.className = "btn-mini";
            rename.textContent = "Rename";
            rename.addEventListener("click", async () => {
                const next = await ask({ title: "Rename photo", ok: "Save", input: { value: data.title || "", max: 80 } });
                if (next && next !== data.title) {
                    await db.collection("photos").doc(doc.id).update({ title: next.slice(0, 80) });
                    toast("Photo renamed");
                }
            });

            const del = document.createElement("button");
            del.className = "btn-delete";
            del.textContent = "Delete";
            del.addEventListener("click", async () => {
                if (await ask({ title: "Delete this photo?", text: "It will be removed from your gallery. This cannot be undone.", ok: "Delete", danger: true })) {
                    await db.collection("photos").doc(doc.id).delete();
                    toast("Photo deleted");
                }
            });

            const cat = document.createElement("button");
            cat.className = "btn-mini";
            cat.textContent = data.category ? "Category: " + data.category : "Category";
            cat.addEventListener("click", async () => {
                const next = await ask({ title: "Photo category", text: "Used for the filter buttons on your gallery page. Leave empty for none.", ok: "Save", input: { value: data.category || "", max: 30 } });
                if (next !== null && next !== (data.category || "")) {
                    await db.collection("photos").doc(doc.id).update({ category: next });
                    toast("Category saved");
                }
            });

            actions.append(rename, cat, del);
            info.append(title, actions);
            card.append(img, info);
            grid.appendChild(card);
        });
    });
}

/* ---------- messages ---------- */
function loadMessages() {
    listen(db.collection("messages").orderBy("createdAt", "desc"), snapshot => {
        allMessages = [];
        snapshot.forEach(doc => allMessages.push({ id: doc.id, ...doc.data() }));
        const unread = allMessages.filter(m => !m.read).length;
        setStat("stat-messages", allMessages.length);
        setStat("stat-unread", unread);
        const badge = $("nav-unread");
        badge.textContent = unread;
        badge.hidden = !unread;
        renderMessages();
        renderRecent();
        renderChart();
    });
}

function renderMessages() {
    const container = $("messages-container");
    const q = $("msg-search").value.trim().toLowerCase();
    const onlyUnread = $("msg-filter").value === "unread";
    const list = allMessages.filter(m =>
        (!onlyUnread || !m.read) &&
        (!q || (m.email || "").toLowerCase().includes(q) || (m.message || "").toLowerCase().includes(q)));

    if (!allMessages.length) { container.innerHTML = `<p class="empty">No messages received yet.</p>`; return; }
    if (!list.length) { container.innerHTML = `<p class="empty">No messages match your search.</p>`; return; }

    container.innerHTML = "";
    list.forEach(m => {
        const card = document.createElement("div");
        card.className = "message-card" + (m.read ? "" : " unread");

        const head = document.createElement("div");
        head.className = "message-header";
        const who = document.createElement("div");
        const email = document.createElement("strong");
        email.className = "msg-email";
        email.textContent = m.email || "(no email)";
        who.appendChild(email);
        if (!m.read) { const tag = document.createElement("span"); tag.className = "new-tag"; tag.textContent = "New"; who.appendChild(tag); }
        const date = document.createElement("span");
        date.className = "msg-date";
        date.textContent = messageDate(m);
        head.append(who, date);

        const body = document.createElement("p");
        body.className = "msg-body";
        body.textContent = m.message || "";

        const actions = document.createElement("div");
        actions.className = "card-actions";

        const reply = document.createElement("a");
        reply.className = "btn-mini";
        reply.textContent = "Reply";
        reply.href = `mailto:${encodeURIComponent(m.email || "")}?subject=${encodeURIComponent("Re: your message to Anup Giri")}`;
        reply.addEventListener("click", () => { if (!m.read) db.collection("messages").doc(m.id).update({ read: true }); });

        const toggle = document.createElement("button");
        toggle.className = "btn-mini";
        toggle.textContent = m.read ? "Mark unread" : "Mark read";
        toggle.addEventListener("click", () => db.collection("messages").doc(m.id).update({ read: !m.read }));

        const del = document.createElement("button");
        del.className = "btn-delete";
        del.textContent = "Delete";
        del.addEventListener("click", async () => {
            if (await ask({ title: "Delete this message?", text: "This cannot be undone.", ok: "Delete", danger: true })) {
                await db.collection("messages").doc(m.id).delete();
                toast("Message deleted");
            }
        });

        actions.append(reply, toggle, del);
        card.append(head, body, actions);
        container.appendChild(card);
    });
}

function setupMessageTools() {
    $("msg-search").addEventListener("input", renderMessages);
    $("msg-filter").addEventListener("change", renderMessages);

    $("msg-readall").addEventListener("click", async () => {
        const unread = allMessages.filter(m => !m.read);
        if (!unread.length) { toast("No unread messages"); return; }
        const batch = db.batch();
        unread.forEach(m => batch.update(db.collection("messages").doc(m.id), { read: true }));
        await batch.commit();
        toast("All messages marked as read");
    });

    $("msg-export").addEventListener("click", () => {
        if (!allMessages.length) { toast("There are no messages to export", "error"); return; }
        const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const rows = [["Date", "Email", "Message", "Read"].map(cell).join(",")];
        allMessages.forEach(m => rows.push([messageDate(m), m.email, m.message, m.read ? "yes" : "no"].map(cell).join(",")));
        const blob = new Blob(["\ufeff" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "messages-" + new Date().toISOString().slice(0, 10) + ".csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        toast("Messages exported");
    });
}

/* ---------- account: change password ---------- */
function passwordError(code) {
    switch (code) {
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
        case "auth/wrong-password":
            return "Your current password is incorrect.";
        case "auth/weak-password":
            return "That password is too weak. Try a longer one.";
        case "auth/requires-recent-login":
            return "For security, please sign out and sign in again, then retry.";
        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";
        default:
            return "Could not change the password (" + (code || "unknown error") + ").";
    }
}

function setupPasswordForm() {
    const status = $("pass-status");
    const say = (text, ok) => { status.style.color = ok ? "var(--ok)" : "var(--danger)"; status.textContent = text; };

    $("pass-form").addEventListener("submit", async e => {
        e.preventDefault();
        const cur = $("cur-pass").value, next = $("new-pass").value, again = $("new-pass2").value;
        if (next.length < 8) { say("The new password must be at least 8 characters."); return; }
        if (next !== again) { say("The new passwords do not match."); return; }
        if (next === cur) { say("Choose a password different from the current one."); return; }
        const user = auth && auth.currentUser;
        if (!user) { say("You are not signed in."); return; }

        const btn = $("pass-btn");
        btn.disabled = true;
        try {
            const cred = firebase.auth.EmailAuthProvider.credential(user.email, cur);
            await user.reauthenticateWithCredential(cred);
            await user.updatePassword(next);
            $("pass-form").reset();
            say("Password updated.", true);
            toast("Password updated");
        } catch (err) {
            console.error("Password change error:", err.code);
            say(passwordError(err.code));
        } finally {
            btn.disabled = false;
        }
    });
}

/* ---------- home page popup (photos + videos shown to visitors) ---------- */
// Turns a YouTube / Vimeo / direct video link into something the site can play (or null if not supported)
function parseVideo(raw) {
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
    if (id && /^[\w-]{6,}$/.test(id)) return { kind: "youtube", id, thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg` };
    if (host === "vimeo.com") { const m = u.pathname.match(/^\/(\d+)/); if (m) return { kind: "vimeo", id: m[1] }; }
    if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) return { kind: "file" };
    return null;
}

function loadPopup() {
    listen(db.collection("settings").doc("popup"), doc => {
        if (popupLoaded) return; // don't overwrite what is being typed
        popupLoaded = true;
        const p = doc.exists ? doc.data() : {};
        $("pop-enabled").checked = !!p.enabled;
        $("pop-title").value = p.title || "";
        $("pop-text").value = p.text || "";
        $("pop-btn-text").value = p.buttonText || "";
        $("pop-btn-url").value = p.buttonUrl || "";
        $("pop-freq").value = p.frequency || "session";
    });
}

function loadSlides() {
    const grid = $("slides-grid");
    listen(db.collection("popupSlides").orderBy("order", "asc"), snapshot => {
        slides = [];
        snapshot.forEach(doc => slides.push({ id: doc.id, ...doc.data() }));
        setStat("slide-count", slides.length);
        setStat("nav-popup", slides.length || "");
        if (!slides.length) {
            grid.innerHTML = `<p class="empty" style="grid-column:1/-1">No photos or videos yet. Add some above.</p>`;
            return;
        }
        grid.innerHTML = "";
        slides.forEach((sl, i) => {
            const card = document.createElement("div");
            card.className = "admin-card";

            const media = document.createElement("div");
            media.className = "slide-thumb";
            if (sl.type === "photo") {
                const img = document.createElement("img");
                img.src = sl.url; img.alt = ""; img.loading = "lazy";
                media.appendChild(img);
            } else {
                const v = parseVideo(sl.url);
                if (v && v.thumb) { const img = document.createElement("img"); img.src = v.thumb; img.alt = ""; media.appendChild(img); }
                const badge = document.createElement("span");
                badge.className = "play-badge";
                badge.textContent = "▶ Video";
                media.appendChild(badge);
            }

            const info = document.createElement("div");
            info.className = "admin-card-info";
            const title = document.createElement("h4");
            title.textContent = `${i + 1}. ${sl.type === "photo" ? "Photo" : "Video"}`;
            const actions = document.createElement("div");
            actions.className = "card-actions";

            const left = document.createElement("button");
            left.className = "btn-mini"; left.textContent = "←"; left.title = "Move earlier"; left.disabled = i === 0;
            left.addEventListener("click", () => moveSlide(i, -1));
            const right = document.createElement("button");
            right.className = "btn-mini"; right.textContent = "→"; right.title = "Move later"; right.disabled = i === slides.length - 1;
            right.addEventListener("click", () => moveSlide(i, 1));
            const del = document.createElement("button");
            del.className = "btn-delete"; del.textContent = "Delete";
            del.addEventListener("click", async () => {
                if (await ask({ title: "Remove from popup?", text: "This photo or video will be removed from the popup.", ok: "Remove", danger: true })) {
                    await db.collection("popupSlides").doc(sl.id).delete();
                    toast("Removed from popup");
                }
            });

            actions.append(left, right, del);
            info.append(title, actions);
            card.append(media, info);
            grid.appendChild(card);
        });
    });
}

async function moveSlide(i, dir) {
    const a = slides[i], b = slides[i + dir];
    if (!a || !b) return;
    const batch = db.batch();
    batch.update(db.collection("popupSlides").doc(a.id), { order: b.order });
    batch.update(db.collection("popupSlides").doc(b.id), { order: a.order });
    await batch.commit();
}

// Photos can be large; keep each one well under Firestore's 1 MB document limit
async function compressForPopup(file) {
    let url = await compressImage(file, 1000, 0.8);
    if (url.length > 850000) url = await compressImage(file, 800, 0.7);
    return url;
}

function setupPopupTools() {
    const status = $("popup-status");
    const slideStatus = $("slide-status");
    const say = (el, text, ok) => { el.style.color = ok ? "var(--ok)" : "var(--danger)"; el.textContent = text; };

    $("popup-form").addEventListener("submit", async e => {
        e.preventDefault();
        const buttonUrl = $("pop-btn-url").value.trim();
        const buttonText = $("pop-btn-text").value.trim();
        if (buttonUrl && !/^https:\/\//i.test(buttonUrl)) { say(status, "The button link must start with https://"); return; }
        if (buttonUrl && !buttonText) { say(status, "Add button text, or clear the button link."); return; }
        const btn = $("popup-save");
        btn.disabled = true;
        try {
            await db.collection("settings").doc("popup").set({
                enabled: $("pop-enabled").checked,
                title: $("pop-title").value.trim(),
                text: $("pop-text").value.trim(),
                buttonText,
                buttonUrl,
                frequency: $("pop-freq").value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            say(status, $("pop-enabled").checked ? "Saved. The popup is ON." : "Saved. The popup is OFF.", true);
            toast("Popup saved");
        } catch (err) {
            console.error(err);
            say(status, "Could not save. Check your Firestore rules.");
            toast("Could not save popup", "error");
        } finally {
            btn.disabled = false;
        }
    });

    $("popup-preview").addEventListener("click", () => window.open("/?popup-preview=1", "_blank", "noopener"));

    $("slide-photo-btn").addEventListener("click", async () => {
        const files = Array.from($("slide-photo").files);
        if (!files.length) { say(slideStatus, "Choose one or more photos first."); return; }
        const btn = $("slide-photo-btn");
        btn.disabled = true;
        try {
            let n = 0;
            for (const file of files) {
                const url = await compressForPopup(file);
                await db.collection("popupSlides").add({
                    type: "photo",
                    url,
                    order: Date.now() + n,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                n++;
                btn.textContent = `Uploading ${n}/${files.length}...`;
            }
            say(slideStatus, `${n} photo(s) added to the popup.`, true);
            toast(`${n} photo(s) added`);
            $("slide-photo").value = "";
        } catch (err) {
            console.error(err);
            say(slideStatus, "Upload failed. Check your connection and Firestore rules.");
            toast("Upload failed", "error");
        } finally {
            btn.disabled = false;
            btn.textContent = "Upload photos";
        }
    });

    $("slide-video-btn").addEventListener("click", async () => {
        const url = $("slide-video").value.trim();
        if (!url) { say(slideStatus, "Paste a video link first."); return; }
        if (!parseVideo(url)) { say(slideStatus, "That link is not supported. Use a YouTube or Vimeo link, or a direct https link ending in .mp4."); return; }
        const btn = $("slide-video-btn");
        btn.disabled = true;
        try {
            await db.collection("popupSlides").add({
                type: "video",
                url,
                order: Date.now(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            $("slide-video").value = "";
            say(slideStatus, "Video added to the popup.", true);
            toast("Video added");
        } catch (err) {
            console.error(err);
            say(slideStatus, "Could not add the video. Check your Firestore rules.");
            toast("Could not add video", "error");
        } finally {
            btn.disabled = false;
        }
    });
}


/* ---------- projects (shown on the website) ---------- */
async function compressForProject(file) {
    let url = await compressImage(file, 900, 0.8);
    if (url.length > 850000) url = await compressImage(file, 700, 0.7);
    return url;
}

function loadProjects() {
    const grid = $("projects-grid");
    listen(db.collection("projects").orderBy("order", "asc"), snapshot => {
        projects = [];
        snapshot.forEach(doc => projects.push({ id: doc.id, ...doc.data() }));
        setStat("proj-count", projects.length);
        setStat("nav-projects", projects.length || "");
        if (!projects.length) {
            grid.innerHTML = `<p class="empty" style="grid-column:1/-1">No projects yet. Add your first one above.</p>`;
            return;
        }
        grid.innerHTML = "";
        projects.forEach((p, i) => {
            const card = document.createElement("div");
            card.className = "admin-card";

            const media = document.createElement("div");
            media.className = "slide-thumb";
            if (p.imageUrl) {
                const img = document.createElement("img");
                img.src = p.imageUrl; img.alt = ""; img.loading = "lazy";
                media.appendChild(img);
            } else {
                const ph = document.createElement("span");
                ph.className = "play-badge";
                ph.textContent = "No image";
                media.appendChild(ph);
            }

            const info = document.createElement("div");
            info.className = "admin-card-info";
            const title = document.createElement("h4");
            title.textContent = p.title || "Untitled";
            const tags = document.createElement("small");
            tags.className = "hint";
            tags.textContent = (p.tags || []).join(" · ");
            const actions = document.createElement("div");
            actions.className = "card-actions";

            const left = document.createElement("button");
            left.className = "btn-mini"; left.textContent = "←"; left.title = "Move earlier"; left.disabled = i === 0;
            left.addEventListener("click", () => moveProject(i, -1));
            const right = document.createElement("button");
            right.className = "btn-mini"; right.textContent = "→"; right.title = "Move later"; right.disabled = i === projects.length - 1;
            right.addEventListener("click", () => moveProject(i, 1));
            const edit = document.createElement("button");
            edit.className = "btn-mini"; edit.textContent = "Edit";
            edit.addEventListener("click", () => startEditProject(p));
            const del = document.createElement("button");
            del.className = "btn-delete"; del.textContent = "Delete";
            del.addEventListener("click", async () => {
                if (await ask({ title: "Delete this project?", text: "It will be removed from your website. This cannot be undone.", ok: "Delete", danger: true })) {
                    await db.collection("projects").doc(p.id).delete();
                    if (editingProject === p.id) resetProjectForm();
                    toast("Project deleted");
                }
            });

            actions.append(left, right, edit, del);
            info.append(title, tags, actions);
            card.append(media, info);
            grid.appendChild(card);
        });
    });
}

async function moveProject(i, dir) {
    const a = projects[i], b = projects[i + dir];
    if (!a || !b) return;
    const batch = db.batch();
    batch.update(db.collection("projects").doc(a.id), { order: b.order });
    batch.update(db.collection("projects").doc(b.id), { order: a.order });
    await batch.commit();
}

function resetProjectForm() {
    editingProject = null;
    $("project-form").reset();
    $("proj-form-title").textContent = "Add a project";
    $("proj-save").textContent = "Add project";
    $("proj-cancel").hidden = true;
    $("proj-rm-wrap").hidden = true;
}

function startEditProject(p) {
    editingProject = p.id;
    $("proj-title").value = p.title || "";
    $("proj-desc").value = p.description || "";
    $("proj-tags").value = (p.tags || []).join(", ");
    $("proj-url").value = p.url || "";
    $("proj-image").value = "";
    $("proj-rm-img").checked = false;
    $("proj-rm-wrap").hidden = !p.imageUrl;
    $("proj-form-title").textContent = "Edit project";
    $("proj-save").textContent = "Save changes";
    $("proj-cancel").hidden = false;
    $("proj-status").textContent = "";
    $("project-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupProjectForm() {
    const status = $("proj-status");
    const say = (text, ok) => { status.style.color = ok ? "var(--ok)" : "var(--danger)"; status.textContent = text; };

    $("proj-cancel").addEventListener("click", () => { resetProjectForm(); say(""); });

    $("project-form").addEventListener("submit", async e => {
        e.preventDefault();
        const title = $("proj-title").value.trim();
        const url = $("proj-url").value.trim();
        if (!title) { say("Give the project a name."); return; }
        if (url && !/^https:\/\//i.test(url)) { say("The project link must start with https://"); return; }
        const tags = $("proj-tags").value.split(",").map(t => t.trim().slice(0, 24)).filter(Boolean).slice(0, 6);
        const btn = $("proj-save");
        btn.disabled = true;
        try {
            const data = { title, description: $("proj-desc").value.trim(), tags, url };
            const file = $("proj-image").files[0];
            if (file) data.imageUrl = await compressForProject(file);
            else if (editingProject && $("proj-rm-img").checked) data.imageUrl = "";
            if (editingProject) {
                await db.collection("projects").doc(editingProject).update(data);
                say("Project updated.", true);
                toast("Project updated");
            } else {
                await db.collection("projects").add({ ...data, order: Date.now(), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                say("Project added. It is now on your website.", true);
                toast("Project added");
            }
            const msg = status.textContent;
            resetProjectForm();
            say(msg, true);
        } catch (err) {
            console.error(err);
            say("Could not save the project. Check your Firestore rules.");
            toast("Could not save project", "error");
        } finally {
            btn.disabled = false;
        }
    });
}

/* ---------- backup (account page) ---------- */
function plain(v) {
    if (v && typeof v.toDate === "function") return v.toDate().toISOString();
    if (Array.isArray(v)) return v.map(plain);
    if (v && typeof v === "object") { const o = {}; Object.keys(v).forEach(k => { o[k] = plain(v[k]); }); return o; }
    return v;
}

function setupBackup() {
    $("backup-btn").addEventListener("click", async () => {
        const btn = $("backup-btn");
        btn.disabled = true;
        try {
            const list = async name => {
                const snap = await db.collection(name).get();
                const out = [];
                snap.forEach(d => out.push({ id: d.id, ...plain(d.data()) }));
                return out;
            };
            const [photos, projectsAll, messages, slidesAll, daily] = await Promise.all([
                list("photos"), list("projects"), list("messages"), list("popupSlides"), list("statsDaily")
            ]);
            const settings = {};
            for (const id of ["site", "popup", "announce", "maintenance"]) {
                const doc = await db.collection("settings").doc(id).get();
                if (doc.exists) settings[id] = plain(doc.data());
            }
            const backup = {
                exportedAt: new Date().toISOString(),
                note: "Photo images are not included, only titles and categories.",
                settings,
                projects: projectsAll,
                messages,
                popupSlides: slidesAll.map(x => x.type === "photo" ? { ...x, url: "(image not included)" } : x),
                photos: photos.map(({ url, ...rest }) => rest),
                dailyVisits: daily
            };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "backup-" + new Date().toISOString().slice(0, 10) + ".json";
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            toast("Backup downloaded");
        } catch (err) {
            console.error(err);
            toast("Could not create the backup", "error");
        } finally {
            btn.disabled = false;
        }
    });
}
