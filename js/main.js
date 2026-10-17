import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { smooth, pchip, noAO, rng, setAniso } from './lib.js';
import { buildRoom } from './room.js';
import { buildDesk, MON } from './desk.js';
import { buildShelf } from './shelf.js';
import { buildCharacter, startBody } from './character.js';
import { buildShowcase, CUT } from './showcase.js';

const bodyP = startBody(); // sculpt hands + props in workers while everything else loads
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

try {
  await Promise.race([
    Promise.all(['700 40px "Geist"', '600 26px "Geist"', 'italic 800 40px "Geist"', '400 20px "JetBrains Mono"', '500 20px "JetBrains Mono"', '400 80px "Tilt Neon"'].map((f) => document.fonts.load(f))),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
} catch { /* fonts are progressive enhancement */ }

const MOBILE = matchMedia('(max-width: 820px)').matches;
const LOW = matchMedia('(max-width: 820px)').matches || (navigator.hardwareConcurrency || 8) <= 4;

/* ------------------------------------------------------------------ renderer */
const renderer = new THREE.WebGLRenderer({ canvas: $('#scene'), antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.5 : 2));
setAniso(renderer.capabilities.getMaxAnisotropy());
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.12;
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030305);
scene.fog = new THREE.FogExp2(0x030305, 0.014);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.01, 30);

const body = await bodyP;
console.info(`[body] sculpted in ${Math.round(body.ms)} ms`);
const room = buildRoom(scene, { low: LOW });
const desk = buildDesk(scene, { low: LOW, props: body.props });
buildShelf(scene, { props: body.props });
const guy = buildCharacter(scene, body);

// dust
const DUST = 380, dGeo = new THREE.BufferGeometry(), dPos = new Float32Array(DUST * 3), dR = rng(3);
for (let i = 0; i < DUST; i++) { dPos[i * 3] = -2.3 + dR() * 4.7; dPos[i * 3 + 1] = dR() * 2.4; dPos[i * 3 + 2] = -0.6 + dR() * 4; }
dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
const dotC = document.createElement('canvas'); dotC.width = dotC.height = 32;
{ const g = dotC.getContext('2d'), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, '#fff'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); }
scene.add(new THREE.Points(dGeo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dotC), color: 0xb0a0ff, size: 0.01, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })));

// Image-based light captured from the room itself → coloured bounce + reflections.
{
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(scene, 0.02, 0.05, 20, { size: 256, position: new THREE.Vector3(0.3, 1.3, 1.4) });
  scene.environment = env.texture; scene.environmentIntensity = 0.75; pm.dispose();
}

/* ------------------------------------------------------------------ post */
// MSAA only when not already supersampling via high pixel density
const msaaFor = (d) => (LOW || d >= 1.75 ? 0 : 4);
const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: msaaFor(renderer.getPixelRatio()) });
const composer = new EffectComposer(renderer, rt);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
let gtao = null;
if (!LOW) {
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.updateGtaoMaterial({ radius: 0.28, distanceExponent: 1.4, thickness: 1, scale: 1.0, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 8, rings: 3, samples: 16 });
  // AO at ~1.25× CSS resolution: clean (no half-res blockiness) without paying for full 2× density
  const setSize = gtao.setSize.bind(gtao); gtao.setSize = (w, h) => { const k = Math.min(1, 1.25 / renderer.getPixelRatio()); setSize(Math.round(w * k), Math.round(h * k)); };
  gtao.blendIntensity = 0.85;
  const r = gtao.render.bind(gtao);
  gtao.render = (...a) => { noAO.forEach((o) => (o.visible = false)); r(...a); noAO.forEach((o) => (o.visible = true)); };
  composer.addPass(gtao);
}
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.35, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const smaa = new SMAAPass(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio());
composer.addPass(smaa);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uTexel: { value: new THREE.Vector2(1 / innerWidth, 1 / innerHeight) }, uSharp: { value: 0.2 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uTexel; uniform float uSharp; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      // contrast-adaptive sharpen (cross kernel)
      vec3 n = texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb, s = texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb;
      vec3 e = texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb, w = texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb;
      vec3 mn = min(c, min(min(n, s), min(e, w))), mx = max(c, max(max(n, s), max(e, w)));
      float amp = clamp(min(min(mn.g, 1.0 - mx.g) / max(mx.g, 1e-4), 1.0), 0.0, 1.0);
      float wgt = -sqrt(amp) * uSharp * 0.2;
      c = clamp((c + (n + s + e + w) * wgt) / (1.0 + 4.0 * wgt), 0.0, 1.0);
      // gentle filmic contrast + vignette (no grain: clean render)
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.18);
      vec2 d = vUv - 0.5; c *= mix(1.0, smoothstep(0.95, 0.25, length(d)), 0.45);
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(grade);

/* ------------------------------------------------------------------ inside the PC: chapter showcase */
const show = buildShowcase(renderer);

/* ------------------------------------------------------------------ the monitor as a portal */
// Close to the screen, the wallpaper crossfades into a live render of the inside of the PC (same camera the
// showcase starts from), so the dive lands exactly in what the screen was already showing.
const portalRT = new THREE.WebGLRenderTarget(1024, 576, { type: THREE.HalfFloatType, samples: LOW ? 0 : 4 });
const portalU = { tDesk: { value: desk.centerScreen.material.map }, tPortal: { value: portalRT.texture }, uMix: { value: 0 }, uTime: { value: 0 } };
desk.centerScreen.material = new THREE.ShaderMaterial({
  uniforms: portalU, toneMapped: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDesk, tPortal; uniform float uMix, uTime; varying vec2 vUv;
    float h(float n){ return fract(sin(n * 91.7) * 437.5); }
    void main(){
      // hyperspace entry: the wallpaper is sucked into the centre (growing radial blur), electric speed streaks
      // shoot outward, and the wire tunnel resolves through it with an RGB split that settles as we reach the glass
      float m = uMix; vec2 C = vec2(0.5), q = vUv - C;
      vec3 d = vec3(0.0); float z = m * 0.6;
      for (int i = 0; i < 14; i++) d += texture2D(tDesk, C + q * (1.0 - z * float(i) / 13.0)).rgb;
      d /= 14.0;
      float k = smoothstep(0.15, 0.92, m), sp = 0.018 * (1.0 - k) * step(0.001, m);
      vec2 up = C + q * mix(0.82, 1.0, k);                                                   // tunnel eases out to full frame
      vec3 p = vec3(texture2D(tPortal, up + q * sp).r, texture2D(tPortal, up).g, texture2D(tPortal, up - q * sp).b);
      vec2 qa = q * vec2(1.78, 1.0); float r = length(qa), a = atan(qa.y, qa.x);
      float li = floor((a + 3.1416) / 6.2832 * 120.0);
      float st = step(0.78, h(li)) * smoothstep(0.05, 0.5, r) * pow(fract(r * 2.2 - uTime * (2.5 + h(li + 7.0) * 3.0) + h(li + 3.0) * 5.0), 7.0);
      float burst = m * (1.0 - k * 0.85);
      vec3 c = mix(d, p, k) + vec3(1.0, 0.16, 0.24) * st * burst * 3.2 + vec3(1.0) * st * burst * smoothstep(0.3, 0.9, r) * 0.8;
      c += vec3(1.0, 0.12, 0.2) * exp(-r * 6.0) * m * (1.0 - k) * 0.9;                        // hot core where everything converges
      gl_FragColor = vec4(c, 1.0);
    }`,
});
const SCREEN_Z = MON.pos.z + 0.0115;

/* ------------------------------------------------------------------ camera choreography */
// progress → keyframe index (monotone, no stops between keys except the ends)
// 0 → P_SWAP: room → the camera dives into the monitor; P_SWAP → 1: the five chapters inside the PC
const P_SWAP = 0.33;
const KEYS_P = [0, 0.02, 0.09, 0.15, 0.2, 0.245, 0.29, 0.325, 1];
const KEYS_I = [0, 0, 1, 2, 3, 4, 5, 6, 6];
const chapterF = (p) => -0.3 + ((p - P_SWAP) / (1 - P_SWAP)) * 4.9; // scroll → chapter position f (slide i holds around f = i + 0.5)
const chapterP = (f) => P_SWAP + ((f + 0.3) / 4.9) * (1 - P_SWAP);
const toIdx = pchip(KEYS_P, KEYS_I);
let path, look, dCover = 1, fovMatch = 38, showFov = 38; // fovMatch: the inside camera's fov that equals what the screen showed
function buildPath() {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), a = camera.aspect;
  dCover = Math.min(MON.h / 2 / t, MON.w / 2 / (t * a));                           // screen exactly covers the view
  fovMatch = THREE.MathUtils.radToDeg(2 * Math.atan(((2 * dCover * t) / MON.h) * Math.tan(THREE.MathUtils.degToRad(showFov / 2))));
  const C = new THREE.Vector3(MON.pos.x, MON.pos.y, SCREEN_Z); // straight into the middle of the screen
  path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.45, 2.08, 3.8),
    new THREE.Vector3(-0.95, 1.72, 2.55),
    new THREE.Vector3(-0.66, 1.56, 1.62),
    new THREE.Vector3(-0.52, 1.44, 0.95),
    new THREE.Vector3(-0.22, 1.27, 0.3),
    new THREE.Vector3(C.x, C.y, C.z + dCover * 1.7),
    new THREE.Vector3(C.x, C.y, C.z + dCover * 0.995),
  ], false, 'centripetal');
  look = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.5, 0.92, -0.1),
    new THREE.Vector3(0.2, 1.13, -0.2),
    new THREE.Vector3(0.06, 1.14, -0.28),
    C.clone(), C.clone(), C.clone(), C.clone(),
  ], false, 'centripetal');
}

/* ------------------------------------------------------------------ DOM */
const hero = $('#hero'), deck = $('#deck');
const slides = $$('.slide'), dots = $$('#deckNav button');

const chapterBtns = $$('#chapters button');
const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
const scrollToProg = (p) => scrollTo({ top: p * maxScroll(), behavior: 'smooth' });
chapterBtns.forEach((b) => b.addEventListener('click', () => scrollToProg(b.dataset.f ? chapterP(+b.dataset.f) : +b.dataset.at)));
dots.forEach((b, i) => b.addEventListener('click', () => scrollToProg(chapterP(i + 0.5))));
addEventListener('keydown', (e) => { if (e.key === 'Escape') scrollToProg(0); });

let target = 0, prog = 0;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const readScroll = () => { const m = maxScroll(); target = m > 0 ? Math.min(1, Math.max(0, scrollY / m)) : 0; };
addEventListener('scroll', readScroll, { passive: true }); readScroll(); prog = target;
window.__dbg = {
  get prog() { return prog; }, composer: null, renderer: null, scene: null,
  jump(p) { scrollTo(0, p * maxScroll()); readScroll(); prog = target; },
  time(n = 10) { const t = performance.now(); for (let i = 0; i < n; i++) composer.render(); renderer.getContext().finish(); return (performance.now() - t) / n; },
};


let mx = 0, my = 0, smx = 0, smy = 0;
addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1; });

function resize() {
  const w = innerWidth, h = innerHeight; if (!w || !h) return;
  camera.aspect = w / h; camera.fov = w / h < 1 ? 58 : 40; camera.updateProjectionMatrix();
  renderer.setSize(w, h); composer.setSize(w, h);
  grade.uniforms.uTexel.value.set(1 / (w * renderer.getPixelRatio()), 1 / (h * renderer.getPixelRatio()));
  gtao?.setSize(w, h); show.resize(w, h); showFov = show.camera.fov; buildPath(); readScroll();
}
addEventListener('resize', resize); resize();

/* ------------------------------------------------------------------ loop */
Object.assign(window.__dbg, { composer, renderer, scene, gtao, bloom });
const clock = new THREE.Clock(), v3 = new THREE.Vector3();
let frame = 0;
// Adaptive resolution: keep ~60fps by trading pixel density.
const MAX_DPR = Math.min(devicePixelRatio, LOW ? 1.5 : 2);
let dpr = MAX_DPR, perfAcc = 0, perfN = 0;
function perf(raw) {
  if (raw > 0.1 || document.hidden) return; // ignore throttled/background frames
  perfAcc += raw; perfN++;
  if (perfN < 90) return;
  const avg = perfAcc / perfN; perfAcc = perfN = 0;
  const next = avg > 0.03 ? Math.max(1, dpr - 0.25) : avg < 0.015 ? Math.min(MAX_DPR, dpr + 0.25) : dpr;
  if (next !== dpr) {
    dpr = next; const s = msaaFor(dpr);
    for (const t of [composer.renderTarget1, composer.renderTarget2]) if (t.samples !== s) { t.samples = s; t.dispose(); }
    renderer.setPixelRatio(dpr); composer.setPixelRatio(dpr); resize();
  }
}
function loop() {
  if (!path) { resize(); if (!path) { requestAnimationFrame(loop); return; } } // viewport was 0x0 at boot (hidden tab, prerender): wait for a real size
  const raw = clock.getDelta(), dt = Math.min(raw, 0.05), t = clock.elapsedTime; frame++;
  perf(raw);
  prog += (target - prog) * (1 - Math.exp(-dt * 3.6)); if (Math.abs(target - prog) < 1e-5) prog = target;

  const idx = toIdx(prog), u = idx / 6;
  const p = path.getPoint(u), q = look.getPoint(u);
  smx += (mx - smx) * 0.04; smy += (my - smy) * 0.04;
  const par = 1 - smooth(0, 3.5, idx);
  camera.position.set(p.x + smx * 0.12 * par, p.y - smy * 0.06 * par, p.z);
  camera.lookAt(q);
  if (camera.aspect > 1.15) camera.rotateY(0.1 * (1 - smooth(0, 1.6, idx)));
  if (window.__cam) { camera.position.fromArray(window.__cam[0]); camera.lookAt(...window.__cam[1]); } // dev: ?cam override

  const inShow = prog >= P_SWAP && !window.__cam;
  renderPass.scene = inShow ? show.scene : scene; renderPass.camera = inShow ? show.camera : camera;
  const pm = inShow ? 0 : smooth(0.215, 0.305, prog); // portal: eased open, finished before the screen covers the view
  if (gtao) gtao.enabled = !inShow && pm < 0.98;
  const f = chapterF(prog);
  if (inShow) {
    // one continuous shot: the inside camera starts with exactly the framing the screen showed, then widens
    show.update(f, t, dt, smx, smy);
    show.camera.fov = THREE.MathUtils.lerp(fovMatch, showFov, smooth(P_SWAP, P_SWAP + 0.05, prog)); show.camera.updateProjectionMatrix();
  }
  else { room.update(t, dt); desk.update(t, dt, frame); guy.update(t); }
  const arr = dGeo.attributes.position.array;
  for (let i = 0; i < DUST; i++) { arr[i * 3 + 1] += dt * 0.015; arr[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.005; if (arr[i * 3 + 1] > 2.4) arr[i * 3 + 1] = 0; }
  dGeo.attributes.position.needsUpdate = true;
  const showBloom = (ff) => 0.75 - 0.5 * show.inWire(ff);                     // less glow inside a wire: keeps the lines sharp
  bloom.strength = inShow ? showBloom(f) : THREE.MathUtils.lerp(0.5 * (1 - smooth(3.6, 5, idx)) + 0.04, showBloom(chapterF(P_SWAP)), pm); // same glow either side of the swap
  grade.uniforms.uTime.value = t % 100;

  // overlays in the room
  const heroA = 1 - smooth(0.005, 0.07, prog);
  hero.style.opacity = heroA; hero.style.transform = `translateY(${(1 - heroA) * -30}px)`;
  // portal: render the inside of the PC onto the monitor while approaching it
  portalU.uMix.value = pm; portalU.uTime.value = t;
  if (pm > 0) {
    show.update(chapterF(P_SWAP), t, dt, smx, smy);
    show.camera.fov = showFov; show.camera.aspect = MON.w / MON.h; show.camera.updateProjectionMatrix();
    renderer.setRenderTarget(portalRT); renderer.render(show.scene, show.camera); renderer.setRenderTarget(null);
    show.camera.aspect = camera.aspect; show.camera.updateProjectionMatrix();
  }

  // chapter panels: text arrives just after its object, leaves just before
  deck.style.visibility = inShow ? 'visible' : 'hidden';
  let cur = -1;
  slides.forEach((el, i) => {
    const u = f - i, a = smooth(-0.14, 0.14, u) * (i === 4 ? 1 : 1 - smooth(0.8, 1.0, u));
    el.style.setProperty('--a', a.toFixed(3));
    const on = inShow && a > 0.6; if (on) cur = i;
    if (on !== el.classList.contains('on')) el.classList.toggle('on', on);
  });
  dots.forEach((b, i) => b.classList.toggle('on', i === cur));

  const ch = !inShow ? (prog < 0.12 ? 0 : 1) : 2 + Math.max(0, cur);
  chapterBtns.forEach((b, i) => b.classList.toggle('on', i === ch));

  composer.render();
  requestAnimationFrame(loop);
}
composer.render();
requestAnimationFrame(() => { $('#loader').classList.add('done'); loop(); });
