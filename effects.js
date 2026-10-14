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

// Background: robot / AI circuit board, AI robot head, data pulses, binary stream and scan line
(() => {
  const c = document.getElementById("fx"); if (!c) return;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const x = c.getContext("2d"), dpr = Math.min(devicePixelRatio || 1, 2), G = 44;
  const dirs = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
  let w, h, base, paths = [], pulses = [], cols = [];
  const rnd = n => Math.random() * n | 0;

  const build = () => {
    w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    base = document.createElement("canvas"); base.width = w * dpr; base.height = h * dpr;
    const b = base.getContext("2d"); b.setTransform(dpr, 0, 0, dpr, 0, 0);
    b.lineJoin = "round"; b.lineCap = "round";
    paths = []; pulses = [];
    for (let i = 0, n = Math.round(w * h / 48000); i < n; i++) {
      let px = Math.round(Math.random() * w / G) * G, py = Math.round(Math.random() * h / G) * G, d = rnd(4) * 2;
      const pts = [[px, py]], cum = [0];
      for (let s = 0, k = 6 + rnd(5); s < k; s++) {
        const len = (1 + rnd(3)) * G, dx = dirs[d][0] * len, dy = dirs[d][1] * len;
        px += dx; py += dy; pts.push([px, py]);
        cum.push(cum[cum.length - 1] + Math.hypot(dx, dy));
        d = (d + [-1, 1, 0, 0, 0][rnd(5)] + 8) % 8;
      }
      paths.push({ pts, cum, total: cum[cum.length - 1] });
      b.strokeStyle = "rgba(77,226,255,.12)"; b.lineWidth = 1.2;
      b.beginPath(); pts.forEach(([a, e], j) => j ? b.lineTo(a, e) : b.moveTo(a, e)); b.stroke();
      pts.forEach(([a, e], j) => { b.fillStyle = "rgba(77,226,255,.22)"; b.beginPath(); b.arc(a, e, j === 0 || j === pts.length - 1 ? 3.5 : 1.6, 0, 7); b.fill(); });
      const [ex, ey] = pts[pts.length - 1];
      b.strokeStyle = "rgba(139,92,246,.35)"; b.beginPath(); b.arc(ex, ey, 6, 0, 7); b.stroke();
    }
    cols = Array.from({ length: Math.ceil(w / 90) }, (_, i) => ({
      x: i * 90 + 25 + rnd(40), y: rnd(h), s: .35 + Math.random() * .7,
      t: Array.from({ length: 12 }, () => rnd(2))
    }));
  };
  build();
  addEventListener("resize", build);
  if (calm) { x.drawImage(base, 0, 0, w, h); return; }

  const at = (p, d) => {
    let i = 1; while (i < p.cum.length - 1 && p.cum[i] < d) i++;
    const f = (d - p.cum[i - 1]) / (p.cum[i] - p.cum[i - 1]), a = p.pts[i - 1], b = p.pts[i];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };

  // AI robot head: tracks the cursor, blinks, scans, and "speaks" with an equalizer mouth
  const m = { x: null, y: 0 };
  addEventListener("pointermove", e => { m.x = e.clientX; m.y = e.clientY; }, { passive: true });
  const rr = (a, b, cw, ch, r) => { x.beginPath(); x.roundRect ? x.roundRect(a, b, cw, ch, r) : x.rect(a, b, cw, ch); };
  const robot = now => {
    const S = Math.min(h * .8, w * .55), W = S * .8, cx = w * .77, cy = h * .5, t = now / 1000;
    const mx = m.x ?? cx + Math.cos(t * .7) * w * .25, my = m.x === null ? cy + Math.sin(t * .5) * h * .2 : m.y;
    x.save(); x.translate(cx, cy); x.rotate(Math.max(-1, Math.min(1, (mx - cx) / w)) * .05);
    x.lineWidth = 1.5; x.strokeStyle = "rgba(77,226,255,.2)";
    rr(-W / 2, -S * .42, W, S * .84, S * .14); x.stroke();
    x.beginPath(); x.moveTo(0, -S * .42); x.lineTo(0, -S * .5); x.stroke();
    x.fillStyle = `rgba(255,59,71,${.55 + .4 * Math.sin(t * 3)})`; x.beginPath(); x.arc(0, -S * .5, 5 + 2 * Math.sin(t * 3), 0, 7); x.fill();
    rr(-W / 2 - S * .05, -S * .08, S * .05, S * .2, 6); x.stroke();
    rr(W / 2, -S * .08, S * .05, S * .2, 6); x.stroke();
    rr(-W * .15, S * .42, W * .3, S * .08, 6); x.stroke();
    // visor with a red scan bar
    x.strokeStyle = "rgba(77,226,255,.28)"; x.fillStyle = "rgba(77,226,255,.04)";
    rr(-W * .38, -S * .27, W * .76, S * .22, S * .08); x.fill(); x.stroke();
    const vx = -W * .38 + ((now / 9) % (W * .76));
    x.strokeStyle = "rgba(255,59,71,.35)"; x.beginPath(); x.moveTo(vx, -S * .25); x.lineTo(vx, -S * .07); x.stroke();
    // eyes follow the pointer
    const blink = now % 4300 < 140 ? .12 : 1;
    [-1, 1].forEach(side => {
      const ex = cx + side * W * .18, ey = cy - S * .16, r = S * .055;
      const dx = mx - ex, dy = my - ey, dist = Math.hypot(dx, dy) || 1, k = Math.min(.45, dist / 600);
      const px = side * W * .18 + dx / dist * r * k * 1.6, py = -S * .16 + dy / dist * r * k * 1.6;
      const g = x.createRadialGradient(px, py, 0, px, py, r * 2.4);
      g.addColorStop(0, "rgba(77,226,255,.5)"); g.addColorStop(1, "rgba(77,226,255,0)");
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r * 2.4, 0, 7); x.fill();
      x.strokeStyle = "rgba(77,226,255,.35)"; x.beginPath(); x.arc(side * W * .18, -S * .16, r * 1.25, 0, 7); x.stroke();
      x.fillStyle = "rgba(190,245,255,.85)"; x.beginPath(); x.ellipse(px, py, r * .55, r * .55 * blink, 0, 0, 7); x.fill();
    });
    // equalizer mouth
    x.fillStyle = "rgba(77,226,255,.28)";
    for (let i = 0; i < 9; i++) {
      const bh = S * .015 + S * .05 * (.5 + .5 * Math.sin(now / 170 + i * 1.3));
      x.fillRect(-W * .27 + i * W * .0675, S * .32 - bh / 2, W * .04, bh);
    }
    x.restore();
  };

  (function draw(now) {
    x.clearRect(0, 0, w, h);
    x.drawImage(base, 0, 0, w, h);

    // binary data stream
    x.font = "11px ui-monospace,Menlo,Consolas,monospace";
    cols.forEach(col => {
      col.y += col.s; if (col.y - 170 > h) col.y = -10;
      if (Math.random() < .03) col.t[rnd(12)] = rnd(2);
      col.t.forEach((v, k) => { x.fillStyle = `rgba(77,226,255,${.2 * (1 - k / 12)})`; x.fillText(v, col.x, col.y - k * 14); });
    });

    robot(now);

    // data pulses running along the circuit traces
    if (paths.length && pulses.length < 14 && Math.random() < .05)
      pulses.push({ p: paths[rnd(paths.length)], d: 0, s: 1.6 + Math.random() * 2.2, c: Math.random() < .25 ? "255,59,71" : "77,226,255" });
    pulses = pulses.filter(q => (q.d += q.s) < q.p.total + 40);
    pulses.forEach(q => {
      for (let k = 0; k < 9; k++) {
        const d = Math.min(q.d, q.p.total) - k * 7; if (d < 0) break;
        const [px, py] = at(q.p, d);
        x.fillStyle = `rgba(${q.c},${1 - k / 9})`; x.beginPath(); x.arc(px, py, 2.6 - k * .22, 0, 7); x.fill();
      }
      const [hx, hy] = at(q.p, Math.min(q.d, q.p.total));
      x.fillStyle = `rgba(${q.c},.18)`; x.beginPath(); x.arc(hx, hy, 9, 0, 7); x.fill();
    });

    // slow scan line
    const sy = (now / 18) % (h + 260) - 130, g = x.createLinearGradient(0, sy - 60, 0, sy + 60);
    g.addColorStop(0, "rgba(77,226,255,0)"); g.addColorStop(.5, "rgba(77,226,255,.07)"); g.addColorStop(1, "rgba(77,226,255,0)");
    x.fillStyle = g; x.fillRect(0, sy - 60, w, 120);

    requestAnimationFrame(draw);
  })(0);
})();
