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

// Background: a little tech — faint circuit traces with data pulses running along them
(() => {
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const c = document.createElement("canvas");
  c.id = "techfx"; c.setAttribute("aria-hidden", "true");
  c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none";
  document.body.prepend(c);
  const x = c.getContext("2d"), dpr = Math.min(devicePixelRatio || 1, 2), G = 48;
  const dirs = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
  const rnd = n => Math.random() * n | 0;
  let w, h, base, paths = [], pulses = [], glyphs = [];
  const GL = ["</>", "{ }", "01", "( )", "[ ]", "=>", "//", "&&", "#", ";"];

  const build = () => {
    w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    base = document.createElement("canvas"); base.width = w * dpr; base.height = h * dpr;
    const b = base.getContext("2d"); b.setTransform(dpr, 0, 0, dpr, 0, 0);
    b.lineJoin = b.lineCap = "round";
    // dotted grid
    b.fillStyle = "rgba(14,165,233,.16)";
    for (let gx = G / 2; gx < w; gx += G) for (let gy = G / 2; gy < h; gy += G) { b.beginPath(); b.arc(gx, gy, 1.1, 0, 7); b.fill(); }
    // circuit traces (kept sparse and faint)
    paths = []; pulses = [];
    glyphs = Array.from({ length: Math.max(6, Math.round(w * h / 110000)) }, () => ({ t: GL[rnd(GL.length)], x: Math.random() * w, y: Math.random() * h, v: .12 + Math.random() * .22, s: 14 + rnd(10) }));
    for (let i = 0, n = Math.max(5, Math.round(w * h / 90000)); i < n; i++) {
      let px = Math.round(Math.random() * w / G) * G + G / 2, py = Math.round(Math.random() * h / G) * G + G / 2, d = rnd(4) * 2;
      const pts = [[px, py]], cum = [0];
      for (let s = 0, k = 5 + rnd(4); s < k; s++) {
        const len = (1 + rnd(3)) * G, dx = dirs[d][0] * len, dy = dirs[d][1] * len;
        px += dx; py += dy; pts.push([px, py]);
        cum.push(cum[cum.length - 1] + Math.hypot(dx, dy));
        d = (d + [-1, 1, 0, 0, 0][rnd(5)] + 8) % 8;
      }
      paths.push({ pts, cum, total: cum[cum.length - 1] });
      b.strokeStyle = "rgba(14,165,233,.17)"; b.lineWidth = 1.3;
      b.beginPath(); pts.forEach(([a, e], j) => j ? b.lineTo(a, e) : b.moveTo(a, e)); b.stroke();
      const [sx, sy] = pts[0], [ex, ey] = pts[pts.length - 1];
      [[sx, sy], [ex, ey]].forEach(([a, e]) => { b.fillStyle = "rgba(14,165,233,.28)"; b.beginPath(); b.arc(a, e, 3.4, 0, 7); b.fill(); });
      b.strokeStyle = "rgba(59,130,246,.3)"; b.beginPath(); b.arc(ex, ey, 6.5, 0, 7); b.stroke();
    }
    x.clearRect(0, 0, w, h); x.drawImage(base, 0, 0, w, h);
  };
  build();
  addEventListener("resize", build);
  if (calm) return;

  const at = (p, d) => {
    let i = 1; while (i < p.cum.length - 1 && p.cum[i] < d) i++;
    const f = (d - p.cum[i - 1]) / (p.cum[i] - p.cum[i - 1]), a = p.pts[i - 1], b = p.pts[i];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };

  (function draw() {
    x.clearRect(0, 0, w, h);
    x.drawImage(base, 0, 0, w, h);
    x.textBaseline = "middle";
    glyphs.forEach(g => {
      g.y -= g.v; if (g.y < -30) { g.y = h + 30; g.x = Math.random() * w; }
      x.font = `600 ${g.s}px ui-monospace,Menlo,Consolas,monospace`;
      x.fillStyle = "rgba(14,165,233,.14)"; x.fillText(g.t, g.x, g.y);
    });
    if (paths.length && pulses.length < 6 && Math.random() < .03)
      pulses.push({ p: paths[rnd(paths.length)], d: 0, s: 1.4 + Math.random() * 1.6, c: Math.random() < .3 ? "59,130,246" : "14,165,233" });
    pulses = pulses.filter(q => (q.d += q.s) < q.p.total + 40);
    pulses.forEach(q => {
      for (let k = 0; k < 8; k++) {
        const d = Math.min(q.d, q.p.total) - k * 7; if (d < 0) break;
        const [px, py] = at(q.p, d);
        x.fillStyle = `rgba(${q.c},${.9 - k * .1})`; x.beginPath(); x.arc(px, py, 2.4 - k * .22, 0, 7); x.fill();
      }
      const [hx, hy] = at(q.p, Math.min(q.d, q.p.total));
      x.fillStyle = `rgba(${q.c},.16)`; x.beginPath(); x.arc(hx, hy, 9, 0, 7); x.fill();
    });
    requestAnimationFrame(draw);
  })();
})();

// Terminal: types each command, then shows its output
(() => {
  const term = document.querySelector(".term");
  if (!term || matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const lines = [...term.querySelectorAll(".term-body p")];
  const cmds = lines.map(p => (p.querySelector(".pr") && !p.querySelector(".cur")) ? p.lastChild : null);
  const texts = cmds.map(n => n ? n.textContent : "");
  lines.forEach((p, i) => { p.style.visibility = "hidden"; if (cmds[i]) cmds[i].textContent = ""; });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  new IntersectionObserver(async (es, io) => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    for (let i = 0; i < lines.length; i++) {
      lines[i].style.visibility = "visible";
      if (cmds[i]) { for (const ch of texts[i]) { cmds[i].textContent += ch; await wait(42); } await wait(260); }
      else await wait(380);
    }
  }, { threshold: .5 }).observe(term);
})();

// Back-to-top button
(() => {
  const b = document.createElement("button");
  b.className = "totop"; b.type = "button"; b.setAttribute("aria-label", "Back to top"); b.textContent = "↑";
  b.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(b);
  addEventListener("scroll", () => b.classList.toggle("show", scrollY > 700), { passive: true });
})();

// Skill cards (About page): click or press Enter to read more about each topic
(() => {
  const cards = document.querySelectorAll(".skills article[data-topic]");
  if (!cards.length) return;

  const overlay = document.createElement("div");
  overlay.className = "topic-overlay"; overlay.hidden = true;
  overlay.innerHTML = '<div class="topic-card" role="dialog" aria-modal="true" aria-labelledby="topic-title"><button class="topic-close" type="button" aria-label="Close">×</button><div class="topic-head"><span class="ico"></span><h3 id="topic-title"></h3></div><div class="topic-body"></div></div>';
  document.body.appendChild(overlay);
  const card = overlay.querySelector(".topic-card");
  const closeBtn = overlay.querySelector(".topic-close");
  let opener = null;

  const open = el => {
    const tpl = document.getElementById("topic-" + el.dataset.topic);
    if (!tpl) return;
    opener = el;
    overlay.querySelector(".ico").innerHTML = el.querySelector(".ico").innerHTML;
    overlay.querySelector("h3").textContent = el.querySelector("h3").textContent;
    overlay.querySelector(".topic-body").replaceChildren(tpl.content.cloneNode(true));
    overlay.hidden = false;
    document.body.classList.add("topic-open");
    card.scrollTop = 0;
    closeBtn.focus();
  };
  const close = () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove("topic-open");
    if (opener) opener.focus();
  };

  cards.forEach(el => {
    el.addEventListener("click", () => open(el));
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(el); } });
  });
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", e => {
    if (overlay.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "Tab") { e.preventDefault(); closeBtn.focus(); } // the close button is the only control inside
  });
})();
