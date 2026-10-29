// The desk's windows are small live demos, not films (Marco, 2026-10-27: "they should be different demos rather than
// videos ... make it fun"). Each one is a toy of one real thing Sol does, looping on its own clock; hovering speeds it
// up or hands it to your pointer. Clicking still opens the post behind it (desk.js). One rAF for all, asleep off screen.
//   hello   Sol wakes up and asks what to call you
//   glass   the look follows a slider, and the number follows the knob
//   talk    you say it out loud, it happens
//   blocks  the rail's buttons rearrange, and a new one drops in
//   notch   the notch drops a note and folds away
const MINIS = (() => {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const pop = x => x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);   // a little overshoot
  const type = (s, t, a, b) => s.slice(0, Math.round(s.length * seg(t, a, b)));
  const mark = 'media/sol.svg';

  const DEF = {
    hello: {
      period: 7600,
      html: `<div class="mh"><img class="cr" src="${mark}" alt=""><p class="bub"></p><span class="nm"></span></div>`,
      init(el) { this.names = ['Marco', 'Ava', 'Sam', 'Noor', 'Jun']; },
      draw(el, t, n) {
        const q = el.q ??= { cr: el.querySelector('.cr'), bub: el.querySelector('.bub'), nm: el.querySelector('.nm') };
        const name = this.names[n % this.names.length], s = t / 1000;
        const born = pop(seg(s, .1, .7)), blink = Math.abs(s % 2.6 - 1.3) < .07 ? .15 : 1, hop = s > 4.3 && s < 5 ? Math.sin(seg(s, 4.3, 5) * Math.PI) * 10 : 0;
        q.cr.style.transform = `translateY(${-hop}px) scale(${born}) scaleY(${blink})`;
        const ask = 'hi! what should I call you?', hey = `nice to meet you, ${name} ✦`;
        q.bub.textContent = s < 4.2 ? type(ask, s, .8, 2.2) : type(hey, s, 4.3, 5.4);
        q.bub.style.opacity = s > .8 && s < 7.1 ? 1 : 0;
        q.nm.textContent = type(name, s, 2.8, 3.5); q.nm.style.opacity = s > 2.7 && s < 4.2 ? 1 : 0;
      },
    },
    glass: {
      period: 6000,
      html: `<div class="mg"><div class="w"><i class="sb"></i><p></p><p class="u"></p><p></p></div>
             <div class="row"><span>glass</span><b class="tr"><u></u><em></em></b><span class="v"></span></div></div>`,
      draw(el, t, n, hover) {
        const q = el.q ??= { w: el.querySelector('.w'), u: el.querySelector('.tr u'), k: el.querySelector('.tr em'), v: el.querySelector('.v'), tr: el.querySelector('.tr') };
        const v = hover != null ? hover : .5 - .5 * Math.cos(t / this.period * Math.PI * 2);
        const HUES = [[0, 0, 0], [52, 14, 60], [10, 24, 62], [70, 30, 12]];     // black, plum, navy, ember
        const f = v * (HUES.length - 1), i = Math.min(HUES.length - 2, Math.floor(f)), k = f - i;
        const c = HUES[i].map((x, j) => Math.round(lerp(x, HUES[i + 1][j], k)));
        q.w.style.background = `rgba(${c},${lerp(.55, .92, v).toFixed(2)})`;
        q.u.style.width = q.k.style.left = v * 100 + '%';
        q.v.textContent = lerp(.55, .92, v).toFixed(2);
      },
      hover(el, x) { return clamp((x - .28) / .5); },
    },
    talk: {
      period: 6800,
      html: `<div class="mt"><div class="bars">${'<i></i>'.repeat(14)}</div><p class="cap"></p>
             <div class="card"><b>Design review</b><small>Thu 3pm <s></s> Fri 3pm</small><em>✓ moved</em></div></div>`,
      draw(el, t, n, hover, speed) {
        const q = el.q ??= { bars: [...el.querySelectorAll('.bars i')], cap: el.querySelector('.cap'), card: el.querySelector('.card') };
        const s = t / 1000, on = s > .3 && s < 3.4;
        q.bars.forEach((b, i) => b.style.transform = `scaleY(${on ? .25 + Math.abs(Math.sin(s * 9 + i * .9)) * (.5 + .5 * Math.sin(i * 1.7 + s * 3)) : .12})`);
        q.cap.textContent = type('move my 3pm to friday', s, .5, 3.1);
        q.cap.style.opacity = s < 6.3 ? 1 : 0;
        const c = pop(seg(s, 3.7, 4.4));
        q.card.style.cssText = `opacity:${s > 3.7 && s < 6.4 ? 1 : 0};transform:translateY(${(1 - c) * 18}px) scale(${lerp(.9, 1, c)})`;
      },
    },
    blocks: {
      period: 8400,
      html: `<div class="mb"><div class="rail">${['call', 'browser', 'desk', 'notes', 'runs'].map((n, i) => `<span class="${i === 4 ? 'new' : ''}">${n}</span>`).join('')}</div>
             <p class="cap"></p></div>`,
      ORDERS: [[0, 1, 2, 3], [2, 0, 1, 3], [2, 3, 0, 1], [2, 3, 0, 1, 4], [2, 3, 0, 1, 4]],
      draw(el, t) {
        const q = el.q ??= { b: [...el.querySelectorAll('.rail span')], cap: el.querySelector('.cap') };
        const s = t / 1000, st = Math.min(4, Math.floor(s / 1.7)), order = this.ORDERS[st];
        q.b.forEach((b, i) => {
          const at = order.indexOf(i);
          b.style.transform = `translateX(${at < 0 ? 0 : at * 40}px) translateY(${at < 0 ? -26 : 0}px) scale(${at < 0 ? .4 : 1})`;
          b.style.opacity = at < 0 ? 0 : 1;
        });
        q.cap.textContent = st < 3 ? 'drag them where you want them' : 'ask for one more: "runs"';
      },
    },
    notch: {
      period: 6400,
      html: `<div class="mn"><div class="slab"><img src="${mark}" alt=""><div class="msg"><b>Codex finished</b><small>3 tests fixed · 2m</small><span>open</span></div></div></div>`,
      draw(el, t) {
        const q = el.q ??= { slab: el.querySelector('.slab'), msg: el.querySelector('.msg') };
        const s = t / 1000, open = s > 1 && s < 4.6;
        const o = open ? pop(seg(s, 1, 1.6)) : 1 - seg(s, 4.6, 4.9);
        q.slab.style.width = lerp(64, 172, o) + 'px'; q.slab.style.height = lerp(18, 70, open ? pop(seg(s, 1.05, 1.7)) : o) + 'px';
        q.slab.style.borderRadius = `0 0 ${lerp(8, 18, o)}px ${lerp(8, 18, o)}px`;
        q.msg.style.opacity = open ? seg(s, 1.4, 1.7) : 0;
      },
    },
  };

  const live = [];
  function mount(pane, kind) {
    const d = DEF[kind]; pane.classList.add('mini'); pane.innerHTML = d.html; d.init?.(pane);
    const m = { pane, d, t0: performance.now() - Math.random() * d.period, hover: null, fast: false };
    const win = pane.closest('.win');
    win?.addEventListener('pointermove', e => { const r = pane.getBoundingClientRect(); m.hover = d.hover ? d.hover(pane, (e.clientX - r.left) / r.width) : null; m.fast = !d.hover; });
    win?.addEventListener('pointerleave', () => { m.hover = null; m.fast = false; });
    live.push(m);
  }
  let awake = true, last = performance.now();
  const desk = document.getElementById('desk');
  if (desk) new IntersectionObserver(([e]) => awake = e.isIntersecting).observe(desk);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  (function tick(now) {
    const dt = Math.min(64, now - last); last = now;
    if (awake) live.forEach(m => {
      if (m.fast) m.t0 -= dt * .8;                          // hover: a touch faster
      const age = still ? m.d.period * .7 : now - m.t0, n = Math.floor(age / m.d.period);
      m.d.draw(m.pane, age % m.d.period, n, m.hover);
    });
    requestAnimationFrame(tick);
  })(last);
  return { mount };
})();
