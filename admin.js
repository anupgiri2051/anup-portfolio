// Admin panel: Firebase Authentication login, dashboard stats, site settings,
// photo upload/rename/delete, and a message inbox (search, read/unread, reply, CSV export).

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = id => document.getElementById(id);

let unsubs = [];
let started = false;
let allMessages = [];
let settingsLoaded = false;

document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    setupImagePreview();
    setupUploadForm();
    setupSettingsForm();
    setupMessageTools();
});

/* ---------- Authentication ---------- */
function authError(code) {
    switch (code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
        case "auth/invalid-email":
            return "Wrong email or password.";
        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";
        case "auth/network-request-failed":
            return "Network error. Check your connection.";
        case "auth/operation-not-allowed":
            return "Email/password sign-in is not enabled in Firebase yet.";
        default:
            return "Could not sign in. Please try again.";
    }
}

function initAuth() {
    const loginForm = $("login-form");
    const errorMsg = $("login-error");

    if (!auth) {
        errorMsg.textContent = "Authentication is not available. Check that firebase-auth-compat.js is loaded.";
        return;
    }

    auth.onAuthStateChanged(user => (user ? showDashboard() : showLoginModal()));

    loginForm.addEventListener("submit", async e => {
        e.preventDefault();
        const btn = $("login-btn");
        errorMsg.textContent = "";
        btn.disabled = true;
        try {
            await auth.signInWithEmailAndPassword($("admin-email").value.trim(), $("admin-password").value);
            $("admin-password").value = "";
        } catch (err) {
            errorMsg.textContent = authError(err.code);
        } finally {
            btn.disabled = false;
        }
    });

    $("reset-pass").addEventListener("click", async () => {
        const email = $("admin-email").value.trim();
        if (!email) { errorMsg.textContent = "Type your admin email first, then click “Forgot password?”."; return; }
        try {
            await auth.sendPasswordResetEmail(email);
            errorMsg.style.color = "#16a34a";
            errorMsg.textContent = "Password reset email sent. Check your inbox.";
        } catch (err) {
            errorMsg.style.color = "";
            errorMsg.textContent = authError(err.code);
        }
    });

    $("logout-btn").addEventListener("click", () => auth.signOut());
}

function showDashboard() {
    $("login-modal").style.display = "none";
    $("admin-dashboard").style.display = "flex";
    $("logout-btn").style.display = "inline-flex";
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
    $("logout-btn").style.display = "none";
    unsubs.forEach(fn => fn());
    unsubs = [];
    started = false;
    settingsLoaded = false;
}

function listen(query, onData, onError) {
    unsubs.push(query.onSnapshot(onData, onError || (err => console.error("Listener error:", err))));
}

function setStat(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
}

/* ---------- Overview ---------- */
function loadStats() {
    listen(db.collection("stats").doc("visits"),
        doc => setStat("stat-visits", doc.exists ? (doc.data().count || 0) : 0),
        () => setStat("stat-visits", "–"));
}

/* ---------- Site settings ---------- */
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
    const form = $("settings-form");
    const status = $("settings-status");
    form.addEventListener("submit", async e => {
        e.preventDefault();
        const instagram = $("set-instagram").value.trim();
        if (instagram && !/^https:\/\//i.test(instagram)) {
            status.style.color = "var(--danger-red)";
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
            status.style.color = "#16a34a";
            status.textContent = "Settings saved.";
        } catch (err) {
            console.error(err);
            status.style.color = "var(--danger-red)";
            status.textContent = "Could not save. Check your Firestore rules.";
        } finally {
            btn.disabled = false;
        }
    });
}

/* ---------- Photos ---------- */
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
    const previewWrapper = $("preview-wrapper");
    const previewContainer = $("image-preview");
    if (!fileInput || !previewContainer) return;

    fileInput.addEventListener("change", e => {
        const files = Array.from(e.target.files);
        previewContainer.innerHTML = "";
        previewWrapper.style.display = files.length ? "block" : "none";
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = evt => {
                const img = document.createElement("img");
                img.src = evt.target.result;
                img.alt = "";
                img.style.cssText = "width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--card-border)";
                previewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });
}

function setupUploadForm() {
    const form = $("upload-form");
    const statusMsg = $("upload-status");
    const uploadBtn = $("upload-btn");
    if (!form) return;

    form.addEventListener("submit", async e => {
        e.preventDefault();
        const titleInput = $("photo-title").value.trim();
        const files = Array.from($("photo-file").files);

        if (!titleInput || files.length === 0) {
            statusMsg.style.color = "var(--danger-red)";
            statusMsg.textContent = "Please provide a title and select at least one image.";
            return;
        }

        try {
            uploadBtn.disabled = true;
            let done = 0;
            uploadBtn.textContent = `Uploading 0/${files.length}...`;
            for (let i = 0; i < files.length; i++) {
                const title = files.length > 1 ? `${titleInput} - ${i + 1}` : titleInput;
                const url = await compressImage(files[i]);
                await db.collection("photos").add({
                    title,
                    url,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                done++;
                uploadBtn.textContent = `Uploading ${done}/${files.length}...`;
            }
            statusMsg.style.color = "#16a34a";
            statusMsg.textContent = `${done} photo(s) uploaded successfully!`;
            form.reset();
            $("preview-wrapper").style.display = "none";
            $("image-preview").innerHTML = "";
        } catch (err) {
            console.error("Upload error:", err);
            statusMsg.style.color = "var(--danger-red)";
            statusMsg.textContent = "Upload failed. Please try again.";
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = "Upload photos";
        }
    });
}

function loadAdminGallery() {
    const grid = $("admin-gallery-grid");
    if (!grid) return;

    listen(db.collection("photos").orderBy("createdAt", "desc"), snapshot => {
        setStat("stat-photos", snapshot.size);
        if (snapshot.empty) {
            grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">No photos uploaded.</p>`;
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
                const next = prompt("New title for this photo:", data.title || "");
                if (next && next.trim() && next.trim() !== data.title) {
                    await db.collection("photos").doc(doc.id).update({ title: next.trim().slice(0, 80) });
                }
            });

            const del = document.createElement("button");
            del.className = "btn-delete";
            del.textContent = "Delete";
            del.addEventListener("click", async () => {
                if (confirm("Delete this photo permanently?")) {
                    await db.collection("photos").doc(doc.id).delete();
                }
            });

            actions.append(rename, del);
            info.append(title, actions);
            card.append(img, info);
            grid.appendChild(card);
        });
    });
}

/* ---------- Messages ---------- */
function loadMessages() {
    listen(db.collection("messages").orderBy("createdAt", "desc"), snapshot => {
        allMessages = [];
        snapshot.forEach(doc => allMessages.push({ id: doc.id, ...doc.data() }));
        setStat("stat-messages", allMessages.length);
        setStat("stat-unread", allMessages.filter(m => !m.read).length);
        renderMessages();
    });
}

function messageDate(m) {
    try { return m.createdAt ? new Date(m.createdAt.toDate()).toLocaleString() : "Recently"; }
    catch (e) { return "Recently"; }
}

function renderMessages() {
    const container = $("messages-container");
    if (!container) return;
    const q = $("msg-search").value.trim().toLowerCase();
    const onlyUnread = $("msg-filter").value === "unread";
    const list = allMessages.filter(m =>
        (!onlyUnread || !m.read) &&
        (!q || (m.email || "").toLowerCase().includes(q) || (m.message || "").toLowerCase().includes(q)));

    if (!allMessages.length) {
        container.innerHTML = `<p style="color: var(--text-muted);">No messages received yet.</p>`;
        return;
    }
    if (!list.length) {
        container.innerHTML = `<p style="color: var(--text-muted);">No messages match your search.</p>`;
        return;
    }

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
        if (!m.read) { const tag = document.createElement("span"); tag.className = "new-tag"; tag.textContent = "New"; who.append(" ", tag); }
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
            if (confirm("Delete this message permanently?")) await db.collection("messages").doc(m.id).delete();
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
        if (!unread.length) return;
        const batch = db.batch();
        unread.forEach(m => batch.update(db.collection("messages").doc(m.id), { read: true }));
        await batch.commit();
    });

    $("msg-export").addEventListener("click", () => {
        if (!allMessages.length) { alert("There are no messages to export."); return; }
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
    });
}
