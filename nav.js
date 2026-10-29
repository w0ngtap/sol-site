// The menu bar, one home for every page: Sol on the left and the notch in the middle, nothing else (Marco, 2026-10-27:
// the page links, status icons, clock and "get Sol" went; the notch is the menu, the hero is the download).
// Links to home sections work from any page.
//
// The notch is the menu (Marco, 2026-10-27: "a fun notch animation to see more, like our notch"). It moves the way
// Sol's notch does (mac/src/notch/Notch.tsx): the black slab grows on two springs with a touch of overshoot, width
// leading and height 40 ms behind, so it blooms out of the camera slot; closing is stiffer, height first, no
// overshoot. The contents never resize: they sit at the open size and the slab uncovers them, then drop in one by one.
// The creature sits in it the way it does in the real notch. Hover opens it, a tap on a phone; leaving, Escape or a
// click outside closes it.
(() => {
  const nav = document.querySelector('nav.menubar'); if (!nav) return;
  const home = /index\.html$|\/$/.test(location.pathname) ? '' : 'index.html';
  const ring = `<svg viewBox="0 0 120 70"><circle cx="60" cy="35" r="22" fill="none" stroke="rgba(255,255,255,.35)" stroke-dasharray="2 3"/>
    <circle cx="60" cy="35" r="5" fill="#efeae2"/>${[0, 72, 144, 216, 288].map(a => `<circle cx="${60 + 22 * Math.cos(a * Math.PI / 180)}" cy="${35 + 22 * Math.sin(a * Math.PI / 180)}" r="3" fill="rgba(255,255,255,.75)"/>`).join('')}
    <circle cx="60" cy="35" r="22" fill="none" stroke="url(#ng)" stroke-width="1.6" stroke-dasharray="14 124" class="spin"/>
    <defs><linearGradient id="ng"><stop offset="0" stop-color="#fd69b9"/><stop offset=".5" stop-color="#fb7129"/><stop offset="1" stop-color="#f4c82a"/></linearGradient></defs></svg>`;
  const arc = `<svg viewBox="0 0 120 70"><path d="M10 60 Q60 -10 110 60" fill="none" stroke="rgba(255,255,255,.3)" stroke-dasharray="2 3"/>
    <path d="M10 60 Q35 22 52 18" fill="none" stroke="url(#ng)" stroke-width="1.8"/>
    <circle cx="10" cy="60" r="3.5" fill="#efeae2"/><circle cx="34" cy="31" r="3.5" fill="#efeae2"/><circle cx="60" cy="25" r="3.5" fill="none" stroke="#efeae2"/><circle cx="86" cy="31" r="3.5" fill="none" stroke="rgba(255,255,255,.4)"/><circle cx="110" cy="60" r="3.5" fill="none" stroke="rgba(255,255,255,.4)"/></svg>`;
  nav.innerHTML = `
    <div class="l"><a class="me" href="${home || '#'}"><img src="media/sol.svg" alt="">Sol</a></div>
    <div class="notch" role="button" tabindex="0" aria-expanded="false" aria-label="Sol's menu">
      <img class="mark" src="media/sol.svg" alt="">
      <div class="drop">
        <p class="hi">where to?</p>
        <div class="tiles">
          <a href="${home}#see" style="--d:0"><span class="pic">${ring}</span><b>See it</b><small>how it works</small></a>
          <a href="blog.html" style="--d:1"><span class="pic"><img src="media/look.png" alt=""><em>new</em></span><b>Blog</b><small>films and notes</small></a>
          <a href="${home}#road" style="--d:2"><span class="pic">${arc}</span><b>What's coming</b><small>the road from here</small></a>
        </div>
      </div>
    </div>
    <div class="r"></div>`;
  /* the notch: two springs, Sol's numbers (Notch.tsx: k 300, z .82 open; closing stiffer, no overshoot) */
  const notch = nav.querySelector('.notch'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const OPEN = { k:300, z:.82 }, SHUT = { k:520, z:1 };
  const size = () => ({ w0: innerWidth < 700 ? 96 : 150, h0: 30, w1: Math.min(452, innerWidth - 16), h1: notch.querySelector('.drop').offsetHeight + 4 });
  function spring(x, put) {
    let v = 0, to = x, cfg = OPEN, raf = 0, last = 0;
    const step = t => {
      const dt = Math.min(.034, (t - last) / 1000); last = t;
      for (let n = 0; n < 4; n++) { const a = -cfg.k * (x - to) - 2 * cfg.z * Math.sqrt(cfg.k) * v; v += a * dt / 4; x += v * dt / 4; }
      if (Math.abs(x - to) < .2 && Math.abs(v) < .5) { x = to; v = 0; raf = 0; put(); return; }
      put(); raf = requestAnimationFrame(step);
    };
    return { get x() { return x; }, go(t, c) { to = t; cfg = c; if (still) { x = t; put(); return; } if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } }, jump(t) { x = to = t; put(); } };
  }
  const put = () => { notch.style.width = W.x + 'px'; notch.style.height = H.x + 'px'; };
  const W = spring(size().w0, put), H = spring(size().h0, put);
  let open = false, lag = 0, shut = 0;
  function set(o) {
    clearTimeout(lag); clearTimeout(shut);
    if (o === open) return; open = o;
    const s = size();
    notch.classList.toggle('open', o); notch.setAttribute('aria-expanded', o);
    if (o) { W.go(s.w1, OPEN); lag = setTimeout(() => H.go(s.h1, OPEN), 40); }
    else { H.go(s.h0, SHUT); lag = setTimeout(() => W.go(s.w0, SHUT), 30); }
  }
  const coarse = matchMedia('(hover: none)').matches;
  if (!coarse) {
    notch.addEventListener('pointerenter', () => set(true));
    notch.addEventListener('pointerleave', () => { shut = setTimeout(() => set(false), 220); });
  }
  notch.addEventListener('click', e => { if (!e.target.closest('a')) set(!open); else set(false); });
  notch.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(!open); } });
  addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  addEventListener('pointerdown', e => { if (open && !notch.contains(e.target)) set(false); });
  addEventListener('resize', () => { const s = size(); W.jump(open ? s.w1 : s.w0); H.jump(open ? s.h1 : s.h0); });
  put();
})();
