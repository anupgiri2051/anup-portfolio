document.addEventListener('DOMContentLoaded', () => {
    const photoFileInput = document.getElementById('photo-file');
    const imagePreviewWrapper = document.getElementById('image-preview-wrapper');
    const imagePreview = document.getElementById('image-preview');
    const addPhotoForm = document.getElementById('add-photo-form');
    const adminPhotosList = document.getElementById('admin-photos-list');
    let currentBase64Image = '';

    // 1. Function to Display Saved Photos in Admin Interface
    function renderAdminPhotos() {
        if (!adminPhotosList) return;

        const existingPhotos = JSON.parse(localStorage.getItem('gallery_photos') || '[]');
        
        if (existingPhotos.length === 0) {
            adminPhotosList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">No published photos yet.</p>';
            return;
        }

        adminPhotosList.innerHTML = existingPhotos.map((photo, index) => `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; padding: 0.6rem; background: rgba(8, 11, 17, 0.5); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.6rem;">
                <div style="display: flex; align-items: center; gap: 0.8rem; overflow: hidden;">
                    <img src="${photo.imageUrl}" alt="${photo.title}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 6px; flex-shrink: 0;">
                    <span style="font-size: 0.9rem; color: var(--text-main); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${photo.title}</span>
                </div>
                <button onclick="deletePhoto(${index})" class="btn btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3); cursor: pointer; flex-shrink: 0;">Delete</button>
            </div>
        `).join('');
    }

    // Global Function to Handle Photo Deletion
    window.deletePhoto = function(index) {
        let existingPhotos = JSON.parse(localStorage.getItem('gallery_photos') || '[]');
        existingPhotos.splice(index, 1);
        localStorage.setItem('gallery_photos', JSON.stringify(existingPhotos));
        renderAdminPhotos();
    };

    // 2. Handle Local JPG Selection & Preview
    if (photoFileInput) {
        photoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            
            if (file) {
                if (!file.type.match('image/jpeg') && !file.type.match('image/jpg')) {
                    alert('Please select a valid JPG image file.');
                    photoFileInput.value = '';
                    imagePreviewWrapper.style.display = 'none';
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    currentBase64Image = event.target.result;
                    imagePreview.src = currentBase64Image;
                    imagePreviewWrapper.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                imagePreviewWrapper.style.display = 'none';
                currentBase64Image = '';
            }
        });
    }

    // 3. Handle Form Submit & Save to Storage
    if (addPhotoForm) {
        addPhotoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const photoTitle = document.getElementById('photo-title').value.trim();

            if (!currentBase64Image) {
                alert('Please select a JPG image file to upload.');
                return;
            }

            const photoData = {
                title: photoTitle,
                imageUrl: currentBase64Image,
                createdAt: new Date().toISOString()
            };

            // Save into localStorage
            let existingPhotos = JSON.parse(localStorage.getItem('gallery_photos') || '[]');
            existingPhotos.unshift(photoData);
            localStorage.setItem('gallery_photos', JSON.stringify(existingPhotos));

            // Reset Form and Refresh List Immediately
            addPhotoForm.reset();
            imagePreviewWrapper.style.display = 'none';
            currentBase64Image = '';
            
            renderAdminPhotos(); // Instant update on screen
        });
    }

    // Initial Load
    renderAdminPhotos();
});