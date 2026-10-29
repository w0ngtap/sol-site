// The sun is still rising: where Sol is going, as one scroll story (replaces road.js).
// Marco, 2026-10-27: three pillars, Customizable, Personalizable, Convenient. Today is "a first look into the convenience
// and customization factor"; next "we will heavily start to lean towards personalization ... in a way that doesn't cost
// them extra money". Under all three, the core foundation: "making everything generative on the fly".
//
// The picture: a living field of light (the foundation) that builds small pieces of UI in an instant; three columns of
// light rise from it, one per pillar; the sun comes up behind the middle one, the one still forming. Driven by how far
// the section has scrolled (p, 0..1) plus a clock for the ambient motion.
//
//   import './pillars.js'  →  window.SolPillars.mount(sectionEl)   (or: import { mount } from './pillars.js')
//   <section class="solpillars"></section>   mount fills it; it returns { destroy }.
import * as THREE from './vendor/three.module.min.js';
import { animate, stagger } from './vendor/anime.esm.min.js';

const BEATS = [
  { h:'Built for you, live.', p:'Under all three, one idea: Sol makes its own parts on the fly. Change something and you see it in an instant, without ever leaving.' },
  { h:'Customizable.', chip:'Today, a first look', p:'It is your space, not a set of fixed options. Presets are only there to speed up what everyone needs.' },
  { h:'Convenient.', chip:'Today, a first look', p:'Easy to use, with the small things that make every day smoother.' },
  { h:'Personalizable.', chip:'Next', next:true, p:'This is where we lean in next: Sol that fits you, made for everyone, at no extra cost.' },
  { h:'This is a first look.', p:'Customizable and convenient are here today. Personalizable is what we are building next.' },
];
const AT = [0, .18, .38, .58, .8];                   // where each beat starts
// the three pillars, left to right in space: [name, status, hover line, colour, x, height, lit window]
const PILLARS = [
  { name:'Customizable', status:'Today, a first look', line:'Your space, shaped your way.', col:[.992,.412,.725], x:-3.3, h:4.4, from:.15, to:.25 },
  { name:'Personalizable', status:'Next', line:'Made to fit you. For everyone, at no extra cost.', col:[.984,.443,.161], x:0, h:5.4, from:.52, to:.65, next:true },
  { name:'Convenient', status:'Today, a first look', line:'Easy to use, smoother every day.', col:[.957,.784,.165], x:3.3, h:4.4, from:.35, to:.45 },
];
const PZ = -4.2, SUNZ = -58, GROUND_FAR = -56;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const span = (p, a, b) => ease(clamp((p - a) / (b - a)));

/* ---------- shaders ---------- */
const SKY_V = `void main(){ gl_Position = vec4(position.xy, 1., 1.); }`;
const SKY_F = `
uniform vec2 uRes; uniform vec2 uSun; uniform float uHz, uWarm, uRise; uniform vec3 uHzc;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes, n = uv * 2. - 1.; float asp = uRes.x / uRes.y;
  float above = max(n.y - uHz, 0.);
  vec3 col = vec3(.012);
  col += vec3(.045,.02,.03) * uWarm * smoothstep(1.2, -.2, n.y);           // the whole sky warms a little
  col += uHzc * exp(-above * 2.6) * (.35 + .65 * uWarm);                  // a band along the horizon
  vec2 d = (n - uSun) * vec2(asp, 1.); float sd = length(d);
  col += vec3(.98,.44,.16) * exp(-sd * 2.4) * .30 * (.3 + uWarm);
  col += vec3(.99,.41,.72) * exp(-sd * .85) * .07 * uWarm;
  col += (h(gl_FragCoord.xy) - .5) / 255.;                                  // invisible; only stops banding
  gl_FragColor = vec4(col, 1.);
}`;
const GROUND_V = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const GROUND_F = `
uniform float uWarm, uFar; uniform vec3 uHzc; varying vec3 vW;
void main(){
  vec3 col = vec3(.018,.016,.018);
  float streak = exp(-abs(vW.x) * .32) * smoothstep(4., uFar, vW.z);
  col += vec3(.98,.44,.16) * streak * .16 * uWarm;
  col = mix(col, uHzc * (.35 + .65 * uWarm) + vec3(.012), smoothstep(uFar * .45, uFar, vW.z));
  gl_FragColor = vec4(col, 1.);
}`;
const SUN_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const SUN_F = `
uniform float uTime, uWarm; varying vec2 vUv;
void main(){
  vec2 q = (vUv - .5) * 4.; float d = length(q);
  float aa = fwidth(d) * 1.5, disc = 1. - smoothstep(1. - aa, 1., d);
  vec3 top = vec3(.957,.784,.165), mid = vec3(.984,.443,.161), bot = vec3(.992,.412,.725);
  float y = clamp(q.y * .5 + .5, 0., 1.);
  vec3 c = y > .5 ? mix(mid, top, (y - .5) * 2.) : mix(bot, mid, y * 2.);
  c = mix(c, vec3(1.,.93,.8), .22 * smoothstep(.95, 0., d));
  float o = max(d - 1., 0.);
  vec3 halo = mix(bot, mid, .55) * (exp(-o * 2.6) * .34 + exp(-o * 9.) * .3) * (1. - disc) * smoothstep(1.95, 1.3, d);
  gl_FragColor = vec4((c * disc + halo) * (.85 + .15 * uWarm), 1.);
}`;
// the foundation: a field of points that is always quietly alive, rippling out from each pillar that stands on it
const GRID_V = `
uniform float uTime, uPx, uLive, uWarm; uniform vec3 uLit, uPX; uniform float uPZ; uniform vec3 uMask;
attribute float aSeed; varying float vA; varying vec3 vC;
const vec3 PC0 = vec3(.992,.412,.725), PC1 = vec3(.984,.443,.161), PC2 = vec3(.957,.784,.165);
void main(){
  vec3 p = position; float t = uTime;
  float f = sin(p.x * .33 + t * .45) * sin(p.z * .29 - t * .38) + .6 * sin((p.x + p.z) * .17 + t * .27);
  p.y += f * .05 * uLive;
  float tw = .5 + .5 * sin(t * 1.1 + aSeed * 6.283);
  float a = .2 + .22 * smoothstep(.3, 1.3, f) * uLive + .08 * tw;
  vec3 col = vec3(.937,.918,.886);
  for (int i = 0; i < 3; i++) {
    float L = uLit[i]; if (L <= 0.) continue;
    float d = distance(p.xz, vec2(uPX[i], uPZ));
    float ring = exp(-pow((d - mod(t * 1.3 + float(i) * 2.3, 8.)) * 2.2, 2.)) * exp(-d * .22);
    float k = L * (ring * .8 + exp(-d * 1.1) * 1.1);
    a += k;
    vec3 pc = i == 0 ? PC0 : i == 1 ? PC1 : PC2;
    col = mix(col, pc, clamp(k * 1.2, 0., .85));
  }
  float sx = exp(-abs(p.x) * .45) * smoothstep(-6., -40., p.z) * uWarm;
  a += sx * .22; col = mix(col, vec3(.98,.55,.25), clamp(sx, 0., .7));
  vec4 mv = modelViewMatrix * vec4(p, 1.); float dist = -mv.z;
  a *= smoothstep(58., 14., dist) * smoothstep(1., 4., dist);
  gl_Position = projectionMatrix * mv;
  float nx = gl_Position.x / gl_Position.w;
  a *= mix(1., smoothstep(uMask.x, uMask.y, nx), uMask.z);               // calm under the words
  gl_PointSize = clamp(uPx * 19. / dist, 1., 8. * uPx);
  vA = a; vC = col;
}`;
const DOT_F = `varying float vA; varying vec3 vC;
void main(){ float d = length(gl_PointCoord - .5); float m = smoothstep(.5, .12, d); if (m * vA < .002) discard; gl_FragColor = vec4(vC * m * vA, 1.); }`;
// pieces of UI built by the foundation in an instant: a button, a card, a sidebar, one after another
const UI_V = `
uniform float uTime, uForm, uShape, uPx; uniform vec3 uAt;
attribute vec3 aGround, aA, aB, aC; attribute float aSeed; varying float vA; varying vec3 vC;
vec3 pick(float i){ return i < .5 ? aA : i < 1.5 ? aB : aC; }
void main(){
  float i = floor(uShape), n = mod(i + 1., 3.), f = smoothstep(.82, 1., fract(uShape));
  float fs = clamp(f * 1.6 - aSeed * .6, 0., 1.); fs = fs * fs * (3. - 2. * fs);
  vec3 tgt = mix(pick(mod(i, 3.)), pick(n), fs);
  tgt.z += sin(fs * 3.1416) * (aSeed - .5) * .9;
  vec3 world = uAt + tgt + vec3(0., sin(uTime * 1.3 + aSeed * 9.) * .012, 0.);
  float k = clamp(uForm * 1.7 - aSeed * .7, 0., 1.); k = 1. - pow(1. - k, 3.);
  vec3 p = mix(aGround, world, k);
  p.x += sin(k * 3.1416) * (aSeed - .5) * 1.4;
  p.y += sin(k * 3.1416) * .5;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uPx * 20. / -mv.z, 1., 6. * uPx);
  vA = (.15 + .85 * k) * uForm * (.75 + .25 * sin(uTime * 2. + aSeed * 30.));
  vC = mix(vec3(.96,.94,.91), mix(vec3(.992,.412,.725), vec3(.957,.784,.165), aSeed), .22 + .25 * fs);
}`;
// the columns of light: a soft core, bright at the foot; the one still forming is made of drifting bands
const PIL_V = `varying vec3 vN, vV; varying vec2 vUv;
void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const PIL_F = `
uniform float uTime, uLit, uForming, uHover; uniform vec3 uCol; varying vec3 vN, vV; varying vec2 vUv;
float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); i.x = mod(i.x, 9.);
  return mix(mix(hh(i), hh(vec2(mod(i.x + 1., 9.), i.y)), f.x), mix(hh(i + vec2(0., 1.)), hh(vec2(mod(i.x + 1., 9.), i.y + 1.)), f.x), f.y); }
void main(){
  float face = abs(dot(normalize(vN), normalize(vV)));
  float core = pow(face, 3.5), rim = pow(1. - face, 3.) * .35;
  float y = vUv.y;
  float vert = smoothstep(1., .55, y) * (.55 + .45 * smoothstep(.5, 0., y)) + smoothstep(.06, 0., y) * .8;
  vec3 col = mix(uCol, vec3(1.,.97,.92), core * .75);
  float a = (core * .95 + rim) * vert;
  if (uForming > .5) {
    vec2 g = vec2(vUv.x * 9., y * 7. - uTime * .45);
    float nz = vn(g) * .65 + vn(g * 2.3 + 4.1) * .35;
    float pat = smoothstep(.42, .72, nz);
    float breathe = .8 + .2 * sin(uTime * 1.4);
    a *= mix(.16, .9, pat) * breathe * smoothstep(1., .3, y);
  }
  a *= uLit * (1. + uHover * .45);
  gl_FragColor = vec4(col * a, 1.);
}`;
// light rising inside each column; for the one still forming, it swirls wide and gathers
const RISE_V = `
uniform float uTime, uPx; uniform vec3 uLit, uPX, uH, uLift; uniform float uPZ;
attribute float aPillar, aSeed, aAng; varying float vA; varying vec3 vC;
const vec3 PC0 = vec3(.992,.412,.725), PC1 = vec3(.984,.443,.161), PC2 = vec3(.957,.784,.165);
void main(){
  int i = int(aPillar + .5);
  float L = uLit[i], H = uH[i];
  float forming = i == 1 ? 1. : 0.;
  float sp = .08 + aSeed * .12;
  float u = fract(aSeed * 7.31 + uTime * sp);
  float r = mix(.16, .55, fract(aSeed * 3.7)) * (1. + forming * (1.6 - 1.3 * u)) ;
  float ang = aAng + uTime * (.3 + forming * .5) * (aSeed > .5 ? 1. : -1.);
  vec3 p = vec3(uPX[i] + cos(ang) * r, u * H + uLift[i], uPZ + sin(ang) * r);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uPx * 22. / -mv.z, 1., 5. * uPx);
  vA = L * smoothstep(1., .55, u) * smoothstep(0., .08, u) * (forming > .5 ? .55 : .7);
  vC = mix(i == 0 ? PC0 : i == 1 ? PC1 : PC2, vec3(1.), .45);
}`;
const GLOW_F = `uniform vec3 uCol; uniform float uA; varying vec2 vUv;
void main(){ float d = length(vUv - .5) * 2.; float g = exp(-d * d * 5.) * smoothstep(1., .6, d); gl_FragColor = vec4(uCol * g * uA, 1.); }`;

/* ---------- shapes the foundation builds: [button, card, sidebar] as outlines of points ---------- */
function shape(kind, N) {
  const prims = [];
  const rrect = (cx, cy, w, h, r) => prims.push({ t:'rr', cx, cy, w, h, r, len:2 * (w + h) - 8 * r + 2 * Math.PI * r });
  const line = (x0, y0, x1, y1) => prims.push({ t:'ln', x0, y0, x1, y1, len:Math.hypot(x1 - x0, y1 - y0) });
  const circ = (cx, cy, r) => prims.push({ t:'c', cx, cy, r, len:2 * Math.PI * r });
  if (kind === 0) {                       // a button: pill, a label, a chevron
    rrect(0, 0, 2.1, .62, .31); line(-.62, 0, .35, 0); line(.52, .1, .64, 0); line(.64, 0, .52, -.1);
  } else if (kind === 1) {                // a card: frame, an image block, two lines, a small button
    rrect(0, 0, 1.9, 1.35, .14); rrect(0, .28, 1.6, .55, .08); line(-.8, -.18, .5, -.18); line(-.8, -.36, .05, -.36); rrect(.55, -.48, .5, .2, .1);
  } else {                                // a sidebar strip: a tall rail with four round spots
    rrect(0, 0, .62, 1.7, .2); [.55, .2, -.15, -.5].forEach(y => circ(0, y, .14));
  }
  const total = prims.reduce((s, p) => s + p.len, 0), out = new Float32Array(N * 3);
  for (let n = 0; n < N; n++) {
    let u = ((n + .5) / N) * total, P = prims[0];
    for (const pr of prims) { if (u <= pr.len) { P = pr; break; } u -= pr.len; }
    let x, y; const t = u / P.len;
    if (P.t === 'ln') { x = lerp(P.x0, P.x1, t); y = lerp(P.y0, P.y1, t); }
    else if (P.t === 'c') { x = P.cx + Math.cos(t * 6.283) * P.r; y = P.cy + Math.sin(t * 6.283) * P.r; }
    else { [x, y] = rrPoint(P, u); }
    out[n * 3] = x + (Math.random() - .5) * .012; out[n * 3 + 1] = y + (Math.random() - .5) * .012; out[n * 3 + 2] = (Math.random() - .5) * .03;
  }
  return out;
}
function rrPoint({ cx, cy, w, h, r }, u) {        // walk the outline of a rounded rectangle
  const sw = w - 2 * r, sh = h - 2 * r, q = Math.PI * r / 2;
  const segs = [[sw, (t) => [cx - sw / 2 + t * sw, cy + h / 2]], [q, (t) => arc(cx + sw / 2, cy + sh / 2, Math.PI / 2 - t * Math.PI / 2)],
    [sh, (t) => [cx + w / 2, cy + sh / 2 - t * sh]], [q, (t) => arc(cx + sw / 2, cy - sh / 2, -t * Math.PI / 2)],
    [sw, (t) => [cx + sw / 2 - t * sw, cy - h / 2]], [q, (t) => arc(cx - sw / 2, cy - sh / 2, -Math.PI / 2 - t * Math.PI / 2)],
    [sh, (t) => [cx - w / 2, cy - sh / 2 + t * sh]], [q, (t) => arc(cx - sw / 2, cy + sh / 2, Math.PI - t * Math.PI / 2)]];
  function arc(ax, ay, a) { return [ax + Math.cos(a) * r, ay + Math.sin(a) * r]; }
  for (const [len, f] of segs) { if (u <= len) return f(len ? u / len : 0); u -= len; }
  return segs[0][1](0);
}

/* ---------- mount ---------- */
export function mount(section) {
  if (!section || section.__solpillars) return section && section.__solpillars;
  section.classList.add('solpillars');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) section.classList.add('sp-static');

  section.innerHTML = `
    <div class="sp-stage">
      <div class="sp-fallback"></div>
      <div class="sp-scrim"></div>
      <h2 class="sp-head"><span>The sun is</span> <span>still rising.</span></h2>
      <div class="sp-story"><div class="sp-rail"><b></b></div>
        ${BEATS.map(b => `<div class="sp-beat"><h3><span>${b.h}</span>${b.chip ? `<em class="sp-chip${b.next ? ' next' : ''}">${b.chip}</em>` : ''}</h3><p>${b.p}</p></div>`).join('')}
      </div>
      <div class="sp-tags">
        ${PILLARS.map(P => `<div class="sp-tag${P.next ? ' next' : ''}"><div><b>${P.name}</b><small>${P.status}</small><i>${P.line}</i></div></div>`).join('')}
        <div class="sp-tag sp-ground"><div><span><img src="${new URL('./media/sol.svg', import.meta.url).href}" alt="">generative, on the fly</span></div></div>
      </div>
    </div>`;
  const $ = s => section.querySelector(s), $$ = s => [...section.querySelectorAll(s)];
  const stage = $('.sp-stage'), beats = $$('.sp-beat'), railFill = $('.sp-rail b'), tags = $$('.sp-tag'), ground = $('.sp-ground');

  /* renderer */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false, powerPreference:'high-performance' });
  } catch (e) { section.classList.add('sp-nogl'); setBeat(still ? -1 : 0); return { destroy() {} }; }
  const dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x030303, 1);
  stage.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene(), root = new THREE.Group(); scene.add(root);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 200);
  const U = { uTime:{ value:0 }, uWarm:{ value:0 }, uPx:{ value:dpr } };

  // sky (screen space, behind everything)
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader:SKY_V, fragmentShader:SKY_F, depthTest:false, depthWrite:false,
    uniforms:{ uRes:{ value:new THREE.Vector2(1, 1) }, uSun:{ value:new THREE.Vector2() }, uHz:{ value:0 }, uWarm:U.uWarm, uRise:{ value:0 }, uHzc:{ value:new THREE.Color() } } }));
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
  const hzc = sky.material.uniforms.uHzc.value;

  // ground (opaque: it hides the sun below the horizon)
  const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(160, -GROUND_FAR + 10), new THREE.ShaderMaterial({
    vertexShader:GROUND_V, fragmentShader:GROUND_F, uniforms:{ uWarm:U.uWarm, uFar:{ value:GROUND_FAR }, uHzc:{ value:hzc } } }));
  groundMesh.rotation.x = -Math.PI / 2; groundMesh.position.set(0, -.002, (GROUND_FAR + 10) / 2); groundMesh.renderOrder = -5;   // z from GROUND_FAR to +10
  root.add(groundMesh);

  // sun
  const sunMat = new THREE.ShaderMaterial({ vertexShader:SUN_V, fragmentShader:SUN_F, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{ uTime:U.uTime, uWarm:U.uWarm } });
  const SUNR = 7.2, sun = new THREE.Mesh(new THREE.PlaneGeometry(SUNR * 4, SUNR * 4), sunMat);
  sun.position.set(0, -SUNR, SUNZ); sun.renderOrder = 1; root.add(sun);

  // the foundation grid
  const phone = () => stage.clientWidth < 900;
  const step = phone() ? .42 : .3, gp = [], gs = [];
  for (let z = 7; z > GROUND_FAR; z -= step * (1 + Math.max(0, -z) * .012))
    for (let x = -24; x <= 24; x += step) { gp.push(x + (Math.random() - .5) * step * .3, 0, z); gs.push(Math.random()); }
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); gGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(gs, 1));
  const litV = new THREE.Vector3(), pxV = new THREE.Vector3(...PILLARS.map(P => P.x)), hV = new THREE.Vector3(), liftV = new THREE.Vector3();
  const gridMat = new THREE.ShaderMaterial({ vertexShader:GRID_V, fragmentShader:DOT_F, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{ uTime:U.uTime, uPx:U.uPx, uWarm:U.uWarm, uLive:{ value:0 }, uLit:{ value:litV }, uPX:{ value:pxV }, uPZ:{ value:PZ }, uMask:{ value:new THREE.Vector3() } } });
  const grid = new THREE.Points(gGeo, gridMat); grid.frustumCulled = false; root.add(grid);

  // the pieces of UI it builds
  const NU = phone() ? 900 : 1400, uiGeo = new THREE.BufferGeometry(), gr = new Float32Array(NU * 3), us = new Float32Array(NU);
  for (let i = 0; i < NU; i++) { gr[i * 3] = (Math.random() - .5) * 9; gr[i * 3 + 1] = 0; gr[i * 3 + 2] = -1 - Math.random() * 7; us[i] = Math.random(); }
  uiGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NU * 3), 3));
  uiGeo.setAttribute('aGround', new THREE.BufferAttribute(gr, 3)); uiGeo.setAttribute('aSeed', new THREE.BufferAttribute(us, 1));
  ['aA', 'aB', 'aC'].forEach((k, i) => uiGeo.setAttribute(k, new THREE.BufferAttribute(shape(i, NU), 3)));
  const uiMat = new THREE.ShaderMaterial({ vertexShader:UI_V, fragmentShader:DOT_F, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{ uTime:U.uTime, uPx:U.uPx, uForm:{ value:0 }, uShape:{ value:0 }, uAt:{ value:new THREE.Vector3(0, 1.75, -1.2) } } });
  const ui = new THREE.Points(uiGeo, uiMat); ui.frustumCulled = false; root.add(ui);

  // the pillars
  const pillarGeo = new THREE.CylinderGeometry(.34, .34, 1, 48, 1, true); pillarGeo.translate(0, .5, 0);
  const glowGeo = new THREE.PlaneGeometry(1, 1);
  const pillars = PILLARS.map((P, i) => {
    const col = new THREE.Vector3(...P.col);
    const m = new THREE.Mesh(pillarGeo, new THREE.ShaderMaterial({ vertexShader:PIL_V, fragmentShader:PIL_F, transparent:true, depthWrite:false,
      blending:THREE.AdditiveBlending, side:THREE.DoubleSide,
      uniforms:{ uTime:U.uTime, uLit:{ value:0 }, uForming:{ value:P.next ? 1 : 0 }, uHover:{ value:0 }, uCol:{ value:col } } }));
    m.position.set(P.x, 0, PZ); m.scale.y = .001; m.renderOrder = 2; root.add(m);
    const glowMat = () => new THREE.ShaderMaterial({ vertexShader:SUN_V, fragmentShader:GLOW_F, transparent:true, depthWrite:false,
      blending:THREE.AdditiveBlending, uniforms:{ uCol:{ value:col }, uA:{ value:0 } } });
    const foot = new THREE.Mesh(glowGeo, glowMat()); foot.rotation.x = -Math.PI / 2; foot.position.set(P.x, .01, PZ); foot.scale.setScalar(3.2); foot.renderOrder = 3; root.add(foot);
    const cap = new THREE.Mesh(glowGeo, glowMat()); cap.position.set(P.x, P.h, PZ); cap.scale.setScalar(1.1); cap.renderOrder = 3; root.add(cap);
    return { P, m, foot, cap, x:P.x, lit:0, hover:0, lift:0 };
  });
  const NR = 220 * 3, rGeo = new THREE.BufferGeometry(), ra = new Float32Array(NR), rs = new Float32Array(NR), rg = new Float32Array(NR);
  for (let i = 0; i < NR; i++) { ra[i] = i % 3; rs[i] = Math.random(); rg[i] = Math.random() * 6.283; }
  rGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NR * 3), 3));
  rGeo.setAttribute('aPillar', new THREE.BufferAttribute(ra, 1)); rGeo.setAttribute('aSeed', new THREE.BufferAttribute(rs, 1)); rGeo.setAttribute('aAng', new THREE.BufferAttribute(rg, 1));
  const riseMat = new THREE.ShaderMaterial({ vertexShader:RISE_V, fragmentShader:DOT_F, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{ uTime:U.uTime, uPx:U.uPx, uLit:{ value:litV }, uPX:{ value:pxV }, uH:{ value:hV }, uLift:{ value:liftV }, uPZ:{ value:PZ } } });
  const rise = new THREE.Points(rGeo, riseMat); rise.frustumCulled = false; rise.renderOrder = 4; root.add(rise);

  /* layout: the scene sits right of the words on a desk, under them on a phone */
  let W = 1, H = 1, isPhone = false;
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight; isPhone = W < 900;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.fov = isPhone ? 50 : 36;
    if (isPhone) camera.setViewOffset(W, H, 0, -H * .15, W, H); else camera.setViewOffset(W, H, -W * .17, -H * .04, W, H);
    camera.updateProjectionMatrix();
    sky.material.uniforms.uRes.value.set(W * dpr, H * dpr);
    const spread = isPhone ? .6 : 1;
    uiMat.uniforms.uAt.value.set(0, isPhone ? 2.1 : 1.75, isPhone ? 3 : -1.2);
    pillars.forEach((pl, i) => { pl.x = pl.P.x * spread; pl.m.position.x = pl.foot.position.x = pl.cap.position.x = pl.x; pxV.setComponent(i, pl.x); });
    gridMat.uniforms.uMask.value.set(isPhone ? -2 : -.62, isPhone ? -1 : -.05, isPhone ? 0 : .85);
    kick();
  }
  const ro = new ResizeObserver(layout); ro.observe(stage);

  /* pointer: the scene leans toward the cursor; hovering a pillar lifts it and shows its line */
  const mouse = { x:0, y:0, tx:0, ty:0, px:-1e4, py:-1e4 };
  let hovered = -1, pinned = -1;
  const onMove = e => { const r = stage.getBoundingClientRect(); mouse.px = e.clientX - r.left; mouse.py = e.clientY - r.top;
    mouse.tx = (mouse.px / r.width) * 2 - 1; mouse.ty = (mouse.py / r.height) * 2 - 1; kick(); };
  const onLeave = () => { mouse.px = mouse.py = -1e4; mouse.tx = mouse.ty = 0; kick(); };
  const onTap = () => { pinned = hovered >= 0 && pinned !== hovered ? hovered : -1; kick(); };
  stage.addEventListener('pointermove', onMove); stage.addEventListener('pointerleave', onLeave); stage.addEventListener('click', onTap);

  const v3 = new THREE.Vector3(), toScreen = (x, y, z) => { v3.set(x, y, z).applyMatrix4(root.matrixWorld).project(camera); return [(v3.x * .5 + .5) * W, (-v3.y * .5 + .5) * H, v3.z]; };
  function pickPillar() {
    let best = -1;
    pillars.forEach((pl, i) => {
      if (pl.lit < .5) return;
      const [bx, by] = toScreen(pl.x, 0, PZ), [, ty] = toScreen(pl.x, pl.m.scale.y + pl.lift, PZ);
      const half = Math.max(28, Math.abs(toScreen(pl.x + .7, 0, PZ)[0] - bx));
      if (Math.abs(mouse.px - bx) < half && mouse.py > ty - 40 && mouse.py < by + 10) best = i;
    });
    return best;
  }

  /* the beats */
  let beat = -2;
  function setBeat(n) {
    if (n === beat) return; beat = n;
    beats.forEach((b, i) => { b.classList.toggle('on', i === n || n === -1); b.classList.toggle('past', i < n); });
    if (still || n < 0) return;
    const b = beats[n];
    animate(b.querySelectorAll('h3 > *'), { opacity:[0, 1], translateY:[14, 0], duration:900, delay:stagger(80), ease:'outExpo' });
    animate(b.querySelector('p'), { opacity:[0, 1], translateY:[10, 0], duration:900, delay:160, ease:'outExpo' });
  }
  const tagsOn = new Set();
  function showTag(i, on) {
    if (tagsOn.has(i) === on) return; on ? tagsOn.add(i) : tagsOn.delete(i);
    tags[i].classList.toggle('on', on);
    if (on && !still) animate(tags[i].firstElementChild, { translateY:[12, 0], scale:[.92, 1], duration:800, ease:'outElastic(1, .7)' });
  }

  /* one frame for a given p and clock */
  let ps = still ? 1 : 0, last = performance.now(), clock = 0;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!still) clock += dt;
    const r = section.getBoundingClientRect();
    const target = still ? 1 : clamp(-r.top / Math.max(1, r.height - innerHeight));
    ps = still ? 1 : ps + (target - ps) * Math.min(1, dt * 7);
    const p = ps;
    U.uTime.value = clock;
    U.uWarm.value = .15 + .85 * ease(clamp(p / .95));

    // the sun climbs, but never all the way: it is still rising
    const rise = ease(clamp(p / .97));
    sun.position.y = lerp(-SUNR * .82, SUNR * .55, rise);
    hzc.setRGB(lerp(.10, .30, U.uWarm.value), lerp(.04, .12, U.uWarm.value), lerp(.05, .07, U.uWarm.value));

    // camera: a slow pull back as the scene fills, and a gentle lean toward the cursor
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 3); mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 3);
    const back = ease(clamp((p - .12) / .8));
    camera.position.set(0, lerp(1.4, 1.75, back) + (isPhone ? .5 : 0), lerp(9, 11, back) + (isPhone ? 4 : 0));
    camera.lookAt(0, lerp(1.6, 2.3, back) + (isPhone ? .3 : 0), -12);
    root.rotation.y = mouse.x * .07; root.rotation.x = mouse.y * .025;
    root.updateMatrixWorld();

    // the foundation and what it builds
    gridMat.uniforms.uLive.value = .35 + .65 * span(p, .0, .08);
    const enter = clamp((innerHeight - r.top) / innerHeight);
    const form = ease(clamp((enter - .35) / .55)) * (1 - span(p, .14, .2));
    uiMat.uniforms.uForm.value = still ? 0 : form;
    uiMat.uniforms.uShape.value = clock * .55;
    ui.visible = form > .001;
    ground.classList.toggle('lit', p < .2);

    // the pillars rise at their beats; hover lifts
    hovered = isPhone ? pinned : (mouse.px > -1e3 ? pickPillar() : -1);
    section.classList.toggle('sp-hovering', hovered >= 0);
    pillars.forEach((pl, i) => {
      const P = pl.P, k = span(p, P.from, P.to);
      pl.lit = P.next ? k * .9 : k;
      const want = hovered === i ? 1 : 0;
      pl.hover = still ? want : pl.hover + (want - pl.hover) * Math.min(1, dt * 8);
      pl.lift = pl.hover * .35;
      const h = Math.max(.001, P.h * k * (P.next ? .82 : 1) * (P.next ? 1 + .03 * Math.sin(clock * .9) : 1));
      pl.m.scale.y = h; pl.m.position.y = pl.lift;
      pl.m.material.uniforms.uLit.value = pl.lit; pl.m.material.uniforms.uHover.value = pl.hover;
      pl.foot.material.uniforms.uA.value = pl.lit * (P.next ? .35 : .55) * (1 + pl.hover * .4);
      pl.cap.material.uniforms.uA.value = pl.lit * (P.next ? .06 + .03 * Math.sin(clock * 1.4) : .1) * (1 + pl.hover * 1.2);
      pl.cap.position.y = h + pl.lift; pl.cap.quaternion.copy(camera.quaternion);
      litV.setComponent(i, pl.lit); hV.setComponent(i, h); liftV.setComponent(i, pl.lift);
      // label above the column
      const [sx, sy] = toScreen(pl.x, h + pl.lift + .25 + (isPhone && P.next ? 1.5 : 0), PZ);
      tags[i].style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
      showTag(i, pl.lit > .6);
      tags[i].classList.toggle('hover', hovered === i);
    });
    const [gx, gy] = toScreen(0, 0, isPhone ? 1.2 : -1.5);
    ground.style.transform = `translate(${gx.toFixed(1)}px,${Math.min(gy, H - 60).toFixed(1)}px)`;
    showTag(3, p > .015 || still);

    // the sky follows the sun
    const [sunX, sunY] = toScreen(0, sun.position.y, SUNZ), [, hzY] = toScreen(0, 0, GROUND_FAR);
    sky.material.uniforms.uSun.value.set(sunX / W * 2 - 1, 1 - sunY / H * 2);
    sky.material.uniforms.uHz.value = 1 - hzY / H * 2;

    // words
    setBeat(still ? -1 : AT.reduce((n, a, i) => p >= a - .001 ? i : n, 0));
    if (isPhone) { railFill.style.width = p * 100 + '%'; railFill.style.height = ''; } else { railFill.style.height = p * 100 + '%'; railFill.style.width = ''; }

    renderer.render(scene, camera);
  }

  /* run only while on screen (and always one frame on demand in the still version) */
  let visible = false, raf = 0, pending = false;
  const loop = now => { raf = 0; if (!visible || document.hidden) return; frame(now); if (!still) raf = requestAnimationFrame(loop); };
  function kick() { if (still) { if (!pending) { pending = true; requestAnimationFrame(now => { pending = false; frame(now); }); } return; }
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin:'100px' });
  io.observe(section);
  const onVis = () => kick();
  document.addEventListener('visibilitychange', onVis);
  const onScroll = () => still && kick();
  addEventListener('scroll', onScroll, { passive:true });
  layout();

  const api = {
    destroy() {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); removeEventListener('scroll', onScroll);
      stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave); stage.removeEventListener('click', onTap);
      scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); renderer.dispose(); delete section.__solpillars;
    },
  };
  section.__solpillars = api;
  return api;
}

window.SolPillars = { mount };
