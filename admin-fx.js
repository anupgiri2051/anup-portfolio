// admin-fx.js — constellation background, cursor glow, card spotlight
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.getElementById("bg"); if (!c) return;
  const x = c.getContext("2d"), m = { x: -999, y: -999 };
  let w, h, stars = [];
  const size = () => {
    w = c.width = innerWidth; h = c.height = innerHeight;
    stars = Array.from({ length: Math.min(80, Math.round(w * h / 18000)) }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.2 + .4,
      vx: (Math.random() - .5) * .2, vy: (Math.random() - .5) * .2, t: Math.random() * 6 }));
  };
  size(); addEventListener("resize", size);
  const glow = document.createElement("div"); glow.className = "cursor-glow"; document.body.appendChild(glow);
  addEventListener("pointermove", e => {
    m.x = e.clientX; m.y = e.clientY;
    glow.style.transform = `translate(${m.x}px,${m.y}px)`;
    const s = e.target.closest?.(".glass-card");
    if (s) { const b = s.getBoundingClientRect(); s.style.setProperty("--mx", e.clientX - b.left + "px"); s.style.setProperty("--my", e.clientY - b.top + "px"); }
  }, { passive: true });
  (function draw(now) {
    x.clearRect(0, 0, w, h);
    stars.forEach((a, i) => {
      a.x = (a.x + a.vx + w) % w; a.y = (a.y + a.vy + h) % h;
      x.fillStyle = `rgba(242,240,255,${.4 + .4 * Math.sin(now / 900 + a.t)})`;
      x.beginPath(); x.arc(a.x, a.y, a.r, 0, 7); x.fill();
      for (let j = i + 1; j < stars.length; j++) {
        const b = stars[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) { x.strokeStyle = `rgba(140,160,255,${.2 * (1 - d / 120)})`; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); }
      }
      const dm = Math.hypot(a.x - m.x, a.y - m.y);
      if (dm < 150) { x.strokeStyle = `rgba(255,59,71,${.5 * (1 - dm / 150)})`; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(m.x, m.y); x.stroke(); }
    });
    requestAnimationFrame(draw);
  })(0);
})();
