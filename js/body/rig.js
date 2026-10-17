// Sculpts the hands (5 jointed fingers, knuckles, nails) as SDFs and meshes them. Pure JS (worker-safe).
// handL/handR are local to a wrist frame (x = hand right, y = back of hand, z = toward fingertips);
// HANDS below poses them on the keyboard and mouse, and guy.js solves the arms to these wrists.
import { Shape, sphere, ellipsoid, roundCone, mesh } from './sdf.js';


const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => mul(a, 1 / Math.hypot(...a));

/* ------------------------------------------------------------ pose (world) */
const HANDS = {
  L: { w: [-0.165, 0.848, 0.215], f: [0.2, -0.12, -1], u: [-0.3, 1, 0], side: -1, curl: [[0.3, 0.45, 0.3], [0.32, 0.48, 0.3], [0.34, 0.5, 0.32], [0.36, 0.52, 0.34]], splay: [0.09, 0.02, -0.05, -0.13] },
  R: { w: [0.36, 0.82, 0.225], f: [-0.03, -0.1, -1], u: [0.1, 1, 0], side: 1, curl: [[0.1, 0.2, 0.15], [0.1, 0.2, 0.15], [0.22, 0.38, 0.25], [0.3, 0.45, 0.3]], splay: [0.05, 0.0, -0.05, -0.1] },
};
for (const k of ['L', 'R']) {
  // right-handed frame (x = r, y = u, z = f): r = u × f  → thumb sits on +r for the right hand, −r for the left
  const H = HANDS[k]; const f = norm(H.f); const r = norm(cross(H.u, f)); const u = cross(f, r);
  Object.assign(H, { f, r, u });
}

/* ------------------------------------------------------------ hand */
function hand(H) {
  const s = H.side, S = new Shape(), nails = [];
  S.add(ellipsoid([0, 0, -0.04], [0.03, 0.021, 0.05]), 0);
  S.add(ellipsoid([0, 0.001, 0.006], [0.029, 0.018, 0.024]), 0.02);
  S.add(ellipsoid([0, 0.002, 0.052], [0.041, 0.0145, 0.048]), 0.02);
  S.add(ellipsoid([-s * 0.021, -0.006, 0.038], [0.017, 0.012, 0.032]), 0.015); // hypothenar
  S.add(ellipsoid([s * 0.02, -0.008, 0.04], [0.02, 0.013, 0.028]), 0.015);     // thenar
  const base = [[s * 0.028, 0.004, 0.096], [s * 0.009, 0.005, 0.099], [-s * 0.011, 0.004, 0.095], [-s * 0.029, 0.002, 0.086]];
  const lens = [[0.043, 0.025, 0.021], [0.047, 0.029, 0.023], [0.044, 0.027, 0.022], [0.034, 0.02, 0.019]];
  const rads = [[0.0095, 0.0086, 0.0079, 0.0068], [0.0098, 0.0089, 0.0081, 0.007], [0.0094, 0.0085, 0.0078, 0.0067], [0.0082, 0.0075, 0.0069, 0.006]];
  for (let i = 0; i < 4; i++) {
    const kn = base[i];
    S.add(roundCone([kn[0] * 0.55, 0.006, 0.03], kn, 0.008, 0.0085), 0.012); // metacarpal ridge
    S.add(sphere([kn[0], kn[1] + 0.003, kn[2]], rads[i][0] + 0.0008), 0.008); // knuckle
    const a = H.splay[i] * s; let th = 0, p = kn;
    for (let j = 0; j < 3; j++) {
      th += H.curl[i][j];
      const dir = [Math.sin(a) * Math.cos(th), -Math.sin(th), Math.cos(a) * Math.cos(th)];
      const q = add(p, mul(dir, lens[i][j]));
      S.add(roundCone(p, q, rads[i][j], rads[i][j + 1]), j === 0 ? 0.01 : 0.003);
      if (j < 2) S.add(sphere(q, rads[i][j + 1] * 1.06), 0.003); // joint
      if (j === 2) {
        const right = [Math.cos(a), 0, -Math.sin(a)], up = norm(cross(dir, right));
        S.add(sphere(add(sub(q, mul(dir, 0.004)), mul(up, -0.002)), rads[i][3] * 1.05), 0.004); // finger pad
        nails.push({ p: add(add(q, mul(dir, -0.008)), mul(up, rads[i][3] * 0.78)), r: right, u: up, f: dir, w: rads[i][3] * 0.9 });
      }
      p = q;
    }
  }
  // thumb
  const cmc = [s * 0.02, -0.004, 0.024], mcp = [s * 0.046, -0.013, 0.06];
  S.add(roundCone(cmc, mcp, 0.0145, 0.0118), 0.012);
  const d1 = norm([s * 0.35, -0.3, 0.8]), ip = add(mcp, mul(d1, 0.032));
  S.add(roundCone(mcp, ip, 0.0112, 0.0102), 0.004); S.add(sphere(ip, 0.0106), 0.003);
  const d2 = norm([s * 0.15, -0.42, 0.85]), tip = add(ip, mul(d2, 0.027));
  S.add(roundCone(ip, tip, 0.0102, 0.0088), 0.003);
  const tr = norm(cross([0, 1, 0], d2)), tu = norm(cross(d2, tr));
  const tu2 = s > 0 ? mul(tu, 1) : tu;
  nails.push({ p: add(add(tip, mul(d2, -0.009)), mul(tu2, 0.0075)), r: tr, u: tu2, f: d2, w: 0.0085 });
  return { geo: mesh(S, 0.0019, 0.006), nails };
}

// Independent jobs so the work can be spread across several workers.
export const JOBS = {
  handL: () => { const h = hand(HANDS.L); return { parts: { handL: h.geo }, nails: { L: h.nails } }; },
  handR: () => { const h = hand(HANDS.R); return { parts: { handR: h.geo }, nails: { R: h.nails } }; },
};
export const FRAMES = { L: HANDS.L, R: HANDS.R };

export function buildBody(names = Object.keys(JOBS), extra = {}) {
  const all = { ...JOBS, ...extra };
  const out = { parts: {}, nails: {}, props: {}, frames: FRAMES, ms: {} };
  for (const n of names) { const t = performance.now(); const r = all[n](); Object.assign(out.parts, r.parts || {}); Object.assign(out.nails, r.nails || {}); Object.assign(out.props, r.props || {}); out.ms[n] = Math.round(performance.now() - t); }
  return out;
}
