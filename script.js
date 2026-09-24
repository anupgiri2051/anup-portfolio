document.addEventListener("DOMContentLoaded", () => {
    setupCleanRouting();
    loadGallery();
    setupContactForm();
    setupLightbox();
    setupMobileMenu();
});

// Dynamic Clean URL Routing (/about, /gallery, /contact, /)
function setupCleanRouting() {
    const routeLinks = document.querySelectorAll("[data-path]");

    routeLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetPath = link.getAttribute("data-path");
            navigateTo(targetPath);
        });
    });

    window.addEventListener("popstate", () => {
        handleCurrentRoute(window.location.pathname);
    });

    // Handle initial URL path on load
    handleCurrentRoute(window.location.pathname);
}

function navigateTo(path) {
    if (window.location.pathname !== path) {
        history.pushState(null, null, path);
    }
    handleCurrentRoute(path);

    // Close mobile menu if open
    const navLinksContainer = document.getElementById("nav-links");
    if (window.innerWidth <= 768 && navLinksContainer) {
        navLinksContainer.style.display = "none";
    }
}

function handleCurrentRoute(path) {
    if (path === "/" || path === "") {
        // Scroll completely to top for Home so no content is hidden under navbar
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
        return;
    }

    const sectionMap = {
        "/about": "about-section",
        "/gallery": "gallery-section",
        "/contact": "contact-section"
    };

    const targetId = sectionMap[path];
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
        targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

// Firestore Gallery Listener
function loadGallery() {
    const galleryContainer = document.getElementById("gallery-container");
    if (!galleryContainer) return;

    db.collection("photos").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        if (snapshot.empty) {
            galleryContainer.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">No photos in gallery yet.</p>`;
            return;
        }

        galleryContainer.innerHTML = "";

        snapshot.forEach(doc => {
            const data = doc.data();

            const item = document.createElement("div");
            item.className = "gallery-item";
            item.innerHTML = `
                <img src="${data.url}" alt="${data.title}" loading="lazy">
                <div class="gallery-item-title">${data.title}</div>
            `;

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
            submitBtn.innerHTML = `Sending...`;

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
            submitBtn.innerHTML = `Send message`;
        }
    });
}

// Lightbox Setup
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

// Mobile Menu Navigation
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
            navLinks.style.background = "rgba(247, 248, 250, 0.98)";
            navLinks.style.padding = "1.5rem";
            navLinks.style.borderBottom = "1px solid var(--card-border)";
        }
    });
}