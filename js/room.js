// Room shell, lighting and décor.
import * as THREE from 'three';
import { mat, glow, add, RB, toTex, noAO, rng, fbm, normalCanvas } from './lib.js';
import * as art from './art.js';

export const ROOM = { back: -0.62, left: -2.4, right: 2.5, front: 4.3, ceil: 2.5 };

function neonPlane(canvas, w, h, k = 1.6) {
  const m = new THREE.MeshBasicMaterial({ map: toTex(canvas), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, color: new THREE.Color(k, k, k) });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  noAO.push(mesh);
  return mesh;
}

let leafTex = null;
function leafTexture() {
  if (leafTex) return leafTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 512; const g = c.getContext('2d');
  g.beginPath(); g.moveTo(64, 508);
  g.bezierCurveTo(4, 380, 10, 120, 64, 4); g.bezierCurveTo(118, 120, 124, 380, 64, 508); g.closePath();
  const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, '#1b3a1f'); gr.addColorStop(0.5, '#2f5a2c'); gr.addColorStop(1, '#1a3420');
  g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(190,220,160,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 500); g.lineTo(64, 20); g.stroke();
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(190,220,160,.16)';
  for (let y = 460; y > 60; y -= 26) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(64, y); g.quadraticCurveTo(64 + s * 24, y - 18, 64 + s * 46, y - 44); g.stroke(); }
  leafTex = toTex(c); return leafTex;
}
function plant(parent, x, y, z, s = 1, seed = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  add(new THREE.CylinderGeometry(0.07, 0.055, 0.13, 40), new THREE.MeshPhysicalMaterial({ color: 0x1c1b20, roughness: 0.3, clearcoat: 0.6 }), 0, 0.065, 0, g);
  add(new THREE.CylinderGeometry(0.064, 0.064, 0.01, 24), mat(0x1a120c, 1), 0, 0.125, 0, g);
  const leafM = new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 });
  const R = rng(seed);
  for (let i = 0; i < 16; i++) {
    const len = 0.16 + R() * 0.12, w = len * 0.26;
    const geo = new THREE.PlaneGeometry(w, len, 2, 10); geo.translate(0, len / 2, 0);
    const pos = geo.attributes.position; const arch = 0.35 + R() * 0.4;
    for (let v = 0; v < pos.count; v++) { const t = pos.getY(v) / len; pos.setZ(v, -Math.pow(t, 2) * len * arch + Math.abs(pos.getX(v)) * 0.25); }
    geo.computeVertexNormals();
    const leaf = new THREE.Mesh(geo, leafM); leaf.castShadow = true;
    leaf.position.set(0, 0.12, 0);
    leaf.rotation.order = 'YXZ'; leaf.rotation.y = (i / 16) * Math.PI * 2 + R() * 0.5; leaf.rotation.x = -(0.15 + R() * 0.55);
    g.add(leaf);
  }
  return g;
}

export function buildRoom(scene, { low }) {
  const { back, left, right, front, ceil } = ROOM;
  const W = right - left, D = front - back, cx = (left + right) / 2, cz = (back + front) / 2;
  const anim = [];

  /* ---------------- shell */
  const wood = art.drawWood();
  const floorM = mat(0xffffff, 1, 0, { map: toTex(wood.color, { repeat: [W / 2, D / 2] }), roughnessMap: toTex(wood.rough, { srgb: false, repeat: [W / 2, D / 2] }) });
  floorM.roughness = 0.9;
  const floor = add(new THREE.PlaneGeometry(W, D), floorM, cx, 0, cz, scene); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;

  const wallN = toTex(normalCanvas(fbm(256, 256, { seed: 6, scale: 16, oct: 4 }), 256, 256, 1.6), { srgb: false, repeat: [4, 2] });
  const wallM = mat(0x17161d, 0.92, 0, { normalMap: wallN, normalScale: new THREE.Vector2(0.12, 0.12) });
  const wall = (w, x, z, ry) => { const m = add(new THREE.PlaneGeometry(w, ceil), wallM, x, ceil / 2, z, scene); m.rotation.y = ry; m.castShadow = false; return m; };
  wall(W, cx, back, 0); wall(D, right, cz, -Math.PI / 2); wall(D, left, cz, Math.PI / 2); wall(W, cx, front, Math.PI);
  const ceilM = new THREE.MeshBasicMaterial({ map: toTex(art.drawGalaxy()), color: new THREE.Color(0.55, 0.55, 0.6) });
  const ceiling = add(new THREE.PlaneGeometry(W, D), ceilM, cx, ceil, cz, scene, false); ceiling.rotation.x = Math.PI / 2;
  // baseboards
  const base = mat(0x0d0d10, 0.5, 0.2);
  add(new THREE.BoxGeometry(W, 0.08, 0.015), base, cx, 0.04, back + 0.008, scene);
  const bb = add(new THREE.BoxGeometry(D, 0.08, 0.015), base, right - 0.008, 0.04, cz, scene); bb.rotation.y = Math.PI / 2;

  /* ---------------- ceiling cove LEDs */
  const coveCol = 0xb44dff;
  const coveM = glow(coveCol, 4);
  add(new THREE.BoxGeometry(W, 0.012, 0.012), coveM, cx, ceil - 0.02, back + 0.03, scene, false);
  const cr = add(new THREE.BoxGeometry(D, 0.012, 0.012), coveM, right - 0.03, ceil - 0.02, cz, scene, false); cr.rotation.y = Math.PI / 2;
  const cl = add(new THREE.BoxGeometry(D, 0.012, 0.012), coveM, left + 0.03, ceil - 0.02, cz, scene, false); cl.rotation.y = Math.PI / 2;
  const coveLight = (w, x, z, ry, I) => {
    const L = new THREE.RectAreaLight(coveCol, I, w, 0.08);
    L.position.set(x, ceil - 0.04, z); L.rotation.order = 'YXZ'; L.rotation.set(-Math.PI / 2 + 0.45, ry, 0); scene.add(L); return L;
  };
  coveLight(W, cx, back + 0.12, 0, 14);
  coveLight(D, right - 0.12, cz, -Math.PI / 2, 12);
  if (!low) coveLight(D, left + 0.12, cz, Math.PI / 2, 10);

  /* ---------------- low-poly geometric wall behind the desk */
  {
    const gx0 = -1.3, gx1 = 1.3, gy0 = 0.77, gy1 = 1.6, nx = 16, ny = 6, R = rng(17);
    const pts = [];
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const edge = i === 0 || j === 0 || i === nx || j === ny;
      pts.push(new THREE.Vector3(
        gx0 + ((gx1 - gx0) * i) / nx + (edge ? 0 : (R() - 0.5) * 0.08),
        gy0 + ((gy1 - gy0) * j) / ny + (edge ? 0 : (R() - 0.5) * 0.07),
        back + 0.006 + (edge ? 0 : R() * 0.05)));
    }
    const pos = []; const P = (i, j) => pts[j * (nx + 1) + i];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      const tri = R() < 0.5 ? [a, b, c, a, c, d] : [a, b, d, b, c, d];
      for (const v of tri) pos.push(v.x, v.y, v.z);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    const panel = add(geo, mat(0x20233a, 0.55, 0.15, { flatShading: true }), 0, 0, 0, scene); panel.castShadow = false;
    const under = new THREE.RectAreaLight(0x3a4dff, 22, 2.5, 0.05);
    under.position.set(0, 0.8, back + 0.14); under.rotation.set(0.62, 0, 0); scene.add(under);
    add(new THREE.BoxGeometry(2.5, 0.01, 0.01), glow(0x3a4dff, 3), 0, 0.775, back + 0.06, scene, false);
  }

  /* ---------------- posters above the desk */
  const posters = [art.drawPosterRonin(), art.drawPosterSpider(), art.drawPosterCity()];
  posters.forEach((pc, i) => {
    const x = -0.62 + i * 0.56, y = 1.98, w = 0.42, h = 0.59;
    add(RB(w + 0.03, h + 0.03, 0.025, 0.004), mat(0x0a0a0c, 0.4, 0.5), x, y, back + 0.013, scene);
    add(new THREE.PlaneGeometry(w, h), mat(0xffffff, 0.55, 0, { map: toTex(pc) }), x, y, back + 0.0265, scene, false);
    add(new THREE.PlaneGeometry(w, h), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.06, depthWrite: false }), x, y, back + 0.028, scene, false);
  });

  /* ---------------- neon */
  const eat = neonPlane(art.drawNeon([
    { t: 'EAT', y: 130, size: 190, color: '#ff3dbd', core: '#ffe3f6' },
    { t: 'SLEEP', y: 360, size: 190, color: '#ff3dbd', core: '#ffe3f6' },
    { t: 'CODE', y: 590, size: 190, color: '#ff1e3c', core: '#ffd6db' },
    { t: 'REPEAT', y: 820, size: 190, color: '#ff3dbd', core: '#ffe3f6' },
  ], 1024, 960, { align: 'left' }), 0.5, 0.47);
  eat.position.set(-1.42, 1.9, back + 0.02); scene.add(eat);
  const pad = neonPlane(art.drawControllerNeon(), 0.3, 0.2); pad.position.set(-1.6, 1.46, back + 0.02); scene.add(pad);
  const name = neonPlane(art.drawNeon([{ t: 'akshat.', y: 150, size: 200, color: '#ff2d3f', core: '#ff9aa6' }], 1024, 300), 1.05, 0.31, 1.5);
  name.position.set(right - 0.02, 2.08, 0.95); name.rotation.y = -Math.PI / 2; scene.add(name);
  const neonL = new THREE.PointLight(0xff3dbd, 1.2, 2, 2); neonL.position.set(-1.4, 1.8, back + 0.3); scene.add(neonL);
  const nameL = new THREE.PointLight(0xff2d3f, 1.2, 2.2, 2); nameL.position.set(right - 0.3, 2.05, 0.95); scene.add(nameL);
  anim.push((t) => { const f = Math.random() < 0.004 ? 0.3 : 1; name.material.color.setScalar(1.5 * f); nameL.intensity = 1.2 * f; });

  /* ---------------- triangle light panels */
  {
    const s = 0.2, h = (s * Math.sqrt(3)) / 2;
    const tri = new THREE.Shape(); tri.moveTo(-s / 2, -h / 3); tri.lineTo(s / 2, -h / 3); tri.lineTo(0, (2 * h) / 3); tri.closePath();
    const geo = new THREE.ShapeGeometry(tri);
    const frame = new THREE.ExtrudeGeometry(tri, { depth: 0.012, bevelEnabled: false });
    const layout = [[0, 0, 0], [1, 0, 1], [2, 0, 0], [3, 0, 1], [1, 1, 0], [2, 1, 1], [3, 1, 0], [4, 1, 1], [3, -1, 0]];
    const cols = [0xff3cac, 0x9b5cff, 0x3aa0ff];
    const mats = [];
    layout.forEach(([i, j, flip], n) => {
      const x = 0.93 + (i * s) / 2, y = 1.9 + j * h + (flip ? h / 3 : 0);
      const m = glow(cols[n % 3], 2.2); mats.push({ m, base: n });
      const back0 = add(frame, mat(0xdedee6, 0.4), x, y, back + 0.004, scene); back0.scale.setScalar(1.04); if (flip) back0.rotation.z = Math.PI;
      const face = add(geo, m, x, y, back + 0.0175, scene, false); face.scale.setScalar(0.94); if (flip) face.rotation.z = Math.PI;
      noAO.push(face);
    });
    const tl = new THREE.PointLight(0xb05cff, 1.4, 1.6, 2); tl.position.set(1.1, 1.95, back + 0.3); scene.add(tl);
    const c = new THREE.Color();
    anim.push((t) => mats.forEach(({ m, base }) => { const h2 = (0.83 + 0.14 * Math.sin(t * 0.4 + base * 0.9)) % 1; m.color.copy(c.setHSL(h2, 1, 0.55)).multiplyScalar(2.2); }));
  }

  /* ---------------- TV wall (right) */
  {
    const tvZ = 0.95, tvY = 1.28, tw = 1.44, th = 0.82;
    const g = new THREE.Group(); g.position.set(right - 0.04, tvY, tvZ); g.rotation.y = -Math.PI / 2; scene.add(g);
    add(RB(tw + 0.02, th + 0.02, 0.035, 0.006), mat(0x08080a, 0.3, 0.5), 0, 0, 0, g);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(tw, th), new THREE.MeshBasicMaterial({ map: toTex(art.drawTV()), color: new THREE.Color(0.9, 0.9, 0.95) }));
    scr.position.z = 0.0181; g.add(scr);
    const L = new THREE.RectAreaLight(0x8fa0ff, 3, tw, th); L.position.z = 0.02; L.rotation.y = Math.PI; g.add(L);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(tw * 1.5, th * 1.6), new THREE.MeshBasicMaterial({ map: toTex(haloCanvas('255,140,60')), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    halo.position.z = -0.018; g.add(halo); noAO.push(halo);
    // floating console
    const con = new THREE.Group(); con.position.set(right - 0.2, 0.42, tvZ); scene.add(con);
    add(RB(0.4, 0.3, 1.8, 0.01), mat(0x121016, 0.45, 0.1), 0, 0, 0, con);
    for (const dz of [-0.45, 0, 0.45]) add(new THREE.BoxGeometry(0.004, 0.24, 0.4), mat(0x0a090c, 0.5), -0.2, 0, dz, con);
    add(new THREE.BoxGeometry(0.012, 0.006, 1.74), glow(0xff8a3c, 3), -0.17, -0.155, 0, con, false);
    const warm = new THREE.PointLight(0xff8a3c, 1.4, 1.4, 2); warm.position.set(right - 0.3, 0.2, tvZ); scene.add(warm);
    add(RB(0.1, 0.07, 0.9, 0.02), mat(0x0c0c0f, 0.35, 0.3), -0.02, 0.19, 0, con); // soundbar
    plant(scene, right - 0.2, 0.57, tvZ + 0.72, 1.1, 4);
  }

  /* ---------------- rug + plants */
  const rug = add(RB(2.5, 0.012, 1.85, 0.005), mat(0xffffff, 0.98, 0, { map: toTex(art.drawRug()) }), 0.05, 0.006, 1.25, scene);
  rug.castShadow = false;
  plant(scene, -2.1, 0, -0.35, 2.4, 7);

  /* ---------------- global light */
  scene.add(new THREE.HemisphereLight(0x3a3f66, 0x080608, 0.15));
  const moon = new THREE.DirectionalLight(0x8095ff, 0.55);
  moon.position.set(-4.5, 3.4, 3.2); moon.target.position.set(0.3, 0.4, 0.3); scene.add(moon, moon.target);
  moon.castShadow = true; moon.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048); moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.02; moon.shadow.radius = 4;
  Object.assign(moon.shadow.camera, { left: -3, right: 3, top: 3, bottom: -2, near: 0.5, far: 14 });
  const rim = new THREE.SpotLight(0x6070ff, 7, 7, 0.45, 0.8, 1.6); rim.position.set(-1.8, 2.4, 2.8); rim.target.position.set(0, 1.0, 0.75); scene.add(rim, rim.target);

  return { update: (t, dt) => anim.forEach((f) => f(t, dt)) };
}

function haloCanvas(rgb) {
  const [c, g] = [document.createElement('canvas'), null]; c.width = 256; c.height = 256; const x = c.getContext('2d');
  const r = x.createRadialGradient(128, 128, 20, 128, 128, 128); r.addColorStop(0, `rgba(${rgb},.9)`); r.addColorStop(0.6, `rgba(${rgb},.25)`); r.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = r; x.fillRect(0, 0, 256, 256); return c;
}
