// Sol's Cowork as a live demo for the website: one room, three people and their agents, working together.
// window.SolCowork.mount(el, opts) builds it inside `el`, scales a fixed design canvas to el's width, and plays a
// looping script. Any real interaction (a click, a key, a scroll) hands the room to the visitor; 12 s after they leave
// it the script starts over. The look is copied from the app (mac/src/cowork/*.css, face.css): see cowork.css.
import { animate, createSpring, stagger } from './vendor/anime.esm.min.js';

const WIDE = { w: 1280, h: 760 };
const NARROW = { w: 420, h: 900 };
const NARROW_BELOW = 640;     // element width under which the narrow canvas is used
const IDLE_RESUME = 12000;
const LOOP_MS = 38500;

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const SOL_SRC = new URL('./media/sol.svg', import.meta.url).href;

/* ---------- people: their family's bud, ported from mac/src/creature/goo.tsx ---------- */
function rnd(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
}
const SUN = ['#fff28a', '#fcd50a', '#fba422', '#fb7111'];
const EMBER = ['#ffb084', '#fb7111', '#ef3a2a', '#c0177a'];
const SHORE = ['#ffe08a', '#ffb36b', '#ff8fb8', '#ff6fd0', '#c98cff'];
const BRAND = ['#fcd50a', '#9ed40a', '#fb7111', '#ef3a2a', '#b8ee3a', '#fb5ad0'];
const FAMILIES = {
  sea: ['#8fd6c8', '#159d8d', '#0a8e5d', '#08749e'],
  tide: ['#f3c2d8', '#f29f7b', '#c95442', '#3327e8'],
  dusk: ['#ecbd89', '#e8a86d', '#8d6b5b', '#6d5d93'],
  parade: ['#f9c3a9', '#f0a9c9', '#d63b34', '#a1bcb4'],
  meadow: ['#f0e060', '#b4de9a', '#8bc34a', '#3f8fe0'],
  fog: ['#b0c5b8', '#7e8ee8', '#3b5bdb', '#5bb07a'],
  sun: SUN, ember: EMBER, shore: SHORE,
};
const FAM_NAMES = Object.keys(FAMILIES);
const familyOf = (login) => FAM_NAMES[Math.floor(rnd(login.toLowerCase())() * FAM_NAMES.length)];
function budPath(seed, lobes = 4, bulge = 0.2, n = 48) {
  const r = rnd(seed), p1 = r() * 6.3, p2 = r() * 6.3;
  const pts = Array.from({ length: n }, (_, i) => {
    const t = (i / n) * 2 * Math.PI, rad = 38 * (1 + bulge * Math.sin(lobes * t + p1) + 0.06 * Math.sin(2 * t + p2));
    return [50 + rad * Math.cos(t), 50 + rad * Math.sin(t)];
  });
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], a = pts[i], b = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${(a[0] + (b[0] - p0[0]) / 6).toFixed(1)} ${(a[1] + (b[1] - p0[1]) / 6).toFixed(1)} ${(b[0] - (p3[0] - a[0]) / 6).toFixed(1)} ${(b[1] - (p3[1] - a[1]) / 6).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  return d + 'Z';
}
const bandsCss = (cols, angle = 90, soft = 0.05) => {
  const n = cols.length, pc = (v) => `${(Math.max(0, Math.min(1, v)) * 100).toFixed(1)}%`;
  return `linear-gradient(${angle}deg, ${cols.map((c, j) => `${c} ${pc(j / n + soft)}, ${c} ${pc((j + 1) / n - soft)}`).join(', ')})`;
};
let uid = 0;
function budSvg(login) {
  const id = `scb${++uid}`, cols = FAMILIES[familyOf(login)], r = rnd(login);
  const lobes = 3 + Math.floor(r() * 3), angle = 30 + Math.floor(r() * 5) * 30, d = budPath(login, lobes, 0.16 + r() * 0.1);
  const rad = (angle * Math.PI) / 180, x2 = 50 + 45 * Math.cos(rad), y2 = 50 + 45 * Math.sin(rad), n = cols.length;
  const stops = cols.map((c, j) => `<stop offset="${Math.max(0, j / n + 0.05)}" stop-color="${c}"/><stop offset="${Math.min(1, (j + 1) / n - 0.05)}" stop-color="${c}"/>`).join('');
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs>
    <linearGradient id="${id}b" gradientUnits="userSpaceOnUse" x1="${100 - x2}" y1="${100 - y2}" x2="${x2}" y2="${y2}">${stops}</linearGradient>
    <radialGradient id="${id}hi" gradientUnits="userSpaceOnUse" cx="36" cy="30" r="34"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}lo" gradientUnits="userSpaceOnUse" cx="64" cy="80" r="50"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
    <path d="${d}" fill="url(#${id}b)"/><path d="${d}" fill="url(#${id}lo)"/><path d="${d}" fill="url(#${id}hi)"/>
    <rect x="30" y="44" width="7" height="7.5" fill="#000"/><rect x="37" y="44" width="7" height="7.5" fill="#fff"/><rect x="50" y="44" width="7" height="7.5" fill="#000"/><rect x="57" y="44" width="7" height="7.5" fill="#fff"/></svg>`;
}
/* a state droplet (goo.tsx Droplet): turning while an agent runs, the check when it is done */
function dropSvg(kind) {
  const id = `scd${++uid}`;
  if (kind === 'done') return `<svg class="sc-drop" viewBox="0 0 100 100"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ceecb2"/><stop offset=".55" stop-color="#70df45"/><stop offset="1" stop-color="#e8ef54"/></linearGradient></defs><circle cx="50" cy="50" r="38" fill="url(#${id})"/><path d="M31 52l12 12 26-28" fill="none" stroke="#0b0b0b" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `<svg class="sc-drop" viewBox="0 0 100 100"><defs>
    <filter id="${id}f" x="-20" y="-20" width="140" height="140" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="5"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -9"/></filter>
    <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${SHORE[0]}"/><stop offset=".35" stop-color="${SHORE[1]}"/><stop offset=".7" stop-color="${SHORE[3]}"/><stop offset="1" stop-color="${SHORE[4]}"/></linearGradient></defs>
    <g filter="url(#${id}f)"><g class="spin"><g class="breath"><circle cx="50" cy="26" r="21" fill="url(#${id}s)"/><circle cx="73" cy="63" r="18" fill="url(#${id}s)"/><circle cx="28" cy="64" r="19" fill="url(#${id}s)"/><circle cx="50" cy="52" r="12" fill="url(#${id}s)"/></g></g></g></svg>`;
}
const famOf = (login) => (login === 'marco' ? BRAND : FAMILIES[familyOf(login)]);
/* a person's mark (bits.tsx Who): Sol for me, their family's bud for anyone else */
function who(login, size = 14, { live = false, state = '' } = {}) {
  const body = login === 'marco' ? `<img src="${SOL_SRC}" alt="" draggable="false">` : budSvg(login);
  const st = state ? `<span class="sc-st">${dropSvg(state === 'done' ? 'done' : 'run')}</span>` : '';
  return `<span class="sc-who ${state === 'working' ? 'working' : ''}" ${live ? `data-live="${login}"` : ''} style="width:${size}px;height:${size}px;--fam:${bandsCss(famOf(login), 120)}" title="${login}">${body}${st}</span>`;
}

/* ---------- the room's pixel things (mac/src/cowork/pixels.ts, 14 by 14 cells) ---------- */
const GLYPHS = {
  doc: [[3,1,6,1,'#6fa8ff'],[9,1,1,1,'#b7d3ff'],[3,2,6,1,'#6fa8ff'],[9,2,2,1,'#b7d3ff'],[3,3,6,1,'#6fa8ff'],[9,3,3,1,'#b7d3ff'],[3,4,9,1,'#6fa8ff'],[3,5,1,1,'#6fa8ff'],[4,5,7,1,'#f4f1ec'],[11,5,1,1,'#6fa8ff'],[3,6,9,1,'#6fa8ff'],[3,7,1,1,'#6fa8ff'],[4,7,7,1,'#f4f1ec'],[11,7,1,1,'#6fa8ff'],[3,8,9,1,'#6fa8ff'],[3,9,1,1,'#6fa8ff'],[4,9,5,1,'#f4f1ec'],[9,9,3,1,'#6fa8ff'],[3,10,9,1,'#6fa8ff'],[3,11,9,1,'#6fa8ff'],[12,11,1,1,'#3d6fc4'],[4,12,9,1,'#3d6fc4']],
  figma: [[4,1,3,1,'#ff2e4e'],[7,1,3,1,'#fb7129'],[3,2,4,1,'#ff2e4e'],[7,2,4,1,'#fb7129'],[3,3,4,1,'#ff2e4e'],[7,3,4,1,'#fb7129'],[4,4,3,1,'#ff2e4e'],[7,4,3,1,'#fb7129'],[4,5,3,1,'#fd69b9'],[7,5,3,1,'#6fa8ff'],[3,6,4,1,'#fd69b9'],[7,6,4,1,'#6fa8ff'],[3,7,4,1,'#fd69b9'],[7,7,4,1,'#6fa8ff'],[4,8,3,1,'#fd69b9'],[7,8,3,1,'#6fa8ff'],[4,9,3,1,'#70df45'],[3,10,4,1,'#70df45'],[3,11,4,1,'#70df45'],[4,12,3,1,'#70df45']],
  web: [[1,2,12,1,'#9a9a97'],[1,3,1,1,'#9a9a97'],[2,3,1,1,'#fd302d'],[3,3,1,1,'#9a9a97'],[4,3,1,1,'#f4c82a'],[5,3,1,1,'#9a9a97'],[6,3,1,1,'#70df45'],[7,3,6,1,'#9a9a97'],[13,3,1,1,'#5a5a58'],[1,4,12,1,'#9a9a97'],[13,4,1,1,'#5a5a58'],[1,5,1,1,'#9a9a97'],[2,5,10,1,'#0e0e0e'],[12,5,1,1,'#9a9a97'],[13,5,1,1,'#5a5a58'],[1,6,1,1,'#9a9a97'],[2,6,1,1,'#0e0e0e'],[3,6,4,1,'#f89b2a'],[7,6,5,1,'#0e0e0e'],[12,6,1,1,'#9a9a97'],[13,6,1,1,'#5a5a58'],[1,7,1,1,'#9a9a97'],[2,7,10,1,'#0e0e0e'],[12,7,1,1,'#9a9a97'],[13,7,1,1,'#5a5a58'],[1,8,1,1,'#9a9a97'],[2,8,1,1,'#0e0e0e'],[3,8,7,1,'#ebebe8'],[10,8,2,1,'#0e0e0e'],[12,8,1,1,'#9a9a97'],[13,8,1,1,'#5a5a58'],[1,9,1,1,'#9a9a97'],[2,9,1,1,'#0e0e0e'],[3,9,5,1,'#ebebe8'],[8,9,4,1,'#0e0e0e'],[12,9,1,1,'#9a9a97'],[13,9,1,1,'#5a5a58'],[1,10,1,1,'#9a9a97'],[2,10,10,1,'#0e0e0e'],[12,10,1,1,'#9a9a97'],[13,10,1,1,'#5a5a58'],[1,11,12,1,'#9a9a97'],[13,11,1,1,'#5a5a58'],[2,12,12,1,'#5a5a58']],
  folder: [[1,2,5,1,'#f6ec8c'],[1,3,6,1,'#f4c82a'],[1,4,12,1,'#f6ec8c'],[1,5,12,6,'#f4c82a'],[13,5,1,7,'#ba7420'],[1,11,12,1,'#ba7420'],[2,12,12,1,'#ba7420']],
  add: [[6,3,2,1,'#5a5a58'],[6,4,2,1,'#5a5a58'],[6,5,2,1,'#5a5a58'],[3,6,8,1,'#5a5a58'],[3,7,8,1,'#5a5a58'],[6,8,2,1,'#5a5a58'],[6,9,2,1,'#5a5a58'],[6,10,2,1,'#5a5a58']],
  flag: [[3,0,1,1,'#f4c82a'],[3,1,1,12,'#cfcac0'],[2,13,3,1,'#5a5a58'],[4,2,6,1,'#fb9ed5'],[10,2,1,1,'#ff4888'],[4,3,2,1,'#fb9ed5'],[6,3,5,1,'#ff4888'],[11,3,1,1,'#ff2e4e'],[4,4,1,1,'#ff4888'],[5,4,5,1,'#ff2e4e'],[10,4,3,1,'#fd302d'],[4,5,1,1,'#ff2e4e'],[5,5,4,1,'#fd302d'],[9,5,4,1,'#fb7129'],[4,6,1,1,'#fd302d'],[5,6,4,1,'#fb7129'],[9,6,3,1,'#f89b2a'],[4,7,1,1,'#fb7129'],[5,7,4,1,'#f89b2a'],[9,7,2,1,'#f4c82a'],[4,8,1,1,'#f89b2a'],[5,8,3,1,'#f4c82a'],[8,8,2,1,'#e8ef54'],[4,9,1,1,'#f4c82a'],[5,9,2,1,'#e8ef54']],
  calendar: [[2,1,10,3,'#ff2e4e'],[4,0,1,2,'#cfcac0'],[9,0,1,2,'#cfcac0'],[2,4,10,8,'#f4f1ec'],[12,2,1,10,'#5a5a58'],[3,12,10,1,'#5a5a58'],[3,5,1,1,'#9a9a97'],[5,5,1,1,'#9a9a97'],[7,5,1,1,'#9a9a97'],[9,5,1,1,'#9a9a97'],[3,7,1,1,'#9a9a97'],[5,7,1,1,'#9a9a97'],[9,7,1,1,'#9a9a97'],[3,9,1,1,'#9a9a97'],[5,9,1,1,'#9a9a97'],[7,9,1,1,'#9a9a97'],[9,9,1,1,'#9a9a97'],[7,7,2,2,'#f89b2a']],
  decisions: [[3,1,8,12,'#f4f1ec'],[11,2,1,11,'#5a5a58'],[4,13,8,1,'#5a5a58'],[4,3,5,1,'#9a9a97'],[4,5,6,1,'#9a9a97'],[4,7,3,1,'#9a9a97'],[8,8,6,5,'#70df45'],[13,9,1,4,'#54a734'],[9,13,5,1,'#54a734'],[9,10,1,1,'#0e0e0e'],[10,11,1,1,'#0e0e0e'],[11,10,1,1,'#0e0e0e'],[12,9,1,1,'#0e0e0e']],
  poll: [[1,12,12,1,'#5a5a58'],[2,7,3,5,'#fd69b9'],[2,7,3,1,'#fb9ed5'],[6,3,3,9,'#f4c82a'],[6,3,3,1,'#f6ec8c'],[10,9,3,3,'#6fa8ff'],[10,9,3,1,'#b7d3ff'],[5,8,1,4,'#ba7420'],[9,4,1,8,'#ba7420'],[13,10,1,2,'#3d6fc4']],
};
const glyph = (k, size = 52) => `<svg class="sc-glyph" width="${size}" height="${size}" viewBox="0 0 14 14" aria-hidden="true">${GLYPHS[k].map(([x, y, w, h, f]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`).join('')}</svg>`;

/* ---------- the room's data: made-up people, made-up work ---------- */
const TILES = [
  { id: 'cal', g: 'calendar', nm: 'the calendar', wh: 'next · tomorrow 10:00 · beta walkthrough', tag: 1, wide: 1 },
  { id: 'dec', g: 'decisions', nm: 'decisions', wh: '2 decided · last by frank\'s agent 1d ago', tag: 1 },
  { id: 'poll', g: 'poll', nm: 'polls', wh: 'no open poll · ask the room', tag: 1 },
  { id: 'research', g: 'folder', nm: 'research', wh: 'isaac · in it now', now: 1, in: 'isaac' },
  { id: 'prd', g: 'doc', nm: 'Cowork studio · PRD', wh: 'marco · 4m ago' },
  { id: 'beta', g: 'web', nm: 'sol-beta page', wh: 'frank\'s agent · changing it now', now: 1, in: 'frank' },
  { id: 'mock', g: 'figma', nm: 'studio mockups', wh: 'frank · 1d ago', wide: 1 },
  { id: 'add', g: 'add', nm: '+ add a thing', wh: 'a doc, a sheet, a site, a folder', add: 1 },
];
const COLS = [['wait', 'waiting'], ['branch', 'on a branch'], ['pr', 'in a PR'], ['main', 'on main'], ['stable', 'stable']];
const CARDS = [
  { n: 46, t: 'Calendar: a week at a glance', col: 'wait', tag: 'product' },
  { n: 45, t: 'Talk: a thread per issue', col: 'wait', tag: 'product' },
  { n: 43, t: 'Hand: give a thing to a teammate', col: 'branch', tag: 'cowork', sig: ['isaac'] },
  { n: 41, t: 'Beta page: wear the mark', col: 'pr', tag: 'product', mark: 'felt', sig: ['frank', 1], live: 'frank' },
  { n: 44, t: 'Polls: a room remembers them', col: 'pr', tag: 'cowork', mark: 'silent', sig: ['isaac', 1] },
  { n: 38, t: 'Decisions: agents read them first', col: 'main', tag: 'base', sig: ['marco', 1] },
  { n: 34, t: 'Rooms: one window, three people', col: 'stable', tag: 'base', sig: ['marco', 1] },
  { n: 31, t: 'See: the board and presence', col: 'stable', tag: 'cowork', sig: ['frank'] },
];
const FEED0 = [
  ['13:58', 'frank', 1, 'started on #41 the beta page wears the mark'],
  ['13:55', 'isaac', 0, 'added research · five interviews'],
  ['13:41', 'isaac', 1, 'opened a draft #44 a room remembers its polls'],
  ['13:20', 'frank', 0, 'took #41'],
  ['12:58', 'marco', 0, 'set the goal: a beta page people want to try'],
];
const TALK0 = [
  ['isaac', '13:50', 'the five interviews are in research now'],
  ['frank', '13:59', 'my agent is on the beta page. it still needs a mark'],
];
const POLL_Q = 'which mark goes on the beta page?';
const POLL_O = ['the creature', 'the wordmark', 'both, stacked'];
const DECISIONS0 = [
  { t: 'polls are one file, one vote a write', by: 'frank', agent: 1, at: '10/26', lines: ['two to five people: a conflict is rare and read again'] },
  { t: 'rooms meet on the cloud by default', by: 'marco', at: '10/25', lines: ['nothing is stored off the machine but the room\'s own files'] },
];
const NEW_DECISION = { t: 'the beta page wears the creature', by: 'marco', at: 'just now', lines: ['3 of 3 in the poll', 'the wordmark stays in the footer'] };
const TYPED = 'which mark goes on the beta page? let\'s ask the room';
const nameOf = (login, agent) => (agent ? `${login}'s agent` : login);

/* ---------- the mount ---------- */
function mount(el, opts = {}) {
  if (!el) throw new Error('SolCowork.mount: no element');
  if (el._solcowork) el._solcowork.destroy();
  el.classList.add('solcowork');
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', opts.label || 'A live demo of Cowork in Sol: three people and their agents in one room');

  let size = WIDE, scale = 1, narrow = false;
  let canvas, R = {};              // the canvas and its parts
  let S;                           // the room's state
  let clock = 0, idx = 0, queue = [], paused = false, lastTouch = 0, visible = true, raf = 0, prev = 0, dead = false;
  const RM = reduced();

  const anim = (t, p) => {
    if (!t || (Array.isArray(t) && !t.length)) return null;
    if (RM) { p = { ...p, duration: 0, delay: 0 }; delete p.ease; }
    return animate(t, p);
  };
  const $ = (s, root = canvas) => root.querySelector(s);
  const $$ = (s, root = canvas) => [...root.querySelectorAll(s)];

  /* ---- build ---- */
  function fresh() {
    return {
      view: 'room', page: null, feed: FEED0.map((f) => [...f]), talk: TALK0.map((t) => [...t]),
      votes: {}, pollOpen: false, pollClosed: false, decisions: DECISIONS0.map((d) => ({ ...d })), minute: 0,
    };
  }
  function build() {
    S = fresh();
    el.innerHTML = '';
    canvas = document.createElement('div');
    canvas.className = `sc-canvas ${narrow ? 'narrow' : ''}`;
    canvas.style.width = `${size.w}px`; canvas.style.height = `${size.h}px`;
    canvas.innerHTML = `
      <div class="sc-win">
        <div class="sc-bar">
          <div class="sc-lights"><i></i><i></i><i></i></div>
          <div class="sc-title">cowork · sol build <span class="sc-vw">the room</span></div>
          <div class="sc-spacer"></div>
          <div class="sc-fy"><img src="${SOL_SRC}" alt="">for you <span class="sc-fyn">1</span></div>
          <span class="sc-me">marco · this Mac</span>
          <span class="sc-teamw">Team</span>
          <nav class="sc-tabs">
            <button class="sc-tab on" data-go="room">the room</button>
            <button class="sc-tab" data-go="board">action board</button>
            <button class="sc-tab" data-go="chat">group chat</button>
          </nav>
          <span class="sc-dots"><i></i><i></i><i></i></span>
        </div>
        <div class="sc-ntabs">
          <button class="sc-tab on" data-go="room">the room</button>
          <button class="sc-tab" data-go="board">action board</button>
        </div>
        <div class="sc-barcard" hidden><i class="sc-neck"></i>
          <div class="sc-gcard"><span class="from">handed you</span><span class="t"><b>#41 Beta page: wear the mark</b><small>${who('frank', 12)}frank</small></span>
            <button class="sc-gbtn" data-act="try">try it</button><button class="sc-gbtn ghost" data-act="notnow">not now</button></div>
        </div>
        <div class="sc-body">
          ${sideHtml()}
          <div class="sc-stage">
            <div class="sc-view sc-room">
              <div class="sc-centre">
                <div class="sc-strip">
                  ${worker('marco', '<span>(you)</span>', 'in Cowork studio · PRD · 4m')}
                  ${worker('frank', '', 'his agent · on sol-beta page', 'working')}
                  ${worker('isaac', '', 'in research · 2m')}
                </div>
                <div class="sc-main">
                  <div class="sc-home">
                    <button class="sc-goal" data-open="goal">${glyph('flag', 40)}<span class="gk">goal</span>
                      <span class="gtx"><span class="gt">a beta page people want to try</span><span class="gs">set by marco · 10/25 · 3 files</span></span><span class="op">open ›</span></button>
                    <div class="sc-gh"><b>what we're making in sol build</b><span>8 things · a ring on a tile means that person is in it</span></div>
                    <div class="sc-gridwrap"><div class="sc-grid">${TILES.map(tileHtml).join('')}</div></div>
                  </div>
                  <div class="sc-page" hidden></div>
                </div>
                <div class="sc-box"><span>tell your agent what you want to start · it opens a session here, the thing beside it</span><span class="k">↵</span></div>
              </div>
              <div class="sc-right">
                <div class="sc-feed"><div class="sc-fh"><b>what happened</b><span>read just now</span></div><ul class="sc-flist">${S.feed.map(feedLi).join('')}</ul></div>
                <div class="sc-talk">
                  <div class="sc-threads"><span class="sc-thread on">general</span><span class="sc-thread ghost">+ issue</span></div>
                  <div class="sc-lines">${S.talk.map(msgHtml).join('')}</div>
                  <form class="sc-tbox"><input type="text" placeholder="say something in general" aria-label="say something in general" autocomplete="off"><button class="sc-send" type="submit">send</button></form>
                </div>
              </div>
            </div>
            <div class="sc-view sc-board" hidden>
              <header class="sc-bhead"><h2>the action board</h2><span class="at">read just now</span><span class="grow"></span>
                <button class="sc-pillb">leads</button><button class="sc-pillb solid">stamp stable</button><button class="sc-pillb plain">one stable back</button></header>
              <div class="sc-cols">${COLS.map(([k, label]) => `<section class="sc-col" data-col="${k}"><h3>${label}<small></small></h3><div class="slot">${CARDS.filter((c) => c.col === k).map(cardHtml).join('')}</div></section>`).join('')}</div>
              <h4 class="sc-sub">hands</h4>
              <ul class="sc-hands"><li class="none">nobody has handed anything yet · a card's ⋯ hands it to a teammate</li></ul>
            </div>
          </div>
        </div>
      </div>
      <svg class="sc-cursor" viewBox="0 0 20 24" aria-hidden="true"><path d="M2 1.5v18.2l4.6-4.4 3 6.8 3.1-1.4-3-6.6 6.4-.2z" fill="#fff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
    el.appendChild(canvas);
    R = { cursor: $('.sc-cursor'), foot: $('.sc-sidefoot') };
    R.cur = { x: size.w * 0.62, y: size.h * 0.7 };
    countCols();
    wire();
    fit();
  }
  function sideHtml() {
    return `<aside class="sc-side">
      <div class="sc-crea">${budWrap('dawn', 22)}<img src="${SOL_SRC}" alt="">${budWrap('isaac', 22, 'stone')}</div>
      <div class="sc-seg"><span>home</span><span class="on">cowork</span></div>
      <div class="sc-newc"><i>+</i>new room</div>
      <div class="sc-newc"><i>+</i>join a room</div>
      <div class="sc-group">rooms<small>2</small></div>
      <div class="sc-row on"><span class="t">sol build</span><span class="w">share</span></div>
      <div class="sc-row"><span class="t">book club</span></div>
      <div class="sc-group">the team<small>3</small></div>
      <div class="sc-row person">${who('marco', 14, { live: true })}<span class="t">marco <span>(you)</span></span><span class="w" data-w="marco">here</span></div>
      <div class="sc-row person">${who('frank', 14, { live: true, state: 'working' })}<span class="t">frank</span><span class="w lit" data-w="frank">agent on #41</span></div>
      <div class="sc-row person">${who('isaac', 14, { live: true })}<span class="t">isaac</span><span class="w" data-w="isaac">here</span></div>
      <div class="sc-group">together</div>
      <button class="sc-row on" data-go="room"><span class="t">the room</span><kbd>⌘B</kbd></button>
      <button class="sc-row" data-go="board"><span class="t">action board</span></button>
      <button class="sc-row" data-go="chat"><span class="t">group chat</span></button>
      <div class="sc-sidefoot"><i></i><span>live · the room plays itself</span></div>
    </aside>`;
  }
  const budWrap = (login, s) => `<span class="sc-who" style="width:${s}px;height:${s}px">${budSvg(login)}</span>`;
  function worker(login, extra, line, state = '') {
    return `<button class="sc-worker" data-person="${login}">${who(login, 30, { live: true, state })}<span class="tx"><span class="n">${login} ${extra}</span><span class="l ${state ? 'lit' : ''}" data-l="${login}">${line}</span></span></button>`;
  }
  function tileHtml(t) {
    return `<div class="sc-tile ${t.add ? 'add' : ''} ${t.in ? 'in' : ''} ${t.wide ? 'wide-only' : ''}" data-tile="${t.id}" style="--fam:${t.in ? bandsCss(famOf(t.in), 120) : 'transparent'}">
      ${t.tag ? '<span class="sc-tag">sol</span>' : ''}
      <button class="sc-tile-in" data-open="${t.id}">${glyph(t.g)}<span class="nm">${t.nm}</span><span class="wh ${t.now ? 'now' : ''}">${t.wh}</span></button>
      <span class="sc-hand"><i class="neck"></i>${t.in ? who(t.in, 28, { state: t.in === 'frank' ? 'working' : '' }) : ''}</span></div>`;
  }
  function feedLi(f, i, fresh) {
    const [at, login, agent, text] = f;
    return `<li class="${fresh ? 'fresh' : ''}"><time>${at}</time><span>${who(login, 14)}<b>${nameOf(login, agent)}</b> ${text}</span></li>`;
  }
  function msgHtml([login, at, text]) {
    if (login === 'marco') return `<div class="sc-msg mine"><div class="col"><p>${text}</p><span class="who"><small>${at}</small></span></div></div>`;
    return `<div class="sc-msg">${who(login, 22)}<div class="col"><span class="who">${login}<small>${at}</small></span><p>${text}</p></div></div>`;
  }
  function cardHtml(c) {
    const mark = c.col === 'wait' && !c.sig ? '<span class="sc-nobody"></span>' : who(c.sig ? c.sig[0] : 'marco', 12, { live: !!c.live, state: c.live ? 'working' : '' });
    return `<button class="sc-card" data-card="${c.n}">
      <span class="l1">${mark}<span class="num">#${c.n}</span><span class="ct">${c.t}</span>${c.mark ? `<span class="sc-mark ${c.mark}">${c.mark}</span>` : ''}<span class="more">⋯</span></span>
      <span class="l2"><span class="sc-ctag">${c.tag}</span>${c.sig ? `<span class="sc-sig">${who(c.sig[0], 12)}${nameOf(c.sig[0], c.sig[1])}</span>` : ''}</span></button>`;
  }
  function countCols() { $$('.sc-col').forEach((col) => { $('h3 small', col).textContent = $$('.sc-card', col).length; }); }

  /* ---- fit: the canvas scaled to the element's width ---- */
  function fit() {
    const w = el.clientWidth || size.w;
    const wantNarrow = w < NARROW_BELOW;
    if (wantNarrow !== narrow) { narrow = wantNarrow; size = narrow ? NARROW : WIDE; restart(true); return; }
    scale = w / size.w;
    canvas.style.transform = `scale(${scale})`;
    el.style.height = `${Math.round(size.h * scale)}px`;
  }

  /* ---- wiring: what a visitor can do ---- */
  function wire() {
    canvas.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]'), open = e.target.closest('[data-open]'), card = e.target.closest('[data-card]');
      const opt = e.target.closest('[data-vote]'), act = e.target.closest('[data-act]'), back = e.target.closest('[data-back]');
      if (!e.target.closest('.sc-menu') && !card) closeMenu();
      if (go) setView(go.dataset.go);
      else if (open) openPage(open.dataset.open);
      else if (back) openPage(null);
      else if (card) toggleMenu(+card.dataset.card);
      else if (opt) vote('marco', +opt.dataset.vote);
      else if (act) {
        if (act.dataset.act === 'close') closePoll();
        else if (act.dataset.act === 'try' || act.dataset.act === 'notnow') hideBarCard(act.dataset.act === 'try');
        else closeMenu();
      }
    });
    $('.sc-tbox').addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = $('.sc-tbox input'), v = inp.value.trim();
      if (!v) return;
      inp.value = ''; $('.sc-send').classList.remove('ready');
      say('marco', v);
    });
    $('.sc-tbox input').addEventListener('input', (e) => $('.sc-send').classList.toggle('ready', !!e.target.value.trim()));
  }

  /* ---- the room's moves (the script and the visitor share them) ---- */
  const tick = () => { S.minute += 1 + (S.minute % 2); const m = 59 + S.minute; return `${String(13 + Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  function setView(v) {
    if (v === 'chat') { setView('room'); openPage(null); const box = $('.sc-tbox'); box.classList.remove('sc-flash'); void box.offsetWidth; box.classList.add('sc-flash'); return; }
    if (S.view === v) return;
    S.view = v; closeMenu();
    $$('[data-go]').forEach((b) => b.classList.toggle('on', b.dataset.go === v));
    const show = v === 'room' ? $('.sc-room') : $('.sc-board'), hide = v === 'room' ? $('.sc-board') : $('.sc-room');
    hide.hidden = true; show.hidden = false;
    $('.sc-vw').textContent = v === 'room' ? (S.page ? pageWord(S.page) : 'the room') : 'action board';
    anim(show, { opacity: [0, 1], translateY: [8, 0], duration: 520, ease: 'outExpo' });
    if (v === 'board') anim($$('.sc-col', show), { opacity: [0, 1], translateY: [10, 0], delay: stagger(45), duration: 600, ease: 'outExpo' });
  }
  const pageWord = (p) => ({ dec: 'decisions', poll: 'polls', cal: 'the calendar', goal: 'the goal' }[p] || TILES.find((t) => t.id === p)?.nm || 'the room');
  function openPage(id) {
    if (id === 'add') { const t = $('[data-tile="add"]'); t.classList.remove('sc-flash'); void t.offsetWidth; t.classList.add('sc-flash'); return; }
    if (S.view !== 'room') setView('room');
    S.page = id;
    const home = $('.sc-home'), page = $('.sc-page');
    $('.sc-vw').textContent = id ? pageWord(id) : 'the room';
    if (!id) { page.hidden = true; home.hidden = false; anim(home, { opacity: [0, 1], translateY: [6, 0], duration: 420, ease: 'outExpo' }); return; }
    page.innerHTML = `<button class="sc-back" data-back>‹ the room</button>${pageHtml(id)}`;
    home.hidden = true; page.hidden = false; page.scrollTop = 0;
    anim(page, { opacity: [0, 1], translateY: [10, 0], duration: 480, ease: 'outExpo' });
    if (id === 'poll') paintPoll(true);
  }
  function head(g, title, sub) { return `<div class="sc-th">${glyph(g, 56)}<div><h2>${title}</h2><p>${sub}</p></div></div>`; }
  function pageHtml(id) {
    if (id === 'poll') {
      return `${head('poll', 'polls', 'one question, two to five answers, one vote a person, changed until it closes')}
        ${S.pollOpen ? `<div class="sc-poll ${S.pollClosed ? 'closed' : ''}"><h3>${POLL_Q}</h3><p class="by"></p>
          <div class="sc-opts" role="radiogroup" aria-label="${POLL_Q}">${POLL_O.map((o, i) => `<button class="sc-opt" data-vote="${i}" role="radio"><span class="bar"></span><span class="o">${o}</span><span class="hands"></span><span class="n">0</span></button>`).join('')}</div>
          <button class="sc-closebtn" data-act="close" ${S.pollClosed ? 'hidden' : ''}>close the poll</button></div>`
          : '<p class="sc-pfoot">no open poll · ask the room</p>'}
        <p class="sc-pfoot">kept in the room's record · who voted what is the room's to see · an agent may ask, never vote</p>`;
    }
    if (id === 'dec') {
      return `${head('decisions', 'decisions', 'what this room decided, only ever added to. Every agent reads it with the goal before it works')}
        <div class="sc-plus"><span>+</span>write down a decision</div>
        <ul class="sc-log">${S.decisions.map(decLi).join('')}</ul>`;
    }
    if (id === 'cal') {
      return `${head('calendar', 'the calendar', 'what the room has on, a row an event · every agent sees it')}
        <h4 class="sc-pg-h">tomorrow</h4><ul class="sc-cal"><li><span class="when">10:00</span><span>beta walkthrough</span><span class="by">marco</span></li><li><span class="when">16:30</span><span>interviews, round two</span><span class="by">isaac</span></li></ul>
        <h4 class="sc-pg-h">friday</h4><ul class="sc-cal"><li><span class="when">11:00</span><span>stamp stable</span><span class="by">frank</span></li></ul>`;
    }
    if (id === 'goal') {
      return `${head('flag', 'a beta page people want to try', 'set by marco · 10/25 · every agent in the room reads it before it works')}
        <h4 class="sc-pg-h">its files</h4><div class="sc-thing-prev"><b>research · interviews</b><i style="width:82%"></i><i style="width:64%"></i><b style="display:block;margin-top:14px">Cowork studio · PRD</b><i style="width:74%"></i></div>`;
    }
    const t = TILES.find((x) => x.id === id);
    return `${head(t.g, t.nm, t.wh)}
      <div class="sc-thing-prev"><i style="width:68%"></i><i style="width:92%"></i><i style="width:80%"></i><i style="width:56%"></i><i style="width:88%"></i></div>
      <p class="sc-pfoot">opens inside Sol, beside the room · whoever is in it shows as a ring on its tile</p>`;
  }
  function decLi(d, i) {
    return `<li class="${d.isNew ? 'new' : ''}"><h3>${d.t}</h3><p class="by">${who(d.by, 12)}${nameOf(d.by, d.agent)} · ${d.at}</p><div class="lines">${d.lines.map((l) => `<p>${l}</p>`).join('')}</div></li>`;
  }

  function addFeed(login, agent, text) {
    const f = [tick(), login, agent, text];
    S.feed.unshift(f);
    const ul = $('.sc-flist');
    ul.insertAdjacentHTML('afterbegin', feedLi(f, 0, true));
    const li = ul.firstElementChild;
    $$('li.fresh', ul).forEach((x) => x !== li && x.classList.remove('fresh'));
    while (ul.children.length > 9) ul.lastElementChild.remove();
    const h = li.offsetHeight;
    anim($$('li', ul).slice(1), { translateY: [-h, 0], duration: 620, ease: 'outExpo' });
    anim(li, { opacity: [0, 1], translateX: [-10, 0], duration: 620, ease: 'outExpo' });
    $('.sc-fh span').textContent = 'read just now';
  }
  function say(login, text) {
    const lines = $('.sc-lines');
    const before = $$('.sc-msg', lines).map((m) => [m, m.getBoundingClientRect().top]);
    lines.insertAdjacentHTML('beforeend', msgHtml([login, tick(), text]));
    const m = lines.lastElementChild;
    before.forEach(([x, top]) => { const d = (top - x.getBoundingClientRect().top) / scale; if (d) anim(x, { translateY: [d, 0], duration: 520, ease: 'outExpo' }); });
    anim(m, { opacity: [0, 1], translateY: [12, 0], scale: [0.96, 1], duration: 560, ease: 'outBack(1.4)' });
    while (lines.children.length > 6) lines.firstElementChild.remove();
  }
  function setTile(id, { wh, now, in: inn, state } = {}) {
    const tile = $(`[data-tile="${id}"]`); if (!tile) return;
    if (wh !== undefined) { const w = $('.wh', tile); w.textContent = wh; w.classList.toggle('now', !!now); }
    if (inn !== undefined) {
      tile.classList.toggle('in', !!inn);
      if (inn) {
        tile.style.setProperty('--fam', bandsCss(famOf(inn), 120));
        $('.sc-hand', tile).innerHTML = `<i class="neck"></i>${who(inn, 28, { state })}`;
        anim($('.sc-hand', tile), { scale: [0.3, 1], rotate: [-25, 0], duration: 700, ease: 'outBack(2)' });
      }
    }
    if (state !== undefined && inn === undefined) {
      const h = $('.sc-hand .sc-who', tile); if (h) h.outerHTML = who(h.title, 28, { state });
    }
  }
  function flash(node) { if (!node) return; node.classList.remove('sc-flash'); void node.offsetWidth; node.classList.add('sc-flash'); }
  /* an agent's presence: every live mark of that person turns, rests, or shows the check */
  function presence(login, state, word, line) {
    $$(`[data-live="${login}"]`).forEach((n) => {
      const size = parseFloat(n.style.width);
      n.outerHTML = who(login, size, { live: true, state });
    });
    $$(`[data-live="${login}"]`).forEach((n) => state && anim(n, { scale: [0.7, 1], duration: 600, ease: 'outBack(2)' }));
    if (word !== undefined) { const w = $(`[data-w="${login}"]`); if (w) { w.textContent = word; w.classList.toggle('lit', state === 'working'); } }
    if (line !== undefined) { const l = $(`[data-l="${login}"]`); if (l) { l.textContent = line; l.classList.toggle('lit', state === 'working'); } }
  }

  /* polls */
  function askPoll() {
    S.pollOpen = true;
    setTile('poll', { wh: `1 open · ${POLL_Q}` });
    flash($('[data-tile="poll"]'));
    if (S.page === 'poll') openPage('poll');
  }
  function paintPoll(first) {
    if (S.page !== 'poll' || !S.pollOpen) return;
    const box = $('.sc-poll'); if (!box) return;
    const counts = POLL_O.map((_, i) => Object.values(S.votes).filter((v) => v === i).length);
    const nv = Object.keys(S.votes).length, max = Math.max(...counts);
    box.classList.toggle('closed', S.pollClosed);
    $('.by', box).textContent = `asked by frank's agent · ${nv} of 3 voted${S.pollClosed ? ' · closed by marco' : ''}`;
    $$('.sc-opt', box).forEach((b, i) => {
      b.disabled = S.pollClosed;
      b.classList.toggle('mine', S.votes.marco === i);
      b.classList.toggle('win', S.pollClosed && counts[i] === max && max > 0);
      b.setAttribute('aria-checked', S.votes.marco === i);
      $('.bar', b).style.transform = `scaleX(${nv ? counts[i] / 3 : 0})`;
      $('.n', b).textContent = counts[i];
      const ppl = Object.keys(S.votes).filter((k) => S.votes[k] === i).sort();
      const hands = $('.hands', b), had = hands.dataset.ppl || '';
      if (had !== ppl.join()) {
        hands.innerHTML = ppl.map((p) => who(p, 16)).join('');
        hands.dataset.ppl = ppl.join();
        if (!first) { const added = ppl.find((p) => !had.split(',').includes(p)); const idx2 = ppl.indexOf(added); if (added) anim(hands.children[idx2], { scale: [0, 1], translateY: [-8, 0], duration: 600, ease: 'outBack(2.2)' }); }
      }
    });
    const cb = $('.sc-closebtn', box); if (cb) cb.hidden = S.pollClosed;
  }
  function vote(login, i) {
    if (!S.pollOpen || S.pollClosed) return;
    S.votes[login] = i;
    paintPoll();
    const n = Object.keys(S.votes).length;
    setTile('poll', { wh: `1 open · ${n} of 3 voted` });
  }
  function closePoll() {
    if (S.pollClosed) return;
    S.pollClosed = true; paintPoll();
    const counts = POLL_O.map((_, i) => Object.values(S.votes).filter((v) => v === i).length), w = counts.indexOf(Math.max(...counts));
    setTile('poll', { wh: `closed · ${POLL_O[w]}, ${counts[w]} of 3` });
    addFeed('marco', 0, `closed the poll: <span class="q">${POLL_O[w]}, ${counts[w]} of 3</span>`);
  }
  function decide() {
    if (S.decisions.some((d) => d.t === NEW_DECISION.t)) return;
    const d = { ...NEW_DECISION, isNew: true };
    S.decisions.unshift(d);
    setTile('dec', { wh: '3 decided · last by marco just now' });
    addFeed('marco', 0, `wrote down a decision: <span class="q">${d.t}</span>`);
    if (S.page === 'dec') {
      const ul = $('.sc-log');
      ul.insertAdjacentHTML('afterbegin', decLi(d));
      const li = ul.firstElementChild, h = li.offsetHeight;
      anim($$('li', ul).slice(1), { translateY: [-h, 0], duration: 700, ease: 'outExpo' });
      anim(li, { opacity: [0, 1], translateY: [-14, 0], duration: 700, ease: 'outExpo' });
    }
  }

  /* the board: a card moves across, every card that shifts glides (FLIP) */
  function moveCard(n, col, patch = {}) {
    const card = $(`[data-card="${n}"]`); if (!card) return;
    const cards = $$('.sc-card'), first = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
    const c = CARDS.find((x) => x.n === n);
    Object.assign(c, patch, { col });
    const slot = $(`[data-col="${col}"] .slot`);
    const fresh = document.createElement('div'); fresh.innerHTML = cardHtml(c).trim();
    const nu = fresh.firstElementChild;
    card.replaceWith(nu);
    slot.prepend(nu);
    countCols();
    if (S.view !== 'board' || RM) return;
    first.set(nu, first.get(card));
    for (const el2 of [...cards.filter((x) => x !== card), nu]) {
      const a = first.get(el2), b = el2.getBoundingClientRect();
      if (!a) continue;
      const dx = (a.left - b.left) / scale, dy = (a.top - b.top) / scale;
      if (!dx && !dy) continue;
      if (el2 === nu) {
        nu.classList.add('moving');
        animate(nu, { translateX: [dx, 0], translateY: [dy, 0], scale: [1.04, 1], ease: createSpring({ stiffness: 90, damping: 13 }), onComplete: () => nu.classList.remove('moving') });
      } else animate(el2, { translateX: [dx, 0], translateY: [dy, 0], duration: 600, ease: 'outExpo' });
    }
    anim($$(`[data-col="${col}"] h3 small`), { scale: [1.6, 1], duration: 500, ease: 'outBack(2)' });
  }
  /* a card's ⋯: what to do with it (ActionBoard.tsx itemsFor), with its trail */
  function toggleMenu(n) {
    const open = $('.sc-menu');
    if (open && +open.dataset.n === n) { closeMenu(); return; }
    closeMenu();
    const c = CARDS.find((x) => x.n === n), card = $(`[data-card="${n}"]`);
    $$('.sc-card.here').forEach((x) => x.classList.remove('here'));
    card.classList.add('here');
    const colName = COLS.find(([k]) => k === c.col)[1];
    const trail = c.n === 41
      ? [['14:09', c.col === 'main' ? 'landed on main · frank\'s agent' : 'review asked · frank\'s agent'], ['14:01', 'PR opened, felt'], ['13:20', 'frank took it']]
      : [['13:30', `moved to ${colName}`], ['yesterday', 'opened by ' + (c.sig ? c.sig[0] : 'marco')]];
    const m = document.createElement('div');
    m.className = 'sc-menu'; m.dataset.n = n;
    m.innerHTML = `<div class="head"><b>#${c.n} ${c.t}</b><p><span class="sc-ctag">${c.tag}</span>${colName}${c.sig ? ` · <span class="sc-sig">${who(c.sig[0], 12)}${nameOf(c.sig[0], c.sig[1])}</span>` : ''}</p></div>
      <ul class="trail">${trail.map(([t, w]) => `<li><time>${t}</time>${w}</li>`).join('')}</ul><hr>
      <button class="it" data-act="m">open in Home<small>your own session on it</small></button>
      <button class="it" data-act="m">try it<small>runs on your Mac</small></button>
      <button class="it" data-act="m">ask for a review</button><hr>
      <button class="it" data-act="m">hand to frank</button><button class="it" data-act="m">hand to isaac</button><hr>
      <button class="it" data-act="m"><span>+ an action: one file on a branch</span></button>`;
    canvas.appendChild(m);
    const cr = canvas.getBoundingClientRect(), r = card.getBoundingClientRect();
    let x = (r.left - cr.left) / scale + 10, y = (r.bottom - cr.top) / scale + 6;
    x = Math.min(x, size.w - 300); if (y + 330 > size.h) y = Math.max(50, (r.top - cr.top) / scale - 336);
    m.style.left = `${x}px`; m.style.top = `${y}px`;
    anim(m, { opacity: [0, 1], scale: [0.94, 1], translateY: [-6, 0], duration: 360, ease: 'outExpo' });
  }
  function closeMenu() { $$('.sc-menu').forEach((m) => m.remove()); $$('.sc-card.here').forEach((x) => x.classList.remove('here')); }

  /* the bar card */
  function showBarCard() {
    const bc = $('.sc-barcard'); bc.hidden = false;
    const cr = canvas.getBoundingClientRect(), fy = $('.sc-fy').getBoundingClientRect(), b = bc.getBoundingClientRect();
    const neck = Math.max(14, Math.round((b.right - (fy.left + fy.width / 2)) / scale - 15));
    bc.style.setProperty('--neck', `${neck}px`);
    $('.sc-fyn').textContent = '2';
    anim(bc, { opacity: [0, 1], scaleY: [0.4, 1], scaleX: [0.85, 1], translateY: [-14, 0], ease: RM ? undefined : createSpring({ stiffness: 160, damping: 14 }) });
    void cr;
  }
  function hideBarCard(tried) {
    const bc = $('.sc-barcard'); if (bc.hidden) return;
    $('.sc-fyn').textContent = '1';
    if (tried) addFeed('marco', 0, 'is trying #41 on this Mac');
    const a = anim(bc, { opacity: [1, 0], translateY: [0, -10], scaleY: [1, 0.6], duration: 320, ease: 'inQuad', onComplete: () => { bc.hidden = true; bc.style.opacity = ''; bc.style.transform = ''; } });
    if (!a) bc.hidden = true;
  }

  /* ---- the demo's cursor ---- */
  function center(node) {
    const cr = canvas.getBoundingClientRect(), r = node.getBoundingClientRect();
    return { x: (r.left - cr.left + r.width * 0.5) / scale, y: (r.top - cr.top + r.height * 0.55) / scale };
  }
  function moveTo(sel, ms = 700) {
    const node = typeof sel === 'string' ? $(sel) : sel;
    if (!node || !node.offsetParent) return;
    const p = center(node), c = R.cursor;
    c.style.opacity = '1';
    if (RM) { c.style.transform = `translate(${p.x}px, ${p.y}px)`; R.cur = p; return; }
    animate(c, { translateX: [R.cur.x, p.x], translateY: [R.cur.y, p.y], duration: ms, ease: 'inOutCubic' });
    R.cur = p;
  }
  function press() {
    if (RM) return;
    animate(R.cursor, { scale: [1, 0.82, 1], duration: 260, ease: 'outQuad' });
  }
  function hideCursor() { if (R.cursor) animate(R.cursor, { opacity: 0, duration: 300 }); }

  /* typing into the talk box, a letter at a time on the script's clock */
  function typeIn(text, per = 42) {
    const inp = $('.sc-tbox input');
    $('.sc-tbox').classList.add('typing');
    [...text].forEach((_, i) => later(i * per, () => { inp.value = text.slice(0, i + 1); $('.sc-send').classList.add('ready'); }));
  }
  function sendTyped() {
    const inp = $('.sc-tbox input'), v = inp.value; inp.value = ''; $('.sc-send').classList.remove('ready');
    if (v) say('marco', v);
  }

  /* ---- the script: [at ms, what happens] ---- */
  const SCRIPT = [
    [1200, () => addFeed('frank', 1, 'pushed 3 commits to #41')],
    [2400, () => moveTo('.sc-tbox input', 900)],
    [3400, () => { press(); typeIn(TYPED); }],
    [6000, () => moveTo('.sc-send', 360)],
    [6450, () => { press(); sendTyped(); }],
    [7700, () => { addFeed('frank', 1, `asked the room: <span class="q">${POLL_Q}</span>`); askPoll(); }],
    [8700, () => moveTo('[data-open="poll"]', 800)],
    [9600, () => { press(); openPage('poll'); }],
    [10900, () => vote('frank', 0)],
    [12000, () => vote('isaac', 2)],
    [12900, () => vote('isaac', 0)],
    [13300, () => moveTo('[data-vote="0"]', 700)],
    [14100, () => { press(); vote('marco', 0); }],
    [15200, () => moveTo('[data-act="close"]', 600)],
    [15900, () => { press(); closePoll(); }],
    [17000, () => moveTo('[data-back]', 700)],
    [17800, () => { press(); openPage(null); }],
    [18500, () => moveTo('[data-open="dec"]', 700)],
    [19300, () => { press(); openPage('dec'); }],
    [20300, () => decide()],
    [22400, () => moveTo('[data-back]', 700)],
    [23100, () => { press(); openPage(null); }],
    [23800, () => {
      setTile('beta', { wh: 'frank\'s agent · done 1m ago', now: 0, in: '' });
      presence('frank', 'done', '#41 ready', 'his agent · #41 is on main');
      addFeed('frank', 1, '#41 Beta page: wear the mark <span class="q">landed on main</span>');
    }],
    [25000, () => moveTo(narrow ? '.sc-ntabs [data-go="board"]' : '.sc-tabs [data-go="board"]', 800)],
    [25900, () => { press(); setView('board'); }],
    [27200, () => moveCard(41, 'main', { mark: '', live: '' })],
    [29000, () => { moveCard(46, 'branch', { sig: ['marco', 1], live: 'marco' }); presence('marco', 'working', 'agent on #46', 'my agent · on #46 the calendar'); }],
    [30300, () => { presence('frank', '', 'here', 'in sol-beta page · 1m'); showBarCard(); }],
    [31600, () => moveTo('[data-card="41"]', 800)],
    [32500, () => { press(); toggleMenu(41); }],
    [35000, () => { closeMenu(); moveTo('.sc-barcard [data-act="notnow"]', 700); }],
    [35900, () => { press(); hideBarCard(false); }],
    [36600, () => moveTo(narrow ? '.sc-ntabs [data-go="room"]' : '.sc-tabs [data-go="room"]', 700)],
    [37300, () => { press(); setView('room'); hideCursor(); }],
  ];
  function later(ms, fn) { queue.push([clock + ms, fn]); }

  /* ---- the clock: runs while visible and not handed to the visitor ---- */
  function frame(now) {
    if (dead) return;
    const dt = Math.min(100, now - (prev || now)); prev = now;
    if (paused) {
      if (performance.now() - lastTouch > IDLE_RESUME && !el.contains(document.activeElement)) restart();
    } else if (visible && !document.hidden) {
      clock += dt;
      while (idx < SCRIPT.length && SCRIPT[idx][0] <= clock) { const f = SCRIPT[idx++][1]; try { f(); } catch (e) { console.warn('[SolCowork]', e); } }
      if (queue.length) { const due = queue.filter((q) => q[0] <= clock); queue = queue.filter((q) => q[0] > clock); due.forEach((q) => q[1]()); }
      if (clock > LOOP_MS) restart();
    }
    raf = requestAnimationFrame(frame);
  }
  function setFoot() {
    const f = $('.sc-sidefoot'); if (!f) return;
    f.classList.toggle('paused', paused);
    $('span', f).textContent = paused ? 'yours now · it plays again when you leave' : 'live · the room plays itself';
  }
  function restart(hard) {
    paused = false; clock = 0; idx = 0; queue = [];
    if (hard || RM || !canvas) { build(); setFoot(); return; }
    const old = canvas;
    animate(old, { opacity: [1, 0], duration: 380, ease: 'inQuad', onComplete: () => { if (dead) return; build(); setFoot(); anim(canvas, { opacity: [0, 1], duration: 520, ease: 'outQuad' }); } });
  }
  function touch(e) {
    if (!e.isTrusted) return;
    lastTouch = performance.now();
    if (e.type === 'pointermove') return;
    if (!paused) { paused = true; queue = []; hideCursor(); setFoot(); }
  }
  ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach((t) => el.addEventListener(t, touch, { passive: true }));
  el.addEventListener('pointermove', (e) => { if (paused) touch(e); }, { passive: true });

  const ro = new ResizeObserver(() => canvas && fit());
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.15 }) : null;
  narrow = (el.clientWidth || WIDE.w) < NARROW_BELOW; size = narrow ? NARROW : WIDE;
  build(); setFoot();
  ro.observe(el); io && io.observe(el);
  raf = requestAnimationFrame(frame);

  const api = {
    pause() { paused = true; lastTouch = Infinity; setFoot(); },
    play() { lastTouch = 0; if (paused) restart(); },
    restart: () => restart(),
    time: () => clock,
    get paused() { return paused; },
    destroy() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); io && io.disconnect(); el.innerHTML = ''; el.classList.remove('solcowork'); el.style.height = ''; delete el._solcowork; },
  };
  el._solcowork = api;
  return api;
}

window.SolCowork = { mount };
export { mount };
