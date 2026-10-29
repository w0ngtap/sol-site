// The desk, the first screen: the things around Sol's name and the download. Every thing leads somewhere
// (`go`), says where on hover (`tip`), and can be dragged anywhere; a window dropped on the trash goes, then comes back.
// Positions are x in % of the desk's width and y in px from its top, chosen to keep the middle clear.

/* ---------- the things around it ---------- */
const THINGS = [
  // windows: each a small live demo of one thing Sol does (minis.js); clicking opens the post behind it
  { x:2.5, y:88,  w:210, h:126, kind:'win', name:'say hello', mini:'hello', go:'post.html?p=dawn', tip:'Sol\'s first five minutes' },
  { x:24,  y:58,  w:190, h:112, kind:'win', name:'make it yours', mini:'glass', go:'post.html?p=glass', tip:'Hover and slide: the look follows' },
  { x:71,  y:66,  w:236, h:118, kind:'win', name:'blocks', mini:'blocks', go:'post.html?p=blocks', tip:'Everything is a block you can move' },
  { x:4.5, y:345, w:200, h:124, kind:'win', name:'talk to it', mini:'talk', go:'#see', tip:'Say it out loud, it happens' },
  { x:80,  y:322, w:210, kind:'win txt', name:'stop-being-the-glue.txt', go:'post.html?p=glue', tip:'Note · the idea behind Sol',
    html:'<div class="pane"><b>stop being the glue</b><br>you copy from one AI,<br>paste into another,<br>explain it all again.<br><br>sol: talk to one. ▍</div>' },
  { x:86.5, y:640, w:180, h:96, kind:'win', name:'the notch', mini:'notch', go:'#try', tip:'When you\'re elsewhere, it lives in the notch' },
  // icons, the sticky, stickers
  { x:18, y:250, kind:'folder', name:'Blog', go:'blog.html', tip:'Films and notes from the build' },
  { x:89, y:214, kind:'folder', name:'What\'s coming', go:'#road', tip:'The road from here' },
  { x:4,  y:640, kind:'trash', name:'ten tabs', go:'#see', tip:'Drop a window here' },
  { x:19.5, y:470, kind:'sticky', go:'#road', tip:'Later: Sol notices first',
    html:'<small>from Sol, 7:42</small>train\'s late. I moved your 9am to 9:30 and told Frank.' },
  { x:55, y:62, kind:'hello', go:'post.html?p=dawn', tip:'Say hello: the first five minutes', html:'<div>HELLO<small>my name is</small></div><p>Sol</p>' },
  { x:69.5, y:300, kind:'sun', go:'#see', tip:'That\'s Sol. It lives in the notch too.' },
  { x:11, y:548, kind:'sun', rot:-24, size:34, go:'#see', tip:'That\'s Sol.' },
  { x:94, y:528, kind:'phone', name:'call Sol', go:'#road', tip:'Coming next: your phone as a door' },
  { x:42, y:150, kind:'face', text:'( ▪ ‿ ▪ )', go:'#see', tip:'hi' },
  { x:74, y:478, kind:'face', text:'▪ ▪  zz', go:'#road', tip:'It stays quiet until you need it' },
];
const desk = $('#desk'), box = $('#things'), tip = $('#tip');
THINGS.forEach(o => {
  const el = document.createElement('div');
  el.style.left = o.x + '%'; el.style.top = o.y + 'px'; el.dataset.go = o.go; el.dataset.tip = o.tip || '';
  if (o.kind.startsWith('win')) {
    el.className = o.kind; el.style.width = o.w + 'px';
    el.innerHTML = `<div class="tb"><i></i><i></i><i></i>${o.mini ? '<b>live</b>' : ''}</div>${o.html || `<div class="pane" style="height:${o.h}px"></div>`}<div class="cap">${o.name}</div>`;
    if (o.mini) MINIS.mount(el.querySelector('.pane'), o.mini);
  } else if (o.kind === 'sun') {
    el.className = 'thing'; el.innerHTML = `<img class="sun-sticker" src="media/sol.svg" alt="" style="width:${o.size || 46}px;transform:rotate(${o.rot || 12}deg)">`;
  } else if (o.kind === 'face') {
    el.className = 'thing face'; el.textContent = o.text;
  } else if (o.kind === 'sticky' || o.kind === 'hello') {
    el.className = 'thing ' + o.kind; el.innerHTML = o.html;
  } else {
    el.className = 'thing'; el.innerHTML = `<div class="${o.kind}">${o.kind === 'trash' ? '<em><u></u><u></u></em>' : ''}</div><span>${o.name}</span>`;
    if (o.kind === 'trash') el.id = 'trash';
  }
  box.append(el);
});

/* drag anything; a press without a drag opens it */
let z = 10;
$$('.win, .thing', box).forEach(el => {
  el.addEventListener('pointerdown', e => {
    if (e.button) return;
    const r0 = el.getBoundingClientRect(), d = desk.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
    const ox = r0.left - d.left, oy = r0.top - d.top; let moved = false;
    el.setPointerCapture(e.pointerId); el.style.zIndex = ++z;
    const move = m => {
      const dx = m.clientX - sx, dy = m.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true; el.classList.add('drag'); tip.style.opacity = 0;
      el.style.left = ox + dx + 'px'; el.style.top = oy + dy + 'px';
      $('#trash')?.parentElement.classList.toggle('hot', el.classList.contains('win') && overTrash(el));
    };
    const up = () => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.classList.remove('drag');
      if (!moved) { const go = el.dataset.go; go.startsWith('#') ? $(go).scrollIntoView({ behavior:'smooth' }) : location.href = go; return; }
      if (el.classList.contains('win') && overTrash(el)) toss(el, ox, oy);
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  });
  el.addEventListener('pointerenter', () => { if (el.dataset.tip) { tip.textContent = el.dataset.tip; tip.style.opacity = 1; } });
  el.addEventListener('pointermove', e => { const d = desk.getBoundingClientRect(); tip.style.left = e.clientX - d.left + 14 + 'px'; tip.style.top = e.clientY - d.top + 18 + 'px'; });
  el.addEventListener('pointerleave', () => tip.style.opacity = 0);
});
function overTrash(el) {
  const t = $('#trash').getBoundingClientRect(), r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  return Math.abs(cx - (t.left + t.width / 2)) < 90 && Math.abs(cy - (t.top + t.height / 2)) < 80;
}
function toss(el, ox, oy) {
  $('#trash').parentElement.classList.remove('hot');
  el.style.transition = 'transform .35s ease-in, opacity .35s'; el.style.transform = 'scale(.1)'; el.style.opacity = 0;
  tip.textContent = 'one less tab. Sol is the one window.'; tip.style.opacity = 1;
  setTimeout(() => { el.style.transition = 'none'; el.style.left = ox + 'px'; el.style.top = oy + 'px'; }, 400);
  setTimeout(() => { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; tip.style.opacity = 0; }, 1600);
}
