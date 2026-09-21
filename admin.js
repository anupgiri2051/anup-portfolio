document.addEventListener('DOMContentLoaded', () => {
    const photoFileInput = document.getElementById('photo-file');
    const imagePreviewWrapper = document.getElementById('image-preview-wrapper');
    const imagePreview = document.getElementById('image-preview');
    const addPhotoForm = document.getElementById('add-photo-form');
    let currentBase64Image = '';

    // Handle Local JPG Selection & Preview
    photoFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        
        if (file) {
            // Ensure file type is JPEG/JPG
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

    // Handle Form Submit
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

        // Example: Save photo data into localStorage / Firebase
        let existingPhotos = JSON.parse(localStorage.getItem('gallery_photos') || '[]');
        existingPhotos.unshift(photoData);
        localStorage.setItem('gallery_photos', JSON.stringify(existingPhotos));

        alert('Photo successfully published!');

        // Reset Form
        addPhotoForm.reset();
        imagePreviewWrapper.style.display = 'none';
        currentBase64Image = '';
    });
});