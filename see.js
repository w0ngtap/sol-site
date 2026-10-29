// See it, the scroll after the desk (Marco, 2026-10-27: "the scroll should naturally transition over to visualizing how
// the problem gets solved"). The same dotted desktop goes on; as it comes up, eight AI windows fall onto it.
//   1  Today, you are the glue: the windows pile up, your cursor runs between them carrying copy, paste, explain again.
//   2  With Sol, you talk to one: the windows fold into chips on one Sol window; you type once and Sol asks them.
//   3  And it grows what you need: buttons bloom on its shelf; you ask for one more and it is made, and stays.
// Everything is DOM on a 900 x 600 scene scaled to fit, driven by how far the section has scrolled (p, 0 to 1); only the
// cursor's running and the windows' drift go by the clock.
(() => {
  const see = document.getElementById('see'); if (!see) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const span = (p, a, b) => ease(clamp((p - a) / (b - a)));

  /* the eight windows, where they lie on the desk (scene px) */
  const APPS = [
    { n:'ChatGPT', k:'chat', x:28, y:44, w:220, h:150, r:-3 },
    { n:'Claude', k:'chat', x:300, y:14, w:210, h:150, r:2 },
    { n:'Codex', k:'code', x:572, y:46, w:240, h:150, r:-1.5 },
    { n:'Gemini', k:'chat', x:62, y:252, w:200, h:140, r:2.5 },
    { n:'Terminal', k:'term', x:326, y:222, w:240, h:150, r:1 },
    { n:'Perplexity', k:'chat', x:640, y:262, w:220, h:140, r:-2 },
    { n:'Browser', k:'web', x:146, y:424, w:270, h:150, r:-1 },
    { n:'Notes', k:'notes', x:520, y:432, w:220, h:140, r:3 },
  ];
  const S = { x:120, y:34, w:660, h:530 };             // the Sol window
  const CW = 70, CG = 6, CX = S.x + (S.w - (APPS.length * CW + (APPS.length - 1) * CG)) / 2, CY = S.y + 40;   // its chips
  const BODY = {
    chat: () => '<p class="b l" style="width:72%"></p><p class="b r" style="width:46%"></p><p class="b l" style="width:58%"></p><p class="b r" style="width:34%"></p>',
    code: () => '<code>› fix the login bug</code><code class="d">reading src/auth.ts</code><code class="d">3 files changed</code><code>› and the tests?</code>',
    term: () => '<code>$ git status</code><code class="d">modified: auth.ts</code><code>$ npm test</code><code class="x">✗ 2 failing</code>',
    web: () => '<div class="tabs">' + '<i></i>'.repeat(9) + '</div><p class="url"></p><p class="blk"></p>',
    notes: () => '<b class="t">the plan, v3</b><p class="b" style="width:80%"></p><p class="b" style="width:64%"></p><p class="b" style="width:70%"></p>',
  };
  const GLUE = ['copy', 'paste', 'explain it again', 'copy', 'which tab was it', 'paste', 're-upload the file', 'explain it again'];
  const HOPS = [0, 4, 1, 7, 2, 6, 3, 5, 1, 4];
  const SHELF = ['meals', 'the gym', 'school', 'budget', 'flashcards'];
  const ASK1 = 'plan my week with what Claude said yesterday', ASK2 = 'make me something for my runs';
  const STEPS = [
    ['Today, you are the glue.', 'Eight apps, and you carry everything between them. Copy, paste, explain it all again.'],
    ['With Sol, you talk to one.', 'Every AI you use folds into one window. Sol asks them for you, with your context.'],
    ['And it grows what you need.', 'Ask for something you need every day. It becomes a button, and it stays.'],
  ];

  /* build */
  const stage = $('.stage', see), scene = $('.scene', see), story = $('.story', see);
  story.innerHTML = STEPS.map(([h, p], i) => `<div class="st"><span>0${i + 1}</span><h2>${h}</h2><p>${p}</p></div>`).join('') + '<div class="rail"><b></b></div>';
  const sts = $$('.st', story), railFill = $('.rail b', story);
  scene.insertAdjacentHTML('beforeend', `
    <div class="glow"></div>
    <div class="solw">
      <div class="tb"><i></i><i></i><i></i><img src="media/sol.svg" alt=""></div>
      <div class="chat">
        <div class="m u" data-at=".5">${ASK1}</div>
        <div class="m s" data-at=".55"><img src="media/sol.svg" alt=""><div>Done. Your week is on the desk.<small><em>asked Claude</em><em>checked Codex</em><em>read Notes</em></small></div></div>
        <div class="m u" data-at=".83">${ASK2}</div>
        <div class="m s" data-at=".87"><img src="media/sol.svg" alt=""><div>Made it. It's on your shelf, and it stays.<small><em class="new">new button · runs</em></small></div></div>
      </div>
      <div class="shelf">${SHELF.map(s => `<span>${s}</span>`).join('')}<span class="runs">runs</span></div>
      <div class="in"><span class="tx"></span><i class="caret"></i><span class="ph">talk to Sol</span></div>
    </div>
    <div class="count"><b>0</b> times you explained it again today</div>
    <div class="cur"><svg viewBox="0 0 16 22"><path d="M1 1v17l4.6-4.4 3 6.9 3-1.3-3-6.8H15z" fill="#fff" stroke="#000" stroke-width="1.2"/></svg><span class="you">you</span><span class="carry"></span></div>`);
  const wins = APPS.map((a, i) => {
    const el = document.createElement('div'); el.className = 'aw ' + a.k;
    el.innerHTML = `<div class="tb"><i></i><i></i><i></i></div><b class="nm">${a.n}</b><div class="bd">${BODY[a.k]()}</div>`;
    scene.insertBefore(el, $('.solw', scene).nextSibling); return el;
  });
  const solw = $('.solw', scene), glow = $('.glow', scene), cur = $('.cur', scene), carry = $('.carry', cur), count = $('.count', scene);
  const tx = $('.in .tx', solw), ph = $('.in .ph', solw), msgs = $$('.chat .m', solw), shelf = $$('.shelf span', solw);
  const nmW = wins.map(w => $('.nm', w).offsetWidth || 50);

  /* fit the 900 x 600 scene into the stage beside (or under) the words */
  let fit = { s:1, x:0, y:0 }, phone = false;
  function layout() {
    const W = stage.clientWidth, H = stage.clientHeight; phone = W < 900;
    const box = phone ? { x:-W * .2, y:H * .3, w:W * 1.4, h:H * .68 } : { x:W * .37, y:64, w:W * .6, h:H - 110 };
    const s = Math.min(box.w / 900, box.h / 600);
    fit = { s, x:box.x + (box.w - 900 * s) / 2, y:box.y + (box.h - 600 * s) / 2 };
    scene.style.transform = `translate(${fit.x}px,${fit.y}px) scale(${s})`;
    nmW.forEach((_, i) => nmW[i] = $('.nm', wins[i]).offsetWidth || nmW[i]);
  }
  addEventListener('resize', layout); layout();

  let step = -1, hop = -1, told = 0;
  function draw(t) {
    const r = see.getBoundingClientRect(), H = innerHeight;
    const enter = clamp((H - r.top) / H);               // the section rising under the desk, before it pins
    const p = clamp(-r.top / (r.height - H));
    const fold = span(p, .24, .44), grow = span(p, .6, .72);
    stage.style.setProperty('--glue', 1 - fold); stage.style.setProperty('--fold', fold);

    // 1 + 2: the windows, falling in, drifting, then folding into chips
    APPS.forEach((a, i) => {
      const el = wins[i], fall = ease(clamp(enter * 1.5 - .25 - i * .06));
      const k = ease(clamp(fold * 1.35 - (i % 4) * .1));
      const drift = Math.sin(t / 1700 + i * 1.3) * 4 * (1 - k);
      const chipX = CX + i * (CW + CG), x = lerp(a.x, chipX, k), y = lerp(a.y + drift, CY, k) + (1 - fall) * 420;
      const w = lerp(a.w, CW, k), h = lerp(a.h, 24, k), rot = lerp(a.r, 0, k) + (1 - fall) * a.r * 5;
      el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:rotate(${rot}deg);opacity:${fall};border-radius:${lerp(10, 12, k)}px;--k:${k}`;
      $('.nm', el).style.left = lerp(34, (w - nmW[i]) / 2, k) + 'px';
      el.classList.toggle('chip', k > .95);
    });
    // Sol's window rises under them as they fold
    const sw = span(p, .26, .4);
    solw.style.cssText = `left:${S.x}px;top:${S.y}px;width:${S.w}px;height:${S.h}px;opacity:${sw};transform:translateY(${(1 - sw) * 30}px) scale(${lerp(.94, 1, sw)})`;
    glow.style.opacity = sw * (.7 + grow * .3);

    // the cursor: running between windows (the clock), then settling on Sol's one line (the scroll)
    const seg = t / 950, n = Math.floor(seg), f = ease(Math.min(1, (seg % 1) * 1.6));
    const A = APPS[HOPS[n % HOPS.length]], B = APPS[HOPS[(n + 1) % HOPS.length]];
    const ax = A.x + A.w * .55, ay = A.y + A.h * .55, bx = B.x + B.w * .55, by = B.y + B.h * .55;
    const hx = lerp(ax, bx, f), hy = lerp(ay, by, f) - Math.sin(f * Math.PI) * 40;
    const ix = S.x + 60 + Math.min(ASK1.length, tx.textContent.length) * 6.4, iy = S.y + S.h - 30;
    const settle = span(p, .3, .42);
    cur.style.transform = `translate(${lerp(hx, ix, settle)}px,${lerp(hy, iy, settle)}px)`;
    cur.style.opacity = enter;
    if (n !== hop) {
      hop = n; carry.textContent = GLUE[n % GLUE.length];
      wins.forEach((w, i) => w.classList.toggle('hit', i === HOPS[(n + 1) % HOPS.length] && fold < .2));
      if (GLUE[n % GLUE.length].includes('again')) told++;
    }
    cur.classList.toggle('busy', fold < .3);
    count.firstChild.textContent = 9 + told; count.style.opacity = clamp(enter * 2 - 1) * (1 - fold * 2);

    // 2 + 3: what is typed, said, and grown
    const typed = p < .66 ? ASK1.slice(0, Math.round(ASK1.length * clamp((p - .42) / .07))) : ASK2.slice(0, Math.round(ASK2.length * clamp((p - .76) / .06)));
    const sent = (p >= .5 && p < .76) || p >= .83;
    tx.textContent = sent ? '' : typed; ph.style.opacity = tx.textContent ? 0 : 1;
    msgs.forEach(m => m.classList.toggle('on', p >= +m.dataset.at));
    wins.forEach((w, i) => w.classList.toggle('lit', p >= .55 && p < .8 && [1, 2, 7].includes(i)));
    shelf.forEach((s, i) => s.classList.toggle('on', i < SHELF.length ? p >= .62 + i * .022 : p >= .87));

    // the words
    const now = p < .36 ? 0 : p < .64 ? 1 : 2;
    if (now !== step) { step = now; sts.forEach((s, i) => { s.classList.toggle('on', i === now); s.classList.toggle('past', i < now); }); }
    railFill.style.height = p * 100 + '%';
    story.style.opacity = clamp(enter * 1.6 - .5);
  }
  (function tick(t) {
    const r = see.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) draw(t);
    requestAnimationFrame(tick);
  })(0);
})();
