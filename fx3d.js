// fx3d.js — 3D parts for the website and the admin portal, with no extra libraries:
//   1. Globe:   a spinning 3D particle globe drawn on a <canvas data-globe>
//   2. Cube:    a 3D skill cube you can drag or spin with the arrow keys  (<div data-cube>)
//   3. Ring:    a 3D carousel layout for the photo gallery ("3D" layout button)
// With "reduce motion" on, the globe shows one still frame and nothing spins by itself.
(() => {
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const TAU = Math.PI * 2;

    function accent() {
        const cs = getComputedStyle(document.documentElement);
        return {
            a: cs.getPropertyValue("--acc-rgb").trim() || "14,165,233",
            b: cs.getPropertyValue("--acc2-rgb").trim() || "59,130,246",
            dark: document.documentElement.getAttribute("data-mode") === "dark"
        };
    }

    /* ======================= 1. 3D particle globe ======================= */
    // shared mouse position (-0.5 .. 0.5) so every globe leans toward the pointer
    const mouse = { x: 0, y: 0 };
    if (fine) addEventListener("pointermove", e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; }, { passive: true });

    function makeGlobe(canvas) {
        const small = canvas.dataset.globe === "small";
        const ctx = canvas.getContext("2d");
        const N = small ? 220 : 520;
        const pts = [];
        // evenly spread points on a sphere (Fibonacci sphere)
        for (let i = 0; i < N; i++) {
            const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i;
            pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
        }
        // a few short links between near neighbours make it look like a network
        const links = [];
        const maxD = small ? .3 : .19;
        for (let i = 0; i < N; i += 2) for (let j = i + 1; j < N; j++) {
            const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], dz = pts[i][2] - pts[j][2];
            if (dx * dx + dy * dy + dz * dz < maxD * maxD) { links.push([i, j]); if (links.length > N * 1.1) break; }
        }
        // satellites on tilted orbits
        const sats = [{ tilt: .5, speed: .9, off: 0, rad: 1.32 }, { tilt: -.9, speed: -.6, off: 2, rad: 1.42 }, { tilt: 1.3, speed: .45, off: 4, rad: 1.25 }];

        let w = 0, h = 0, dpr = 1, col = accent(), ry = 0, rx = -.35, tx = 0, ty = 0, visible = true, raf = 0, t0 = performance.now();

        const size = () => {
            const r = canvas.getBoundingClientRect();
            dpr = Math.min(devicePixelRatio || 1, 2);
            w = Math.max(1, r.width); h = Math.max(1, r.height);
            canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (calm) draw(performance.now());
        };

        function project(p, R, cx, cy, cosY, sinY, cosX, sinX) {
            // rotate around Y, then X, then simple perspective
            let x = p[0] * cosY - p[2] * sinY, z = p[0] * sinY + p[2] * cosY, y = p[1];
            const y2 = y * cosX - z * sinX; z = y * sinX + z * cosX; y = y2;
            const s = 2.6 / (2.6 + z);
            return [cx + x * R * s, cy + y * R * s, z, s];
        }

        function draw(now) {
            const t = (now - t0) / 1000;
            ctx.clearRect(0, 0, w, h);
            const R = Math.min(w, h) * (small ? .36 : .4), cx = w / 2, cy = h / 2;
            tx += ((mouse.x * .9) - tx) * .05; ty += ((mouse.y * .6) - ty) * .05;
            const cosY = Math.cos(ry + tx), sinY = Math.sin(ry + tx), cosX = Math.cos(rx + ty), sinX = Math.sin(rx + ty);
            const P = pts.map(p => project(p, R, cx, cy, cosY, sinY, cosX, sinX));
            const front = col.dark ? .95 : .85, back = col.dark ? .14 : .12;

            // soft glow behind the globe
            const g = ctx.createRadialGradient(cx, cy, R * .2, cx, cy, R * 1.25);
            g.addColorStop(0, `rgba(${col.a},${col.dark ? .16 : .12})`); g.addColorStop(1, `rgba(${col.a},0)`);
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, TAU); ctx.fill();

            // equator ring
            ctx.lineWidth = 1;
            ctx.strokeStyle = `rgba(${col.b},.22)`;
            ctx.beginPath();
            for (let k = 0; k <= 64; k++) {
                const a = k / 64 * TAU, q = project([Math.cos(a) * 1.12, 0, Math.sin(a) * 1.12], R, cx, cy, cosY, sinY, cosX, sinX);
                k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
            }
            ctx.stroke();

            // network links
            for (const [i, j] of links) {
                const a = P[i], b = P[j], d = (a[2] + b[2]) / 2;
                const al = (back + (front - back) * (1 - (d + 1) / 2)) * .35;
                ctx.strokeStyle = `rgba(${col.a},${al.toFixed(3)})`;
                ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
            }
            // points: nearer = bigger and brighter
            for (let i = 0; i < N; i++) {
                const q = P[i], depth = 1 - (q[2] + 1) / 2;
                const al = back + (front - back) * depth;
                ctx.fillStyle = `rgba(${i % 7 ? col.a : col.b},${al.toFixed(3)})`;
                ctx.beginPath(); ctx.arc(q[0], q[1], (small ? .9 : 1.1) + depth * (small ? 1.2 : 1.7) * q[3], 0, TAU); ctx.fill();
            }
            // satellites with short trails
            sats.forEach(s => {
                for (let k = 0; k < 10; k++) {
                    const a = (t * s.speed + s.off) - k * .045 * Math.sign(s.speed);
                    const p = [Math.cos(a) * s.rad, Math.sin(a) * s.rad * Math.sin(s.tilt), Math.sin(a) * s.rad * Math.cos(s.tilt)];
                    const q = project(p, R, cx, cy, cosY, sinY, cosX, sinX);
                    ctx.fillStyle = `rgba(${col.b},${(.9 - k * .09) * (q[2] < 0 ? 1 : .45)})`;
                    ctx.beginPath(); ctx.arc(q[0], q[1], (3 - k * .25) * q[3], 0, TAU); ctx.fill();
                }
            });
        }

        function loop(now) {
            raf = 0;
            if (!visible || document.hidden) return;
            ry += small ? .006 : .0035;
            draw(now);
            raf = requestAnimationFrame(loop);
        }
        const start = () => { if (!calm && !raf) raf = requestAnimationFrame(loop); };

        size();
        if ("ResizeObserver" in window) new ResizeObserver(size).observe(canvas); else addEventListener("resize", size);
        addEventListener("themechange", () => { col = accent(); if (calm) draw(performance.now()); });
        if ("IntersectionObserver" in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(canvas);
        document.addEventListener("visibilitychange", start);
        if (calm) draw(performance.now()); else start();
    }

    /* ======================= 2. draggable 3D cube ======================= */
    function makeCube(scene) {
        const cube = scene.querySelector(".cube");
        if (!cube) return;
        let rx = -20, ry = -30, vx = 0, vy = calm ? 0 : .25, drag = null, raf = 0, idle = 0, seen = true;
        const apply = () => { cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
        const loop = () => {
            raf = 0;
            if (!drag) {
                ry += vy; rx += vx;
                vx *= .92;
                const settled = performance.now() - idle > 1500;
                if (calm) vy *= .9;                                              // no auto spin: just slow down
                else if (settled) { vy += (.25 - vy) * .03; rx += (-20 - rx) * .02; } // ease back to a gentle spin
                else vy *= .95;                                                   // momentum after a flick
            }
            apply();
            if (drag || (seen && !document.hidden && (!calm || Math.abs(vy) > .01 || Math.abs(vx) > .01))) raf = requestAnimationFrame(loop);
        };
        const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
        scene.addEventListener("pointerdown", e => {
            drag = { x: e.clientX, y: e.clientY, rx, ry, lx: e.clientX, ly: e.clientY };
            scene.setPointerCapture(e.pointerId);
            scene.classList.add("grabbing");
            kick();
        });
        scene.addEventListener("pointermove", e => {
            if (!drag) return;
            ry = drag.ry + (e.clientX - drag.x) * .5;
            rx = drag.rx - (e.clientY - drag.y) * .5;
            vy = (e.clientX - drag.lx) * .3; vx = -(e.clientY - drag.ly) * .3;
            drag.lx = e.clientX; drag.ly = e.clientY;
        });
        const end = () => { if (!drag) return; drag = null; idle = performance.now(); scene.classList.remove("grabbing"); kick(); };
        scene.addEventListener("pointerup", end);
        scene.addEventListener("pointercancel", end);
        scene.addEventListener("keydown", e => {
            const m = { ArrowLeft: [0, -90], ArrowRight: [0, 90], ArrowUp: [90, 0], ArrowDown: [-90, 0] }[e.key];
            if (!m) return;
            e.preventDefault();
            rx += m[0]; ry += m[1]; vx = 0; vy = 0; idle = performance.now();
            cube.classList.add("snap"); apply(); setTimeout(() => cube.classList.remove("snap"), 600);
            kick();
        });
        apply();
        if ("IntersectionObserver" in window) new IntersectionObserver(es => { seen = es[0].isIntersecting; if (seen) kick(); }).observe(scene);
        else kick();
        document.addEventListener("visibilitychange", kick);
    }

    /* ======================= 3. 3D gallery ring ======================= */
    function setupRing() {
        const grid = document.getElementById("gallery-container");
        const ctrl = document.getElementById("carousel-ctrl");
        if (!grid || !ctrl) return;
        let pos = 0, auto = null, drag = null, moved = false;
        const on = () => grid.dataset.layout === "carousel";
        const items = () => [...grid.querySelectorAll(".gallery-item:not(.is-hidden)")];
        const mod = (a, n) => ((a % n) + n) % n;

        function layout(dragOffset = 0) {
            const active = on();
            ctrl.hidden = !active;
            if (!active) {
                grid.style.transform = "";
                grid.querySelectorAll(".gallery-item").forEach(it => { it.style.removeProperty("--t"); it.style.zIndex = ""; it.classList.remove("front"); });
                stopAuto();
                return;
            }
            const list = items(), n = list.length;
            if (!n) { grid.style.transform = ""; return; }
            const w = list[0].offsetWidth || 260;
            const step = 360 / n;
            const r = n === 1 ? 0 : n === 2 ? Math.round(w * .75) : Math.round((w / 2) / Math.tan(Math.PI / n) + 46);
            const cur = mod(Math.round(pos), n);
            // every photo carries its own full 3D position on the ring; nearer photos sit on top
            list.forEach((it, i) => {
                const ang = (i - pos - dragOffset) * step;
                it.style.setProperty("--t", `perspective(1500px) translateZ(${-r}px) rotateY(${ang.toFixed(2)}deg) translateZ(${r}px)`);
                it.style.zIndex = String(Math.round(Math.cos(ang * Math.PI / 180) * 100) + 100);
                it.classList.toggle("front", i === cur);
                it.dataset.ci = i;
            });
            grid.style.transform = "";
            const c = document.getElementById("carousel-count");
            if (c) c.textContent = (cur + 1) + " / " + n;
        }
        const go = d => { pos += d; layout(); };
        const goTo = i => {
            const n = items().length; if (!n) return;
            let d = i - mod(Math.round(pos), n);
            if (d > n / 2) d -= n; if (d < -n / 2) d += n;
            go(d);
        };
        function startAuto() {
            if (auto || calm) return;
            auto = setInterval(() => go(1), 2600);
            const b = document.getElementById("car-spin");
            if (b) { b.innerHTML = window.icon ? icon("pause") : "II"; b.setAttribute("aria-label", "Stop rotating"); b.classList.add("on"); }
        }
        function stopAuto() {
            clearInterval(auto); auto = null;
            const b = document.getElementById("car-spin");
            if (b) { b.innerHTML = window.icon ? icon("play") : "▶"; b.setAttribute("aria-label", "Rotate automatically"); b.classList.remove("on"); }
        }

        document.getElementById("car-prev").addEventListener("click", () => { stopAuto(); go(-1); });
        document.getElementById("car-next").addEventListener("click", () => { stopAuto(); go(1); });
        const spin = document.getElementById("car-spin");
        if (calm) spin.hidden = true;
        spin.addEventListener("click", () => auto ? stopAuto() : startAuto());

        // drag / swipe to turn the ring
        grid.addEventListener("pointerdown", e => {
            if (!on() || e.button > 0) return;
            drag = { x: e.clientX, w: (items()[0] || {}).offsetWidth || 260 };
            moved = false;
        });
        addEventListener("pointermove", e => {
            if (!drag) return;
            const dx = e.clientX - drag.x;
            if (Math.abs(dx) > 6) { moved = true; grid.classList.add("dragging"); stopAuto(); }
            if (moved) layout(-dx / drag.w);
        });
        addEventListener("pointerup", e => {
            if (!drag) return;
            const dx = e.clientX - drag.x, w = drag.w;
            drag = null;
            grid.classList.remove("dragging");
            if (moved) { pos += Math.round(-dx / w); layout(); }
        });
        // click a side photo to bring it to the front; click the front one to open it
        grid.addEventListener("click", e => {
            if (!on()) return;
            if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; return; }
            const it = e.target.closest(".gallery-item");
            if (it && !it.classList.contains("front")) { e.stopPropagation(); e.preventDefault(); stopAuto(); goTo(+it.dataset.ci); }
        }, true);
        // arrow keys while the 3D gallery is showing
        document.addEventListener("keydown", e => {
            if (!on() || document.body.classList.contains("lb-open") || !document.body.classList.contains("view-gallery")) return;
            const t = e.target;
            if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
            if (e.key === "ArrowLeft") { e.preventDefault(); stopAuto(); go(-1); }
            if (e.key === "ArrowRight") { e.preventDefault(); stopAuto(); go(1); }
        });
        addEventListener("resize", () => layout());
        window.refreshCarousel = () => layout();
        layout();
    }

    /* ---------- start ---------- */
    function init() {
        document.querySelectorAll("canvas[data-globe]").forEach(makeGlobe);
        document.querySelectorAll("[data-cube]").forEach(makeCube);
        setupRing();
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
