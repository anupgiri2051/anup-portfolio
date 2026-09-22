document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginOverlay = document.getElementById('login-overlay');
    const dashboardContent = document.getElementById('admin-dashboard-content');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    if (localStorage.getItem('adminLoggedIn') === 'true') {
        showDashboard();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputId = document.getElementById('admin-id').value.trim();
        const inputPassword = document.getElementById('admin-password').value.trim();

        if (inputId === 'admin' && inputPassword === 'meanup') {
            localStorage.setItem('adminLoggedIn', 'true');
            loginError.textContent = '';
            showDashboard();
        } else {
            loginError.textContent = 'Invalid User ID or Password.';
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('adminLoggedIn');
            location.reload();
        });
    }

    function showDashboard() {
        loginOverlay.style.display = 'none';
        dashboardContent.style.display = 'block';
        initAdminDashboard();
    }
});

function initAdminDashboard() {
    const uploadForm = document.getElementById('upload-form');
    const photoFileInput = document.getElementById('photo-file');
    const photoTitleInput = document.getElementById('photo-title');
    const previewBox = document.getElementById('preview-box');
    const imagePreview = document.getElementById('image-preview');
    const statusMsg = document.getElementById('upload-status');
    const submitBtn = document.getElementById('submit-btn');

    let base64Image = "";

    photoFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                base64Image = event.target.result;
                imagePreview.src = base64Image;
                previewBox.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            previewBox.style.display = 'none';
            base64Image = "";
        }
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = photoTitleInput.value.trim();
        if (!title || !base64Image) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';
        statusMsg.style.color = '#94a3b8';
        statusMsg.textContent = 'Saving photo to database...';

        try {
            await db.collection("photos").add({
                title: title,
                imageUrl: base64Image,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            statusMsg.style.color = '#10b981';
            statusMsg.textContent = 'Photo published successfully!';
            uploadForm.reset();
            previewBox.style.display = 'none';
            base64Image = "";
        } catch (error) {
            console.error("Upload error:", error);
            statusMsg.style.color = '#ef4444';
            statusMsg.textContent = 'Upload failed: ' + error.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload & Publish';
        }
    });

    loadAdminGallery();
    loadReceivedMessages();
}

function loadAdminGallery() {
    const adminGrid = document.getElementById('admin-photos-grid');
    if (!adminGrid) return;

    db.collection("photos").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        if (snapshot.empty) {
            adminGrid.innerHTML = '<p style="color: #94a3b8;">No photos uploaded yet.</p>';
            return;
        }

        adminGrid.innerHTML = '';

        snapshot.forEach((doc) => {
            const data = doc.data();
            const photoId = doc.id;

            const card = document.createElement('div');
            card.className = 'admin-card';

            card.innerHTML = `
                <img src="${data.imageUrl}" alt="${data.title}">
                <div class="admin-card-info">
                    <h4 style="font-size: 0.95rem; color: #f8fafc;">${data.title || "Untitled Photo"}</h4>
                    <button class="btn-delete" onclick="deletePhoto('${photoId}')">Delete Photo</button>
                </div>
            `;

            adminGrid.appendChild(card);
        });
    }, (error) => {
        console.error("Error loading gallery:", error);
        adminGrid.innerHTML = '<p style="color: #94a3b8;">Error loading photos.</p>';
    });
}

async function deletePhoto(photoId) {
    if (confirm("Are you sure you want to delete this photo?")) {
        try {
            await db.collection("photos").doc(photoId).delete();
        } catch (error) {
            alert("Error deleting photo: " + error.message);
        }
    }
}

function loadReceivedMessages() {
    const messagesList = document.getElementById('admin-messages-list');
    if (!messagesList) return;

    db.collection("messages").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        if (snapshot.empty) {
            messagesList.innerHTML = '<p style="color: #94a3b8;">No received messages yet.</p>';
            return;
        }

        messagesList.innerHTML = '';

        snapshot.forEach((doc) => {
            const msg = doc.data();
            const msgId = doc.id;
            const dateStr = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleString() : 'Just now';

            const msgCard = document.createElement('div');
            msgCard.className = 'message-card';

            msgCard.innerHTML = `
                <div class="message-header">
                    <div>
                        <strong style="color: #f8fafc;">${msg.name}</strong> 
                        <span class="msg-email">&lt;${msg.email}&gt;</span>
                    </div>
                    <span class="msg-date">${dateStr}</span>
                </div>
                <div>
                    <p style="color: #f8fafc; font-size: 0.95rem; white-space: pre-wrap;">${msg.message}</p>
                </div>
                <div style="display: flex; justify-content: flex-end;">
                    <button class="btn-delete" onclick="deleteMessage('${msgId}')">Delete Message</button>
                </div>
            `;

            messagesList.appendChild(msgCard);
        });
    }, (error) => {
        console.error("Error fetching messages:", error);
        messagesList.innerHTML = '<p style="color: #94a3b8;">Error loading messages.</p>';
    });
}

async function deleteMessage(msgId) {
    if (confirm("Are you sure you want to delete this message?")) {
        try {
            await db.collection("messages").doc(msgId).delete();
        } catch (error) {
            alert("Error deleting message: " + error.message);
        }
    }
}