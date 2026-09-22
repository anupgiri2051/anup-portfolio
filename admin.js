document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    setupImagePreview();
    setupUploadForm();
});

// Authentication Management
function initAuth() {
    const loginModal = document.getElementById("login-modal");
    const dashboard = document.getElementById("admin-dashboard");
    const logoutBtn = document.getElementById("logout-btn");
    const loginForm = document.getElementById("login-form");

    if (sessionStorage.getItem("adminLoggedIn") === "true") {
        showDashboard();
    } else {
        showLoginModal();
    }

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const inputId = document.getElementById("admin-email").value.trim();
        const inputPassword = document.getElementById("admin-password").value.trim();
        const errorMsg = document.getElementById("login-error");

        if ((inputId === "admin" || inputId === "admin@gmail.com") && inputPassword === "meanup") {
            sessionStorage.setItem("adminLoggedIn", "true");
            errorMsg.textContent = "";
            showDashboard();
        } else {
            errorMsg.textContent = "Invalid Admin ID or Password.";
        }
    });

    logoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem("adminLoggedIn");
        showLoginModal();
    });

    function showDashboard() {
        loginModal.style.display = "none";
        dashboard.style.display = "flex";
        logoutBtn.style.display = "inline-flex";

        loadAdminGallery();
        loadMessages();
    }

    function showLoginModal() {
        loginModal.style.display = "flex";
        dashboard.style.display = "none";
        logoutBtn.style.display = "none";
    }
}

// Preview Multiple Selected Images
function setupImagePreview() {
    const fileInput = document.getElementById("photo-file");
    const previewWrapper = document.getElementById("preview-wrapper");
    const previewContainer = document.getElementById("image-preview");

    if (!fileInput || !previewContainer) return;

    fileInput.addEventListener("change", (e) => {
        const files = Array.from(e.target.files);
        previewContainer.innerHTML = "";

        if (files.length > 0) {
            previewWrapper.style.display = "block";

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const img = document.createElement("img");
                    img.src = evt.target.result;
                    img.style.width = "90px";
                    img.style.height = "90px";
                    img.style.objectFit = "cover";
                    img.style.borderRadius = "8px";
                    img.style.border = "1px solid var(--card-border)";
                    previewContainer.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
        } else {
            previewWrapper.style.display = "none";
        }
    });
}

// Upload Form Handler (Multiple Photos)
function setupUploadForm() {
    const form = document.getElementById("upload-form");
    const statusMsg = document.getElementById("upload-status");
    const uploadBtn = document.getElementById("upload-btn");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const titleInput = document.getElementById("photo-title").value.trim();
        const fileInput = document.getElementById("photo-file");
        const files = Array.from(fileInput.files);

        if (!titleInput || files.length === 0) {
            statusMsg.style.color = "var(--danger-red)";
            statusMsg.textContent = "Please provide a title and select at least one image.";
            return;
        }

        try {
            uploadBtn.disabled = true;
            let uploadedCount = 0;
            uploadBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Uploading 0/${files.length}...`;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const title = files.length > 1 ? `${titleInput} - ${i + 1}` : titleInput;

                await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = async () => {
                        try {
                            const imageUrl = reader.result;
                            await db.collection("photos").add({
                                title: title,
                                url: imageUrl,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            uploadedCount++;
                            uploadBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Uploading ${uploadedCount}/${files.length}...`;
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.onerror = (err) => reject(err);
                });
            }

            statusMsg.style.color = "#10b981";
            statusMsg.textContent = `${uploadedCount} photo(s) uploaded successfully!`;
            form.reset();
            document.getElementById("preview-wrapper").style.display = "none";
            document.getElementById("image-preview").innerHTML = "";
        } catch (err) {
            console.error("Upload error:", err);
            statusMsg.style.color = "var(--danger-red)";
            statusMsg.textContent = "Upload failed. Please try again.";
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Upload Photos`;
        }
    });
}

// Load Gallery with Delete Capability
function loadAdminGallery() {
    const adminGrid = document.getElementById("admin-gallery-grid");
    if (!adminGrid) return;

    db.collection("photos").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        if (snapshot.empty) {
            adminGrid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">No photos uploaded.</p>`;
            return;
        }

        adminGrid.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const card = document.createElement("div");
            card.className = "admin-card";
            card.innerHTML = `
                <img src="${data.url}" alt="${data.title}">
                <div class="admin-card-info">
                    <h4>${data.title}</h4>
                    <button class="btn-delete" data-id="${doc.id}">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            `;

            card.querySelector(".btn-delete").addEventListener("click", async () => {
                if (confirm("Delete this photo permanently?")) {
                    await db.collection("photos").doc(doc.id).delete();
                }
            });

            adminGrid.appendChild(card);
        });
    });
}

// Load Messages with Delete Capability
function loadMessages() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    db.collection("messages").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        if (snapshot.empty) {
            container.innerHTML = `<p style="color: var(--text-muted);">No messages received yet.</p>`;
            return;
        }

        container.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const dateStr = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString() : "Recently";

            const card = document.createElement("div");
            card.className = "message-card";
            card.innerHTML = `
                <div class="message-header">
                    <div>
                        <i class="fa-solid fa-envelope" style="color: var(--primary-blue); margin-right: 6px;"></i>
                        <strong class="msg-email">${data.email}</strong>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="msg-date">${dateStr}</span>
                        <button class="btn-delete msg-delete-btn" data-id="${doc.id}">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                <p style="color: var(--text-main); white-space: pre-line; margin-top: 0.5rem;">${data.message}</p>
            `;

            card.querySelector(".msg-delete-btn").addEventListener("click", async () => {
                if (confirm("Delete this message permanently?")) {
                    await db.collection("messages").doc(doc.id).delete();
                }
            });

            container.appendChild(card);
        });
    });
}