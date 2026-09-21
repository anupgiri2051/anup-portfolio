document.addEventListener('DOMContentLoaded', () => {
    const publicPhotosGrid = document.getElementById('public-photos-grid');
    const publicVlogsGrid = document.getElementById('public-vlogs-grid');

    // Helper: Convert YouTube Links to Embed URLs
    function getEmbedUrl(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
    }

    // Real-Time Photos Stream for Public View
    if (publicPhotosGrid) {
        db.collection('gallery_photos').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
            if (snapshot.empty) {
                publicPhotosGrid.innerHTML = '<p class="loading-text">No photos published yet.</p>';
                return;
            }

            publicPhotosGrid.innerHTML = snapshot.docs.map(doc => {
                const photo = doc.data();
                return `
                    <div class="glass-card" style="padding: 1rem; text-align: center;">
                        <img src="${photo.imageUrl}" alt="${photo.title || 'Gallery Image'}" style="width: 100%; height: 220px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 0.8rem;">
                        <h3 style="font-size: 1.05rem; font-weight: 700;">${photo.title || ''}</h3>
                    </div>
                `;
            }).join('');
        }, (error) => {
            console.error("Error fetching photos: ", error);
            publicPhotosGrid.innerHTML = '<p class="loading-text">Unable to load gallery photos.</p>';
        });
    }

    // Real-Time Vlogs Stream for Public View
    if (publicVlogsGrid) {
        db.collection('vlogs').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
            if (snapshot.empty) {
                publicVlogsGrid.innerHTML = '<p class="loading-text">No vlogs published yet.</p>';
                return;
            }

            publicVlogsGrid.innerHTML = snapshot.docs.map(doc => {
                const vlog = doc.data();
                const embedUrl = getEmbedUrl(vlog.url);

                return `
                    <div class="glass-card" style="padding: 1rem;">
                        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 10px; margin-bottom: 0.8rem; border: 1px solid var(--border-color);">
                            <iframe src="${embedUrl}" style="position: absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
                        </div>
                        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.4rem;">${vlog.title}</h3>
                        ${vlog.description ? `<p style="font-size: 0.9rem; color: var(--text-muted);">${vlog.description}</p>` : ''}
                    </div>
                `;
            }).join('');
        }, (error) => {
            console.error("Error fetching vlogs: ", error);
            publicVlogsGrid.innerHTML = '<p class="loading-text">Unable to load vlogs.</p>';
        });
    }
});