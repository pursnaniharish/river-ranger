// Hand-rolled canvas confetti for level-ups.
(function () {
  let canvas = null;
  let ctx = null;
  let parts = [];
  let raf = null;
  const COLORS = ['#ffd34d', '#2f8fd8', '#6cc04a', '#ff8a3d', '#e5484d', '#8e6bff', '#7fd0ff'];

  function tick() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    parts.forEach(p => {
      p.vy += 0.32;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      p.life++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    });
    parts = parts.filter(p => p.y < h + 20 && p.life < 320);
    if (parts.length) {
      raf = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, w, h);
      raf = null;
    }
  }

  RR.confetti = function (count) {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch (e) { /* ignore */ }
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'confetti';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = count || 140;
    for (let i = 0; i < n; i++) {
      parts.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * window.innerWidth * 0.4,
        y: window.innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 13,
        vy: -4 - Math.random() * 12,
        s: 6 + Math.random() * 7,
        c: COLORS[i % COLORS.length],
        r: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.3,
        life: 0
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  };
})();
