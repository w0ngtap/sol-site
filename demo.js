// Sol's window as a live demo (the website's). window.SolDemo.mount(el, opts) builds it inside el, scales a fixed
// design canvas to el's width, and plays a looping script: the window at rest, a week planned from what Claude said,
// a runs tracker Sol builds on the spot (its + works, its button lands on the shelf), the window restyling itself in
// place, and the notch dropping with a ping. A click or a key hands the window to the visitor; ~12 s idle and the
// script takes it back. Nothing here calls a network.
//
// The look is the app's own (mac/src/face.css, work/work.css, notch/notch.css; see demo.css). The notch moves on
// Sol's springs (notch/Notch.tsx and the site's nav.js): open k 300 z .82, width first and height 40 ms behind;
// closing k 520 z 1, no overshoot.
import { animate, stagger } from './vendor/anime.esm.min.js';

const LOGO = new URL('./media/sol.svg', import.meta.url).href;
const STILL = matchMedia('(prefers-reduced-motion: reduce)');
const CANCEL = Symbol('cancel');
const IDLE_MS = 12000;

/* ---------- small things ---------- */
const P = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
const svg = (d, vb = 16) => `<svg viewBox="0 0 ${vb} ${vb}" ${P} aria-hidden="true">${d}</svg>`;
const ICON = {
  side: svg('<rect x="2" y="3" width="12" height="10" rx="2"/><path d="M6.5 3v10"/>'),
  browser: svg('<rect x="2" y="3" width="12" height="10" rx="2"/><path d="M2 6.5h12"/>'),
  desk: svg('<rect x="2" y="3" width="12" height="10" rx="2"/><path d="M5.5 8h5"/>'),
  phone: svg('<path d="M5.2 2.5 3.4 3.1c-.6.2-1 .8-.9 1.5.6 4.4 4.5 8.3 8.9 8.9.7.1 1.3-.3 1.5-.9l.6-1.8-2.9-1.5-1.3 1.3c-1.5-.7-2.7-1.9-3.4-3.4l1.3-1.3z"/>'),
  kebab: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="3.5" r="1.3" fill="currentColor"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="8" cy="12.5" r="1.3" fill="currentColor"/></svg>',
  plus: svg('<path d="M8 3v10M3 8h10"/>'),
  search: svg('<circle cx="7" cy="7" r="4.2"/><path d="m10.2 10.2 3.3 3.3"/>'),
  folder: svg('<path d="M1.5 4V13h13V5.5H7.5L6 4z"/>'),
  gear: svg('<circle cx="8" cy="8" r="2.3"/><path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1"/>'),
  mic: svg('<rect x="6" y="2" width="4" height="7.5" rx="2"/><path d="M3.8 7.8a4.2 4.2 0 0 0 8.4 0M8 12v2"/>'),
  check: '<svg class="sd-check" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true"><path d="M1 5h2v2H1zM3 7h2v2H3zM5 5h2v2H5zM7 3h2v2H7z" fill="currentColor"/></svg>',
  runs: svg('<path d="M3 13V9M6.3 13V5M9.7 13V7.5M13 13V3"/>'),
  send: svg('<path d="M8 13V3.5M4 7.2 8 3.2l4 4"/>', 16),
  ask: svg('<path d="M3 3.5h10v7H7.5L4.5 13v-2.5H3z"/>'),
  read: svg('<path d="M4 2h5.5L12 4.5V14H4z"/><path d="M6.3 7.5h3.4M6.3 10h3.4"/>'),
  build: svg('<path d="M8 2v3M8 11v3M2 8h3M11 8h3M3.8 3.8l2 2M10.2 10.2l2 2M3.8 12.2l2-2M10.2 5.8l2-2"/>'),
  paint: svg('<path d="M2.5 13.5c2 0 3.2-.8 3.2-2.4a1.7 1.7 0 0 0-3.4 0"/><path d="m6.4 9.6 6.4-6.4a1 1 0 0 1 1.4 1.4L7.8 11"/>'),
  cursor: '<svg viewBox="0 0 20 22" aria-hidden="true"><path d="M3 2v15.5l4-3.8 2.6 6 2.6-1.1-2.6-5.9 5.6-.2z" fill="#fff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/></svg>',
};
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// motion that respects reduced motion: the end state at once
const anim = (t, p) => animate(t, STILL.matches ? { ...p, duration: 1, delay: 0 } : p);

// the AIs Sol talks to: their flat colour is the seat's square (face.css .row .seat: claude amber, codex candy)
const SEATS = [
  { id: 'sol', name: 'sol', c: 'conic-gradient(#fd69b9, #fb7129, #f4c82a, #fd69b9)', model: 'auto' },
  { id: 'claude', name: 'claude', c: '#f89b2a', model: 'opus' },
  { id: 'codex', name: 'codex', c: '#fd69b9', model: 'gpt-codex' },
  { id: 'chatgpt', name: 'chatgpt', c: '#70df45', model: 'gpt' },
  { id: 'gemini', name: 'gemini', c: '#4a9bff', model: 'gemini pro' },
];
const seat = (id) => SEATS.find((s) => s.id === id);

/* ---------- the geometry: two canvases, the wide one and the phone one ---------- */
const GEO = {
  wide: { W: 1100, H: 720, win: { x: 24, y: 46, w: 1052, h: 654 }, side: 272, notch: { w0: 180, h0: 30, w1: 420, h1: 88 } },
  compact: { W: 480, H: 760, win: { x: 12, y: 42, w: 456, h: 698 }, side: 240, notch: { w0: 132, h0: 28, w1: 340, h1: 88 } },
};

const SCRIPT = {
  week: 'plan my week with what Claude said yesterday',
  runs: 'make me a tracker for my runs',
  style: 'put the sidebar on the right and make it warmer',
};

function mount(el, opts = {}) {
  if (!el) throw new Error('SolDemo.mount: no element');
  const o = { autoplay: true, idle: IDLE_MS, ...opts };
  el.innerHTML = '';
  el.classList.add('soldemo');

  /* ---------- the DOM ---------- */
  const canvas = h('div', 'sd-canvas');
  const seatBtns = (cls) => SEATS.map((s) => `<button type="button" data-seat="${s.id}" class="${cls || ''}"><i style="--c:${s.c};background:${s.c}"></i>${s.name}</button>`).join('');
  canvas.innerHTML = `
    <div class="sd-desk"><i></i><i></i><i></i></div>
    <div class="sd-notch" role="button" aria-label="Sol's notch">
      <div class="sd-mark"><img src="${LOGO}" alt=""></div>
      <div class="sd-saybox"><div class="sd-saytext"><p class="sd-say"></p><p class="sd-meta"></p></div>
        <div class="sd-btns"><button type="button" class="sd-cbtn sd-first">open</button><button type="button" class="sd-cbtn sd-hide-c">later</button></div></div>
    </div>
    <div class="sd-win">
      <div class="sd-warmth"></div>
      <div class="sd-bar">
        <div class="sd-lights"><i></i><i></i><i></i></div>
        <button type="button" class="sd-barbtn" data-act="side" title="the side">${ICON.side}</button>
        <div class="sd-title"><span class="sd-tt">plan the week</span><span class="sd-where sd-hide-c">home</span></div>
        <div class="sd-spacer"></div>
        <div class="sd-rail">
          <span class="sd-railname sd-hide-c">Everyday</span><span class="sd-raildots sd-hide-c"><i class="sd-on"></i><i></i></span>
          <button type="button" class="sd-barbtn sd-hide-c" title="browser">${ICON.browser}</button>
          <button type="button" class="sd-barbtn sd-hide-c" title="desk">${ICON.desk}</button>
          <button type="button" class="sd-word">file it</button>
          <button type="button" class="sd-barbtn" title="call">${ICON.phone}</button>
          <div class="sd-slot"></div>
          <i class="sd-barsep"></i>
          <button type="button" class="sd-barbtn" title="more">${ICON.kebab}</button>
        </div>
      </div>
      <div class="sd-body">
        <aside class="sd-side">
          <div class="sd-shead">
            <div class="sd-brand"><img src="${LOGO}" alt=""><span>sol</span></div>
            <div class="sd-seatsw sd-mode"><span class="sd-thumb"></span><button type="button" class="sd-on">home</button><button type="button">cowork</button></div>
          </div>
          <button type="button" class="sd-newc">${ICON.plus}<span>new session</span><kbd>⌘N</kbd></button>
          <div class="sd-find">${ICON.search}<span>search</span></div>
          <div class="sd-list">
            <div class="sd-group">${ICON.folder}<span>home</span><small>3</small></div>
            <button type="button" class="sd-row sd-on" data-title="plan the week"><span class="sd-wst"><i></i></span><span class="sd-t">plan the week</span><small class="sd-age">now</small></button>
            <button type="button" class="sd-row" data-title="essay draft"><span class="sd-wst sd-unread"><i></i></span><span class="sd-t">essay draft</span><small class="sd-age">1h</small></button>
            <button type="button" class="sd-row" data-title="trip to lisbon"><span class="sd-wst"><i></i></span><span class="sd-t">trip to lisbon</span><small class="sd-age">2d</small></button>
            <div class="sd-group">${ICON.folder}<span>app</span><small>2</small></div>
            <button type="button" class="sd-row sd-login" data-title="fix login bug"><span class="sd-wst sd-run"><i></i></span><span class="sd-t">fix login bug</span><small class="sd-tag">gpt</small><small class="sd-age sd-live">4m</small></button>
            <button type="button" class="sd-row" data-title="onboarding copy"><span class="sd-wst"><i></i></span><span class="sd-t">onboarding copy</span><small class="sd-age">3h</small></button>
            <div class="sd-group"><span>chats</span><small>1</small></div>
            <button type="button" class="sd-row" data-title="a good 10k pace?"><span class="sd-wst"><i></i></span><span class="sd-t">a good 10k pace?</span><small class="sd-age">1d</small></button>
          </div>
          <div class="sd-sfoot"><button type="button" class="sd-newc">${ICON.gear}<span>settings</span><kbd>⌘,</kbd></button></div>
        </aside>
        <main class="sd-main">
          <div class="sd-talk"><div class="sd-col"></div><div class="sd-empty"><img src="${LOGO}" alt=""></div></div>
          <div class="sd-ask"><div class="sd-askcol">
            <div class="sd-island">
              <div class="sd-line">
                <textarea class="sd-input" rows="1" placeholder="talk to Sol" aria-label="talk to Sol" spellcheck="false"></textarea>
                <div class="sd-typed"></div>
                <button type="button" class="sd-send" aria-label="send">${ICON.send}</button>
              </div>
              <div class="sd-picker">
                <div class="sd-seatsw sd-minds"><span class="sd-thumb"></span>${seatBtns()}</div>
                <button type="button" class="sd-pill sd-mono sd-model sd-hide-c">auto</button>
                <button type="button" class="sd-pill sd-hide-c"><span class="sd-lv"><i class="sd-on"></i><i class="sd-on"></i><i></i></span>medium</button>
                <span class="sd-grow"></span>
                <span class="sd-icon sd-hide-c">${ICON.mic}</span>
                <span class="sd-health" title="engine health"><i></i><i></i><i></i><i></i></span>
                <span class="sd-status"><img src="${LOGO}" alt=""></span>
              </div>
            </div>
          </div></div>
        </main>
      </div>
    </div>
    <div class="sd-cursor" style="position:absolute;left:0;top:0;width:20px;height:22px;z-index:40;pointer-events:none;opacity:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">${ICON.cursor}</div>`;
  el.append(canvas);

  const $ = (s) => canvas.querySelector(s);
  const win = $('.sd-win'), side = $('.sd-side'), main = $('.sd-main'), talk = $('.sd-talk'), col = $('.sd-col'), empty = $('.sd-empty');
  const island = $('.sd-island'), input = $('.sd-input'), typed = $('.sd-typed'), sendBtn = $('.sd-send');
  const notch = $('.sd-notch'), mark = $('.sd-mark'), saybox = $('.sd-saybox'), say = $('.sd-say'), meta = $('.sd-meta');
  const warmth = $('.sd-warmth'), slot = $('.sd-slot'), cursor = $('.sd-cursor'), title = $('.sd-title .sd-tt');
  const minds = $('.sd-minds'), modeSw = $('.sd-mode'), modelPill = $('.sd-model');
  const loginRow = $('.sd-login');

  /* ---------- the clock: waits that run only while the demo is on screen, and die with their run ---------- */
  const waits = new Set();
  const springs = new Set();
  let visible = true, last = performance.now(), raf = 0, dead = false;
  // a run carries the time a wait overshot into its next wait, so a slow frame (a busy phone) never stretches the story
  const newRun = () => ({ alive: true, ws: new Set(), carry: 0 });
  const kill = (r) => { if (!r || !r.alive) return; r.alive = false; for (const w of r.ws) { waits.delete(w); w.rej(CANCEL); } r.ws.clear(); };
  const sleep = (ms, r) => new Promise((res, rej) => {
    if (!r.alive) return rej(CANCEL);
    const w = { left: ms - r.carry, res, rej };
    r.carry = 0;
    w.done = () => { r.ws.delete(w); r.carry = Math.min(1000, Math.max(0, -w.left)); res(); };
    if (w.left <= 0) { r.carry = -w.left; queueMicrotask(res); return; }
    waits.add(w); r.ws.add(w);
  });
  const frame = (t) => {
    if (dead) return;
    const dt = Math.min(1000, t - last); last = t;   // real time, so a slow frame never slows the story
    if (visible && !document.hidden) {
      for (const w of [...waits]) { w.left -= dt; if (w.left <= 0) { waits.delete(w); w.done(); } }
    }
    for (const s of [...springs]) stepSpring(s, dt);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  /* ---------- springs (Notch.tsx's: a mass of 1, stiffness k, damping ratio z) ---------- */
  function spring(x, cfg, put) {
    const s = { x, v: 0, t: x, k: cfg.k, z: cfg.z, eps: cfg.eps ?? 0.1, delay: 0, put };
    s.to = (t, opt = {}) => {
      s.t = t; if (opt.cfg) { s.k = opt.cfg.k; s.z = opt.cfg.z; }
      s.delay = opt.delay || 0;
      if (STILL.matches) { s.x = t; s.v = 0; springs.delete(s); put(); return; }
      springs.add(s);
    };
    s.jump = (t) => { s.x = s.t = t; s.v = 0; springs.delete(s); put(); };
    return s;
  }
  function stepSpring(s, dt) {
    if (s.delay > 0) { s.delay -= dt; return; }
    let rem = dt / 1000;
    const c = 2 * s.z * Math.sqrt(s.k);
    while (rem > 0) { const hh = Math.min(rem, 1 / 240); const a = -s.k * (s.x - s.t) - c * s.v; s.v += a * hh; s.x += s.v * hh; rem -= hh; }
    if (Math.abs(s.v) < s.eps && Math.abs(s.x - s.t) < s.eps) { s.x = s.t; s.v = 0; springs.delete(s); }
    s.put();
  }

  /* ---------- layout and scale ---------- */
  let G = GEO.wide, compact = false, scale = 1;
  const S = { side: 'left', warm: false, big: false, runs: null, shelf: null, week: false, seat: 'sol', notch: false, clean: true };

  const sideP = spring(0, { k: 170, z: 0.86, eps: 0.0008 }, () => putSide());
  function putSide() {
    const p = sideP.x, ww = G.win.w, sw = G.side;
    if (compact) {
      side.style.transform = `translateX(${ww - sw * p}px)`;
      side.style.visibility = p < 0.002 ? 'hidden' : 'visible';
      main.style.left = '0px'; main.style.right = '0px';
    } else {
      side.style.visibility = 'visible';
      side.style.transform = `translateX(${p * (ww - sw)}px)`;
      main.style.left = `${sw * (1 - p)}px`; main.style.right = `${sw * p}px`;
    }
    side.classList.toggle('sd-right', compact || p > 0.5);
    side.classList.toggle('sd-float', compact);
  }

  const nW = spring(0, { k: 300, z: 0.82 }, () => putNotch());
  const nH = spring(0, { k: 300, z: 0.82 }, () => putNotch());
  function putNotch() {
    const n = G.notch;
    notch.style.width = `${nW.x}px`; notch.style.height = `${nH.x}px`;
    const k = clamp((nH.x - n.h0) / (n.h1 - n.h0), 0, 1.2);
    const t = clamp((k - 0.3) / 0.6, 0, 1);   // the line rises in once the card has room for it (Notch.tsx)
    saybox.style.opacity = String(t); saybox.style.translate = `0 ${(1 - t) * 10}px`;
    saybox.style.left = `${(nW.x - (n.w1 - 40)) / 2}px`;
    // the corners round out as it opens
    notch.style.borderRadius = `0 0 ${16 + 8 * clamp(k, 0, 1)}px ${16 + 8 * clamp(k, 0, 1)}px`;
  }

  function layout() {
    const w = el.clientWidth || el.getBoundingClientRect().width;
    if (!w) return;
    const c = w < 720;
    if (c !== compact || !canvas.style.width) {
      compact = c; G = c ? GEO.compact : GEO.wide;
      el.classList.toggle('compact', c);
      canvas.style.width = `${G.W}px`; canvas.style.height = `${G.H}px`;
      Object.assign(win.style, { left: `${G.win.x}px`, top: `${G.win.y}px`, width: `${G.win.w}px`, height: `${G.win.h}px` });
      side.style.width = `${G.side}px`;
      saybox.style.width = `${G.notch.w1 - 40}px`;
      nW.jump(S.notch ? G.notch.w1 : G.notch.w0); nH.jump(S.notch ? G.notch.h1 : G.notch.h0);
      putSide();
      requestAnimationFrame(() => { placeThumb(minds, true); placeThumb(modeSw, true); });
    }
    scale = w / G.W;
    canvas.style.transform = `scale(${scale})`;
    el.style.height = `${G.H * scale}px`;
  }
  const ro = new ResizeObserver(() => layout());
  ro.observe(el);
  const io = new IntersectionObserver((es) => { for (const e of es) visible = e.isIntersecting; }, { threshold: 0.15 });
  io.observe(el);
  layout();

  /* ---------- the seat switch: a lit capsule that travels as goo (SeatSwitch.tsx): the leading edge first ---------- */
  const thumbs = new Map();
  function thumbOf(sw) {
    if (thumbs.has(sw)) return thumbs.get(sw);
    const th = sw.querySelector('.sd-thumb');
    const put = () => { th.style.left = `${T.l.x}px`; th.style.width = `${Math.max(10, T.r.x - T.l.x)}px`; };
    const T = { l: spring(2, { k: 380, z: 0.8 }, put), r: spring(40, { k: 380, z: 0.8 }, put) };
    thumbs.set(sw, T); return T;
  }
  function placeThumb(sw, now) {
    const on = sw.querySelector('button.sd-on'); if (!on) return;
    const T = thumbOf(sw), l = on.offsetLeft, r = on.offsetLeft + on.offsetWidth;
    if (now) { T.l.jump(l); T.r.jump(r); return; }
    const right = l > T.l.x;   // moving right: the right edge leads, the left one follows behind
    T.r.to(r, { cfg: right ? { k: 420, z: 0.78 } : { k: 200, z: 0.85 } });
    T.l.to(l, { cfg: right ? { k: 200, z: 0.85 } : { k: 420, z: 0.78 } });
  }
  function pickSeat(id) {
    S.seat = id;
    minds.querySelectorAll('button').forEach((b) => b.classList.toggle('sd-on', b.dataset.seat === id));
    modelPill.textContent = seat(id).model;
    placeThumb(minds);
  }
  pickSeat('sol');
  // fonts can shift the widths after first paint
  (document.fonts?.ready || Promise.resolve()).then(() => { placeThumb(minds, true); placeThumb(modeSw, true); });
  // Sol asking one of them: its square lights for a moment
  function ping(id) {
    const b = minds.querySelector(`[data-seat="${id}"]`); if (!b) return;
    const sq = b.querySelector('i');
    anim(sq, { scale: [1, 1.7, 1], duration: 700, ease: 'outQuad' });
    anim(b, { color: ['rgba(239,234,226,1)', 'rgba(239,234,226,.55)'], duration: 1400, ease: 'outQuad', onComplete: () => { b.style.color = ''; } });
  }

  /* ---------- the talk ---------- */
  const rel = (e) => { const r = e.getBoundingClientRect(), c = canvas.getBoundingClientRect(); return { x: (r.left - c.left) / scale, y: (r.top - c.top) / scale, w: r.width / scale, h: r.height / scale }; };
  const scr = { y: 0 };
  function follow(ms = 520) {
    const to = talk.scrollHeight - talk.clientHeight;
    if (to <= talk.scrollTop + 1) return;
    scr.y = talk.scrollTop;
    anim(scr, { y: to, duration: ms, ease: 'outQuad', onUpdate: () => { talk.scrollTop = scr.y; } });
  }
  function hideEmpty() {
    if (empty.style.display === 'none' || empty.dataset.going) return;
    empty.dataset.going = '1';
    anim(empty, { opacity: [1, 0], scale: [1, 0.85], duration: 380, ease: 'outQuad', onComplete: () => { empty.style.display = 'none'; delete empty.dataset.going; } });
  }
  function showEmpty() {
    empty.style.display = ''; delete empty.dataset.going;
    anim(empty, { opacity: [0, 1], scale: [0.9, 1], duration: 700, ease: 'outExpo' });
  }
  function meBubble(text) {
    hideEmpty(); S.clean = false;
    const row = h('div', 'sd-merow'), b = h('div', 'sd-me'); b.textContent = text; row.append(b); col.append(row);
    anim(b, { opacity: [0, 1], translateY: [18, 0], scale: [0.94, 1], duration: 520, ease: 'outExpo' });
    anim(island, { scale: [0.985, 1], duration: 380, ease: 'outBack' });
    follow();
    return row;
  }
  // Sol's words: one word at a time, the creature's eye blinking at the end of the line
  async function speak(r, text) {
    const p = h('div', 'sd-you sd-live');
    const parts = text.split(/(\s+)/);
    const ws = parts.map((x) => { if (/^\s+$/.test(x)) return document.createTextNode(x); const s = h('span', 'sd-w'); s.textContent = x; return s; });
    p.append(...ws); col.append(p); follow();
    const spans = ws.filter((x) => x.nodeType === 1);
    try {
      for (let i = 0; i < spans.length; i++) {
        spans[i].classList.add('sd-in');
        if (i % 6 === 5) follow(300);
        await sleep(STILL.matches ? 0 : rnd(24, 52), r);
      }
    } finally { spans.forEach((s) => s.classList.add('sd-in')); p.classList.remove('sd-live'); follow(); }
    return p;
  }
  // steps (face.css .steps): each a slab, the running one lifted with its time; when all are done they fold into a line
  async function steps(r, list, prov) {
    const box = h('div', 'sd-steps'); col.append(box);
    let tick = 0;
    const rows = [];
    try {
      for (const it of list) {
        const row = h('div', 'sd-step sd-running', `<span class="sd-gl">${ICON[it.glyph]}</span><span class="sd-tx">${it.text}</span><span class="sd-el">0.0s</span><span class="sd-st"><i class="sd-spin"></i></span>`);
        box.append(row); rows.push(row);
        anim(row, { opacity: [0, 1], translateY: [6, 0], duration: 320, ease: 'outExpo' });
        follow(320);
        if (it.seat) ping(it.seat);
        const t0 = performance.now(), elx = row.querySelector('.sd-el');
        clearInterval(tick); tick = setInterval(() => { elx.textContent = `${((performance.now() - t0) / 1000).toFixed(1)}s`; }, 100);
        await sleep(it.ms, r);
        clearInterval(tick);
        row.classList.remove('sd-running'); row.querySelector('.sd-st').innerHTML = ICON.check; elx.style.color = 'var(--mute)';
        await sleep(140, r);
      }
      await sleep(420, r);
    } finally {
      clearInterval(tick);
      rows.forEach((row) => { row.classList.remove('sd-running'); row.querySelector('.sd-st').innerHTML = ICON.check; });
    }
    if (!prov) return box;
    // fold: the stack shuts and the quiet line of where it came from takes its place
    const hgt = box.offsetHeight;
    anim(box, { height: [`${hgt}px`, '0px'], opacity: [1, 0], marginBottom: ['14px', '0px'], duration: 420, ease: 'inOutQuad' });
    await sleep(380, r).catch((e) => { box.remove(); throw e; });
    const line = h('div', 'sd-prov', prov.map((x) => `<span><i style="--c:${x.c}"></i>${x.html}</span>`).join(''));
    box.replaceWith(line);
    anim(line, { opacity: [0, 1], translateY: [-4, 0], duration: 360, ease: 'outQuad' });
    return line;
  }

  /* ---------- the week card ---------- */
  const DAYS = [
    ['mon', [['deep work', 'claude'], ['gym 18:00']]],
    ['tue', [['design review', 'claude'], ['call mum']]],
    ['wed', [['deep work', 'claude'], ['long run 10k', 'notes']]],
    ['thu', [['launch day', 'big'], ['no meetings', 'claude']]],
    ['fri', [['write-up', 'claude'], ['off at 4']]],
  ];
  const DOT = { claude: '#f89b2a', notes: '#efeae2' };
  async function weekFlow(r) {
    await steps(r, [
      { glyph: 'ask', text: 'asking <b>Claude</b> · yesterday’s talk “the launch”', ms: 1300, seat: 'claude' },
      { glyph: 'read', text: 'reading <b>Notes</b> · 3 notes this week', ms: 900 },
    ], [{ c: '#f89b2a', html: 'asked <b>Claude</b>' }, { c: 'rgb(239 234 226 / .7)', html: 'read <b>Notes</b>' }]);
    await speak(r, 'Here’s your week, built around what Claude said yesterday: protect your mornings, keep Thursday clear for the launch.');
    const card = h('div', 'sd-card sd-week');
    card.innerHTML = `<div class="sd-dtitle"><span>this week</span><span class="sd-grow"></span><small>oct 26 – 30</small></div>
      <div class="sd-days">${DAYS.map(([d, items], i) => `<div class="sd-day ${i === 0 ? 'sd-today' : ''}"><h4>${d}</h4>${items.map(([t, k]) =>
        `<p class="${k === 'big' ? 'sd-big' : ''}"><i style="--c:${DOT[k] || 'var(--mute)'}"></i>${t}</p>`).join('')}</div>`).join('')}</div>
      <div class="sd-src"><span><i style="--c:#f89b2a"></i>from Claude, yesterday</span><span class="sd-hide-c"><i style="--c:#efeae2"></i>from your Notes</span><span class="sd-spacer"></span><button type="button" class="sd-dbtn sd-quiet">add to calendar</button></div>`;
    col.append(card);
    anim(card, { opacity: [0, 1], translateY: [22, 0], scale: [0.98, 1], duration: 700, ease: 'outExpo' });
    anim(card.querySelectorAll('.sd-day'), { opacity: [0, 1], translateY: [10, 0], delay: stagger(70, { start: 160 }), duration: 600, ease: 'outExpo' });
    anim(card.querySelectorAll('.sd-day p'), { opacity: [0, 1], translateX: [-4, 0], delay: stagger(40, { start: 380 }), duration: 420, ease: 'outQuad' });
    follow(700);
    S.week = true;
    return card;
  }

  /* ---------- the runs tracker Sol makes on the spot ---------- */
  const RUNS0 = [5.2, 0, 3.4, 0, 6.1, 0, 0];   // mon..sun; today is saturday
  const TODAY = 5, GOAL = 25, ADDS = [4.2, 3.1, 5.0, 2.6];
  async function runsFlow(r) {
    if (S.runs) {
      await speak(r, 'It’s already here, and on your shelf at the top.');
      flash(S.runs.card); return S.runs;
    }
    // building: a running step with its clock, the shape of the thing with a sheen over it
    const box = h('div', 'sd-steps');
    const row = h('div', 'sd-step sd-running', `<span class="sd-gl">${ICON.build}</span><span class="sd-tx">building <b>runs</b> · a tracker, a chart, a button</span><span class="sd-el">0.0s</span><span class="sd-st"><i class="sd-spin"></i></span>`);
    box.append(row); col.append(box);
    anim(row, { opacity: [0, 1], translateY: [6, 0], duration: 320, ease: 'outExpo' });
    const skel = h('div', 'sd-skel');
    skel.innerHTML = `<i class="sd-ln" style="top:18px;width:60px"></i><i class="sd-ln" style="top:42px;width:120px;height:20px;border-radius:6px"></i>${
      RUNS0.map((_, i) => `<i class="sd-skb" style="left:${18 + i * 32}px;height:${[34, 8, 22, 8, 46, 8, 8][i]}px"></i>`).join('')}`;
    col.append(skel);
    anim(skel, { height: ['0px', '196px'], opacity: [0, 1], duration: 650, ease: 'outExpo' });
    anim(skel.querySelectorAll('.sd-ln, .sd-skb'), { opacity: [0, 1], scaleY: [0.3, 1], delay: stagger(80, { start: 300 }), duration: 500, ease: 'outBack' });
    follow(600);
    const t0 = performance.now(), elx = row.querySelector('.sd-el');
    const tick = setInterval(() => { elx.textContent = `${((performance.now() - t0) / 1000).toFixed(1)}s`; }, 100);
    let card;
    try {
      await sleep(2300, r);
    } finally {
      clearInterval(tick);
      row.classList.remove('sd-running'); row.querySelector('.sd-st').innerHTML = ICON.check; elx.style.color = 'var(--mute)';
      // whatever happens, the thing lands: it is real now
      card = makeRuns();
      skel.replaceWith(card.card);
      anim(card.card, { opacity: [0, 1], scale: [0.97, 1], filter: ['blur(8px)', 'blur(0px)'], duration: 700, ease: 'outExpo' });
      anim(card.card.querySelectorAll('.sd-top, .sd-cells, .sd-dl, .sd-made'), { opacity: [0, 1], translateY: [8, 0], delay: stagger(70, { start: 120 }), duration: 520, ease: 'outExpo' });
      card.draw(true);
      follow(600);
    }
    await sleep(500, r);
    await shelfLand(r, card);
    await speak(r, 'Made it. It lives on your shelf now, so it’s one press away tomorrow.');
    return card;
  }
  function makeRuns() {
    const vals = RUNS0.slice();
    let add = 0;
    const c = h('div', 'sd-card sd-runs');
    c.innerHTML = `<div class="sd-dtitle"><span class="sd-rname">runs</span><span class="sd-grow"></span><small>made by Sol · just now</small></div>
      <div class="sd-top"><div class="sd-tot"><span class="sd-n">0.0</span><small>km this week</small></div><span class="sd-grow"></span><button type="button" class="sd-dbtn sd-add">${ICON.plus.replace('<svg', '<svg width="11" height="11"')} run</button></div>
      <div class="sd-bars">${vals.map((_, i) => `<div class="sd-b ${i === TODAY ? 'sd-today' : ''}"><em></em><span></span></div>`).join('')}</div>
      <div class="sd-dl">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => `<span class="${i === TODAY ? 'sd-today' : ''}">${d}</span>`).join('')}</div>
      <div class="sd-cells">${Array.from({ length: GOAL }, () => '<i></i>').join('')}<small>goal 25 km</small></div>`;
    const bars = [...c.querySelectorAll('.sd-bars .sd-b')], cells = [...c.querySelectorAll('.sd-cells i')], num = c.querySelector('.sd-tot .sd-n');
    const tot = { v: 0 };
    const draw = (first) => {
      const max = Math.max(8, ...vals), H = 74;
      bars.forEach((b, i) => {
        const hh = Math.max(3, (vals[i] / max) * H);
        b.classList.toggle('sd-zero', !vals[i]);
        b.querySelector('em').textContent = vals[i] ? vals[i].toFixed(1) : '';
        const sp = b.querySelector('span');
        anim(sp, { height: `${hh}px`, duration: first ? 900 : 700, delay: first ? 220 + i * 60 : 0, ease: 'outBack(1.6)',
          onUpdate: () => b.style.setProperty('--h', sp.style.height) });
      });
      const sum = vals.reduce((a, b) => a + b, 0);
      anim(tot, { v: sum, duration: first ? 1100 : 600, delay: first ? 200 : 0, ease: 'outExpo', onUpdate: () => { num.textContent = tot.v.toFixed(1); } });
      cells.forEach((ce, i) => { const got = i < Math.floor(sum); if (got !== ce.classList.contains('sd-got')) setTimeout(() => ce.classList.toggle('sd-got', got), (first ? 400 : 0) + i * 22); });
    };
    const plus = () => {
      vals[TODAY] = +(vals[TODAY] + ADDS[add++ % ADDS.length]).toFixed(1);
      if (vals[TODAY] > 16) vals[TODAY] = ADDS[0];
      draw(false);
      const b = bars[TODAY].querySelector('span');
      anim(b, { scaleX: [1.25, 1], duration: 500, ease: 'outElastic(1, .5)' });
    };
    c.querySelector('.sd-add').addEventListener('click', plus);
    const card = { card: c, draw, plus, add: c.querySelector('.sd-add') };
    S.runs = card;
    return card;
  }
  function flash(e) {
    if (!e) return;
    const y = e.offsetTop - 40;
    scr.y = talk.scrollTop;
    anim(scr, { y: clamp(y, 0, talk.scrollHeight - talk.clientHeight), duration: 600, ease: 'inOutQuad', onUpdate: () => { talk.scrollTop = scr.y; } });
    anim(e, { boxShadow: ['inset 0 1px 0 rgb(239 234 226 / .11), 0 0 0 2px rgba(253,105,185,.55)', 'inset 0 1px 0 rgb(239 234 226 / .11), 0 0 0 0px rgba(253,105,185,0)'], duration: 1400, delay: 300, ease: 'outQuad' });
  }
  // the button flies from the thing to the shelf; the rail makes room, the button lands with a squash
  async function shelfLand(r, card) {
    if (S.shelf) return;
    const btn = h('button', 'sd-word sd-new', `${ICON.runs}runs`); btn.type = 'button';
    btn.style.visibility = 'hidden';
    slot.append(btn);
    S.shelf = btn;
    btn.addEventListener('click', () => flash(S.runs?.card));
    const bw = btn.offsetWidth;
    slot.style.marginRight = '-8px';
    anim(slot, { width: ['0px', `${bw}px`], marginRight: ['-8px', '0px'], duration: 520, ease: 'outExpo' });
    const from = rel(card.card.querySelector('.sd-rname'));
    const ghost = h('div', 'sd-ghost', `${ICON.runs}runs`);
    canvas.append(ghost);
    ghost.style.left = '0px'; ghost.style.top = '0px';
    const gw = ghost.offsetWidth;
    const fx = from.x - 12, fy = from.y - 5;
    anim(ghost, { scale: [0.6, 1.08], opacity: [0, 1], duration: 300, ease: 'outBack' });
    ghost.style.transform = `translate(${fx}px, ${fy}px)`;
    const g = { x: fx, y: fy, s: 1 };
    await sleep(320, r).catch((e) => { ghost.remove(); btn.style.visibility = ''; slot.style.width = 'auto'; slot.style.marginRight = '0px'; throw e; });
    const to = rel(slot);
    const tx = to.x + (to.w - gw) / 2 + (bw - to.w) / 2, ty = to.y + (to.h - 26) / 2;
    // the arc: x eases in and out, y leaves fast and settles; a slight lift in scale on the way
    anim(g, { x: tx, duration: STILL.matches ? 1 : 760, ease: 'inOutCubic', onUpdate: () => { ghost.style.transform = `translate(${g.x}px, ${g.y}px) scale(${g.s})`; } });
    anim(g, { y: ty, duration: STILL.matches ? 1 : 760, ease: 'outCubic' });
    anim(g, { s: [1.08, 1.14, 1], duration: STILL.matches ? 1 : 760, ease: 'inOutQuad' });
    try { await sleep(770, r); } finally {
      ghost.remove(); btn.style.visibility = ''; slot.style.width = 'auto'; slot.style.marginRight = '0px';
      anim(btn, { scaleX: [1.18, 1], scaleY: [0.82, 1], duration: 600, ease: 'outElastic(1, .45)' });
    }
  }

  /* ---------- the window restyles itself ---------- */
  const tint = { r: 0, g: 0, b: 0, a: 0.78, w: 0 };
  const putTint = () => {
    canvas.style.setProperty('--bc', `${Math.round(tint.r)} ${Math.round(tint.g)} ${Math.round(tint.b)}`);
    canvas.style.setProperty('--ba', tint.a.toFixed(3));
    warmth.style.opacity = tint.w.toFixed(3);
  };
  function setWarm(on, ms = 1500) {
    S.warm = on;
    canvas.style.setProperty('--glow', on ? 'var(--amber)' : 'var(--candy)');
    anim(tint, { r: on ? 36 : 0, g: on ? 18 : 0, b: on ? 8 : 0, a: on ? 0.8 : 0.78, w: on ? 1 : 0, duration: ms, ease: 'inOutQuad', onUpdate: putTint });
  }
  function setSide(where) {
    S.side = where;
    sideP.to(where === 'right' ? 1 : 0, { cfg: compact ? { k: 260, z: 0.86 } : { k: 150, z: 0.84 } });
  }
  function setBig(on) {
    S.big = on;
    const v = { f: parseFloat(getComputedStyle(canvas).getPropertyValue('--chat-text')) || 15 };
    anim(v, { f: on ? 17.5 : 15, duration: 500, ease: 'outExpo', onUpdate: () => canvas.style.setProperty('--chat-text', `${v.f}px`) });
  }
  async function restyleFlow(r, want) {
    await steps(r, [{ glyph: 'paint', text: 'changing <b>the window</b> · side, tint', ms: 900 }], null).then((box) => {
      anim(box, { opacity: [1, 0.55], duration: 400 });
    });
    if (want.side) setSide(want.side);
    if (want.warm != null) setWarm(want.warm);
    if (want.big != null) setBig(want.big);
    await sleep(want.side ? 900 : 500, r);
    const bits = [];
    if (want.side) bits.push(want.side === 'right' ? (compact ? 'the side comes in from the right now' : 'the side lives on the right now') : 'the side is back on the left');
    if (want.warm === true) bits.push('the glass is warmer');
    if (want.warm === false) bits.push('the glass is back to black');
    if (want.big === true) bits.push('the words are bigger');
    if (want.big === false) bits.push('the words are back to normal');
    const s = bits.join(', and ');
    await speak(r, `Done: ${s}. Nothing reloaded. Say “undo” to put it back.`);
  }

  /* ---------- the notch drops with a ping ---------- */
  function notchOpen(text, sub) {
    say.innerHTML = text; meta.textContent = sub || '';
    S.notch = true; notch.classList.add('sd-open');
    const n = G.notch;
    nW.to(n.w1, { cfg: { k: 300, z: 0.82 } });
    nH.to(n.h1, { delay: 40, cfg: { k: 300, z: 0.82 } });
    // the creature hops as it wakes
    anim(mark, { translateY: [0, -5, 0], scaleX: [1, 0.9, 1.1, 1], scaleY: [1, 1.12, 0.88, 1], duration: 620, delay: 120, ease: 'outQuad' });
  }
  function notchClose() {
    if (!S.notch) return;
    S.notch = false; notch.classList.remove('sd-open');
    const n = G.notch;
    nW.to(n.w0, { cfg: { k: 520, z: 1 } });
    nH.to(n.h0, { delay: 20, cfg: { k: 520, z: 1 } });
  }
  async function notifyFlow(r) {
    notchOpen('<b>Codex</b> finished: 3 tests fixed', 'fix login bug · just now');
    ping('codex');
    // the row it came from settles: the runner stops, an unread cell
    const st = loginRow.querySelector('.sd-wst'), age = loginRow.querySelector('.sd-age');
    st.className = 'sd-wst sd-unread'; age.className = 'sd-age'; age.textContent = 'now';
    anim(loginRow, { backgroundColor: ['rgba(253,105,185,.16)', 'rgba(253,105,185,0)'], duration: 1600, ease: 'outQuad', onComplete: () => { loginRow.style.backgroundColor = ''; } });
    try { await sleep(4200, r); } finally { notchClose(); }
  }

  /* ---------- the pointer the script uses to press things ---------- */
  const cur = { x: 0, y: 0 };
  async function press(r, target) {
    if (!target || !target.isConnected) return;
    const t = rel(target);
    const tx = t.x + t.w * 0.55, ty = t.y + t.h * 0.6;
    if (cursor.style.opacity !== '1') { cur.x = tx + 140; cur.y = ty + 90; }
    cursor.style.opacity = '1';
    const put = () => { cursor.style.transform = `translate(${cur.x}px, ${cur.y}px)`; };
    put();
    anim(cur, { x: tx, y: ty, duration: STILL.matches ? 1 : 700, ease: 'inOutCubic', onUpdate: put });
    await sleep(740, r);
    anim(cursor, { scale: [1, 0.82, 1], duration: 260, ease: 'outQuad' });
    target.click();
    await sleep(300, r);
  }
  const hideCursor = () => anim(cursor, { opacity: 0, duration: 300, ease: 'outQuad' });

  /* ---------- typing ---------- */
  function showTyped(text) {
    typed.textContent = text;
    input.placeholder = text ? '' : 'talk to Sol';
    sendBtn.classList.toggle('sd-on', !!text);
  }
  async function typeIn(r, text) {
    island.classList.add('sd-focus');
    try {
      for (let i = 1; i <= text.length; i++) {
        showTyped(text.slice(0, i));
        const ch = text[i - 1];
        await sleep(STILL.matches ? 12 : (ch === ' ' ? rnd(50, 110) : rnd(28, 62)) + (Math.random() < 0.05 ? 180 : 0), r);
      }
      await sleep(380, r);
    } catch (e) { showTyped(''); island.classList.remove('sd-focus'); throw e; }
    showTyped(''); island.classList.remove('sd-focus');
    anim(sendBtn, { scale: [0.8, 1], duration: 250 });
  }

  /* ---------- back to rest ---------- */
  async function reset(r) {
    notchClose();
    hideCursor();
    const kids = [...col.children];
    if (kids.length) {
      anim(kids, { opacity: 0, translateY: -12, filter: 'blur(4px)', duration: 520, delay: stagger(30), ease: 'inQuad' });
      await sleep(520 + kids.length * 30, r);
    }
    col.innerHTML = ''; talk.scrollTop = 0;
    if (S.side !== 'left') setSide('left');
    if (S.warm) setWarm(false, 1200);
    if (S.big) setBig(false);
    if (S.shelf) {
      const b = S.shelf; S.shelf = null;
      anim(b, { opacity: 0, scale: 0.6, duration: 260, ease: 'inQuad' });
      slot.style.width = `${b.offsetWidth}px`;
      anim(slot, { width: '0px', marginRight: '-8px', duration: 480, delay: 200, ease: 'inOutQuad', onComplete: () => { b.remove(); slot.style.marginRight = '0px'; } });
    }
    S.runs = null; S.week = false;
    loginRow.querySelector('.sd-wst').className = 'sd-wst sd-run';
    const age = loginRow.querySelector('.sd-age'); age.className = 'sd-age sd-live'; age.textContent = '4m';
    if (S.seat !== 'sol') pickSeat('sol');
    showEmpty();
    S.clean = true;
  }

  /* ---------- the script ---------- */
  async function script(r) {
    if (!S.clean) await reset(r);
    for (;;) {
      await sleep(1700, r);
      // 2. plan the week from what Claude said
      await typeIn(r, SCRIPT.week);
      meBubble(SCRIPT.week);
      await sleep(450, r);
      await weekFlow(r);
      await sleep(2600, r);
      // 3. a tracker, built live; its + works
      await typeIn(r, SCRIPT.runs);
      meBubble(SCRIPT.runs);
      await sleep(450, r);
      const card = await runsFlow(r);
      await sleep(500, r);
      await press(r, card.add);
      await sleep(500, r);
      await press(r, card.add);
      hideCursor();
      await sleep(1800, r);
      // 4. the window restyles itself in place
      await typeIn(r, SCRIPT.style);
      meBubble(SCRIPT.style);
      await sleep(450, r);
      await restyleFlow(r, { side: 'right', warm: true });
      await sleep(2200, r);
      // 5. the notch drops with a ping, then closes
      await notifyFlow(r);
      await sleep(1600, r);
      await reset(r);
    }
  }

  /* ---------- the visitor's turn ---------- */
  let mode = 'auto', run = null, idleT = 0, queue = Promise.resolve(), userRun = newRun();
  function play() {
    if (dead) return;
    kill(run);
    mode = 'auto';
    run = newRun();
    const r = run;
    script(r).catch((e) => { if (e !== CANCEL) console.error(e); });
    return r;
  }
  function takeOver() {
    clearTimeout(idleT);
    idleT = setTimeout(resume, o.idle);
    if (mode === 'user') return;
    mode = 'user';
    kill(run); run = null;
    showTyped(''); hideCursor();
  }
  function resume() {
    if (dead) return;
    if (canvas.contains(document.activeElement) && input.value) { idleT = setTimeout(resume, o.idle); return; }
    kill(userRun); userRun = newRun(); queue = Promise.resolve();
    input.blur(); input.value = ''; showTyped(''); island.classList.remove('sd-focus');
    S.clean = false;
    play();
  }
  function reply(text) {
    const t = text.toLowerCase(), r = userRun;
    const want = {};
    if (/\bright\b/.test(t)) want.side = 'right';
    else if (/\bleft\b/.test(t)) want.side = 'left';
    if (/warm|cozy|cosy|orange|sunset/.test(t)) want.warm = true;
    else if (/cool|cold|black|dark/.test(t)) want.warm = false;
    if (/bigger|larger|\bbig\b|zoom/.test(t)) want.big = true;
    else if (/smaller|\bsmall\b/.test(t)) want.big = false;
    if (/undo|reset|put it back/.test(t)) { want.side = 'left'; want.warm = false; want.big = false; }
    const seatNow = seat(S.seat);
    if (Object.keys(want).length) return restyleFlow(r, want);
    if (/\bruns?\b|tracker|track|running/.test(t)) return runsFlow(r);
    if (/\bnotes?\b/.test(t)) return steps(r, [{ glyph: 'read', text: 'reading <b>Notes</b> · 3 notes this week', ms: 900 }],
      [{ c: 'rgb(239 234 226 / .7)', html: 'read <b>Notes</b>' }]).then(() => speak(r, 'Three notes this week: the launch checklist, a gift idea for Ana, and “run before 8, it’s cooler”.'));
    if (/week|plan|calendar|schedule/.test(t)) return weekFlow(r);
    if (/notch|ping|notif|codex/.test(t)) return speak(r, 'Watch the top: that’s where I live when you’re elsewhere.').then(() => notifyFlow(r));
    if (/claude|chatgpt|gemini|gpt/.test(t)) {
      const who = SEATS.find((s) => s.id !== 'sol' && t.includes(s.id)) || seat('claude');
      return steps(r, [{ glyph: 'ask', text: `asking <b>${who.name[0].toUpperCase() + who.name.slice(1)}</b>`, ms: 900, seat: who.id }], null)
        .then(() => speak(r, `In the real Sol, ${who.name === 'chatgpt' ? 'ChatGPT' : who.name[0].toUpperCase() + who.name.slice(1)} would answer right here, in this same window. This demo only knows a few tricks.`));
    }
    const via = seatNow.id === 'sol' ? 'I’d pick the right AI for it and answer right here' : `${seatNow.name === 'chatgpt' ? 'ChatGPT' : seatNow.name[0].toUpperCase() + seatNow.name.slice(1)} would answer right here`;
    return speak(r, `In the real Sol, ${via}. This demo knows a few tricks: try “make it warmer”, “sidebar on the right”, “bigger”, “track my runs” or “read my notes”.`);
  }
  function submit() {
    const text = input.value.trim();
    if (!text) return;
    input.value = ''; sendBtn.classList.remove('sd-on');
    meBubble(text);
    const r = userRun;
    queue = queue.then(() => sleep(380, r)).then(() => reply(text)).catch((e) => { if (e !== CANCEL) console.error(e); });
  }

  // any press or key inside the demo is the visitor taking the window
  const onDown = (e) => {
    takeOver();
    if (e.target === input || e.target.closest('.sd-island')) {
      if (e.target !== input) { e.preventDefault(); input.focus({ preventScroll: true }); }
    }
  };
  el.addEventListener('pointerdown', onDown, true);
  el.addEventListener('wheel', () => { if (mode === 'user') takeOver(); }, { passive: true });
  input.addEventListener('focus', () => { takeOver(); island.classList.add('sd-focus'); });
  input.addEventListener('blur', () => island.classList.remove('sd-focus'));
  input.addEventListener('input', () => { takeOver(); sendBtn.classList.toggle('sd-on', !!input.value.trim()); input.value = input.value.replace(/\n/g, ''); });
  input.addEventListener('keydown', (e) => {
    takeOver();
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === 'Escape') input.blur();
  });
  sendBtn.addEventListener('click', submit);
  minds.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) pickSeat(b.dataset.seat); });
  modeSw.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; modeSw.querySelectorAll('button').forEach((x) => x.classList.toggle('sd-on', x === b)); placeThumb(modeSw); });
  side.querySelectorAll('.sd-row').forEach((row) => row.addEventListener('click', () => {
    side.querySelectorAll('.sd-row').forEach((x) => x.classList.toggle('sd-on', x === row));
    title.textContent = row.dataset.title;
  }));
  canvas.querySelector('[data-act="side"]').addEventListener('click', () => {
    if (compact) setSide(S.side === 'right' ? 'left' : 'right');
    else setSide(S.side === 'right' ? 'left' : 'right');
  });
  notch.addEventListener('click', (e) => {
    if (S.notch) { notchClose(); return; }
    notchOpen('<b>Codex</b> finished: 3 tests fixed', 'fix login bug · just now');
  });
  canvas.querySelector('.sd-cbtn.sd-first').addEventListener('click', (e) => {
    e.stopPropagation(); notchClose();
    const row = loginRow; side.querySelectorAll('.sd-row').forEach((x) => x.classList.toggle('sd-on', x === row)); title.textContent = row.dataset.title;
    if (compact) setSide('right');
  });
  const onMQ = () => { if (STILL.matches) springs.forEach((s) => s.jump(s.t)); };
  STILL.addEventListener?.('change', onMQ);

  putTint();
  if (o.autoplay) play();

  return {
    play: () => { clearTimeout(idleT); play(); },
    pause: () => { takeOver(); clearTimeout(idleT); },
    destroy: () => {
      dead = true; kill(run); kill(userRun); clearTimeout(idleT); cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect(); STILL.removeEventListener?.('change', onMQ);
      el.removeEventListener('pointerdown', onDown, true);
      el.innerHTML = ''; el.classList.remove('soldemo', 'compact'); el.style.height = '';
    },
  };
}

window.SolDemo = { mount };
export { mount };
export default { mount };
