// effects.js — clean version: typing line, ticker, soft reveals, avatar tilt, form feedback
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

  // soft staggered reveal
  if (!calm && "IntersectionObserver" in window) {
    const rv = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); }
    }), { threshold: .15 });
    document.querySelectorAll("section h2,.facts div,.areas li,.robot").forEach(el => {
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

// Background: neural network with data packets, mouse interaction and scan pulses
(() => {
  const c = document.getElementById("fx");
  if (!c || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const x = c.getContext("2d"), m = { x: -999, y: -999 };
  const LINK = 135, dpr = Math.min(devicePixelRatio || 1, 2);
  let w, h, nodes = [], packets = [], pulse = null, last = 0;
  const size = () => {
    w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    nodes = Array.from({ length: Math.min(75, Math.round(w * h / 19000)) }, () => ({
      x: Math.random() * w, y: Math.random() * h, z: .45 + Math.random() * .55,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, t: Math.random() * 6
    }));
    packets = [];
  };
  size(); addEventListener("resize", size);
  addEventListener("pointermove", e => { m.x = e.clientX; m.y = e.clientY; }, { passive: true });
  (function draw(now) {
    x.clearRect(0, 0, w, h);
    nodes.forEach(a => {
      a.x = (a.x + a.vx * a.z + w) % w; a.y = (a.y + a.vy * a.z + h) % h;
      const dx = a.x - m.x, dy = a.y - m.y, dm = Math.hypot(dx, dy);
      if (dm < 140 && dm > 1) { a.x += dx / dm * (140 - dm) * .012; a.y += dy / dm * (140 - dm) * .012; }
    });
    const near = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < LINK) {
        near.push([a, b]);
        x.strokeStyle = `rgba(120,160,255,${.22 * (1 - d / LINK) * Math.min(a.z, b.z)})`;
        x.lineWidth = 1; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
      }
    }
    // data packets travelling along links
    if (near.length && packets.length < 16 && Math.random() < .07) {
      const [a, b] = near[Math.random() * near.length | 0];
      packets.push({ a, b, t: 0, s: .012 + Math.random() * .014, c: Math.random() < .25 ? "255,59,71" : "77,226,255" });
    }
    packets = packets.filter(p => (p.t += p.s) < 1);
    packets.forEach(p => {
      const px = p.a.x + (p.b.x - p.a.x) * p.t, py = p.a.y + (p.b.y - p.a.y) * p.t;
      const tx = p.a.x + (p.b.x - p.a.x) * Math.max(0, p.t - .12), ty = p.a.y + (p.b.y - p.a.y) * Math.max(0, p.t - .12);
      x.strokeStyle = `rgba(${p.c},.7)`; x.lineWidth = 1.6; x.beginPath(); x.moveTo(tx, ty); x.lineTo(px, py); x.stroke();
      x.fillStyle = `rgba(${p.c},1)`; x.beginPath(); x.arc(px, py, 2, 0, 7); x.fill();
    });
    // nodes
    nodes.forEach(a => {
      x.fillStyle = `rgba(235,240,255,${(.4 + .4 * Math.sin(now / 900 + a.t)) * a.z})`;
      x.beginPath(); x.arc(a.x, a.y, 1.9 * a.z, 0, 7); x.fill();
      const dm = Math.hypot(a.x - m.x, a.y - m.y);
      if (dm < 160) { x.strokeStyle = `rgba(77,226,255,${.5 * (1 - dm / 160)})`; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(m.x, m.y); x.stroke(); }
    });
    // occasional scan pulse
    if (!pulse && now - last > 7000 && nodes.length) { const n = nodes[Math.random() * nodes.length | 0]; pulse = { x: n.x, y: n.y, r: 0 }; last = now; }
    if (pulse) {
      pulse.r += 3.2;
      x.strokeStyle = `rgba(139,92,246,${Math.max(0, .5 - pulse.r / 700)})`; x.lineWidth = 1.5;
      x.beginPath(); x.arc(pulse.x, pulse.y, pulse.r, 0, 7); x.stroke();
      if (pulse.r > 350) pulse = null;
    }
    requestAnimationFrame(draw);
  })(0);
})();
