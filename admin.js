document.addEventListener('DOMContentLoaded', () => {
    const photoFileInput = document.getElementById('photo-file');
    const imagePreviewWrapper = document.getElementById('image-preview-wrapper');
    const imagePreview = document.getElementById('image-preview');
    const addPhotoForm = document.getElementById('add-photo-form');
    const publishVlogForm = document.getElementById('publish-vlog-form');
    const adminPhotosList = document.getElementById('admin-photos-list');
    const adminVlogsList = document.getElementById('admin-vlogs-list');

    let selectedFile = null;

    // File selection & preview
    if (photoFileInput) {
        photoFileInput.addEventListener('change', (e) => {
            selectedFile = e.target.files[0];
            if (selectedFile) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (imagePreview) imagePreview.src = event.target.result;
                    if (imagePreviewWrapper) imagePreviewWrapper.style.display = 'block';
                };
                reader.readAsDataURL(selectedFile);
            } else {
                if (imagePreviewWrapper) imagePreviewWrapper.style.display = 'none';
                selectedFile = null;
            }
        });
    }

    // Upload photo to Firebase Storage & save metadata to Firestore
    if (addPhotoForm) {
        addPhotoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const photoTitleInput = document.getElementById('photo-title');
            const photoTitle = photoTitleInput ? photoTitleInput.value.trim() : '';
            const submitBtn = addPhotoForm.querySelector('button[type="submit"]');

            if (!selectedFile) {
                alert('Please select an image file to upload.');
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "Uploading...";
                }

                // 1. Storage Reference
                const storageRef = storage.ref(`photos/${Date.now()}_${selectedFile.name}`);
                
                // 2. Perform File Upload with Monitoring
                const uploadTask = storageRef.put(selectedFile);

                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        // Progress calculation
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        if (submitBtn) submitBtn.innerText = `Uploading (${Math.round(progress)}%)...`;
                    },
                    (error) => {
                        // Handle unsuccessful uploads
                        console.error("Storage upload task error:", error);
                        alert(`Upload failed: ${error.message}`);
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerText = "Upload Image";
                        }
                    },
                    async () => {
                        // Handle successful uploads
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();

                        // 3. Save Record in Firestore
                        await db.collection('gallery_photos').add({
                            title: photoTitle,
                            imageUrl: downloadURL,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });

                        alert('Photo published successfully!');
                        addPhotoForm.reset();
                        if (imagePreviewWrapper) imagePreviewWrapper.style.display = 'none';
                        selectedFile = null;

                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerText = "Upload Image";
                        }
                    }
                );

            } catch (error) {
                console.error("Firebase Storage Upload Error:", error);
                alert(`Upload failed: ${error.message}`);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Upload Image";
                }
            }
        });
    }

    // Publish Vlog Entry
    if (publishVlogForm) {
        publishVlogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const vlogTitle = document.getElementById('vlog-title').value.trim();
            const vlogUrl = document.getElementById('vlog-url').value.trim();
            const vlogDesc = document.getElementById('vlog-desc').value.trim();

            try {
                await db.collection('vlogs').add({
                    title: vlogTitle,
                    url: vlogUrl,
                    description: vlogDesc,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                alert('Vlog published successfully!');
                publishVlogForm.reset();
            } catch (error) {
                console.error("Vlog Publish Error:", error);
                alert(`Failed to publish vlog: ${error.message}`);
            }
        });
    }

    // Admin Panel Real-Time Photos Stream
    if (adminPhotosList) {
        db.collection('gallery_photos').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
            if (snapshot.empty) {
                adminPhotosList.innerHTML = '<p class="loading-text">No photos uploaded yet.</p>';
                return;
            }
            adminPhotosList.innerHTML = snapshot.docs.map(doc => {
                const data = doc.data();
                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem; background: rgba(8, 11, 17, 0.5); border: 1px solid var(--border-color, #333); border-radius: 8px; margin-bottom: 0.6rem;">
                        <div style="display: flex; align-items: center; gap: 0.8rem;">
                            <img src="${data.imageUrl}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 6px;">
                            <span style="font-weight: 600;">${data.title || 'Untitled'}</span>
                        </div>
                        <button onclick="deletePhoto('${doc.id}')" style="color: #ef4444; background: none; border: 1px solid rgba(239,68,68,0.3); padding: 0.3rem 0.6rem; border-radius: 6px; cursor: pointer;">Delete</button>
                    </div>
                `;
            }).join('');
        });
    }

    // Admin Panel Real-Time Vlogs Stream
    if (adminVlogsList) {
        db.collection('vlogs').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
            if (snapshot.empty) {
                adminVlogsList.innerHTML = '<p class="loading-text">No vlogs published yet.</p>';
                return;
            }
            adminVlogsList.innerHTML = snapshot.docs.map(doc => {
                const data = doc.data();
                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem; background: rgba(8, 11, 17, 0.5); border: 1px solid var(--border-color, #333); border-radius: 8px; margin-bottom: 0.6rem;">
                        <span>${data.title}</span>
                        <button onclick="deleteVlog('${doc.id}')" style="color: #ef4444; background: none; border: 1px solid rgba(239,68,68,0.3); padding: 0.3rem 0.6rem; border-radius: 6px; cursor: pointer;">Delete</button>
                    </div>
                `;
            }).join('');
        });
    }

    // Document Deletion Handlers
    window.deletePhoto = (id) => db.collection('gallery_photos').doc(id).delete();
    window.deleteVlog = (id) => db.collection('vlogs').doc(id).delete();
});