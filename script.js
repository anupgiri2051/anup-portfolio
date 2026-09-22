// Load Gallery Photos Dynamically from Firebase Firestore
function loadGalleryPhotos() {
    const galleryGrid = document.getElementById('public-photos-grid');

    if (!galleryGrid) return;

    // Listen to real-time updates from Firestore 'photos' collection
    db.collection("photos").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        if (snapshot.empty) {
            galleryGrid.innerHTML = '<p class="loading-text">No gallery items uploaded yet.</p>';
            return;
        }

        galleryGrid.innerHTML = ''; // Clear loading placeholder

        snapshot.forEach((doc) => {
            const data = doc.data();
            const photoUrl = data.imageUrl;
            const photoTitle = data.title || "Gallery Photo";

            // Create Gallery Item Card
            const card = document.createElement('div');
            card.className = 'glass-card gallery-item';
            card.onclick = () => openLightbox(photoUrl);

            card.innerHTML = `
                <img src="${photoUrl}" alt="${photoTitle}" class="gallery-thumb" onerror="this.src='https://via.placeholder.com/400x220?text=Image+Not+Found'">
                <div class="gallery-caption">
                    <h4>${photoTitle}</h4>
                    <p>Click to view full screen</p>
                </div>
            `;

            galleryGrid.appendChild(card);
        });
    }, (error) => {
        console.error("Error fetching photos: ", error);
        galleryGrid.innerHTML = '<p class="loading-text">Error loading photos from database.</p>';
    });
}

// Lightbox Modal Functions
function openLightbox(imageSrc) {
    const modal = document.getElementById('lightbox');
    const modalImg = document.getElementById('lightbox-img');
    if (modal && modalImg) {
        modal.style.display = 'flex';
        modalImg.src = imageSrc;
    }
}

function closeLightbox() {
    const modal = document.getElementById('lightbox');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Contact Form Handler
document.addEventListener('DOMContentLoaded', () => {
    // Start fetching gallery photos from Firestore
    loadGalleryPhotos();

    const contactForm = document.getElementById('public-contact-form');
    const formStatus = document.getElementById('form-status');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('contact-name').value;

            if (formStatus) {
                formStatus.style.color = '#10b981';
                formStatus.textContent = `Thank you, ${name}! Your message has been sent successfully.`;
            }

            contactForm.reset();
        });
    }
});