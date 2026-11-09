const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Mobile menu ---------- */
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
links.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', false);
  })
);

/* ---------- Header on scroll ---------- */
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Reveal on scroll ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.section-head, .glow-card, .about-copy, .sub-head, .contact-grid > div')
  .forEach(el => { el.classList.add('reveal'); io.observe(el); });

/* ---------- Cursor spotlight on cards ---------- */
document.querySelectorAll('.glow-card').forEach(card => {
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

/* ---------- Count-up stats ---------- */
const statIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, end = +el.dataset.count;
    if (reduceMotion) { el.textContent = end; return; }
    const t0 = performance.now();
    const step = t => {
      const p = Math.min((t - t0) / 1200, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    statIO.unobserve(el);
  });
});
document.querySelectorAll('[data-count]').forEach(el => statIO.observe(el));

/* ---------- Text scramble in hero ---------- */
(() => {
  const el = document.getElementById('scramble');
  const words = ['schools', 'creators', 'commuters', 'businesses', 'gamers', 'Nigeria'];
  const glyphs = '!<>-_\\/[]{}=+*^?#01ABCDEF';
  let i = 0;
  if (reduceMotion) return;
  const scrambleTo = next => {
    const from = el.textContent, len = Math.max(from.length, next.length);
    const queue = [];
    for (let k = 0; k < len; k++) {
      const start = Math.floor(Math.random() * 16), end = start + Math.floor(Math.random() * 16);
      queue.push({ from: from[k] || '', to: next[k] || '', start, end });
    }
    let frame = 0;
    const tick = () => {
      let out = '', done = 0;
      for (const q of queue) {
        if (frame >= q.end) { done++; out += q.to; }
        else if (frame >= q.start) out += glyphs[Math.floor(Math.random() * glyphs.length)];
        else out += q.from;
      }
      el.textContent = out;
      frame++;
      if (done < queue.length) requestAnimationFrame(tick);
    };
    tick();
  };
  setInterval(() => { i = (i + 1) % words.length; scrambleTo(words[i]); }, 2600);
})();

/* ---------- Web3 globe: rotating node sphere with data arcs & orbiting blocks ---------- */
(() => {
  const canvas = document.getElementById('globe');
  const ctx = canvas.getContext('2d');
  let W, H, R, cx, cy, dpr;

  const ORANGE = [255, 138, 61];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // Fibonacci sphere points
  const N = 560, pts = [], ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
    pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }
  // Highlighted nodes
  const nodes = [];
  for (let i = 0; i < 18; i++) nodes.push(pts[Math.floor((i * 97 + 31) % N)]);
  // Arcs between nodes with travelling pulses
  const arcs = [];
  for (let i = 0; i < 14; i++) {
    const a = nodes[i % nodes.length], b = nodes[(i * 5 + 3) % nodes.length];
    if (a !== b) arcs.push({ a, b, off: Math.random(), speed: .12 + Math.random() * .18 });
  }

  const slerp = (a, b, t) => {
    const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const om = Math.acos(dot);
    if (om < 1e-4) return a;
    const s = Math.sin(om), k1 = Math.sin((1 - t) * om) / s, k2 = Math.sin(t * om) / s;
    const lift = 1 + Math.sin(Math.PI * t) * .16 * om;
    return [(a[0] * k1 + b[0] * k2) * lift, (a[1] * k1 + b[1] * k2) * lift, (a[2] * k1 + b[2] * k2) * lift];
  };

  let rotY = 0, tiltX = -0.35, targetTilt = -0.35, targetYaw = 0, yawOffset = 0;

  const rot = p => {
    const ay = rotY + yawOffset, ax = tiltX;
    const x1 = p[0] * Math.cos(ay) + p[2] * Math.sin(ay);
    const z1 = -p[0] * Math.sin(ay) + p[2] * Math.cos(ay);
    const y1 = p[1] * Math.cos(ax) - z1 * Math.sin(ax);
    const z2 = p[1] * Math.sin(ax) + z1 * Math.cos(ax);
    return [x1, y1, z2];
  };
  const proj = p => {
    const s = 1 / (1 - p[2] * 0.28);
    return [cx + p[0] * R * s, cy + p[1] * R * s, p[2], s];
  };

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = W > 900;
    R = wide ? Math.min(W * 0.21, H * 0.33) : Math.min(W * 0.42, H * 0.26);
    cx = wide ? W * 0.72 : W * 0.5;
    cy = wide ? H * 0.5 : H * 0.3;
  }

  // Orbiting "blocks"
  const sats = [0, 2.1, 4.2].map((o, i) => ({ o, ring: i % 2 }));

  function ringPoint(theta, radius, tilt, spin) {
    // circle in tilted plane
    let p = [Math.cos(theta) * radius, 0, Math.sin(theta) * radius];
    const c = Math.cos(tilt), s = Math.sin(tilt);
    p = [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
    const c2 = Math.cos(spin), s2 = Math.sin(spin);
    p = [p[0] * c2 - p[1] * s2, p[0] * s2 + p[1] * c2, p[2]];
    return p;
  }
  const rings = [
    { radius: 1.3, tilt: 1.2, spin: 0.35 },
    { radius: 1.5, tilt: 1.35, spin: -0.5 },
  ];

  function draw(time) {
    const t = time / 1000;
    ctx.clearRect(0, 0, W, H);

    // halo
    const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.6);
    halo.addColorStop(0, 'rgba(232,89,12,0.20)');
    halo.addColorStop(0.5, 'rgba(232,89,12,0.06)');
    halo.addColorStop(1, 'rgba(232,89,12,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.6, 0, Math.PI * 2); ctx.fill();

    // rings (screen space, not rotating with globe)
    rings.forEach((rg, ri) => {
      ctx.beginPath();
      for (let k = 0; k <= 120; k++) {
        const p = ringPoint((k / 120) * Math.PI * 2, rg.radius, rg.tilt, rg.spin);
        const q = proj(p);
        k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      }
      ctx.strokeStyle = rgba(ORANGE, ri ? 0.12 : 0.2);
      ctx.setLineDash(ri ? [3, 7] : []);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // sphere body + rim light
    const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.05);
    body.addColorStop(0, 'rgba(255,138,61,0.05)');
    body.addColorStop(0.75, 'rgba(7,7,10,0.35)');
    body.addColorStop(1, 'rgba(255,138,61,0.12)');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.02, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,138,61,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.02, 0, Math.PI * 2); ctx.stroke();

    // sphere dots
    for (const p of pts) {
      const q = proj(rot(p));
      const depth = (q[2] + 1) / 2;
      ctx.fillStyle = q[2] > 0 ? `rgba(255,190,150,${0.3 + depth * 0.6})` : `rgba(255,160,110,${0.06 + depth * 0.12})`;
      const s = (q[2] > 0 ? 2 : 1.2) * q[3];
      ctx.beginPath(); ctx.arc(q[0], q[1], s / 2, 0, Math.PI * 2); ctx.fill();
    }

    // arcs + pulses
    for (const arc of arcs) {
      const steps = 40;
      let prev = null;
      for (let k = 0; k <= steps; k++) {
        const q = proj(rot(slerp(arc.a, arc.b, k / steps)));
        if (prev) {
          ctx.strokeStyle = rgba(ORANGE, q[2] > -0.1 ? 0.28 : 0.06);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        }
        prev = q;
      }
      // pulse with trail
      const pt = (t * arc.speed + arc.off) % 1;
      for (let j = 0; j < 8; j++) {
        const tt = pt - j * 0.012;
        if (tt < 0) break;
        const q = proj(rot(slerp(arc.a, arc.b, tt)));
        if (q[2] < -0.1) break;
        ctx.fillStyle = rgba([255, 200, 160], (1 - j / 8) * 0.95);
        ctx.beginPath(); ctx.arc(q[0], q[1], (2.4 - j * 0.22) * q[3], 0, Math.PI * 2); ctx.fill();
      }
    }

    // glowing nodes
    for (let i = 0; i < nodes.length; i++) {
      const q = proj(rot(nodes[i]));
      if (q[2] < -0.15) continue;
      const pulse = 0.6 + 0.4 * Math.sin(t * 2 + i);
      const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], 14 * q[3]);
      g.addColorStop(0, rgba(ORANGE, 0.75 * pulse));
      g.addColorStop(1, rgba(ORANGE, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(q[0], q[1], 14 * q[3], 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(q[0], q[1], 2.2 * q[3], 0, Math.PI * 2); ctx.fill();
    }

    // orbiting blocks (rotating cubes drawn as hexagon outlines)
    sats.forEach((s, i) => {
      const rg = rings[s.ring];
      const p = ringPoint(t * (0.35 + i * 0.07) + s.o, rg.radius, rg.tilt, rg.spin);
      const q = proj(p);
      const size = 9 * q[3], a = t * 1.5 + i;
      ctx.save();
      ctx.translate(q[0], q[1]);
      ctx.globalAlpha = q[2] > 0 ? 1 : 0.4;
      ctx.shadowColor = 'rgba(255,138,61,.9)'; ctx.shadowBlur = 16;
      ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = a + k * Math.PI / 3;
        const x = Math.cos(ang) * size, y = Math.sin(ang) * size;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const ang = a + k * 2 * Math.PI / 3 + Math.PI / 6;
        ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * size, Math.sin(ang) * size);
      }
      ctx.stroke();
      ctx.restore();
    });
  }

  let running = true, last = 0, looping = false;
  const start = () => {
    if (looping) return;
    looping = true; last = performance.now(); requestAnimationFrame(loop);
  };
  function loop(time) {
    if (!running) { looping = false; return; }
    const dt = Math.min((time - last) / 1000, 0.05); last = time;
    rotY += dt * 0.12;
    tiltX += (targetTilt - tiltX) * 0.04;
    yawOffset += (targetYaw - yawOffset) * 0.04;
    draw(time);
    requestAnimationFrame(loop);
  }

  window.addEventListener('pointermove', e => {
    targetTilt = -0.35 + ((e.clientY / window.innerHeight) - 0.5) * 0.5;
    targetYaw = ((e.clientX / window.innerWidth) - 0.5) * 0.6;
  }, { passive: true });

  window.addEventListener('resize', () => { resize(); if (reduceMotion) draw(0); });
  resize();

  if (reduceMotion) { draw(0); return; }

  // Pause when hero is offscreen or tab hidden
  const visIO = new IntersectionObserver(([e]) => {
    running = e.isIntersecting && !document.hidden;
    if (running) start();
  });
  visIO.observe(canvas);
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden && canvas.getBoundingClientRect().bottom > 0;
    if (running) start();
  });
})();

/* ---------- Contact form -> email app ---------- */
document.getElementById('contact-form').addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const subject = `Website enquiry: ${f.get('topic')}`;
  const body = `Name: ${f.get('name')}\nEmail: ${f.get('email')}\nInterested in: ${f.get('topic')}\n\n${f.get('message')}`;
  window.location.href =
    `mailto:bobychampion87@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

document.getElementById('year').textContent = new Date().getFullYear();
