// "Inside the PC": the five portfolio chapters as one continuous flight. Through the monitor you land inside a
// graphics card — between its PCB and the heatsink, past the power stages and VRAM to the GPU die — for About,
// Experience and Projects. At Stack the camera dives into a CPU die and keeps flying through the silicon (core
// blocks, cache arrays, stacked metal wiring) to Contact. Nothing pops in: the scene is the world itself, and
// electricity runs through every trace and wire. Scroll drives one continuous value f; main.js renders this
// scene in place of the room. Both ways in are a flight down the inside of a wire: from the screen into the card,
// and from the card into the die (the GPU wire and the die wire are identical inside, so the switch is invisible).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const SLIDES = [
  // [electricity, secondary glow, fog/base] — dark theme, one hot accent per chapter
  { id: 'about', name: 'About', pal: [0xff2d3f, 0xff6a3d, 0x030304] },
  { id: 'work', name: 'Experience', pal: [0xff4a26, 0xffa040, 0x040303] },
  { id: 'projects', name: 'Projects', pal: [0xff2d6f, 0xff2d3f, 0x040304] },
  { id: 'stack', name: 'Stack', pal: [0x6fb6ff, 0xd6ecff, 0x020306] },
  { id: 'contact', name: 'Contact', pal: [0xff2d3f, 0x9fd0ff, 0x030306] },
];
export const CUT = 3; // f where the camera dives from the GPU into the CPU die

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const std = (color, roughness = 0.5, metalness = 0, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness, metalness, ...o });
const mesh = (g, m, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); parent.add(o); return o; };
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 4294967296); }
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S3 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
function inst(parent, geo, mat, list, f) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  list.forEach((it, i) => { Q.identity(); S3.set(1, 1, 1); f(it, V, Q, S3); M4.compose(V, Q, S3); im.setMatrixAt(i, M4); });
  im.count = list.length; parent.add(im); return im;
}

/* ------------------------------------------------------------ electricity: flat wires with distance-along-path */
function electric(U) {
  return new THREE.ShaderMaterial({
    uniforms: U, toneMapped: false,
    vertexShader: `attribute float aDist, aSeed; varying float vD, vS, vZ;
      void main(){ vD = aDist; vS = aSeed; vec4 mv = modelViewMatrix * vec4(position, 1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uCol, uCol2, uFog, uBase; varying float vD, vS, vZ;
      void main(){
        vec3 col = uBase;
        float live = step(0.2, vS);
        float speed = 4.5 + vS * 5.5, gap = 2.6 + fract(vS * 13.7) * 4.0;
        float ph = fract((vD - uTime * speed) / gap + vS * 9.1);
        float head = pow(ph, 20.0), core = pow(ph, 110.0);
        col += live * (mix(uCol2, uCol, smoothstep(0.98, 0.7, ph)) * head * 6.5 + vec3(1.0) * core * 6.0);
        col += live * uCol * (0.1 + 0.08 * sin(uTime * 7.0 + vS * 40.0));
        col = mix(uFog, col, exp(-vZ * 0.05));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}
function wires() {
  const P = [], DIST = [], SEED = [], IDX = [];
  return {
    // flat ribbon along a polyline in the xz-plane at height y
    add(pts, w, seed, y = 0.004) {
      let acc = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); if (L < 1e-4) continue;
        const nx = (-dz / L) * w * 0.5, nz = (dx / L) * w * 0.5, ex = (dx / L) * w * 0.5, ez = (dz / L) * w * 0.5, o = P.length / 3;
        P.push(ax - ex + nx, y, az - ez + nz, ax - ex - nx, y, az - ez - nz, bx + ex + nx, y, bz + ez + nz, bx + ex - nx, y, bz + ez - nz);
        DIST.push(acc, acc, acc + L, acc + L); SEED.push(seed, seed, seed, seed); IDX.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
        acc += L;
      }
    },
    mesh(mat) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aDist', new THREE.Float32BufferAttribute(DIST, 1)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(SEED, 1)); g.setIndex(IDX);
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; return m;
    },
  };
}
const route = ([ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az; if (Math.abs(dx) > Math.abs(dz)) return [[ax, az], [ax + Math.sign(dx) * (Math.abs(dx) - Math.abs(dz)), az], [bx, bz]]; return [[ax, az], [ax, az + Math.sign(dz) * (Math.abs(dz) - Math.abs(dx))], [bx, bz]]; };

/* ------------------------------------------------------------ world A: inside the graphics card */
export const GPU = { X0: -8, X1: 32, Z0: -14, Z1: 6, die: new THREE.Vector3(14, 0, -3.6), cpu: new THREE.Vector3(26.5, 0, -2.2) };
// where the two wires lie on the card (wire 1 arrives from the screen and ends at x = -3.4; wire 2 starts past the die)
GPU.wire1 = { z: 3.4, y: 0.36, end: -3.4 }; GPU.wire2 = { z: 0.0, y: 0.42, start: GPU.die.x + 2.6 };
// nothing on the board may stick up into a wire (or into the flight line just outside its open end)
const inCorridor = (x, z, r = 0) => (Math.abs(z - GPU.wire1.z) < 0.7 + r && x < GPU.wire1.end + 1.2 + r) || (Math.abs(z - GPU.wire2.z) < 0.7 + r && x > GPU.wire2.start - 1.8 - r);
function gpuWorld(wireMat) {
  const { X0, X1, Z0, Z1 } = GPU, W = X1 - X0, D = Z1 - Z0, R = rng(20260), g = new THREE.Group();
  const pcb = canvas(4096, 2048, (c, w, h) => {
    c.fillStyle = '#050607'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) { c.fillStyle = `rgba(255,255,255,${0.008 + R() * 0.012})`; c.fillRect(R() * w, R() * h, 2, 2); }
    c.strokeStyle = 'rgba(120,130,140,0.05)'; c.lineWidth = 1;
    for (let i = 0; i < 60; i++) { const x = R() * w, y = R() * h, ww = 80 + R() * 400, hh = 60 + R() * 300; c.save(); c.beginPath(); c.rect(x, y, ww, hh); c.clip(); for (let k = -hh; k < ww; k += 9) { c.beginPath(); c.moveTo(x + k, y); c.lineTo(x + k + hh, y + hh); c.stroke(); } c.restore(); }
    c.strokeStyle = 'rgba(200,205,210,0.09)'; c.lineWidth = 2; c.fillStyle = 'rgba(200,205,210,0.11)'; c.font = '500 22px "JetBrains Mono", monospace';
    const labels = ['VRM_1', 'C204', 'R118', 'U7', 'GDDR6X', 'PEX_VDD', 'FAN_2', 'NVVDD', 'MEM_PLL', 'AP-4090', 'U12', 'Q31', 'L8', 'VBIOS', 'HDMI_0', 'PWR_EN'];
    for (let i = 0; i < 140; i++) { const x = R() * w, y = R() * h; if (R() > 0.5) c.strokeRect(x, y, 30 + R() * 160, 20 + R() * 90); else c.fillText(labels[(R() * labels.length) | 0], x, y); }
  });
  mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: pcb, roughness: 0.78, metalness: 0.08 }), g, (X0 + X1) / 2, 0, (Z0 + Z1) / 2).rotation.x = -Math.PI / 2;

  const comps = [], free = (x, z, w, d) => !inCorridor(x, z, Math.max(w, d) / 2) && comps.every((o) => Math.abs(o.x - x) > (o.w + w) / 2 + 0.25 || Math.abs(o.z - z) > (o.d + d) / 2 + 0.25);
  const chipM = std(0x0b0b0e, 0.42, 0.1, { clearcoat: 0.3 }), pinM = std(0x9a9aa4, 0.3, 1);
  const tops = ['GDDR6X', 'VRM CTRL', 'PHY 2.5G', '25.000M'].map((txt, v) => canvas(256, 256, (c, w, h) => { c.fillStyle = '#0c0c0f'; c.fillRect(0, 0, w, h); c.fillStyle = '#3b3b44'; c.font = '700 34px "Geist", sans-serif'; c.fillText(['AP', 'NXT', 'R9X', 'CLK'][v], 26, 92); c.font = '500 18px "JetBrains Mono"'; c.fillText(txt, 26, 130); c.fillText('2026 · TW', 26, 158); c.beginPath(); c.arc(36, 210, 9, 0, 7); c.fill(); }));
  const pins = [], caps = [], chokes = [], smd = [], leds = [];
  const edgeM = new THREE.LineBasicMaterial({ color: 0xff6a5a, transparent: true, opacity: 0.28 });
  const outline = (geo, x, y, z) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeM); l.position.set(x, y, z); g.add(l); };
  const chip = (x, z, w, d, top = (R() * 4) | 0) => {
    comps.push({ x, z, w, d, chip: true });
    const cg = new RoundedBoxGeometry(w, 0.09, d, 2, 0.015);
    mesh(cg, [chipM, chipM, new THREE.MeshStandardMaterial({ map: tops[top], roughness: 0.45 }), chipM, chipM, chipM], g, x, 0.045, z);
    outline(new THREE.BoxGeometry(w, 0.09, d), x, 0.045, z);
    const n = Math.max(4, Math.round(w / 0.07)), m = Math.max(4, Math.round(d / 0.07));
    for (let i = 0; i < n; i++) { const px = x - w / 2 + (i + 0.5) * (w / n); pins.push([px, z - d / 2 - 0.03, 0], [px, z + d / 2 + 0.03, 0]); }
    for (let i = 0; i < m; i++) { const pz = z - d / 2 + (i + 0.5) * (d / m); pins.push([x - w / 2 - 0.03, pz, 1], [x + w / 2 + 0.03, pz, 1]); }
  };
  // GPU die: package + glossy silicon, ringed by VRAM
  {
    const { x, z } = GPU.die; comps.push({ x, z, w: 4.4, d: 4.4 });
    mesh(new RoundedBoxGeometry(4.2, 0.12, 4.2, 2, 0.04), std(0x0d1512, 0.55, 0.2), g, x, 0.06, z);
    const dieT = canvas(1024, 1024, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0a0a10'); gr.addColorStop(0.5, '#16161f'); gr.addColorStop(1, '#08080c'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      // compute clusters: 7 × 6 SM blocks around a central L2, each with its own micro-layout
      for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 7; gx++) {
        const bx = 40 + gx * 136, by = 40 + gy * 158; if (gy >= 2 && gy <= 3 && gx >= 2 && gx <= 4) continue;
        c.fillStyle = 'rgba(255,60,80,.05)'; c.fillRect(bx, by, 120, 140);
        c.strokeStyle = 'rgba(255,90,100,.35)'; c.lineWidth = 2; c.strokeRect(bx, by, 120, 140);
        for (let k = 0; k < 26; k++) { c.fillStyle = `rgba(255,120,130,${0.08 + Math.random() * 0.2})`; c.fillRect(bx + 6 + Math.random() * 100, by + 6 + Math.random() * 124, 4 + Math.random() * 30, 2); }
        c.fillStyle = 'rgba(255,170,175,.35)'; c.font = '500 14px "JetBrains Mono"'; c.fillText(`SM ${gy * 7 + gx}`, bx + 8, by + 132);
      }
      c.strokeStyle = 'rgba(255,90,100,.6)'; c.lineWidth = 3; c.strokeRect(312, 356, 400, 300);
      for (let y = 370; y < 640; y += 10) for (let x = 326; x < 700; x += 10) { c.fillStyle = `rgba(255,90,100,${0.08 + Math.random() * 0.15})`; c.fillRect(x, y, 6, 6); }
      c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '700 64px "Geist", sans-serif'; c.fillText('AP-102', 400, 520); c.font = '500 26px "JetBrains Mono"'; c.fillText('L2 · 96 MB', 440, 560);
    });
    mesh(new RoundedBoxGeometry(2.3, 0.1, 2.3, 2, 0.02), std(0xffffff, 0.08, 0.6, { map: dieT, emissiveMap: dieT, emissive: 0xffffff, emissiveIntensity: 0.6, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.5, iridescenceIOR: 1.5 }), g, x, 0.17, z);
    outline(new THREE.BoxGeometry(2.3, 0.1, 2.3), x, 0.17, z); outline(new THREE.BoxGeometry(4.2, 0.12, 4.2), x, 0.06, z);
    // rows of tiny MLCC capacitors on the substrate around the die
    const mlcc = []; for (const side of [-1, 1]) for (let k = -8; k <= 8; k++) { mlcc.push([x + k * 0.14, z + side * 1.5, 0], [x + side * 1.5, z + k * 0.14, 1]); }
    inst(g, new THREE.BoxGeometry(0.07, 0.035, 0.04), std(0x5e4a38, 0.45, 0.5), mlcc, ([mx, mz, r], v, q) => { v.set(mx, 0.145, mz); q.setFromAxisAngle(UP, r ? Math.PI / 2 : 0); });
    // mounting holes for the cooler: copper rings through the board
    for (const [hx, hz] of [[-3.1, -3.1], [3.1, -3.1], [-3.1, 3.1], [3.1, 3.1]]) { mesh(new THREE.RingGeometry(0.16, 0.28, 32), std(0xb06a3c, 0.3, 1, { side: THREE.DoubleSide }), g, x + hx, 0.006, z + hz).rotation.x = -Math.PI / 2; mesh(new THREE.CircleGeometry(0.16, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }), g, x + hx, 0.007, z + hz).rotation.x = -Math.PI / 2; }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r = 3.4; chip(x + Math.cos(a) * r, z + Math.sin(a) * r * 0.85, 1.0, 0.75, 0); }
  }
  // VRM: rows of chokes + capacitors + driver chips toward the entry
  for (let i = 0; i < 14; i++) { const x = -1.5 + i * 0.62, z = -6.6; chokes.push([x, z]); comps.push({ x, z, w: 0.46, d: 0.46 }); }
  for (let i = 0; i < 16; i++) { const x = -1.6 + i * 0.55, z = -5.6; caps.push([x, z, 0.17, 0.5]); comps.push({ x, z, w: 0.4, d: 0.4 }); }
  for (let i = 0; i < 7; i++) chip(-1.3 + i * 1.25, -7.7, 0.5, 0.5, 1);
  // CPU at the end of the run: package with the lid off, its die glowing faintly — where the camera dives in
  {
    const { x, z } = GPU.cpu; comps.push({ x, z, w: 3.6, d: 3.6 });
    mesh(new RoundedBoxGeometry(3.4, 0.14, 3.4, 2, 0.04), std(0x0b1712, 0.55, 0.2), g, x, 0.07, z);
    const cpuT = canvas(1024, 1024, (c, w, h) => {
      c.fillStyle = '#05070c'; c.fillRect(0, 0, w, h);
      const blocks = [[60, 60, 420, 380], [544, 60, 420, 380], [60, 584, 420, 380], [544, 584, 420, 380], [60, 470, 904, 84]];
      for (const [bx, by, bw, bh] of blocks) { c.fillStyle = '#0b1220'; c.fillRect(bx, by, bw, bh); c.strokeStyle = 'rgba(111,182,255,.55)'; c.lineWidth = 2; c.strokeRect(bx, by, bw, bh); for (let k = 0; k < 60; k++) { c.fillStyle = `rgba(111,182,255,${0.05 + R() * 0.15})`; c.fillRect(bx + R() * bw, by + R() * bh, 4 + R() * 60, 2); } }
    });
    mesh(new THREE.BoxGeometry(1.7, 0.06, 1.25), new THREE.MeshStandardMaterial({ map: cpuT, emissiveMap: cpuT, emissive: 0xffffff, emissiveIntensity: 1.4, roughness: 0.2, metalness: 0.4 }), g, x, 0.17, z);
  }
  // power stages beside the chokes, a 12-pin power connector, display outputs at the far end, PCIe gold fingers
  for (let i = 0; i < 14; i++) chip(-1.5 + i * 0.62, -7.15, 0.4, 0.32, 1);
  {
    const pcon = canvas(256, 96, (c, w, h) => { c.fillStyle = '#0c0c0f'; c.fillRect(0, 0, w, h); for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) { c.fillStyle = '#000'; c.fillRect(14 + k * 39, 14 + r * 40, 30, 28); c.fillStyle = '#c9a24a'; c.fillRect(24 + k * 39, 22 + r * 40, 10, 12); } });
    const cx = -4.6, cz = -9.6, bg = new THREE.BoxGeometry(1.7, 0.55, 0.7); comps.push({ x: cx, z: cz, w: 1.7, d: 0.7 });
    mesh(bg, [std(0x0d0d10, 0.6), std(0x0d0d10, 0.6), std(0x0d0d10, 0.6), std(0x0d0d10, 0.6), new THREE.MeshStandardMaterial({ map: pcon, roughness: 0.6 }), std(0x0d0d10, 0.6)], g, cx, 0.275, cz); outline(bg, cx, 0.275, cz);
  }
  for (let i = 0; i < 4; i++) { const pz = -9 + i * 1.6, pg = new THREE.BoxGeometry(0.7, 0.45, 1.1); comps.push({ x: 30.6, z: pz, w: 0.7, d: 1.1 }); mesh(pg, std(0x9a9aa4, 0.3, 1), g, 30.6, 0.225, pz); outline(pg, 30.6, 0.225, pz); mesh(new THREE.BoxGeometry(0.02, 0.18, 0.7), new THREE.MeshBasicMaterial({ color: 0x050506 }), g, 30.24, 0.24, pz); }
  { const fingers = []; for (let x = 2; x < 20; x += 0.11) fingers.push(x); inst(g, new THREE.BoxGeometry(0.07, 0.008, 0.55), std(0xd4a94a, 0.22, 1), fingers, (x, v) => v.set(x, 0.006, GPU.Z1 - 0.45)); }
  // via fields: dense grids of tiny plated holes around the die and under the VRM
  { const vf = []; for (let x = GPU.die.x - 5; x < GPU.die.x + 5; x += 0.16) for (let z = GPU.die.z - 5.4; z < GPU.die.z - 4.6; z += 0.16) vf.push([x, z]); for (let x = -1.8; x < 7.2; x += 0.16) for (let z = -8.4; z < -7.9; z += 0.16) vf.push([x, z]);
    inst(g, new THREE.CylinderGeometry(0.022, 0.022, 0.006, 8), std(0xb08a50, 0.3, 1), vf.filter(([x, z]) => !inCorridor(x, z)), ([x, z], v) => v.set(x, 0.004, z)); }
  // filler parts
  for (let i = 0; i < 60; i++) { const w = 0.35 + R() * 0.9, d = w * (0.6 + R() * 0.5), x = X0 + 2 + R() * (W - 4), z = Z0 + 2 + R() * (D - 4); if (free(x, z, w, d)) chip(x, z, w, d); }
  for (let i = 0; i < 160; i++) { const x = X0 + 1 + R() * (W - 2), z = Z0 + 1 + R() * (D - 2), r = 0.09 + R() * 0.1; if (free(x, z, r * 2, r * 2)) { caps.push([x, z, r, 0.18 + R() * 0.35]); comps.push({ x, z, w: r * 2, d: r * 2 }); } }
  for (let i = 0; i < 1600; i++) { const x = X0 + R() * W, z = Z0 + R() * D, r = R() > 0.5; if (!inCorridor(x, z)) smd.push([x, z, r]); }
  for (let i = 0; i < 60; i++) { const x = X0 + R() * W, z = Z0 + R() * D; if (!inCorridor(x, z)) leds.push([x, z]); }
  inst(g, new THREE.BoxGeometry(0.03, 0.012, 0.07), pinM, pins, ([x, z, side], v, q) => { v.set(x, 0.008, z); q.setFromAxisAngle(UP, side ? Math.PI / 2 : 0); });
  inst(g, new THREE.CylinderGeometry(1, 1, 1, 24), std(0x121216, 0.35, 0.3, { clearcoat: 0.6 }), caps, ([x, z, r, h], v, q, s) => { v.set(x, h / 2, z); s.set(r, h, r); });
  inst(g, new THREE.CylinderGeometry(0.96, 0.96, 0.02, 24), std(0xb9b9c4, 0.25, 1), caps, ([x, z, r, h], v, q, s) => { v.set(x, h + 0.005, z); s.set(r, 1, r); });
  { // inductors with their value printed on top
    const chokeTop = canvas(128, 128, (c, w, h) => { c.fillStyle = '#26262b'; c.fillRect(0, 0, w, h); c.fillStyle = '#9a9aa4'; c.font = '700 40px "JetBrains Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('R22', w / 2, h / 2 - 6); c.font = '500 16px "JetBrains Mono"'; c.fillText('2604', w / 2, h / 2 + 28); c.beginPath(); c.arc(18, 18, 6, 0, 7); c.fill(); });
    const side = std(0x232328, 0.45, 0.7);
    inst(g, new RoundedBoxGeometry(0.46, 0.34, 0.46, 2, 0.04), [side, side, new THREE.MeshStandardMaterial({ map: chokeTop, roughness: 0.5, metalness: 0.5 }), side, side, side], chokes, ([x, z], v) => v.set(x, 0.17, z));
  }
  inst(g, new THREE.BoxGeometry(0.1, 0.035, 0.05), std(0x17171b, 0.5, 0.2), smd, ([x, z, rot], v, q) => { v.set(x, 0.018, z); q.setFromAxisAngle(UP, rot ? Math.PI / 2 : 0); });
  const ledIM = inst(g, new THREE.BoxGeometry(0.07, 0.03, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), leds, ([x, z], v) => v.set(x, 0.015, z));

  // the ceiling: heatsink fin stack + copper heat pipes over the whole run (you're inside the card)
  const fins = []; for (let x = X0 + 2; x < 24; x += 0.13) fins.push(x);
  inst(g, new THREE.BoxGeometry(0.018, 1.1, 15), std(0x1d1d22, 0.3, 0.9), fins, (x, v) => v.set(x, 3.15, -3));
  for (const z of [-8, -5, -2, 1]) mesh(new THREE.CylinderGeometry(0.11, 0.11, 32, 20), std(0xb06a3c, 0.28, 1), g, 8, 2.48, z).rotation.z = Math.PI / 2;
  mesh(new THREE.BoxGeometry(32, 0.08, 15), std(0x111115, 0.4, 0.8), g, 8, 2.58, -3);

  // traces: buses + pin traces (VRAM ↔ die get dense buses)
  const W2 = wires(), chipsL = comps.filter((c) => c.chip), vias = [];
  const edgePt = (c) => { const s = (R() * 4) | 0, t = R() - 0.5; return s === 0 ? [c.x + t * c.w, c.z - c.d / 2 - 0.06] : s === 1 ? [c.x + t * c.w, c.z + c.d / 2 + 0.06] : s === 2 ? [c.x - c.w / 2 - 0.06, c.z + t * c.d] : [c.x + c.w / 2 + 0.06, c.z + t * c.d]; };
  for (let b = 0; b < 40; b++) {
    const a = [X0 + R() * W, Z0 + R() * D], e = [a[0] + (R() - 0.5) * 18, a[1] + (R() - 0.5) * 9], n = 3 + ((R() * 6) | 0), seed = R();
    for (let k = 0; k < n; k++) { const pts = route([a[0], a[1] + k * 0.11], [e[0], e[1] + k * 0.11]); W2.add(pts, 0.04, (seed + k * 0.013) % 1); vias.push(pts[0], pts[pts.length - 1]); }
  }
  for (let i = 0; i < 12; i++) { // VRAM ↔ die buses
    const a = (i / 12) * Math.PI * 2, mx = GPU.die.x + Math.cos(a) * 3.4, mz = GPU.die.z + Math.sin(a) * 3.4 * 0.85, seed = R();
    for (let k = 0; k < 6; k++) { const o = (k - 2.5) * 0.09; W2.add(route([mx + o, mz], [GPU.die.x + Math.cos(a) * 1.3 + o, GPU.die.z + Math.sin(a) * 1.3]), 0.035, (seed + k * 0.02) % 1); }
  }
  for (let k = 0; k < 10; k++) W2.add(route([GPU.die.x + 2.2, GPU.die.z + (k - 4.5) * 0.12], [GPU.cpu.x - 1.8, GPU.cpu.z + (k - 4.5) * 0.12]), 0.04, (0.3 + k * 0.07) % 1); // PCIe lanes to the CPU
  for (let i = 0; i < 380; i++) {
    const c = chipsL[(R() * chipsL.length) | 0], a = edgePt(c), o = R() > 0.4 ? edgePt(chipsL[(R() * chipsL.length) | 0]) : [a[0] + (R() - 0.5) * 6, a[1] + (R() - 0.5) * 4];
    if (Math.hypot(o[0] - a[0], o[1] - a[1]) > 12) continue;
    const pts = route(a, o); W2.add(pts, 0.025 + R() * 0.035, R()); vias.push(pts[pts.length - 1]);
  }
  g.add(W2.mesh(wireMat));
  inst(g, new THREE.CylinderGeometry(0.035, 0.035, 0.01, 12), std(0x6a5a3a, 0.3, 1), vias, ([x, z], v) => v.set(x, 0.006, z));
  const ledC = new THREE.Color();
  return { g, update(t, a) { for (let i = 0; i < leds.length; i++) { ledC.copy(a).multiplyScalar(Math.sin(t * (1 + (i % 7) * 0.7) + i) > 0.2 ? 2.2 : 0.15); ledIM.setColorAt(i, ledC); } ledIM.instanceColor.needsUpdate = true; } };
}

/* ------------------------------------------------------------ world B: inside the CPU die (far from world A) */
export const DIE = { OX: 400, X0: -12, X1: 30, Z0: -16, Z1: 8, WIRE: { x: -37, y: 1.58, z: 3.0 } }; // the die wire runs between metal layers 2 and 3, coming in from off the die
function cpuWorld(wireMat) {
  const { OX, X0, X1, Z0, Z1 } = DIE, W = X1 - X0, D = Z1 - Z0, R = rng(777), g = new THREE.Group(); g.position.x = OX;
  // silicon floor: floorplan of cores, cache and IO, faintly lit from within
  const floor = canvas(4096, 2048, (c, w, h) => {
    c.fillStyle = '#03050a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(111,182,255,.06)'; c.lineWidth = 1; for (let i = 0; i < w; i += 12) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); } for (let i = 0; i < h; i += 12) { c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
    for (let i = 0; i < 2400; i++) { c.fillStyle = `rgba(111,182,255,${0.03 + R() * 0.12})`; c.fillRect(R() * w, R() * h, 3 + R() * 70, 2); }
  });
  mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floor, emissiveMap: floor, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.5 }), g, (X0 + X1) / 2, 0, (Z0 + Z1) / 2).rotation.x = -Math.PI / 2;
  // cores: a raised slab per core, each with its own etched layout and label, plus functional units on top —
  // an L2 SRAM block, four ALUs whose tops flicker with activity, a register file — all outlined in crisp edges
  const edgeM = new THREE.LineBasicMaterial({ color: 0x6fb6ff, transparent: true, opacity: 0.55 });
  const outline = (geo, x, y, z) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeM); l.position.set(x, y, z); g.add(l); };
  const sramT = canvas(256, 512, (c, w, h) => { c.fillStyle = '#060a12'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(111,182,255,.22)'; for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) c.fillRect(x, y, 5, 5); c.fillStyle = 'rgba(111,182,255,.5)'; for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 2, h); });
  const sramM = new THREE.MeshStandardMaterial({ map: sramT, emissiveMap: sramT, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.3, metalness: 0.4 });
  const regM = std(0x0d1424, 0.35, 0.6), unitM = std(0x0b1220, 0.35, 0.6);
  const cores = [], alus = [];
  for (let i = 0; i < 8; i++) for (const [row, cz] of [[0, -6.2], [1, 2.2]]) {
    const x = -6 + i * 4.6, n = i * 2 + row;
    cores.push([x, cz]);
    const coreT = canvas(512, 512, (c, w, h) => {
      c.fillStyle = '#070b14'; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 320; k++) { c.fillStyle = `rgba(150,200,255,${0.05 + R() * 0.22})`; if (R() > 0.5) c.fillRect(R() * w, R() * h, 2, 8 + R() * 90); else c.fillRect(R() * w, R() * h, 8 + R() * 90, 2); }
      c.strokeStyle = 'rgba(150,200,255,.35)'; c.lineWidth = 2; for (let k = 0; k < 6; k++) c.strokeRect(20 + R() * 300, 20 + R() * 300, 60 + R() * 140, 40 + R() * 120); // functional blocks
      c.strokeStyle = 'rgba(150,200,255,.6)'; c.lineWidth = 3; c.strokeRect(6, 6, w - 12, h - 12);
      c.fillStyle = 'rgba(200,225,255,.75)'; c.font = '600 30px "JetBrains Mono", monospace'; c.fillText(`CORE ${String(n).padStart(2, '0')}`, 26, h - 30);
    });
    const slab = new THREE.BoxGeometry(3.6, 0.28, 3.6);
    mesh(slab, [unitM, unitM, new THREE.MeshStandardMaterial({ map: coreT, emissiveMap: coreT, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.35, metalness: 0.5 }), unitM, unitM, unitM], g, x, 0.14, cz);
    outline(slab, x, 0.14, cz);
    const l2 = new THREE.BoxGeometry(1.1, 0.12, 3.2); mesh(l2, sramM, g, x + 1.1, 0.34, cz); outline(l2, x + 1.1, 0.34, cz);
    const rf = new THREE.BoxGeometry(1.4, 0.1, 0.6); mesh(rf, regM, g, x - 0.75, 0.33, cz + 1.2); outline(rf, x - 0.75, 0.33, cz + 1.2);
    for (let k = 0; k < 4; k++) { const ux = x - 1.15 + (k % 2) * 0.85, uz = cz - 1.0 + Math.floor(k / 2) * 0.95; const ub = new THREE.BoxGeometry(0.7, 0.18, 0.7); mesh(ub, unitM, g, ux, 0.37, uz); outline(ub, ux, 0.37, uz); alus.push([ux, uz]); }
  }
  // ALU tops: a fine grid of transistor cells, lit by how busy each unit is
  const aluT = canvas(128, 128, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let y = 2; y < h; y += 6) for (let x = 2; x < w; x += 6) { c.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.75})`; c.fillRect(x, y, 4, 3); } c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2); });
  aluT.colorSpace = THREE.NoColorSpace;
  const aluIM = inst(g, new THREE.BoxGeometry(0.6, 0.01, 0.6), new THREE.MeshBasicMaterial({ map: aluT, toneMapped: false }), alus, ([x, z], v) => v.set(x, 0.465, z));
  // L3 cache strip between the core rows: SRAM cells blinking as they're read
  const cells = []; for (let x = X0 + 1; x < X1 - 1; x += 0.32) for (let z = -3.4; z < -0.6; z += 0.32) cells.push([x, z]);
  const cellIM = inst(g, new THREE.BoxGeometry(0.26, 0.06, 0.26), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), cells, ([x, z], v) => v.set(x, 0.03, z));
  // standard-cell rows: dense tiny transistor blocks filling the floor around the cores
  const stdc = [];
  for (const [z0, z1] of [[Z0 + 0.6, -8.7], [4.7, Z1 - 0.6]]) for (let z = z0; z < z1; z += 0.2) { let x = X0 + 0.5; while (x < X1 - 0.5) { const w = 0.05 + R() * 0.12; if (R() > 0.12) stdc.push([x + w / 2, z, w, R()]); x += w + 0.03; } }
  for (let i = 0; i < 8; i++) for (const cz of [-6.2, 2.2]) for (let z = cz - 1.7; z < cz + 1.7; z += 0.2) for (let x = -6 + i * 4.6 + 1.86; x < -6 + i * 4.6 + 2.72; x += 0.12) stdc.push([x, z, 0.08, R()]);
  const stdIM = inst(g, new THREE.BoxGeometry(1, 0.05, 0.12), std(0x101826, 0.4, 0.6), stdc, ([x, z, w], v, q, s) => { v.set(x, 0.025, z); s.set(w, 1, 1); });
  { const c2 = new THREE.Color(); stdc.forEach(([, , , r], i) => { c2.setRGB(0.5, 0.6, 0.8).multiplyScalar(r > 0.93 ? 2.2 : 0.5 + r * 0.6); stdIM.setColorAt(i, c2); }); stdIM.instanceColor.needsUpdate = true; }
  // die marking under the last stretch
  const mark = canvas(1024, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(255,45,63,.9)'; c.font = '800 300px "Geist", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('AP', w / 2, h / 2); });
  mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({ map: mark, transparent: true, toneMapped: false, depthWrite: false, opacity: 0.75 }), g, 22, 0.3, -2).rotation.x = -Math.PI / 2;

  // metal stack: alternating wiring layers above the silicon, stitched with vias — all carrying current
  const Wm = wires(), vias = [];
  const layers = [[0.7, 'x', 0.05], [1.25, 'z', 0.06], [1.9, 'x', 0.09], [2.7, 'z', 0.12]];
  for (const [y, dir, w] of layers) {
    const pitch = dir === 'x' ? 0.55 + w * 4 : 0.7 + w * 4;
    if (dir === 'x') for (let z = Z0 + 1; z < Z1 - 1; z += pitch) { let x = X0 + R() * 3; while (x < X1 - 2) { const L = 2 + R() * 9; Wm.add([[x, z], [Math.min(X1 - 1, x + L), z]], w, R(), y); vias.push([x, z, y]); x += L + 0.6 + R() * 2; } }
    else for (let x = X0 + 1; x < X1 - 1; x += pitch) { let z = Z0 + R() * 3; while (z < Z1 - 2) { const L = 2 + R() * 7; Wm.add([[x, z], [x, Math.min(Z1 - 1, z + L)]], w, R(), y); vias.push([x, z, y]); z += L + 0.6 + R() * 2; } }
  }
  // ring bus around the cores
  { const pts = [[X0 + 1.5, -8.6], [X1 - 1.5, -8.6], [X1 - 1.5, 4.6], [X0 + 1.5, 4.6], [X0 + 1.5, -8.6]]; for (let k = 0; k < 6; k++) Wm.add(pts.map(([x, z]) => [x + (x < 0 ? k : -k) * 0.1, z + (z < 0 ? k : -k) * 0.1]), 0.05, (0.25 + k * 0.11) % 1, 0.02); }
  // clock H-tree spread over the cores (its own thin layer just above them)
  const H = (x, z, sx, sz, d) => { if (d === 0) return; Wm.add([[x - sx, z], [x + sx, z]], 0.04 + d * 0.015, (0.31 + d * 0.17) % 1, 0.52); for (const e of [-1, 1]) { Wm.add([[x + e * sx, z - sz], [x + e * sx, z + sz]], 0.035 + d * 0.012, (0.47 + d * 0.13) % 1, 0.52); for (const f of [-1, 1]) H(x + e * sx, z + f * sz, sx / 2, sz / 2, d - 1); } };
  H(10, -2, 10, 4.6, 4);
  g.add(Wm.mesh(wireMat));
  // the ceiling: top power mesh with copper straps
  const ceilT = canvas(2048, 1024, (c, w, h) => { c.fillStyle = '#06070a'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(176,106,60,.35)'; c.lineWidth = 6; for (let x = 0; x < w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } c.lineWidth = 2; for (let y = 0; y < h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } });
  mesh(new THREE.PlaneGeometry(W + 30, D + 6), new THREE.MeshStandardMaterial({ map: ceilT, roughness: 0.45, metalness: 0.7 }), g, (X0 + X1) / 2 - 12, 3.6, (Z0 + Z1) / 2).rotation.x = Math.PI / 2;
  const straps = []; for (let z = Z0 + 1; z < Z1; z += 2.4) straps.push(z);
  inst(g, new THREE.BoxGeometry(W + 30, 0.08, 0.28), std(0x8a5530, 0.3, 1), straps, (z, v) => v.set((X0 + X1) / 2 - 12, 3.5, z));
  // copper pillars floor → ceiling, with rings of current climbing them
  const pillars = []; for (let x = X0 + 2; x < X1; x += 5.5) pillars.push([x, -10.4], [x + 2.7, 6.2]);
  inst(g, new THREE.CylinderGeometry(0.32, 0.36, 3.6, 32), std(0xb06a3c, 0.28, 1), pillars, ([x, z], v) => v.set(x, 1.8, z));
  const rings = []; pillars.forEach(([x, z]) => { for (let k = 0; k < 3; k++) rings.push([x, z, k / 3]); });
  const ringIM = inst(g, new THREE.TorusGeometry(0.4, 0.02, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), rings, ([x, z], v, q) => { v.set(x, 0, z); q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2); });
  const RQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), RS = new THREE.Vector3(1, 1, 1), RV = new THREE.Vector3(), RM = new THREE.Matrix4();
  const clear = ([x, z]) => !(Math.abs(z - DIE.WIRE.z) < 0.6 && x > DIE.WIRE.x - 0.6 && x < DIE.WIRE.x + WIRE.L + 0.6); // nothing pierces the wire
  inst(g, new THREE.CylinderGeometry(0.02, 0.02, 1, 8), std(0x2c3542, 0.35, 1), vias.filter(clear), ([x, z, y], v, q, s) => { const h = Math.min(y, 0.32); v.set(x, y - h / 2, z); s.set(1, h, 1); }); // short stitches down to the layer below
  const cc = new THREE.Color();
  return {
    g,
    update(t, a) {
      for (let i = 0; i < cells.length; i++) { const on = Math.sin(t * 3 + i * 0.37) * Math.sin(t * 0.7 + i * 1.3) > 0.55; cc.copy(a).multiplyScalar(on ? 1.4 : 0.06); cellIM.setColorAt(i, cc); } // SRAM reads
      cellIM.instanceColor.needsUpdate = true;
      for (let i = 0; i < alus.length; i++) { const load = 0.5 + 0.5 * Math.sin(t * (2 + (i % 5)) + i * 2.1); cc.copy(a).multiplyScalar(0.12 + load * load * 1.1); aluIM.setColorAt(i, cc); } // ALUs busy / idle
      aluIM.instanceColor.needsUpdate = true;
      rings.forEach(([x, z, o], i) => { const k = (t * 0.45 + o) % 1; RV.set(x, k * 3.6, z); RS.setScalar(1 - k * 0.15); RM.compose(RV, RQ, RS); ringIM.setMatrixAt(i, RM); cc.copy(a).multiplyScalar(2.2 * Math.sin(k * Math.PI)); ringIM.setColorAt(i, cc); });
      ringIM.instanceMatrix.needsUpdate = true; ringIM.instanceColor.needsUpdate = true;
    },
  };
}

/* ------------------------------------------------------------ the wire you travel through */
// An open-ended conductor along +x from `start`: inside, copper strands with electricity streaking along the walls
// and pulse rings racing ahead; outside, a dark insulated sheath. Unlit, so two identical wires look identical
// wherever they are — the camera can hop from one to the other mid-flight.
export const WIRE = { R: 0.3, L: 30 };
function wire(start, U) {
  const g = new THREE.Group(); g.position.copy(start);
  const geo = new THREE.CylinderGeometry(WIRE.R, WIRE.R, WIRE.L, 64, 1, true); geo.rotateZ(-Math.PI / 2); geo.translate(WIRE.L / 2, 0, 0);
  const inner = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, toneMapped: false,
    vertexShader: 'varying vec2 vUv; varying float vZ; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform float uTime; uniform vec3 uCol, uCol2; varying vec2 vUv; varying float vZ;
      // crisp, pixel-thin lines anti-aliased with screen-space derivatives (no wide soft blobs)
      float aaLine(float x, float px){ float w = fwidth(x); return (1.0 - smoothstep(0.0, px * w, abs(fract(x + 0.5) - 0.5))) * (1.0 - smoothstep(0.25, 0.5, w)); }
      void main(){
        float a = vUv.x, d = vUv.y * ${WIRE.L.toFixed(1)};
        // dark copper with fine brushed strands (faded out where they would alias into moiré)
        vec3 col = vec3(0.035, 0.022, 0.018) + vec3(0.06, 0.035, 0.022) * aaLine(a * 240.0, 1.0) * 0.6;
        // conductor lines running the length of the wire, each carrying sharp dashes of current
        float lanes = 48.0, la = a * lanes, li = floor(la), h = fract(sin(li * 91.7) * 437.5);
        float line = aaLine(la, 1.6);
        float ph = fract(d * 0.12 - uTime * (3.0 + h * 4.5) + h * 7.0);
        float dash = smoothstep(0.82, 0.995, ph) * (1.0 - smoothstep(0.995, 1.0, ph));       // short bright dash, hard front
        float core = smoothstep(0.975, 0.997, ph) * (1.0 - smoothstep(0.997, 1.0, ph));
        col += line * (uCol * (0.12 + dash * 3.2) + vec3(1.0) * core * 3.0);
        // thin pulse rings racing ahead
        float rg = aaLine(d * 0.16 - uTime * 2.6, 1.4);
        col += rg * mix(uCol2, uCol, 0.6) * 1.1;
        col *= exp(-vZ * 0.07);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  g.add(new THREE.Mesh(geo, inner));
  const sheath = new THREE.Mesh(new THREE.CylinderGeometry(WIRE.R + 0.035, WIRE.R + 0.035, WIRE.L, 48, 1, true).rotateZ(-Math.PI / 2).translate(WIRE.L / 2, 0, 0), std(0x0c0c10, 0.6, 0.2));
  g.add(sheath);
  const lip = mesh(new THREE.TorusGeometry(WIRE.R + 0.018, 0.022, 10, 64), std(0xb06a3c, 0.3, 1), g, 0, 0, 0); lip.rotation.y = Math.PI / 2; // copper core showing at the cut end
  mesh(new THREE.TorusGeometry(WIRE.R + 0.018, 0.022, 10, 64), std(0xb06a3c, 0.3, 1), g, WIRE.L, 0, 0).rotation.y = Math.PI / 2;
  return g;
}

/* ------------------------------------------------------------ flight paths (keyed by chapter position f) */
function track(keys) { // keys: [[f, pos[x,y,z], look[x,y,z]], ...] → smooth curve through every key at its f
  const P = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[1])), false, 'centripetal');
  const L = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k[2])), false, 'centripetal');
  const F = keys.map((k) => k[0]), n = keys.length - 1;
  const u = (f) => { if (f <= F[0]) return 0; if (f >= F[n]) return 1; let i = 0; while (f > F[i + 1]) i++; return (i + (f - F[i]) / (F[i + 1] - F[i])) / n; };
  return { at: (f, p, l) => { const t = u(f); P.getPoint(t, p); L.getPoint(t, l); } };
}

/* ------------------------------------------------------------ the showcase */
export function buildShowcase(renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.03, 80);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35; pm.dispose();
  scene.background = new THREE.Color(0x030304);
  scene.fog = new THREE.FogExp2(0x030304, 0.06);

  const U = { uTime: { value: 0 }, uCol: { value: new THREE.Color() }, uCol2: { value: new THREE.Color() }, uFog: { value: new THREE.Color() }, uBase: { value: new THREE.Color(0.075, 0.05, 0.042) } };
  const wireMat = electric(U);
  const A = gpuWorld(wireMat), B = cpuWorld(wireMat); scene.add(A.g, B.g);
  const UW = { uTime: U.uTime, uCol: U.uCol, uCol2: U.uCol2 };
  // wire 1: from the screen onto the card (opens near the VRM); wire 2: on the card toward the CPU; wire 3: same wire, inside the die
  const W1 = new THREE.Vector3(GPU.wire1.end - WIRE.L, GPU.wire1.y, GPU.wire1.z), W2 = new THREE.Vector3(GPU.wire2.start, GPU.wire2.y, GPU.wire2.z), W3 = new THREE.Vector3(DIE.WIRE.x, DIE.WIRE.y, DIE.WIRE.z);
  A.g.add(wire(W1, UW), wire(W2, UW)); B.g.add(wire(W3, UW));
  const key = new THREE.DirectionalLight(0xffffff, 1.0); scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight(0x8890a0, 0x050505, 0.12));
  const lamp = new THREE.PointLight(0xffffff, 10, 7, 1.6); scene.add(lamp);                  // travels with the camera
  const dieGlow = new THREE.PointLight(0xff2d3f, 14, 9, 1.6); dieGlow.position.copy(GPU.die).setY(1.4); scene.add(dieGlow);
  const cpuGlow = new THREE.PointLight(0x6fb6ff, 12, 7, 1.6); cpuGlow.position.copy(GPU.cpu).setY(1.2); scene.add(cpuGlow);

  // GPU run: down the wire from the screen, out over the VRM, around the VRAM, over the die, into the next wire.
  // Inside a wire the camera rides its axis; the hop from wire 2 (card) to wire 3 (die) happens at the same point
  // along both, so nothing changes on screen.
  const gx = GPU.die.x, gz = GPU.die.z, o = DIE.OX, ax = (v, s, dy = 0) => [v.x + s, v.y + dy, v.z];
  const runA = track([
    [-0.3, ax(W1, 2), ax(W1, 10)],
    [-0.02, ax(W1, 27), ax(W1, 35)],
    [0.1, ax(W1, 30.6), [0, 0.34, 3.3]],
    [0.22, [-2.2, 0.66, 3.1], [1.8, 0.25, -1.8]],
    [0.5, [-1.6, 1.45, 2.4], [2.6, 0.25, -5.6]],
    [1.5, [6.6, 1.25, 1.4], [gx - 1.5, 0.1, gz + 0.2]],
    [2.5, [gx + 1.2, 1.7, gz + 4.3], [gx + 2.5, 0.0, gz - 0.6]],
    [2.68, ax(W2, -1.6, 0.18), ax(W2, 2)],
    [2.76, ax(W2, 0.8), ax(W2, 6)],
    [3.0, ax(W2, 15), ax(W2, 21)],
  ]);
  // CPU run: the rest of the wire, out among the metal layers, along the cores to the AP marking
  const W3w = W3.clone().add(new THREE.Vector3(o, 0, 0));
  const runB = track([
    [3.0, ax(W3w, 15), ax(W3w, 21)],
    [3.22, ax(W3w, 30.2), ax(W3w, 36)],                            // eyes down the axis until clear of the end
    [3.38, [o - 4.6, 1.4, 3.2], [o + 1, 0.55, -1.2]],
    [3.6, [o - 3.5, 1.15, 3.4], [o + 3, 0.45, -2.2]],
    [4.1, [o + 6, 1.55, 1.2], [o + 12, 0.6, -2.4]],
    [4.6, [o + 15.5, 2.2, 2.4], [o + 21, 0.2, -2]],
    [5.0, [o + 18.5, 3.0, 2.6], [o + 22, 0.1, -2]],
  ]);

  const ca = new THREE.Color(), cb = new THREE.Color(), cc = new THREE.Color(), copper = new THREE.Color(0.075, 0.05, 0.042), alu = new THREE.Color(0.03, 0.05, 0.08), white = new THREE.Color(1, 1, 1);
  const pal = SLIDES.map((s) => s.pal.map((h) => new THREE.Color(h)));
  const pos = new THREE.Vector3(), look = new THREE.Vector3(), lampOff = new THREE.Vector3(0.6, 0.8, 0.4);

  return {
    scene, camera,
    /** 1 while riding a wire (main lowers bloom so the tunnel stays crisp). */
    inWire: (f) => (1 - ss(0.0, 0.14, f)) + ss(2.66, 2.76, f) * (1 - ss(3.16, 3.3, f)),
    resize(w, h) { camera.aspect = w / h; camera.fov = camera.aspect > 1.05 ? 38 : 52; camera.updateProjectionMatrix(); },
    /**
     * @param f chapter position (chapter i holds around i + 0.5); f < CUT flies through the GPU, f ≥ CUT through the CPU
     */
    update(f, t, dt, mx, my) {
      const i0 = Math.max(0, Math.min(4, Math.floor(f))), k = ss(0.55, 0.98, f - i0), i1 = Math.min(4, i0 + 1); // blend completes before each boundary (no jump at the CPU cut)
      ca.copy(pal[i0][0]).lerp(pal[i1][0], k); cb.copy(pal[i0][1]).lerp(pal[i1][1], k); cc.copy(pal[i0][2]).lerp(pal[i1][2], k);
      scene.background.copy(cc); scene.fog.color.copy(cc);
      U.uTime.value = t; U.uCol.value.copy(ca); U.uCol2.value.copy(cb); U.uFog.value.copy(cc);
      U.uBase.value.copy(f >= CUT ? alu : copper); // copper traces on the card, aluminium wiring in the die

      (f < CUT ? runA : runB).at(f, pos, look);
      pos.x += mx * 0.12; pos.y -= my * 0.06;
      camera.position.copy(pos); camera.lookAt(look);
      // slow spiral while riding a wire, starting from zero at each entrance (a function of f only, so the
      // screen portal and the GPU→CPU hop still match frame for frame)
      camera.rotation.z += (1 - ss(0.0, 0.14, f)) * Math.max(0, f + 0.3) * 2.6 + (1 - ss(3.16, 3.3, f)) * Math.max(0, f - 2.72) * 4.0 * ss(2.6, 2.72, f);
      lamp.position.copy(pos).add(lampOff); lamp.color.copy(ca).lerp(white, 0.55);
      key.position.set(pos.x - 3, 6, 5); key.target.position.set(pos.x, 0, 0);
      dieGlow.color.copy(ca); dieGlow.intensity = 10 + Math.sin(t * 3) * 3;
      A.g.visible = f < CUT; B.g.visible = f >= CUT;
      if (f < CUT) A.update(t, ca); else B.update(t, ca);
    },
  };
}
