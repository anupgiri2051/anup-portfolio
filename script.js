document.addEventListener("DOMContentLoaded", () => {
    setupCleanRouting();
    loadGallery();
    setupContactForm();
    setupLightbox();
    setupMobileMenu();
    setupScrollReveal();
});

// Fade-in-on-scroll micro-interaction for bento cards
function setupScrollReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
        items.forEach(item => item.classList.add("in-view"));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("in-view");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    items.forEach(item => observer.observe(item));
}

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
            item.style.animationDelay = Math.min(galleryContainer.children.length, 12) * 0.06 + "s";
            item.innerHTML = `
                <img src="${data.url}" alt="${esc(data.title)}" loading="lazy">
                <div class="gallery-item-title">${esc(data.title)}</div>
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
            navLinks.style.background = "rgba(10, 14, 23, 0.98)";
            navLinks.style.padding = "1.5rem";
            navLinks.style.borderBottom = "1px solid var(--card-border)";
        }
    });
}

/* ===== Visual effects ===== */
document.addEventListener("DOMContentLoaded", () => {
    constellation();
    trackScroll();
    window.addEventListener("resize", () => {
        const nav = document.getElementById("nav-links");
        if (window.innerWidth > 768 && nav) nav.removeAttribute("style");
    });
});

function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Scroll progress line + highlight the nav link of the section in view
function trackScroll() {
    const bar = document.getElementById("bar");
    const links = document.querySelectorAll("#nav-links a");
    const map = { "home": "/", "about-section": "/about", "gallery-section": "/gallery", "contact-section": "/contact" };
    const onScroll = () => {
        const d = document.documentElement;
        bar.style.width = (scrollY / (d.scrollHeight - innerHeight || 1)) * 100 + "%";
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (e.isIntersecting) links.forEach(a => a.classList.toggle("active", a.dataset.path === map[e.target.id]));
    }), { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
}

// Night-sky background: twinkling stars joined like a neural network,
// reaching toward the pointer, with a rare shooting star (the logo's streak)
function constellation() {
    const c = document.getElementById("bg");
    if (!c || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const x = c.getContext("2d");
    let w, h, stars = [], shot = null;
    const m = { x: -999, y: -999 };
    const size = () => {
        w = c.width = innerWidth; h = c.height = innerHeight;
        stars = Array.from({ length: Math.min(90, Math.round(w * h / 16000)) }, () => ({
            x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 + .4,
            vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, t: Math.random() * 6
        }));
    };
    size();
    addEventListener("resize", size);
    addEventListener("pointermove", e => { m.x = e.clientX; m.y = e.clientY; });
    (function draw(now) {
        x.clearRect(0, 0, w, h);
        stars.forEach((a, i) => {
            a.x = (a.x + a.vx + w) % w; a.y = (a.y + a.vy + h) % h;
            x.fillStyle = `rgba(242,240,255,${.45 + .4 * Math.sin(now / 900 + a.t)})`;
            x.beginPath(); x.arc(a.x, a.y, a.r, 0, 7); x.fill();
            for (let j = i + 1; j < stars.length; j++) {
                const b = stars[j], d = Math.hypot(a.x - b.x, a.y - b.y);
                if (d < 120) { x.strokeStyle = `rgba(140,160,255,${.2 * (1 - d / 120)})`; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); }
            }
            const dm = Math.hypot(a.x - m.x, a.y - m.y);
            if (dm < 150) { x.strokeStyle = `rgba(255,59,71,${.55 * (1 - dm / 150)})`; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(m.x, m.y); x.stroke(); }
        });
        if (!shot && Math.random() < .0018) shot = { x: Math.random() * w * .5, y: Math.random() * h * .35 };
        if (shot) {
            const g = x.createLinearGradient(shot.x - 160, shot.y - 70, shot.x, shot.y);
            g.addColorStop(0, "rgba(255,59,71,0)"); g.addColorStop(1, "rgba(255,120,120,.9)");
            x.strokeStyle = g; x.lineWidth = 2; x.beginPath(); x.moveTo(shot.x - 160, shot.y - 70); x.lineTo(shot.x, shot.y); x.stroke(); x.lineWidth = 1;
            shot.x += 9; shot.y += 4;
            if (shot.x > w + 200 || shot.y > h + 100) shot = null;
        }
        requestAnimationFrame(draw);
    })(0);
}
