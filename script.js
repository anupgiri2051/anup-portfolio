// Load Gallery Photos Dynamically from Firebase Firestore
function loadGalleryPhotos() {
    const galleryGrid = document.getElementById('public-photos-grid');

    if (!galleryGrid) return;

    db.collection("photos").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        if (snapshot.empty) {
            galleryGrid.innerHTML = '<p class="loading-text">No gallery items uploaded yet.</p>';
            return;
        }

        galleryGrid.innerHTML = '';

        snapshot.forEach((doc) => {
            const data = doc.data();
            const photoUrl = data.imageUrl;
            const photoTitle = data.title || "Gallery Photo";

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

// Lightbox Modal Controls
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

// Contact Form Handler - Stores messages in Firebase Firestore
document.addEventListener('DOMContentLoaded', () => {
    loadGalleryPhotos();

    const contactForm = document.getElementById('public-contact-form');
    const formStatus = document.getElementById('form-status');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('contact-name').value.trim();
            const email = document.getElementById('contact-email').value.trim();
            const message = document.getElementById('contact-message').value.trim();
            const sendBtn = document.getElementById('send-btn');

            if (!name || !email || !message) return;

            if (sendBtn) sendBtn.disabled = true;
            if (formStatus) {
                formStatus.style.color = '#94a3b8';
                formStatus.textContent = 'Sending message...';
            }

            try {
                // Add message to Firestore "messages" collection
                await db.collection("messages").add({
                    name: name,
                    email: email,
                    message: message,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                if (formStatus) {
                    formStatus.style.color = '#10b981';
                    formStatus.textContent = `Thank you, ${name}! Your message was sent successfully.`;
                }

                contactForm.reset();
            } catch (error) {
                console.error("Error sending message:", error);
                if (formStatus) {
                    formStatus.style.color = '#ef4444';
                    formStatus.textContent = 'Failed to send message: ' + error.message;
                }
            } finally {
                if (sendBtn) sendBtn.disabled = false;
            }
        });
    }
});