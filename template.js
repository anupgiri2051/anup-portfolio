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
  document.querySelectorAll(".eyebrow,section h2,.facts div,.journey,.skills article,.robot,.code,.gallery-grid,#contact-form,.stats").forEach(el => {
    el.style.setProperty("--d", [...el.parentElement.children].indexOf(el) * .08 + "s");
    el.classList.add("rv"); rv.observe(el);
  });

  // count-up numbers
  document.querySelectorAll("[data-count]").forEach(el => {
    const end = +el.dataset.count; let n = 0;
    const id = setInterval(() => { if (!el.hasAttribute("data-count")) { clearInterval(id); return; } el.textContent = ++n; if (n >= end) clearInterval(id); }, 450);
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
  let w, h, base, paths = [], pulses = [], glyphs = [], running = true;
  // pause the animation while the tab is hidden (saves battery on phones and laptops)
  document.addEventListener("visibilitychange", () => { running = !document.hidden; });
  let ACC = "14,165,233", ACC2 = "59,130,246";
  const GL = ["</>", "{ }", "01", "( )", "[ ]", "=>", "//", "&&", "#", ";"];

  const build = () => {
    const cs = getComputedStyle(document.documentElement);
    ACC = cs.getPropertyValue("--acc-rgb").trim() || ACC;
    ACC2 = cs.getPropertyValue("--acc2-rgb").trim() || ACC2;
    w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    base = document.createElement("canvas"); base.width = w * dpr; base.height = h * dpr;
    const b = base.getContext("2d"); b.setTransform(dpr, 0, 0, dpr, 0, 0);
    b.lineJoin = b.lineCap = "round";
    // dotted grid
    b.fillStyle = `rgba(${ACC},.16)`;
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
      b.strokeStyle = `rgba(${ACC},.17)`; b.lineWidth = 1.3;
      b.beginPath(); pts.forEach(([a, e], j) => j ? b.lineTo(a, e) : b.moveTo(a, e)); b.stroke();
      const [sx, sy] = pts[0], [ex, ey] = pts[pts.length - 1];
      [[sx, sy], [ex, ey]].forEach(([a, e]) => { b.fillStyle = `rgba(${ACC},.28)`; b.beginPath(); b.arc(a, e, 3.4, 0, 7); b.fill(); });
      b.strokeStyle = `rgba(${ACC2},.3)`; b.beginPath(); b.arc(ex, ey, 6.5, 0, 7); b.stroke();
    }
    x.clearRect(0, 0, w, h); x.drawImage(base, 0, 0, w, h);
  };
  build();
  addEventListener("resize", build);
  addEventListener("themechange", build);
  if (calm) return;

  const at = (p, d) => {
    let i = 1; while (i < p.cum.length - 1 && p.cum[i] < d) i++;
    const f = (d - p.cum[i - 1]) / (p.cum[i] - p.cum[i - 1]), a = p.pts[i - 1], b = p.pts[i];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };

  (function draw() {
    if (!running) { requestAnimationFrame(draw); return; }
    x.clearRect(0, 0, w, h);
    x.drawImage(base, 0, 0, w, h);
    x.textBaseline = "middle";
    glyphs.forEach(g => {
      g.y -= g.v; if (g.y < -30) { g.y = h + 30; g.x = Math.random() * w; }
      x.font = `600 ${g.s}px ui-monospace,Menlo,Consolas,monospace`;
      x.fillStyle = `rgba(${ACC},.14)`; x.fillText(g.t, g.x, g.y);
    });
    if (paths.length && pulses.length < 6 && Math.random() < .03)
      pulses.push({ p: paths[rnd(paths.length)], d: 0, s: 1.4 + Math.random() * 1.6, c: Math.random() < .3 ? ACC2 : ACC });
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

// Terminal: types each command, then shows its output (restarts when the text is edited in the admin)
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let token = 0, observer = null;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  window.startTerminal = () => {
    const term = document.querySelector(".term");
    if (!term || reduce || !("IntersectionObserver" in window)) return;
    const run = ++token;
    if (observer) observer.disconnect();
    const tb = term.querySelector(".term-body");
    if (tb && tb.dataset.def === undefined) tb.dataset.def = tb.innerHTML; // remember the original text before it is blanked for typing
    const lines = [...term.querySelectorAll(".term-body p")];
    const cmds = lines.map(p => (p.querySelector(".pr") && !p.querySelector(".cur")) ? p.lastChild : null);
    const texts = cmds.map(n => n ? n.textContent : "");
    lines.forEach((p, i) => { p.style.visibility = "hidden"; if (cmds[i]) cmds[i].textContent = ""; });
    observer = new IntersectionObserver(async (es, io) => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      for (let i = 0; i < lines.length; i++) {
        if (run !== token) return;
        lines[i].style.visibility = "visible";
        if (cmds[i]) {
          for (const ch of texts[i]) { if (run !== token) return; cmds[i].textContent += ch; await wait(42); }
          await wait(260);
        } else await wait(380);
      }
    }, { threshold: .5 });
    observer.observe(term);
  };
  window.startTerminal();
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

  // Reads the default text of a topic from its <template>, then applies anything edited in the admin
  const topicData = key => {
    const tpl = document.getElementById("topic-" + key);
    const def = { intro: "", items: [], tags: [], goal: "", h1: "What I’m learning", h2: "Topics I’m exploring" };
    if (tpl) {
      const f = tpl.content;
      const q = s => f.querySelector(s);
      if (q(".t-intro")) def.intro = q(".t-intro").textContent;
      def.items = [...f.querySelectorAll("li")].map(li => li.textContent);
      def.tags = [...f.querySelectorAll(".chips span")].map(s => s.textContent);
      const g = q(".t-goal");
      if (g) def.goal = g.textContent.replace(/^\s*My goal:\s*/i, "");
      const hs = f.querySelectorAll("h4");
      if (hs[0]) def.h1 = hs[0].textContent;
      if (hs[1]) def.h2 = hs[1].textContent;
    }
    const o = (window.siteTopics && window.siteTopics[key]) || {};
    return {
      intro: o.intro || def.intro,
      items: o.items && o.items.length ? o.items : def.items,
      tags: o.tags && o.tags.length ? o.tags : def.tags,
      goal: o.goal || def.goal,
      h1: def.h1, h2: def.h2
    };
  };

  const buildBody = key => {
    const d = topicData(key);
    const frag = document.createDocumentFragment();
    const add = (tag, text, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; e.textContent = text; frag.appendChild(e); return e; };
    if (d.intro) add("p", d.intro, "t-intro");
    if (d.items.length) {
      add("h4", d.h1);
      const ul = document.createElement("ul");
      d.items.forEach(t => { const li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
      frag.appendChild(ul);
    }
    if (d.tags.length) {
      add("h4", d.h2);
      const box = document.createElement("div");
      box.className = "chips";
      d.tags.forEach(t => { const s = document.createElement("span"); s.textContent = t; box.appendChild(s); });
      frag.appendChild(box);
    }
    if (d.goal) {
      const p = document.createElement("p");
      p.className = "t-goal";
      const b = document.createElement("b");
      b.textContent = "My goal:";
      p.append(b, " " + d.goal);
      frag.appendChild(p);
    }
    return frag;
  };

  const open = el => {
    opener = el;
    overlay.querySelector(".ico").innerHTML = el.querySelector(".ico").innerHTML;
    overlay.querySelector("h3").textContent = el.querySelector("h3").textContent;
    overlay.querySelector(".topic-body").replaceChildren(buildBody(el.dataset.topic));
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
