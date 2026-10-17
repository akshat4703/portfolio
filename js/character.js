// Gaming chair + the guy at the desk: hood up, typing, facing the monitors. Everything is sculpted in code as
// SDFs (js/body/guy.js hoodie/head/jeans, js/body/rig.js hands) and meshed in workers.
import * as THREE from 'three';
import { mat, glow, add, RB } from './lib.js';
import { sneaker } from './shelf.js';
import { POSE } from './body/guy.js';

// Kick off meshing ASAP across a few workers; resolves with merged geometry buffers.
export function startBody() {
  const groups = [['hoodie'], ['head'], ['jeans', 'sneakerLow'], ['sneakerHigh', 'mouse'], ['handL', 'handR', 'pad']];
  const t0 = performance.now();
  return Promise.all(groups.map((names) => new Promise((resolve, reject) => {
    const w = new Worker(new URL('./body/worker.js', import.meta.url), { type: 'module' });
    w.onmessage = (e) => { resolve(e.data); w.terminate(); };
    w.onerror = reject;
    w.postMessage(names);
  }))).then((rs) => rs.reduce((o, r) => ({ parts: { ...o.parts, ...r.parts }, nails: { ...o.nails, ...r.nails }, props: { ...o.props, ...r.props }, frames: r.frames, ms: performance.now() - t0 }), { parts: {}, nails: {}, props: {} }));
}

function geometry(p) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(p.normal, 3));
  g.setIndex(new THREE.BufferAttribute(p.index, 1));
  g.computeBoundingSphere();
  return g;
}
const meshOf = (p, m, parent) => { const o = new THREE.Mesh(geometry(p), m); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
// per-vertex colour from painted regions (soft-blended at region edges)
function painted(p, palette, m, parent) {
  const g = geometry(p), pal = palette.map((h) => new THREE.Color(h)), c = new THREE.Color(), col = new Float32Array(p.region.length * 3);
  for (let i = 0; i < p.region.length; i++) { c.copy(pal[p.under[i]]).lerp(pal[p.region[i]], p.blend[i]); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; parent.add(o); return o;
}

const CHAIR_RECLINE = 0.22; // backrest tilt (rad)
const CHAIR_Z = 0.68;       // chair axis

export function buildCharacter(scene, body) {
  const metal = mat(0x0b0b0e, 0.3, 0.75);
  const leather = mat(0x0d0d10, 0.38, 0.05), redLeather = mat(0xb3131f, 0.42, 0.05);

  /* ---------------- chair (pivot = chair axis; `seat` space = world while facing the desk) */
  const swivel = new THREE.Group(); swivel.position.set(0, 0, CHAIR_Z); scene.add(swivel);
  const seat = new THREE.Group(); seat.position.set(0, 0, -CHAIR_Z); swivel.add(seat);
  const chair = new THREE.Group(); chair.position.set(0, 0, CHAIR_Z); seat.add(chair);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = add(RB(0.3, 0.03, 0.045, 0.012), metal, Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15, chair); leg.rotation.y = -a;
    add(new THREE.SphereGeometry(0.026, 14, 10), metal, Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3, chair);
  }
  add(new THREE.CylinderGeometry(0.025, 0.03, 0.34, 16), metal, 0, 0.25, 0, chair);
  add(RB(0.52, 0.09, 0.5, 0.04), leather, 0, 0.47, 0, chair);
  for (const sx of [-1, 1]) add(RB(0.075, 0.11, 0.5, 0.035), redLeather, sx * 0.23, 0.485, 0, chair);
  {
    const s = new THREE.Shape();
    s.moveTo(-0.2, 0); s.lineTo(0.2, 0); s.quadraticCurveTo(0.26, 0.16, 0.24, 0.3); s.quadraticCurveTo(0.22, 0.38, 0.12, 0.39); s.lineTo(-0.12, 0.39); s.quadraticCurveTo(-0.22, 0.38, -0.24, 0.3); s.quadraticCurveTo(-0.26, 0.16, -0.2, 0);
    const back = new THREE.Group(); back.position.set(0, 0.5, 0.27); back.rotation.x = CHAIR_RECLINE; back.scale.set(1.08, 2.05, 1); chair.add(back);
    add(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 5, curveSegments: 24 }), leather, 0, 0, -0.01, back);
    for (const sx of [-1, 1]) add(RB(0.045, 0.3, 0.012, 0.005), redLeather, sx * 0.13, 0.19, 0.072, back);
    add(RB(0.12, 0.012, 0.012, 0.005), redLeather, 0, 0.33, 0.072, back);
  }
  for (const sx of [-1, 1]) { add(new THREE.BoxGeometry(0.04, 0.2, 0.04), metal, sx * 0.29, 0.58, 0.02, chair); add(RB(0.07, 0.03, 0.26, 0.012), leather, sx * 0.29, 0.69, -0.02, chair); }

  /* ---------------- materials */
  const fleece = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.92, sheen: 0.85, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x4c4c5e), specularIntensity: 0.3 });
  const skin = new THREE.MeshPhysicalMaterial({ color: 0x5e3923, roughness: 0.52, sheen: 0.3, sheenColor: new THREE.Color(0xff9e80), sheenRoughness: 0.45, specularIntensity: 0.5 });
  const face = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color(0xff9e80), sheenRoughness: 0.45, specularIntensity: 0.5 });
  const denim = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.86, sheen: 0.35, sheenColor: new THREE.Color(0x3b4a6a), sheenRoughness: 0.6 });
  const nailM = new THREE.MeshPhysicalMaterial({ color: 0x8a6656, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const P = body.parts;

  // soft warm key from above-behind: rims the hood and shoulders for the over-the-shoulder shots
  {
    const key = new THREE.SpotLight(0xffd6b8, 4, 3.4, 0.6, 0.85, 1.6);
    key.position.set(0.55, 2.0, 1.45); key.target.position.set(0, 1.05, 0.6);
    seat.add(key, key.target);
  }

  /* ---------------- hoodie (hood up), jeans, sneakers */
  // fleece · rib knit · seams · red spider print
  painted(P.hoodie, [0x1e1e25, 0x17171c, 0x0e0e11, 0xc8142a], fleece, seat);
  painted(P.jeans, [0x1b2232, 0x2c3447, 0x26304a], denim, seat);
  for (const k of ['L', 'R']) {
    const a = POSE.ankle[k], s = sneaker({ base: 0x0d0d0f, toe: 0x0d0d0f, heel: 0xc41225, overlay: 0xc41225, collar: 0x0d0d0f, sole: 0xf4f4f0, outsole: 0x0d0d0f, high: true });
    s.position.set(a[0], 0, a[2] - 0.066); s.rotation.y = Math.PI / 2 + (k === 'L' ? 0.12 : -0.1); seat.add(s); // toe → −z, ankle collar under the shin
  }
  // hoodie drawstrings with aglets, hanging from the hood opening down the chest
  {
    const head = new THREE.Object3D(); head.position.fromArray(POSE.HEAD.o); head.rotation.x = POSE.HEAD.pitch; head.updateMatrix();
    const string = mat(0xd9d9de, 0.7), tip = mat(0x9a9aa2, 0.25, 0.9);
    for (const sx of [-1, 1]) {
      const top = new THREE.Vector3(sx * 0.03, -0.128, -0.07).applyMatrix4(head.matrix);
      const pts = [top, new THREE.Vector3(sx * 0.034, 1.11, 0.566), new THREE.Vector3(sx * 0.039, 1.03, 0.55), new THREE.Vector3(sx * 0.041, 0.965, 0.553)];
      const curve = new THREE.CatmullRomCurve3(pts);
      add(new THREE.TubeGeometry(curve, 40, 0.0032, 8, false), string, 0, 0, 0, seat);
      const end = curve.getPoint(1), dir = curve.getTangent(1);
      const ag = add(new THREE.CylinderGeometry(0.0038, 0.0034, 0.022, 10), tip, end.x, end.y, end.z, seat);
      ag.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.negate()); ag.position.addScaledVector(dir, 0.011);
    }
  }

  /* ---------------- head: sculpted face, eyes, headphones over the hood */
  const head = new THREE.Group(); head.position.fromArray(POSE.HEAD.o); head.rotation.x = POSE.HEAD.pitch; seat.add(head);
  painted(P.head, [0x5e3923, 0x47251f, 0x150e0b, 0x0d0a09, 0x3a2216], face, head); // skin · lips · brows · hair · inner ear
  {
    const sclera = new THREE.MeshPhysicalMaterial({ color: 0xa99d91, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.08 });
    const iris = new THREE.MeshPhysicalMaterial({ color: 0x2b1810, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
    const pupil = new THREE.MeshBasicMaterial({ color: 0x050403 });
    for (const sx of [-1, 1]) {
      const eye = new THREE.Group(); eye.position.set(sx * 0.031, 0.011, -0.0835); eye.rotation.set(0.05, -sx * 0.03, 0); head.add(eye); // looking slightly down at the screen
      add(new THREE.SphereGeometry(0.0118, 24, 16), sclera, 0, 0, 0, eye, false);
      const ir = add(new THREE.SphereGeometry(0.01195, 24, 12, 0, Math.PI * 2, 0, 0.5), iris, 0, 0, 0, eye, false); ir.rotation.x = -Math.PI / 2;
      const pu = add(new THREE.SphereGeometry(0.0121, 16, 8, 0, Math.PI * 2, 0, 0.21), pupil, 0, 0, 0, eye, false); pu.rotation.x = -Math.PI / 2;
    }
  }
  {
    // band hugs the top of the hood (outer shell ≈ 0.128 half-width, top ≈ +0.17 in head space)
    const hpG = new THREE.Group(); hpG.position.set(0, 0.042, 0.03); hpG.scale.setScalar(1.16); head.add(hpG);
    const hp = mat(0x0c0c0f, 0.3, 0.5);
    add(new THREE.TorusGeometry(0.121, 0.011, 12, 56, Math.PI), hp, 0, 0.004, 0.004, hpG);
    const pad = add(new THREE.TorusGeometry(0.11, 0.01, 10, 40, Math.PI * 0.55), redLeather, 0, 0.004, 0.004, hpG); pad.rotation.z = Math.PI * 0.225;
    for (const sx of [-1, 1]) {
      add(RB(0.012, 0.05, 0.02, 0.005), hp, sx * 0.12, 0.0, 0.004, hpG);
      const cup = add(new THREE.SphereGeometry(1, 28, 20), hp, sx * 0.126, -0.022, 0.004, hpG); cup.scale.set(0.022, 0.052, 0.044);
      const cush = add(new THREE.TorusGeometry(0.036, 0.012, 10, 28), mat(0x111114, 0.9), sx * 0.104, -0.022, 0.004, hpG); cush.rotation.y = Math.PI / 2; cush.scale.set(1, 1.25, 1);
      const ring = add(new THREE.TorusGeometry(0.03, 0.0035, 8, 32), glow(0xff2d3f, 3.5), sx * 0.148, -0.022, 0.004, hpG, false); ring.rotation.y = Math.PI / 2; ring.scale.set(1, 1.2, 1);
    }
  }

  /* ---------------- sculpted hands on the keyboard and mouse */
  const hands = {};
  for (const k of ['L', 'R']) {
    const fr = body.frames[k];
    const g = new THREE.Group(); g.position.fromArray(fr.w);
    g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...fr.r), new THREE.Vector3(...fr.u), new THREE.Vector3(...fr.f)));
    seat.add(g); hands[k] = { g, base: g.position.clone() };
    meshOf(k === 'L' ? P.handL : P.handR, skin, g);
    const nailGeo = new THREE.SphereGeometry(1, 16, 10);
    for (const n of body.nails[k]) {
      const m = new THREE.Mesh(nailGeo, nailM); m.position.fromArray(n.p);
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...n.r), new THREE.Vector3(...n.u), new THREE.Vector3(...n.f)));
      m.scale.set(n.w * 0.85, 0.0014, n.w * 1.25); g.add(m);
    }
  }

  return {
    head,
    update(t) {
      // idle life: a slow look around the screen, typing taps on the left hand, small mouse moves on the right
      head.rotation.y = Math.sin(t * 0.31) * 0.025; head.rotation.x = POSE.HEAD.pitch + Math.sin(t * 0.53) * 0.01;
      const tap = Math.max(0, Math.sin(t * 9.0) * Math.sin(t * 2.3)) ** 3;
      hands.L.g.position.copy(hands.L.base).y += -tap * 0.0025;
      hands.R.g.position.set(hands.R.base.x + Math.sin(t * 0.8) * 0.004, hands.R.base.y, hands.R.base.z + Math.sin(t * 0.57) * 0.003);
    },
  };
}
