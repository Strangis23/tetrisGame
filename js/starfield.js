// Animated deep-space starfield background. Respects reduce-motion setting.
(function () {
  const canvas = document.getElementById('starfield-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let stars = [];
  let w = 0;
  let h = 0;
  let animId = 0;
  let t = 0;

  function reduceMotion() {
    if (typeof getSetting === 'function') return getSetting('reduceMotion');
    try {
      const raw = localStorage.getItem('ttd-settings');
      if (raw) return !!JSON.parse(raw).reduceMotion;
    } catch (_) { /* ignore */ }
    return false;
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function buildStars() {
    stars = [];
    const count = Math.floor((w * h) / 4200);
    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: depth < 0.08 ? rand(1.2, 1.8) : depth < 0.35 ? rand(0.7, 1.2) : rand(0.3, 0.8),
        a: rand(0.25, 1),
        tw: rand(0.4, 2.2),
        ph: Math.random() * Math.PI * 2,
        sp: rand(0.008, 0.045) * (0.3 + depth * 1.4),
        hue: depth < 0.12 ? 195 : depth < 0.4 ? 210 : 220,
      });
    }
  }

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    buildStars();
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(40, 20, 80, 0.35)');
    g.addColorStop(0.45, 'rgba(8, 14, 32, 0.2)');
    g.addColorStop(1, 'rgba(3, 7, 18, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (const s of stars) {
      ctx.fillStyle = `hsla(${s.hue}, 55%, ${s.r > 1 ? 88 : 78}%, ${s.a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(now) {
    t = now * 0.001;
    ctx.clearRect(0, 0, w, h);

    const neb = ctx.createRadialGradient(w * 0.72, h * 0.18, 0, w * 0.72, h * 0.18, w * 0.45);
    neb.addColorStop(0, 'rgba(88, 28, 135, 0.14)');
    neb.addColorStop(1, 'rgba(88, 28, 135, 0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, w, h);

    const neb2 = ctx.createRadialGradient(w * 0.15, h * 0.75, 0, w * 0.15, h * 0.75, w * 0.35);
    neb2.addColorStop(0, 'rgba(34, 211, 238, 0.07)');
    neb2.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = neb2;
    ctx.fillRect(0, 0, w, h);

    for (const s of stars) {
      s.y += s.sp;
      if (s.y > h + 4) {
        s.y = -4;
        s.x = Math.random() * w;
      }
      const twinkle = 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
      ctx.fillStyle = `hsla(${s.hue}, 60%, ${s.r > 1 ? 92 : 82}%, ${s.a * twinkle})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    animId = requestAnimationFrame(frame);
  }

  function start() {
    resize();
    if (reduceMotion()) {
      drawStatic();
      return;
    }
    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', () => {
    if (reduceMotion()) {
      resize();
      drawStatic();
    } else {
      resize();
    }
  });

  window.addEventListener('ttd-settings-changed', start);
  start();
})();
