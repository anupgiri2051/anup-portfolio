// Admin portal: Firebase Authentication, dashboard (stats, chart, recent messages), photos,
// message inbox, site settings and account (change password, auto sign-out).

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = id => document.getElementById(id);

const IDLE_MS = 30 * 60 * 1000;
const VIEWS = { overview: "Overview", photos: "Photos", messages: "Messages", settings: "Site settings", account: "Account" };
const IDLE_EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"];

let unsubs = [];
let started = false;
let allMessages = [];
let settingsLoaded = false;
let idleTimer = null;

document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    initNav();
    setupImagePreview();
    setupDropzone();
    setupUploadForm();
    setupSettingsForm();
    setupMessageTools();
    setupPasswordForm();
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
    const h = (location.hash || "").slice(1);
    return VIEWS[h] ? h : "overview";
}

function showView(view) {
    document.querySelectorAll(".view").forEach(el => { el.hidden = el.id !== "view-" + view; });
    document.querySelectorAll(".sb-nav a").forEach(a => a.classList.toggle("active", a.dataset.view === view));
    $("page-title").textContent = VIEWS[view];
    document.body.classList.remove("sb-open");
    window.scrollTo(0, 0);
}

function go(view) {
    if (location.hash === "#" + view) showView(view);
    else location.hash = view;
}

function initNav() {
    document.querySelectorAll("[data-view]").forEach(a =>
        a.addEventListener("click", e => { e.preventDefault(); go(a.dataset.view); }));
    window.addEventListener("hashchange", () => showView(currentView()));
    $("menu-btn").addEventListener("click", () => document.body.classList.toggle("sb-open"));
    $("sb-scrim").addEventListener("click", () => document.body.classList.remove("sb-open"));
    showView(currentView());
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
}

function showLoginModal() {
    $("login-modal").style.display = "flex";
    $("admin-dashboard").style.display = "none";
    stopIdleWatch();
    unsubs.forEach(fn => fn());
    unsubs = [];
    started = false;
    settingsLoaded = false;
    allMessages = [];
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

function renderChart() {
    const box = $("chart7");
    if (!box) return;
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
    const max = Math.max(1, ...counts);
    box.innerHTML = "";
    days.forEach((d, i) => {
        const col = document.createElement("div");
        col.className = "bar";
        const n = document.createElement("b");
        n.textContent = counts[i];
        const track = document.createElement("div");
        track.className = "track";
        const fill = document.createElement("i");
        fill.style.height = (counts[i] / max * 100) + "%";
        track.appendChild(fill);
        const label = document.createElement("span");
        label.textContent = d.toLocaleDateString(undefined, { weekday: "short" });
        col.append(n, track, label);
        box.appendChild(col);
    });
    setStat("chart-total", counts.reduce((a, b) => a + b, 0));
}

function renderRecent() {
    const box = $("recent-messages");
    if (!box) return;
    if (!allMessages.length) { box.innerHTML = `<p class="empty">No messages yet.</p>`; return; }
    box.innerHTML = "";
    allMessages.slice(0, 5).forEach(m => {
        const a = document.createElement("a");
        a.href = "#messages";
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

/* ---------- site settings ---------- */
function loadSettings() {
    listen(db.collection("settings").doc("site"), doc => {
        if (settingsLoaded) return; // don't overwrite what is being typed
        settingsLoaded = true;
        const s = doc.exists ? doc.data() : {};
        $("set-intro").value = s.intro || "";
        $("set-location").value = s.location || "";
        $("set-instagram").value = s.instagram || "";
    });
}

function setupSettingsForm() {
    const status = $("settings-status");
    $("settings-form").addEventListener("submit", async e => {
        e.preventDefault();
        const instagram = $("set-instagram").value.trim();
        if (instagram && !/^https:\/\//i.test(instagram)) {
            status.style.color = "var(--danger)";
            status.textContent = "The Instagram link must start with https://";
            return;
        }
        const btn = $("settings-btn");
        btn.disabled = true;
        try {
            await db.collection("settings").doc("site").set({
                intro: $("set-intro").value.trim(),
                location: $("set-location").value.trim(),
                instagram,
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

            actions.append(rename, del);
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
