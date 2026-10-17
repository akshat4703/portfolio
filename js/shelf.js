// Display shelf: PS5 discs up top, sneaker collection below, warm backlight.
import * as THREE from 'three';
import { mat, glow, add, RB, toTex, makeCanvas, rng } from './lib.js';
import { drawSpine } from './art.js';

// Sculpted sneaker meshes (js/body/props.js) coloured per region.
// regions: 0 base · 1 toe/eyestay · 2 heel · 3 side stripe · 4 collar · 5 midsole · 6 outsole · 7 laces
let SNK = null;
const snkMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.25, sheenRoughness: 0.6, clearcoat: 0.12, clearcoatRoughness: 0.5 });
export function initSneakers(props) {
  const base = (p) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(p.normal, 3));
    g.setIndex(new THREE.BufferAttribute(p.index, 1));
    return { g, region: p.region, under: p.under, blend: p.blend };
  };
  SNK = { high: base(props.sneakerHigh), low: base(props.sneakerLow) };
}
const col = new THREE.Color();
export function sneaker(c) {
  const src = c.high ? SNK.high : SNK.low;
  const g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal']) g.setAttribute(k, src.g.getAttribute(k));
  g.setIndex(src.g.getIndex());
  const pal = [c.base, c.toe, c.heel, c.overlay, c.collar, c.sole, c.outsole, c.lace || 0xf2f2f2].map((h) => col.set(h).toArray());
  const colors = new Float32Array(src.region.length * 3);
  for (let i = 0; i < src.region.length; i++) {
    const a = pal[src.region[i]], b = pal[src.under[i]], t = src.blend[i];
    colors[i * 3] = b[0] + (a[0] - b[0]) * t; colors[i * 3 + 1] = b[1] + (a[1] - b[1]) * t; colors[i * 3 + 2] = b[2] + (a[2] - b[2]) * t;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, snkMat); m.castShadow = m.receiveShadow = true;
  const grp = new THREE.Group(); grp.add(m); return grp;
}
export const kicks = [
  { base: 0xf2f2f2, toe: 0xc41225, heel: 0xc41225, overlay: 0xc41225, collar: 0x0b0b0b, sole: 0xf4f4f0, outsole: 0xc41225, high: true },
  { base: 0x0d0d0f, toe: 0x0d0d0f, heel: 0xc41225, overlay: 0xc41225, collar: 0x0d0d0f, sole: 0xf4f4f0, outsole: 0x0d0d0f, high: true },
  { base: 0xf4f4f2, toe: 0x111113, heel: 0x111113, overlay: 0x111113, collar: 0xf4f4f2, sole: 0xf4f4f0, outsole: 0x111113, high: false },
  { base: 0x6b4a2e, toe: 0x3a2618, heel: 0x3a2618, overlay: 0x0e0e0e, collar: 0xd8c9ae, sole: 0xe8dcc4, outsole: 0x3a2618, high: false, lace: 0xd8c9ae },
  { base: 0xf2f2f4, toe: 0x6ea8e8, heel: 0x6ea8e8, overlay: 0x6ea8e8, collar: 0xf2f2f4, sole: 0xf4f4f0, outsole: 0x6ea8e8, high: true },
  { base: 0x111114, toe: 0xc41225, heel: 0x2b3fd6, overlay: 0xc41225, collar: 0x111114, sole: 0xf0f0f0, outsole: 0x2b3fd6, high: true, lace: 0xc41225 },
];

function walnut() {
  const [c, g] = makeCanvas(1024, 1024), R = rng(44);
  g.fillStyle = '#2a1c15'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) {
    const y0 = R() * 1024, amp = 4 + R() * 14, f = 0.004 + R() * 0.01, ph = R() * 6;
    g.strokeStyle = R() < 0.6 ? `rgba(12,7,5,${0.12 + R() * 0.25})` : `rgba(120,80,55,${0.05 + R() * 0.1})`;
    g.lineWidth = 0.6 + R() * 2.2; g.beginPath();
    for (let x = 0; x <= 1024; x += 16) { const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph) * amp * 0.3; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  return toTex(c, { repeat: [1, 2] });
}

export function buildShelf(scene, { props }) {
  initSneakers(props);
  const shelf = new THREE.Group(); shelf.position.set(1.72, 0, -0.42); scene.add(shelf);
  const wood = mat(0xffffff, 0.45, 0.05, { map: walnut() });
  const SW = 0.7, SD = 0.36, SH = 1.95, levels = [0.06, 0.44, 0.82, 1.2, 1.58, 1.93];
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.025, SH, SD), wood, sx * (SW / 2 - 0.0125), SH / 2, 0, shelf);
  add(new THREE.BoxGeometry(SW, SH, 0.012), wood, 0, SH / 2, -SD / 2 + 0.006, shelf);
  const amber = glow(0xff9a4a, 2.4);
  levels.forEach((L, i) => {
    add(new THREE.BoxGeometry(SW - 0.05, 0.025, SD), wood, 0, L - 0.0125, 0, shelf);
    if (i > 0) add(new THREE.BoxGeometry(SW - 0.07, 0.004, 0.006), amber, 0, L - 0.028, SD / 2 - 0.02, shelf, false);
    if (i < 5) add(new THREE.BoxGeometry(SW - 0.07, 0.006, 0.006), amber, 0, L + 0.004, -SD / 2 + 0.02, shelf, false);
  });
  for (const y of [0.3, 1.0, 1.7]) { const L = new THREE.PointLight(0xff9a4a, 0.55, 0.9, 2); L.position.set(1.72, y, -0.3); scene.add(L); }

  const games = [['SPIDER-MAN 2', '#b3131f'], ['GOD OF WAR', '#1d2b3a'], ['GRAN TURISMO 7', '#101014'], ['ELDEN RING', '#2b2618'], ['GHOST OF TSUSHIMA', '#5a0f14'], ['THE LAST OF US', '#1f2a1c'], ['RATCHET & CLANK', '#2b1a5a'], ['EA FC 26', '#0c1a2e'], ['RETURNAL', '#2a0b18'], ['ASTRO BOT', '#e8e8ee', '#111'], ['DEATH STRANDING 2', '#101418'], ['BLACK MYTH', '#3a2a14'], ['SPIDER-MAN: MILES', '#141418'], ['HORIZON', '#6a2a14'], ['STELLAR BLADE', '#2a2a36'], ["DEMON'S SOULS", '#1a1a1a'], ['NBA 2K26', '#1a2a6a'], ['CYBERPUNK 2077', '#d8d020', '#111']];
  const side = mat(0x1a4fb5, 0.3, 0.1), backM = mat(0x0f2f70, 0.4);
  const spines = games.map(([t, c, txt]) => mat(0xffffff, 0.4, 0, { map: toTex(drawSpine(t, c, txt)) }));
  const geo = new THREE.BoxGeometry(0.014, 0.17, 0.135);
  const row = (level, n, off) => { let x = -SW / 2 + 0.05; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, [side, side, side, side, spines[(i + off) % spines.length], backM]); m.position.set(x, level + 0.085, 0.05); m.castShadow = m.receiveShadow = true; shelf.add(m); x += 0.0155; } return x; };
  const xEnd = row(levels[4], 18, 0);
  const lean = new THREE.Mesh(geo, [side, side, side, side, spines[3], backM]); lean.position.set(xEnd + 0.05, levels[4] + 0.083, 0.05); lean.rotation.z = -0.32; shelf.add(lean);
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(geo, [side, side, side, side, backM, backM]); m.rotation.z = Math.PI / 2; m.rotation.y = i % 2 ? 0.05 : -0.04; m.position.set(0.23, levels[4] + 0.007 + i * 0.0145, 0.05); shelf.add(m); }
  row(levels[3], 12, 7);
  {
    const f = new THREE.Group(); f.position.set(0.2, levels[3], 0.04); shelf.add(f);
    add(new THREE.CylinderGeometry(0.035, 0.04, 0.012, 24), mat(0x0a0a0c), 0, 0.006, 0, f);
    add(new THREE.CapsuleGeometry(0.022, 0.05, 6, 12), mat(0x0d0d10, 0.5), 0, 0.055, 0, f);
    add(new THREE.SphereGeometry(0.034, 24, 16), mat(0x101014, 0.35), 0, 0.12, 0, f);
    for (const sx of [-1, 1]) { const e = add(new THREE.SphereGeometry(0.009, 12, 8), glow(0xffffff, 1.3), sx * 0.013, 0.123, 0.03, f, false); e.scale.set(1, 1.3, 0.4); }
    add(new THREE.BoxGeometry(0.03, 0.03, 0.002), glow(0xff2d3f, 1.6), 0, 0.06, 0.024, f, false);
  }
  [[levels[2], 0, 1], [levels[1], 2, 3], [levels[0], 4, 5]].forEach(([L, a, b]) => {
    const s1 = sneaker(kicks[a]); s1.position.set(-0.165, L, 0.03); s1.rotation.y = 0.12; shelf.add(s1);
    const s2 = sneaker(kicks[b]); s2.position.set(0.165, L, 0.03); s2.rotation.y = -0.12; s2.scale.x = -1; shelf.add(s2);
  });
  add(RB(0.34, 0.12, 0.22, 0.004), mat(0xe8641c, 0.7), -0.12, levels[5] + 0.06, 0.02, shelf);
  add(RB(0.35, 0.02, 0.225, 0.004), mat(0xd9581a, 0.7), -0.12, levels[5] + 0.12, 0.02, shelf);
  add(RB(0.32, 0.11, 0.2, 0.004), mat(0x0e0e10, 0.5), -0.1, levels[5] + 0.185, 0.02, shelf);
  add(new THREE.BoxGeometry(0.321, 0.012, 0.201), mat(0xc41225, 0.6), -0.1, levels[5] + 0.2, 0.02, shelf);
}
