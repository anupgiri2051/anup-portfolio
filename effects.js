// effects.js — clean version: typing line, ticker, section banners, soft reveals, avatar tilt, form feedback
(() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer:fine)").matches;

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
    const t = document.createElement("div");
    t.className = "ticker"; t.setAttribute("aria-hidden", "true");
    t.innerHTML = `<div>${words.concat(words).map(w => `<span>${w}</span>`).join("")}</div>`;
    hero.after(t);
  }

  // section banners (gradient, floating icon tile)
  const svg = p => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#0f3d91" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const banners = {
    "about-section": ["About", "A quick look at who I am and what I do.", svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>')],
    "focus-section": ["What I'm exploring", "AI, IT and the web, one small project at a time.", svg('<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>')],
    "gallery-section": ["Gallery", "Tap any photo to view it.", svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 9"/>')],
    "contact-section": ["Get in touch", "Send me a message or find me on Instagram.", svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>')]
  };
  Object.entries(banners).forEach(([id, [title, sub, icon]]) => {
    const sec = document.getElementById(id); if (!sec) return;
    sec.querySelector("h2")?.classList.add("vh");
    const b = document.createElement("div");
    b.className = "banner";
    b.innerHTML = `<div class="tile"><span>${icon}</span></div><h2>${title}</h2><p>${sub}</p>`;
    sec.prepend(b);
  });

  // soft staggered reveal
  if (!calm && "IntersectionObserver" in window) {
    const rv = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); }
    }), { threshold: .15 });
    document.querySelectorAll(".facts div,.areas li,.robot").forEach(el => {
      el.style.setProperty("--d", [...el.parentElement.children].indexOf(el) * .1 + "s");
      el.classList.add("rv"); rv.observe(el);
    });
  }

  // nav state
  const nav = document.querySelector(".nav");
  addEventListener("scroll", () => nav && nav.classList.toggle("scrolled", scrollY > 60), { passive: true });

  // contact form: sent animation + floating Message button
  const cform = document.getElementById("contact-form"), cstat = document.getElementById("contact-status");
  if (cform && cstat) new MutationObserver(() => {
    if (/success/i.test(cstat.textContent)) {
      cform.classList.add("sent");
      setTimeout(() => cform.classList.remove("sent"), 3000);
    }
  }).observe(cstat, { childList: true, characterData: true, subtree: true });
  const fab = document.createElement("a");
  fab.className = "fab"; fab.href = "/contact"; fab.setAttribute("data-path", "/contact"); fab.innerHTML = "<i></i>Message me";
  document.body.appendChild(fab);
  const cs = document.getElementById("contact-section");
  if (cs && "IntersectionObserver" in window)
    new IntersectionObserver(es => es.forEach(e => fab.classList.toggle("hide", e.isIntersecting)), { threshold: .25 }).observe(cs);

  if (calm || !fine) return;

  // soft cursor glow + portrait tilt
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  document.body.appendChild(glow);
  const arch = document.querySelector(".arch");
  addEventListener("pointermove", e => {
    glow.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    if (arch) {
      const b = arch.getBoundingClientRect();
      const x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
      const near = Math.abs(x) < 1.2 && Math.abs(y) < 1.2;
      arch.style.setProperty("--ry", near ? x * 12 + "deg" : "0deg");
      arch.style.setProperty("--rx", near ? -y * 12 + "deg" : "0deg");
    }
  }, { passive: true });
})();
