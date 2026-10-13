// effects.js — typing role line, 3D tilt, pointer spotlight, cursor glow, magnetic buttons, ticker
(() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer:fine)").matches;

  // intro loader (short, with a failsafe)
  if (!calm) {
    const root = document.documentElement;
    root.classList.add("loading");
    const ld = document.createElement("div");
    ld.className = "loader";
    ld.innerHTML = '<img src="logo.png" alt=""><i></i>';
    document.body.prepend(ld);
    const done = () => { root.classList.remove("loading"); ld.classList.add("out"); setTimeout(() => ld.remove(), 700); };
    const start = performance.now();
    addEventListener("load", () => setTimeout(done, Math.max(0, 900 - (performance.now() - start))));
    setTimeout(done, 3000);
  }

  // gradient banners with a floating glass icon tile (Digi Hub style)
  const svg = p => `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#0f3d91" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const banners = {
    "about-section": ["About", "A quick look at who I am and what I do.", svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>')],
    "focus-section": ["What I'm exploring", "AI, IT and the web, one small project at a time.", svg('<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>')],
    "gallery-section": ["Gallery", "Moments and projects. Tap any photo to view it.", svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 9"/>')],
    "contact-section": ["Get in touch", "Send me a message or find me on Instagram.", svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>')]
  };
  Object.entries(banners).forEach(([id, [title, sub, icon]]) => {
    const sec = document.getElementById(id); if (!sec) return;
    const old = sec.querySelector("h2"); if (old) old.classList.add("vh");
    const b = document.createElement("div");
    b.className = "banner";
    b.innerHTML = `<a class="back" href="/" data-path="/">&larr; Home</a><div class="tile"><span>${icon}</span></div><h2>${title}</h2><p>${sub}</p>`;
    sec.prepend(b);
  });

  // typing roles
  const out = document.getElementById("role-text");
  const roles = ["IT student from Baglung", "Exploring artificial intelligence", "Building for the web"];
  if (out) {
    if (calm) out.textContent = roles[0];
    else {
      let r = 0, c = 0, del = false;
      (function type() {
        const t = roles[r];
        out.textContent = t.slice(0, c);
        if (!del && c === t.length) { del = true; return setTimeout(type, 1600); }
        if (del && c === 0) { del = false; r = (r + 1) % roles.length; }
        c += del ? -1 : 1;
        setTimeout(type, del ? 28 : 55);
      })();
    }
  }

  // skills ticker after the hero
  const hero = document.getElementById("home");
  if (hero) {
    const words = ["Artificial Intelligence", "★", "Information Technology", "★", "Web Development", "★", "Learning in public", "★"];
    const row = words.concat(words).map(w => `<span>${w}</span>`).join("");
    const t = document.createElement("div");
    t.className = "ticker"; t.setAttribute("aria-hidden", "true");
    t.innerHTML = `<div>${row}</div>`;
    hero.after(t);
  }

  // staggered reveal, nav state, scroll cue
  if (!calm && "IntersectionObserver" in window) {
    const rv = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); }
    }), { threshold: .15 });
    document.querySelectorAll(".facts div,.areas li,.robot,#contact-form").forEach((el, i, all) => {
      const sib = [...el.parentElement.children].indexOf(el);
      el.style.setProperty("--d", sib * .1 + "s");
      el.classList.add("rv"); rv.observe(el);
    });
  }
  const nav = document.querySelector(".nav");
  const cue = document.createElement("div");
  cue.className = "scroll-cue"; cue.setAttribute("aria-hidden", "true"); cue.innerHTML = "<i></i>";
  if (hero) hero.appendChild(cue);
  addEventListener("scroll", () => {
    const y = scrollY > 60;
    nav && nav.classList.toggle("scrolled", y);
    cue.classList.toggle("gone", y);
  }, { passive: true });

  // floating glass chips around the portrait
  const av = document.querySelector(".arch");
  if (av) [["AI", "c1"], ["IT", "c2"], ["Web", "c3"]].forEach(([t, c]) => {
    const el = document.createElement("span");
    el.className = "chip " + c; el.textContent = t; av.appendChild(el);
  });

  // headings decode into place when they scroll into view
  if (!calm && "IntersectionObserver" in window) {
    const chars = "01<>/{}#*";
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, text = el.dataset.t; let f = 0;
      const id = setInterval(() => {
        el.textContent = [...text].map((ch, i) => ch === " " || i < f / 2 ? ch : chars[Math.random() * chars.length | 0]).join("");
        if (++f > text.length * 2) { clearInterval(id); el.textContent = text; }
      }, 32);
    }), { threshold: .6 });
    document.querySelectorAll("section h2").forEach(h => { h.dataset.t = h.textContent; io.observe(h); });
  }

  if (calm || !fine) return;

  // cursor glow
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  document.body.appendChild(glow);

  // cursor ring that eases after the pointer and grows over links
  const ring = document.createElement("div");
  ring.className = "cursor-ring";
  document.body.appendChild(ring);
  let rx = -100, ry = -100, tx = -100, ty = -100;
  addEventListener("pointermove", e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  document.addEventListener("pointerover", e => ring.classList.toggle("big", !!e.target.closest("a,button,.gallery-item,input,textarea")));
  (function loop() {
    rx += (tx - rx) * .18; ry += (ty - ry) * .18;
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(loop);
  })();

  // click sparks
  addEventListener("pointerdown", e => {
    for (let i = 0; i < 10; i++) {
      const p = document.createElement("i");
      const a = Math.PI * 2 * i / 10 + Math.random() * .5, d = 30 + Math.random() * 40;
      p.className = "spark";
      p.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;--c:${i % 2 ? "#4de2ff" : "#ff3b47"}`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  });

  // spotlight targets (gallery items are added later, so use delegation)
  const spotSel = ".code,.robot,.gallery-item,#contact-form";
  document.querySelectorAll(spotSel).forEach(el => el.classList.add("spot"));
  new MutationObserver(() =>
    document.querySelectorAll(".gallery-item:not(.spot)").forEach(el => el.classList.add("spot"))
  ).observe(document.getElementById("gallery-container") || document.body, { childList: true });

  const arch = document.querySelector(".arch");
  addEventListener("pointermove", e => {
    glow.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    const s = e.target.closest?.(".spot");
    if (s) {
      const b = s.getBoundingClientRect();
      s.style.setProperty("--mx", e.clientX - b.left + "px");
      s.style.setProperty("--my", e.clientY - b.top + "px");
    }
    if (arch) {
      const b = arch.getBoundingClientRect();
      const x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
      const near = Math.abs(x) < 1.2 && Math.abs(y) < 1.2;
      arch.style.setProperty("--ry", near ? x * 14 + "deg" : "0deg");
      arch.style.setProperty("--rx", near ? -y * 14 + "deg" : "0deg");
    }
  }, { passive: true });

  // magnetic buttons
  document.querySelectorAll(".btn").forEach(btn => {
    btn.addEventListener("pointermove", e => {
      const b = btn.getBoundingClientRect();
      btn.style.translate = `${(e.clientX - b.left - b.width / 2) * .18}px ${(e.clientY - b.top - b.height / 2) * .28}px`;
    });
    btn.addEventListener("pointerleave", () => btn.style.translate = "");
  });
})();
