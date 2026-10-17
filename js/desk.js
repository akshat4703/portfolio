// Desk, triple monitors, PC, laptop, PS5, peripherals.
import * as THREE from 'three';
import { mat, glow, add, RB, toTex, noAO, normalTex } from './lib.js';
import * as art from './art.js';
import { drawDesktopCanvas } from './desktop.js';

export const MON = { w: 0.62, h: 0.36, pos: new THREE.Vector3(0, 1.14, -0.3) };

function regionMesh(p, palette, opts = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(p.normal, 3));
  g.setIndex(new THREE.BufferAttribute(p.index, 1));
  const c = new THREE.Color(), col = new Float32Array(p.region.length * 3), rough = palette.map((x) => x[1]);
  const pal = palette.map((x) => new THREE.Color(x[0]));
  for (let i = 0; i < p.region.length; i++) { c.copy(pal[p.under[i]]).lerp(pal[p.region[i]], p.blend[i]); col.set(c.toArray(), i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: Math.min(...rough), clearcoat: opts.clearcoat ?? 0.2, clearcoatRoughness: 0.4 }));
  m.castShadow = m.receiveShadow = true; return m;
}

export function buildDesk(scene, { low, props }) {
  const metal = mat(0x0b0b0e, 0.3, 0.75);
  const anim = [];

  // desk
  const deskN = normalTex({ seed: 23, scale: 128, oct: 2, w: 512, h: 512 }, 1, [6, 2]);
  add(RB(2.6, 0.045, 0.8, 0.012), mat(0x121116, 0.42, 0.15, { normalMap: deskN, normalScale: new THREE.Vector2(0.05, 0.05) }), 0, 0.7375, -0.2, scene);
  for (const x of [-1.2, 1.2]) {
    add(new THREE.BoxGeometry(0.05, 0.715, 0.06), metal, x, 0.3575, -0.52, scene);
    add(new THREE.BoxGeometry(0.05, 0.715, 0.06), metal, x, 0.3575, 0.12, scene);
    add(new THREE.BoxGeometry(0.05, 0.04, 0.7), metal, x, 0.05, -0.2, scene);
  }
  add(new THREE.BoxGeometry(2.4, 0.06, 0.03), metal, 0, 0.62, -0.52, scene);
  add(new THREE.BoxGeometry(2.5, 0.006, 0.006), glow(0xff1e36, 2.6), 0, 0.712, 0.19, scene, false);

  // desk mat
  add(RB(1.15, 0.004, 0.42, 0.0015), mat(0xffffff, 0.9, 0, { map: toTex(art.drawMat()) }), 0.05, 0.762, 0.0, scene);

  // keyboard: aluminium case, real keycaps, RGB bleeding through the gaps
  {
    const U = 0.0195, KX = -0.06, KZ = 0.08, g = new THREE.Group(); g.position.set(KX, 0.763, KZ); g.rotation.x = 0.05; scene.add(g);
    add(RB(0.42, 0.018, 0.14, 0.005), mat(0x1a1a1f, 0.28, 0.85), 0, 0.009, 0, g);
    const glowPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.125), new THREE.MeshBasicMaterial({ map: toTex(art.drawKeyboard()) }));
    glowPlate.rotation.x = -Math.PI / 2; glowPlate.position.y = 0.0185; g.add(glowPlate);
    const rows = [
      [1, -0.5, 1, 1, 1, 1, -0.5, 1, 1, 1, 1, -0.5, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
      [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
      [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
      [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
    ];
    const caps = [];
    const x0 = -9.75 * U;
    rows.forEach((row, r) => {
      let x = x0; const z = (r - 2.5) * U + (r === 0 ? -0.004 : 0);
      row.forEach((w, c) => { if (w < 0) { x += -w * U; return; } caps.push({ x: x + (w * U) / 2, z, w, r, accent: (r === 0 && c === 0) || (r === 1 && c === 13) || (r === 3 && c === 11) }); x += w * U; });
      if (r > 0) for (let c = 0; c < 4; c++) caps.push({ x: x0 + 15.5 * U + (c + 0.5) * U, z, w: 1, r, accent: false }); // numpad
    });
    const byWidth = new Map();
    for (const k of caps) { const key = k.w; if (!byWidth.has(key)) byWidth.set(key, []); byWidth.get(key).push(k); }
    const capMat = new THREE.MeshPhysicalMaterial({ color: 0x17171b, roughness: 0.55, clearcoat: 0.1 });
    const accMat = new THREE.MeshPhysicalMaterial({ color: 0xb3131f, roughness: 0.5, clearcoat: 0.1 });
    const dummy = new THREE.Object3D();
    for (const [w, list] of byWidth) {
      const geo = RB(w * U - 0.0024, 0.0085, U - 0.0024, 0.0022, 2);
      for (const accent of [false, true]) {
        const L = list.filter((k) => k.accent === accent); if (!L.length) continue;
        const im = new THREE.InstancedMesh(geo, accent ? accMat : capMat, L.length); im.castShadow = im.receiveShadow = true;
        L.forEach((k, i) => { dummy.position.set(k.x, 0.0235, k.z); dummy.rotation.set((k.r - 3) * 0.045, 0, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
        g.add(im);
      }
    }
  }

  // mouse (sculpted)
  {
    const m = regionMesh(props.mouse, [[0x0e0e11, 0.5], [0x121216, 0.35], [0x2a2a30, 0.6]], { clearcoat: 0.25 });
    m.position.set(0.36, 0.762, 0.09); m.rotation.y = -0.04; scene.add(m);
    const strip = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0012, 6, 48, Math.PI), glow(0xff2d3f, 3));
    strip.rotation.x = -Math.PI / 2; strip.position.set(0.36, 0.765, 0.098); strip.scale.set(1, 1.9, 1); scene.add(strip);
  }
  // can
  add(new THREE.CylinderGeometry(0.033, 0.033, 0.155, 32), mat(0x101012, 0.25, 0.8), 0.56, 0.84, -0.06, scene);
  add(new THREE.CylinderGeometry(0.0335, 0.0335, 0.05, 32), mat(0xc41225, 0.3, 0.6), 0.56, 0.85, -0.06, scene);

  // monitors
  const player = art.createPlayer();
  const tex = { desk: toTex(drawDesktopCanvas()), code: toTex(art.drawCode()), player: toTex(player.canvas), term: toTex(art.drawTerminal()) };
  function monitor(w, h, map, lightColor, lightI) {
    const g = new THREE.Group();
    add(RB(w + 0.018, h + 0.018, 0.022, 0.006), mat(0x0a0a0d, 0.35, 0.4), 0, 0, 0, g);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map }));
    scr.position.z = 0.0115; g.add(scr);
    add(RB(w * 0.62, h * 0.6, 0.05, 0.02), mat(0x0d0d10, 0.45, 0.3), 0, 0, -0.03, g);
    add(new THREE.BoxGeometry(0.05, 0.3, 0.03), metal, 0, -0.23, -0.07, g);
    add(RB(0.24, 0.012, 0.17, 0.005), metal, 0, -0.374, -0.05, g);
    const L = new THREE.RectAreaLight(lightColor, lightI, w, h); L.position.z = 0.02; L.rotation.y = Math.PI; g.add(L);
    add(new THREE.BoxGeometry(0.004, 0.0015, 0.001), glow(0xffffff, 1.6), w / 2 - 0.02, -h / 2 - 0.0055, 0.0115, g, false);
    const amb = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(lightColor).multiplyScalar(0.22), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    amb.position.z = -0.06; amb.rotation.y = Math.PI; g.add(amb); noAO.push(amb);
    scene.add(g); return { g, scr };
  }
  const center = monitor(MON.w, MON.h, tex.desk, 0xb4b8ff, 4.5); center.g.position.copy(MON.pos);
  const left = monitor(0.56, 0.32, tex.code, 0x9fb0ff, 2.8); left.g.position.set(-0.64, 1.14, -0.22); left.g.rotation.y = 0.5;
  const right = monitor(0.56, 0.32, tex.player, 0xff5a7a, 2.8); right.g.position.set(0.64, 1.14, -0.22); right.g.rotation.y = -0.5;
  anim.push((t, dt, frame) => { if (frame % 2 === 0) { player.draw(t); tex.player.needsUpdate = true; } });

  // laptop
  const laptop = new THREE.Group(); laptop.position.set(0.86, 0.76, 0.08); laptop.rotation.y = -0.6; scene.add(laptop);
  const alu = mat(0x2a2b30, 0.3, 0.75);
  add(RB(0.32, 0.014, 0.22, 0.004), alu, 0, 0.007, 0, laptop);
  add(new THREE.PlaneGeometry(0.28, 0.12), mat(0x0c0c0f, 0.8), 0, 0.0145, -0.03, laptop).rotation.x = -Math.PI / 2;
  const hinge = new THREE.Group(); hinge.position.set(0, 0.014, -0.11); hinge.rotation.x = -0.28; laptop.add(hinge);
  add(RB(0.32, 0.21, 0.008, 0.004), alu, 0, 0.105, 0, hinge);
  const lscr = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.18), new THREE.MeshBasicMaterial({ map: tex.term })); lscr.position.set(0, 0.108, 0.0045); hinge.add(lscr);

  // PS5
  {
    const g = new THREE.Group(); g.position.set(1.13, 0.76, -0.36); g.rotation.y = -0.35; scene.add(g);
    const s = new THREE.Shape();
    s.moveTo(-0.115, 0); s.lineTo(0.105, 0); s.quadraticCurveTo(0.128, 0.2, 0.138, 0.39); s.quadraticCurveTo(0.0, 0.415, -0.138, 0.392); s.quadraticCurveTo(-0.128, 0.2, -0.115, 0);
    const eg = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 4, curveSegments: 32 });
    eg.rotateY(-Math.PI / 2);
    const white = new THREE.MeshPhysicalMaterial({ color: 0xf1f1f4, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
    add(eg, white, 0.051, 0.012, 0, g); add(eg, white, -0.035, 0.012, 0, g);
    add(RB(0.066, 0.37, 0.225, 0.012), mat(0x08080a, 0.2, 0.4), 0, 0.2, 0, g);
    const blue = glow(0x2a6bff, 4);
    add(new THREE.BoxGeometry(0.003, 0.33, 0.003), blue, 0.034, 0.2, 0.112, g, false);
    add(new THREE.BoxGeometry(0.003, 0.33, 0.003), blue, -0.034, 0.2, 0.112, g, false);
    add(new THREE.CylinderGeometry(0.055, 0.06, 0.012, 32), mat(0x0a0a0c, 0.4), 0, 0.006, 0, g);
    const L = new THREE.PointLight(0x2a6bff, 0.6, 0.8, 2); L.position.set(1.08, 0.95, -0.2); scene.add(L);
  }

  // DualSense (sculpted)
  {
    const g = new THREE.Group(); g.position.set(-0.62, 0.791, 0.1); g.rotation.y = 0.35; scene.add(g);
    g.add(regionMesh(props.dualsense, [[0xeeeef2, 0.38], [0x0c0c0f, 0.42], [0xe4e4ea, 0.3]], { clearcoat: 0.35 }));
    add(new THREE.BoxGeometry(0.05, 0.0015, 0.0025), glow(0x2a6bff, 3.5), 0, 0.0205, -0.029, g, false);
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.0025, 0.0015, 0.026), glow(0x2a6bff, 3.5), sx * 0.0285, 0.0205, -0.016, g, false);
  }

  // PC tower
  const fanMat = glow(0xff2d3f, 3);
  // curved fan blade
  const fans = [];
  const bs = new THREE.Shape(); bs.moveTo(0.017, -0.006); bs.quadraticCurveTo(0.036, -0.017, 0.051, -0.005); bs.lineTo(0.051, 0.011); bs.quadraticCurveTo(0.034, 0.013, 0.017, 0.008); bs.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(bs, { depth: 0.0015, bevelEnabled: false, curveSegments: 12 });
  const bladeMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1a22, roughness: 0.35, transmission: 0, transparent: true, opacity: 0.85 });
  {
    const g = new THREE.Group(); g.position.set(-1.12, 0.76, -0.28); scene.add(g);
    const W = 0.23, H = 0.48, D = 0.46, shell = mat(0x0b0b0e, 0.4, 0.5);
    add(new THREE.BoxGeometry(0.008, H, D), shell, -W / 2, H / 2, 0, g);
    add(new THREE.BoxGeometry(W, 0.012, D), shell, 0, H - 0.006, 0, g);
    add(new THREE.BoxGeometry(W, 0.02, D), shell, 0, 0.01, 0, g);
    add(new THREE.BoxGeometry(W, H, 0.008), shell, 0, H / 2, -D / 2, g);
    add(new THREE.BoxGeometry(W, H, 0.006), mat(0x111116, 0.85, 0.2), 0, H / 2, D / 2, g);
    for (let i = 0; i < 3; i++) {
      const y = 0.1 + i * 0.14;
      add(new THREE.TorusGeometry(0.055, 0.005, 8, 48), fanMat, 0, y, D / 2 + 0.005, g, false);
      add(new THREE.CylinderGeometry(0.018, 0.018, 0.004, 20), mat(0x151519, 0.5), 0, y, D / 2 + 0.004, g).rotation.x = Math.PI / 2;
      const rotor = new THREE.Group(); rotor.position.set(0, y, D / 2 - 0.004); g.add(rotor); fans.push(rotor);
      for (let b = 0; b < 7; b++) { const piv = new THREE.Group(); piv.rotation.z = (b / 7) * Math.PI * 2; rotor.add(piv); const bl = new THREE.Mesh(bladeGeo, bladeMat); bl.rotation.x = 0.35; piv.add(bl); }
      add(new THREE.TorusGeometry(0.055, 0.004, 8, 48), fanMat, -0.03, y + 0.02, -0.02, g, false).rotation.y = Math.PI / 2;
    }
    add(new THREE.BoxGeometry(0.004, 0.3, 0.28), mat(0x16161c, 0.6, 0.3), -W / 2 + 0.01, 0.3, -0.04, g);
    add(RB(0.14, 0.045, 0.28, 0.006), mat(0x1c1c22, 0.35, 0.6), -0.03, 0.2, 0.0, g);
    add(new THREE.BoxGeometry(0.003, 0.004, 0.26), fanMat, 0.041, 0.21, 0.0, g, false);
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 28), mat(0x1a1a20, 0.3, 0.6), -W / 2 + 0.035, 0.36, -0.06, g).rotation.z = Math.PI / 2;
    add(new THREE.TorusGeometry(0.042, 0.004, 8, 40), fanMat, -W / 2 + 0.052, 0.36, -0.06, g, false).rotation.y = Math.PI / 2;
    for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.006, 0.07, 0.008), fanMat, -W / 2 + 0.02, 0.37, 0.05 + i * 0.014, g, false);
    add(new THREE.BoxGeometry(W - 0.01, 0.08, D - 0.01), mat(0x0e0e12, 0.7, 0.2), 0, 0.06, 0, g);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.004, H - 0.02, D - 0.02), new THREE.MeshPhysicalMaterial({ color: 0x8899aa, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.14, depthWrite: false }));
    glass.position.set(W / 2, H / 2, 0); g.add(glass); noAO.push(glass);
  }
  const pcLight = new THREE.PointLight(0xff2d3f, 2.2, 1.6, 2); pcLight.position.set(-1.0, 1.0, -0.2); scene.add(pcLight);
  anim.push((t, dt) => { for (const f of fans) f.rotation.z -= (dt || 0.016) * 9; });
  anim.push((t) => {
    const hue = THREE.MathUtils.lerp(0.99, 0.66, (Math.sin(t * 0.45) + 1) / 2);
    fanMat.color.setHSL(hue, 1, 0.55).multiplyScalar(3); pcLight.color.setHSL(hue, 1, 0.5);
  });

  // cable management: everything runs behind the desk to a floor power strip
  {
    const cableM = mat(0x0a0a0c, 0.5, 0.05);
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const cable = (pts, r = 0.0032) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 80, r, 10, false), cableM); m.castShadow = true; scene.add(m); };
    cable([V(0, 0.8, -0.37), V(0.02, 0.765, -0.5), V(0.1, 0.55, -0.585), V(0.45, 0.06, -0.58), V(0.82, 0.015, -0.52)]);
    cable([V(-0.62, 0.8, -0.3), V(-0.6, 0.765, -0.5), V(-0.45, 0.45, -0.59), V(0.2, 0.02, -0.57), V(0.8, 0.015, -0.5)]);
    cable([V(0.62, 0.8, -0.3), V(0.6, 0.765, -0.5), V(0.62, 0.45, -0.59), V(0.78, 0.04, -0.56), V(0.86, 0.015, -0.5)]);
    cable([V(-1.12, 0.95, -0.52), V(-1.1, 0.74, -0.59), V(-0.9, 0.3, -0.6), V(-0.2, 0.015, -0.58), V(0.78, 0.015, -0.52)], 0.005);
    cable([V(-0.06, 0.772, 0.005), V(-0.1, 0.766, -0.16), V(-0.34, 0.766, -0.33), V(-0.8, 0.768, -0.38), V(-0.99, 0.8, -0.2)], 0.0022);
    cable([V(1.0, 0.768, 0.02), V(1.2, 0.765, -0.15), V(1.29, 0.62, -0.25), V(1.25, 0.2, -0.38), V(0.95, 0.015, -0.5)], 0.0026);
    add(RB(0.36, 0.035, 0.065, 0.006), mat(0x141418, 0.4, 0.2), 0.95, 0.0175, -0.5, scene);
    add(new THREE.BoxGeometry(0.006, 0.002, 0.004), glow(0xff2d3f, 3), 0.8, 0.036, -0.48, scene, false);
  }

  return { centerScreen: center.scr, update: (t, dt, frame) => anim.forEach((f) => f(t, dt, frame)) };
}
