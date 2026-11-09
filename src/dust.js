export function startDust(canvas) {
  const ctx = canvas.getContext('2d');
  const flakes = Array.from({ length: 70 }, () => spawn());

  function spawn() {
    return {
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.6,
      v: 0.00015 + Math.random() * 0.00045,
      d: (Math.random() - 0.5) * 0.00025,
      a: 0.08 + Math.random() * 0.22,
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  }

  resize();
  window.addEventListener('resize', resize);

  function tick() {
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      f.y += f.v;
      f.x += f.d;
      if (f.y > 1) {
        f.y = -0.02;
        f.x = Math.random();
      }
      ctx.fillStyle = `rgba(232, 213, 176, ${f.a})`;
      ctx.beginPath();
      ctx.arc(f.x * w, f.y * h, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
