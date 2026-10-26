// template.js — light portfolio template: reveal on scroll, count-up, photo tilt, nav shadow, floating orbs
(() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const skip = document.querySelector(".skip");
  if (skip) skip.addEventListener("click", e => { e.preventDefault(); const m = document.getElementById("main"); m.setAttribute("tabindex", "-1"); m.focus(); m.scrollIntoView(); });

  const nav = document.querySelector(".nav");
  addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 20), { passive: true });

  if (calm || !("IntersectionObserver" in window)) return;

  // reveal on scroll with a small stagger
  const rv = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); }
  }), { threshold: .12 });
  document.querySelectorAll(".eyebrow,section h2,.facts div,.skills article,.robot,.code,.gallery-grid,#contact-form,.stats").forEach(el => {
    el.style.setProperty("--d", [...el.parentElement.children].indexOf(el) * .08 + "s");
    el.classList.add("rv"); rv.observe(el);
  });

  // count-up numbers
  document.querySelectorAll("[data-count]").forEach(el => {
    const end = +el.dataset.count; let n = 0;
    const id = setInterval(() => { el.textContent = ++n; if (n >= end) clearInterval(id); }, 450);
    el.textContent = 0;
  });

  // photo card tilt + orb parallax (mouse devices only)
  if (!matchMedia("(pointer:fine)").matches) return;
  const card = document.querySelector(".photo-card"), orbs = document.querySelectorAll(".orb");
  addEventListener("pointermove", e => {
    const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
    orbs.forEach((o, i) => o.style.translate = `${nx * (30 + i * 20)}px ${ny * (30 + i * 20)}px`);
    if (card) {
      const b = card.getBoundingClientRect();
      const x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
      const near = Math.abs(x) < 1 && Math.abs(y) < 1;
      card.style.setProperty("--ry", near ? x * 8 + "deg" : "0deg");
      card.style.setProperty("--rx", near ? -y * 8 + "deg" : "0deg");
    }
  }, { passive: true });
})();
