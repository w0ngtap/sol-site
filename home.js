// The home page: the desk's download line. The desk is desk.js, See it see.js, What's coming road.js.
const $ = (s, r=document) => r.querySelector(s), $$ = (s, r=document) => [...r.querySelectorAll(s)];

/* ---------- the desk: the download, the one line, the menu bar's place ---------- */
$('#lineBtn').onclick = () => $('#line').classList.toggle('on');
// the notch's "Linux & Windows" lands here (#line): open the line under the buttons
const lineHash = () => { if (location.hash === '#line') { $('#line').classList.add('on'); $('#desk').scrollIntoView({ behavior:'smooth' }); } };
addEventListener('hashchange', lineHash); lineHash();
$('#line button').onclick = e => { navigator.clipboard?.writeText($('#line span').textContent); e.target.textContent = 'copied'; };

// The ending's film plays once when it comes into view and stays on its last frame: the sun is up.
(() => {
  const v = document.querySelector('#end .dawnfilm'); if (!v) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { v.poster = 'media/films/creature-alive-end.jpg'; return; }
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { v.play().catch(() => {}); o.disconnect(); } }, { threshold:.5 }).observe(v);
})();
