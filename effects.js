// effects.js — typing role line, 3D tilt, pointer spotlight, cursor glow, magnetic buttons, ticker
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
    const row = words.concat(words).map(w => `<span>${w}</span>`).join("");
    const t = document.createElement("div");
    t.className = "ticker"; t.setAttribute("aria-hidden", "true");
    t.innerHTML = `<div>${row}</div>`;
    hero.after(t);
  }

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
