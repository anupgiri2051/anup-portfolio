document.addEventListener("DOMContentLoaded", () => {
    loadGallery();
    setupContactForm();
    setupLightbox();
    setupMobileMenu();
});

// Load Gallery Items from Firestore
function loadGallery() {
    const galleryContainer = document.getElementById("gallery-container");
    if (!galleryContainer) return;

    db.collection("photos").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        if (snapshot.empty) {
            galleryContainer.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">No photos in gallery yet.</p>`;
            return;
        }

        galleryContainer.innerHTML = ""; // Clear loader or existing content

        snapshot.forEach(doc => {
            const data = doc.data();

            const item = document.createElement("div");
            item.className = "gallery-item";
            item.innerHTML = `
                <img src="${data.url}" alt="${data.title}" loading="lazy">
                <div class="gallery-item-title">${data.title}</div>
            `;

            // Open full image lightbox on click
            item.addEventListener("click", () => {
                openLightbox(data.url, data.title);
            });

            galleryContainer.appendChild(item);
        });
    });
}

// Contact Form Handler
function setupContactForm() {
    const contactForm = document.getElementById("contact-form");
    const statusMsg = document.getElementById("contact-status");
    const submitBtn = document.getElementById("contact-submit-btn");

    if (!contactForm) return;

    contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("contact-email").value.trim();
        const message = document.getElementById("contact-message").value.trim();

        if (!email || !message) {
            statusMsg.style.color = "var(--danger-red)";
            statusMsg.textContent = "Please fill in all fields.";
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...`;

            await db.collection("messages").add({
                email: email,
                message: message,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            statusMsg.style.color = "#10b981";
            statusMsg.textContent = "Your message has been sent successfully!";
            contactForm.reset();
        } catch (err) {
            console.error("Error sending message:", err);
            statusMsg.style.color = "var(--danger-red)";
            statusMsg.textContent = "Failed to send message. Please try again.";
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Send Message`;
        }
    });
}

// Lightbox Modal Functionality
function setupLightbox() {
    const modal = document.getElementById("lightbox-modal");
    const closeBtn = document.getElementById("lightbox-close");

    if (!modal || !closeBtn) return;

    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
}

function openLightbox(url, title) {
    const modal = document.getElementById("lightbox-modal");
    const img = document.getElementById("lightbox-img");
    const caption = document.getElementById("lightbox-caption");

    if (!modal || !img || !caption) return;

    img.src = url;
    caption.textContent = title;
    modal.style.display = "flex";
}

// Mobile Menu Toggle
function setupMobileMenu() {
    const menuBtn = document.getElementById("mobile-menu-btn");
    const navLinks = document.getElementById("nav-links");

    if (!menuBtn || !navLinks) return;

    menuBtn.addEventListener("click", () => {
        const isFlex = navLinks.style.display === "flex";
        navLinks.style.display = isFlex ? "none" : "flex";
        if (!isFlex) {
            navLinks.style.flexDirection = "column";
            navLinks.style.position = "absolute";
            navLinks.style.top = "100%";
            navLinks.style.left = "0";
            navLinks.style.right = "0";
            navLinks.style.background = "rgba(11, 15, 23, 0.95)";
            navLinks.style.padding = "1.5rem";
            navLinks.style.borderBottom = "1px solid var(--card-border)";
        }
    });
}