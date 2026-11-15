// fx.js — animations for the website and the admin portal.
// Everything here is switched off for visitors whose device asks for reduced motion.
(() => {
    const root = document.documentElement;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

    // intro splash: only on the first page view of a visit
    try {
        if (calm || sessionStorage.getItem("introSeen")) root.classList.add("no-intro");
        else sessionStorage.setItem("introSeen", "1");
    } catch (e) { root.classList.add("no-intro"); }

    // the "scroll down" button works even with animations off
    document.addEventListener("DOMContentLoaded", () => {
        const cue = document.querySelector(".scroll-cue");
        if (cue) cue.addEventListener("click", () => {
            const t = document.getElementById("code-section");
            if (t) t.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
        });
        const intro = document.getElementById("intro");
        if (intro) intro.addEventListener("animationend", e => { if (e.target === intro) intro.remove(); });
    });

    if (calm) return;
    root.classList.add("anim-on");
    document.addEventListener("DOMContentLoaded", init);

    /* ---------- which elements get which effect ---------- */
    const SPOT = ".skills article,.project-card,.facts div,.timeline li,#contact-form,.hero .stats,.card,.stat,.admin-card,.login-card";
    const TILT = ".project-card,.skills article,.stat,.login-card,.timeline li";
    const REVEAL = [[".project-card", "up"], [".timeline li", "left"], [".term", "zoom"], [".hp-head", "up"], [".site-footer .f-top", "up"]];

    let io;
    function each(el, sel, fn) {
        if (el.matches && el.matches(sel)) fn(el);
        if (el.querySelectorAll) el.querySelectorAll(sel).forEach(fn);
    }
    function decorate(el) {
        each(el, SPOT, e => e.classList.add("spot"));
        if (fine) each(el, TILT, e => e.classList.add("tilt"));
        REVEAL.forEach(([sel, kind]) => each(el, sel, e => {
            if (e.dataset.fx) return;
            e.dataset.fx = kind;
            e.classList.add("fx-wait");
            io.observe(e);
        }));
    }

    function init() {
        // scroll reveal with a small stagger for items that appear together
        io = new IntersectionObserver(entries => {
            entries.filter(en => en.isIntersecting).forEach((en, i) => {
                const el = en.target;
                io.unobserve(el);
                el.style.setProperty("--fd", Math.min(i, 8) * 80 + "ms");
                el.classList.replace("fx-wait", "fx-play");
                const done = ev => {
                    if (ev.target !== el) return;
                    el.classList.remove("fx-play");
                    el.style.removeProperty("--fd");
                    el.removeEventListener("animationend", done);
                };
                el.addEventListener("animationend", done);
            });
        }, { threshold: .12, rootMargin: "0px 0px -30px 0px" });

        decorate(document.body);
        new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) decorate(n); })))
            .observe(document.body, { childList: true, subtree: true });

        setupPointer();
        setupRipple();
        setupNavPill();
        setupParallax();
    }

    /* ---------- spotlight glow, 3D tilt and magnetic buttons (mouse only) ---------- */
    function setupPointer() {
        if (!fine) return;
        const MAG = ".btn.primary,#nav-links a.cta,.mode-btn,.totop,.f-top-btn";
        let tiltEl = null, magEl = null;
        const resetTilt = () => { if (tiltEl) tiltEl.style.transform = ""; tiltEl = null; };
        const resetMag = () => { if (magEl) magEl.style.translate = ""; magEl = null; };

        document.addEventListener("pointermove", e => {
            const t = e.target;
            if (!t || !t.closest) return;

            const s = t.closest(".spot");
            if (s) {
                const r = s.getBoundingClientRect();
                s.style.setProperty("--mx", e.clientX - r.left + "px");
                s.style.setProperty("--my", e.clientY - r.top + "px");
            }

            const tl = t.closest(".tilt");
            if (tl !== tiltEl) resetTilt();
            if (tl) {
                tiltEl = tl;
                const r = tl.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
                tl.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateY(-6px)`;
            }

            const m = t.closest(MAG);
            if (m !== magEl) resetMag();
            if (m) {
                magEl = m;
                const r = m.getBoundingClientRect();
                const dx = (e.clientX - (r.left + r.width / 2)) * .22, dy = (e.clientY - (r.top + r.height / 2)) * .3;
                m.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
            }
        }, { passive: true });
        root.addEventListener("mouseleave", () => { resetTilt(); resetMag(); });
    }

    /* ---------- ripple on click ---------- */
    function setupRipple() {
        const SEL = ".btn,.btn-mini,.btn-delete,.cats button,.layout-toggle button,#nav-links a,.swatch,.f-top-btn,.cmdk-btn,#lightbox-share,#lightbox-download";
        document.addEventListener("pointerdown", e => {
            const b = e.target.closest && e.target.closest(SEL);
            if (!b) return;
            const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2;
            const s = document.createElement("span");
            s.className = "ripple";
            s.setAttribute("aria-hidden", "true");
            s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
            b.classList.add("has-ripple");
            b.appendChild(s);
            setTimeout(() => s.remove(), 700);
        }, { passive: true });
    }

    /* ---------- sliding highlight behind the menu links ---------- */
    function setupNavPill() {
        const nav = document.getElementById("nav-links");
        if (!nav) return;
        const pill = document.createElement("span");
        pill.className = "nav-pill";
        pill.setAttribute("aria-hidden", "true");
        nav.prepend(pill);
        const active = () => nav.querySelector("a.active");
        const place = a => {
            if (!a || a.classList.contains("cta") || a.hidden || innerWidth <= 820) { pill.style.opacity = "0"; return; }
            pill.style.opacity = "1";
            pill.style.width = a.offsetWidth + "px";
            pill.style.height = a.offsetHeight + "px";
            pill.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
        };
        nav.addEventListener("pointerover", e => { const a = e.target.closest("a"); if (a) place(a); });
        nav.addEventListener("pointerleave", () => place(active()));
        new MutationObserver(() => place(active())).observe(nav, { subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
        addEventListener("resize", () => place(active()));
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place(active()));
        place(active());
        requestAnimationFrame(() => pill.classList.add("ready"));
    }

    /* ---------- hero drifts and fades as you scroll ---------- */
    function setupParallax() {
        const copy = document.querySelector(".hero-copy"), card = document.querySelector(".photo-card"), cue = document.querySelector(".scroll-cue");
        if (!copy) return;
        let ticking = false;
        addEventListener("scroll", () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                ticking = false;
                const y = scrollY, h = innerHeight;
                if (y > h * 1.3) return;
                copy.style.transform = `translateY(${(y * .14).toFixed(1)}px)`;
                copy.style.opacity = String(Math.max(0, 1 - y / (h * .85)).toFixed(3));
                if (card) card.style.translate = `0 ${(y * -.07).toFixed(1)}px`;
                if (cue) cue.style.opacity = String(Math.max(0, 1 - y / 160).toFixed(3));
            });
        }, { passive: true });
    }
})();
