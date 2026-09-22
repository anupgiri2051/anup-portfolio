document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const photoUrlInput = document.getElementById('photo-url');
    const photoTitleInput = document.getElementById('photo-title');
    const previewBox = document.getElementById('preview-box');
    const imagePreview = document.getElementById('image-preview');
    const statusMsg = document.getElementById('upload-status');
    const submitBtn = document.getElementById('submit-btn');

    // 1. Live Image Preview Handler
    photoUrlInput.addEventListener('input', () => {
        const url = photoUrlInput.value.trim();
        if (url) {
            imagePreview.src = url;
            previewBox.style.display = 'block';
        } else {
            previewBox.style.display = 'none';
        }
    });

    imagePreview.addEventListener('error', () => {
        previewBox.style.display = 'none';
    });

    // 2. Submit Form & Upload Photo to Firestore
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = photoTitleInput.value.trim();
        const imageUrl = photoUrlInput.value.trim();

        if (!title || !imageUrl) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Publishing...';
        statusMsg.style.color = '#94a3b8';
        statusMsg.textContent = 'Connecting to database...';

        try {
            await db.collection("photos").add({
                title: title,
                imageUrl: imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            statusMsg.style.color = '#10b981';
            statusMsg.textContent = 'Successfully added to public gallery!';
            
            // Reset form
            uploadForm.reset();
            previewBox.style.display = 'none';
        } catch (error) {
            console.error("Upload error:", error);
            statusMsg.style.color = '#ef4444';
            statusMsg.textContent = 'Failed to publish: ' + error.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Publish to Gallery';
        }
    });

    // 3. Render Admin Grid to View & Delete Photos
    loadAdminGallery();
});

// Function to fetch and render managed photos
function loadAdminGallery() {
    const adminGrid = document.getElementById('admin-photos-grid');
    if (!adminGrid) return;

    db.collection("photos").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        if (snapshot.empty) {
            adminGrid.innerHTML = '<p class="loading-text">No photos uploaded yet.</p>';
            return;
        }

        adminGrid.innerHTML = '';

        snapshot.forEach((doc) => {
            const data = doc.data();
            const photoId = doc.id;

            const card = document.createElement('div');
            card.className = 'admin-card';

            card.innerHTML = `
                <img src="${data.imageUrl}" alt="${data.title}" onerror="this.src='https://via.placeholder.com/220x140?text=Invalid+URL'">
                <div class="admin-card-info">
                    <h4>${data.title || "Untitled Photo"}</h4>
                    <button class="btn-delete" onclick="deletePhoto('${photoId}')">Delete Photo</button>
                </div>
            `;

            adminGrid.appendChild(card);
        });
    }, (error) => {
        console.error("Error loading gallery:", error);
        adminGrid.innerHTML = '<p class="loading-text">Error loading database photos.</p>';
    });
}

// Function to Delete Photo from Firestore
async function deletePhoto(photoId) {
    if (confirm("Are you sure you want to remove this photo from your gallery?")) {
        try {
            await db.collection("photos").doc(photoId).delete();
        } catch (error) {
            alert("Error deleting photo: " + error.message);
        }
    }
}