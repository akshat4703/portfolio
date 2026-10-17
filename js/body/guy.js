// The guy at the desk, sculpted entirely in code: hoodie (hood up), head, jeans. SDFs meshed by Surface Nets
// in a worker (no three.js here). World space, metres; he sits facing the monitors (−z), right hand = +x.
// Hands are the jointed SDF hands in rig.js, posed on the keyboard + mouse (FRAMES); the arms are solved to them.
import { Shape, sphere, ellipsoid, roundCone, roundBox, mesh, paint, vnoise, sstep } from './sdf.js';
import { FRAMES } from './rig.js';

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => mul(a, 1 / len(a));
const lerp = (a, b, t) => add(a, mul(sub(b, a), t));

/* ------------------------------------------------------------ pose */
// two-bone IK: elbow on the pole side of the shoulder→wrist line
function ik(s, w, l1, l2, pole) {
  const d = Math.min(len(sub(w, s)), l1 + l2 - 0.002), dir = norm(sub(w, s));
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const p = norm(sub(pole, mul(dir, dot(pole, dir))));
  return add(add(s, mul(dir, along)), mul(p, h));
}
const HEAD = { o: [0.0, 1.295, 0.625], pitch: -0.14 }; // head centre (between the ears); pitched down at the monitor
const P = {
  hip: { L: [-0.095, 0.6, 0.755], R: [0.105, 0.6, 0.755] },
  knee: { L: [-0.135, 0.575, 0.33], R: [0.15, 0.57, 0.335] },
  ankle: { L: [-0.15, 0.105, 0.36], R: [0.17, 0.105, 0.325] },
  shoulder: { L: [-0.18, 1.105, 0.655], R: [0.185, 1.1, 0.645] },
  neck: [0.0, 1.16, 0.655],
};
P.wrist = { L: FRAMES.L.w, R: FRAMES.R.w };
P.elbow = {
  L: ik(P.shoulder.L, P.wrist.L, 0.29, 0.27, [-0.55, -1, 0.55]),
  R: ik(P.shoulder.R, P.wrist.R, 0.29, 0.27, [0.55, -1, 0.55]),
};
export const POSE = { HEAD, ...P };

/* ------------------------------------------------------------ helpers */
// primitive given in head-local space (face toward −z), placed by HEAD (pitch about x)
function inHead(p) {
  const [ox, oy, oz] = HEAD.o, c = Math.cos(-HEAD.pitch), s = Math.sin(-HEAD.pitch), R = 0.2;
  return { f: (x, y, z) => { const dy = y - oy, dz = z - oz; return p.f(x - ox, c * dy - s * dz, s * dy + c * dz); }, min: [ox - R, oy - R, oz - R], max: [ox + R, oy + R, oz + R] };
}
// world point → head-local
const toHead = (x, y, z) => { const c = Math.cos(-HEAD.pitch), s = Math.sin(-HEAD.pitch), dy = y - HEAD.o[1], dz = z - HEAD.o[2]; return [x - HEAD.o[0], c * dy - s * dz, s * dy + c * dz]; };
// distance to segment a→b and the parameter along it
function seg(p, a, b) { const ab = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / dot(ab, ab))); return [len(sub(p, add(a, mul(ab, t)))), t]; }
const shell = (outer, inner) => ({ f: (x, y, z) => Math.max(outer.f(x, y, z), -inner.f(x, y, z)), min: outer.min, max: outer.max });

/* ------------------------------------------------------------ hoodie (torso, sleeves, hood) */
// regions: 0 fleece · 1 rib knit (cuffs, hem, hood rim) · 2 seams / pocket edge · 3 red spider print on the back
function hoodie() {
  const S = new Shape();
  // torso, leaning slightly toward the desk
  S.add(ellipsoid([0, 1.0, 0.7], [0.195, 0.165, 0.125]));
  S.add(ellipsoid([0, 0.84, 0.725], [0.18, 0.15, 0.125]), 0.06);
  S.add(ellipsoid([0.005, 0.68, 0.755], [0.185, 0.1, 0.135]), 0.06);
  S.add(roundCone(P.shoulder.L, P.shoulder.R, 0.07, 0.07), 0.07);                       // shoulder line
  S.add(ellipsoid([0, 1.06, 0.735], [0.15, 0.09, 0.09]), 0.05);                         // upper back
  S.add(ellipsoid([0, 0.83, 0.598], [0.125, 0.07, 0.022]), 0.012);                      // kangaroo pocket
  S.add(ellipsoid([0, 1.15, 0.665], [0.1, 0.05, 0.09]), 0.04);                          // bunched hood at the neck
  // sleeves: puffy fleece, bunching above ribbed cuffs that sit over the wrist
  const cuff = {};
  for (const k of ['L', 'R']) {
    const s = P.shoulder[k], e = P.elbow[k], w = P.wrist[k], fa = norm(sub(w, e));
    cuff[k] = { a: sub(w, mul(fa, 0.085)), b: sub(w, mul(fa, 0.02)) };
    S.add(roundCone(s, e, 0.066, 0.056), 0.05);
    S.add(sphere(e, 0.058), 0.03);
    S.add(roundCone(e, cuff[k].a, 0.056, 0.049), 0.03);
    S.add(roundCone(cuff[k].a, cuff[k].b, 0.039, 0.036), 0.012);                        // rib cuff
  }
  // hood up: a shell around the head with the face opening cut away, falling onto the shoulders behind
  const hoodOut = ellipsoid([0, 0.018, 0.022], [0.128, 0.152, 0.148]), hoodIn = ellipsoid([0, 0.008, 0.004], [0.106, 0.13, 0.126]);
  const hood = shell(hoodOut, hoodIn);
  const opening = ellipsoid([0, -0.022, -0.125], [0.085, 0.125, 0.11]);
  S.add(inHead({ f: (x, y, z) => Math.max(hood.f(x, y, z), -opening.f(x, y, z), y < -0.11 ? -(y + 0.11) * 0.5 + hood.f(x, y, z) : -1), min: hoodOut.min, max: hoodOut.max }), 0.015);
  S.add(inHead(roundCone([0, -0.02, 0.1], [0, -0.17, 0.06], 0.06, 0.08)), 0.05);       // hood back → upper back
  S.add(inHead({ f: (x, y, z) => { const o = opening.f(x, y, z); return Math.max(Math.abs(o) - 0.012, hoodOut.f(x, y, z) - 0.004, -0.13 - y); }, min: hoodOut.min, max: hoodOut.max }), 0.006); // rolled hood rim
  // the seat flattens him from below
  const body = S;
  const shaped = { f: (x, y, z) => Math.max(body.eval(x, y, z), 0.6 - y), min: body.min, max: body.max };
  const T = new Shape(); T.add(shaped);
  // fabric: soft folds + elbow creases + bunching above the cuffs; rib knit on cuffs and hem
  T.post = (d, x, y, z) => {
    if (d > 0.02) return d;
    let n = vnoise(x * 22, y * 22, z * 22) * 0.0035 + vnoise(x * 60, y * 60, z * 60) * 0.0008;
    const p = [x, y, z];
    for (const k of ['L', 'R']) {
      const [de, te] = seg(p, P.shoulder[k], P.elbow[k]), [df, tf] = seg(p, P.elbow[k], cuff[k].a), [dc, tc] = seg(p, cuff[k].a, cuff[k].b);
      if (de < 0.09 && te > 0.6) n += Math.sin(te * 70) * 0.003 * sstep(0.6, 0.95, te);           // creases into the elbow
      if (df < 0.08) n += Math.sin(tf * 55 + Math.atan2(y - P.elbow[k][1], x - P.elbow[k][0]) * 2) * 0.0035 * sstep(0.55, 1, tf); // bunching
      if (dc < 0.06) n += Math.sin(Math.atan2(y - cuff[k].a[1], z - cuff[k].a[2]) * 28 + x * 0) * 0.0007;          // rib
    }
    if (y < 0.66 && y > 0.6) n += Math.sin(Math.atan2(x, z - 0.755) * 90) * 0.0007;                // hem rib
    return d + n;
  };
  const geo = mesh(T, 0.0045, 0.01);
  // spider on the back (2D in x/y, projected along z onto the back panel)
  const spider = (x, y) => {
    const X = Math.abs(x), Y = y - 0.99; let d = Math.hypot(X / 0.016, (Y + 0.012) / 0.03) - 1; d *= 0.016;
    d = Math.min(d, Math.hypot(X, Y - 0.028) - 0.011);
    const legs = [[[0.012, 0.01], [0.05, 0.05], [0.06, 0.1]], [[0.014, 0.0], [0.065, 0.03], [0.09, 0.06]], [[0.014, -0.012], [0.065, -0.03], [0.09, -0.07]], [[0.012, -0.022], [0.045, -0.06], [0.055, -0.11]]];
    for (const L of legs) for (let i = 0; i < 2; i++) { const [a, b] = [L[i], L[i + 1]], ab = [b[0] - a[0], b[1] - a[1]], t = Math.max(0, Math.min(1, ((X - a[0]) * ab[0] + (Y - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2))); d = Math.min(d, Math.hypot(X - a[0] - ab[0] * t, Y - a[1] - ab[1] * t) - (0.0045 - t * 0.0015)); }
    return d;
  };
  const paints = [
    { id: 2, f: (x, y, z) => (z < 0.62 && y < 0.905 && y > 0.755 ? Math.abs(ellipsoid([0, 0.83, 0.598], [0.125, 0.07, 0.03]).f(x, y, z)) - 0.0012 : 1) },
    { id: 1, f: (x, y) => (y < 0.655 ? -1 : 1) },
    { id: 1, f: (x, y, z) => Math.min(...['L', 'R'].map((k) => seg([x, y, z], cuff[k].a, cuff[k].b)[0] - 0.06)) },
    { id: 1, f: (x, y, z) => { const [hx, hy, hz] = toHead(x, y, z); return hy > -0.13 && hz < 0.02 ? Math.abs(opening.f(hx, hy, hz)) - 0.013 : 1; } },
    { id: 3, f: (x, y, z) => (z > 0.77 && y > 0.85 && y < 1.12 ? spider(x, y) : 1) },
  ];
  return { ...geo, ...paint(geo.position, paints, 0, 0.0015) };
}

/* ------------------------------------------------------------ head (local: face toward −z; placed by HEAD) */
// regions: 0 skin · 1 lips · 2 brows · 3 hair · 4 inner ear shadow
function head() {
  const S = new Shape();
  S.add(ellipsoid([0, 0.028, 0.012], [0.075, 0.09, 0.095]));                              // cranium
  S.add(ellipsoid([0, -0.036, -0.03], [0.065, 0.07, 0.072]), 0.035);                      // face mass
  for (const s of [-1, 1]) {
    S.add(roundCone([s * 0.056, -0.04, 0.005], [s * 0.022, -0.1, -0.068], 0.017, 0.015), 0.025); // jaw line
    S.add(ellipsoid([s * 0.045, -0.012, -0.066], [0.025, 0.02, 0.022]), 0.022);          // cheekbone + cheek
    S.add(ellipsoid([s * 0.077, -0.005, 0.008], [0.011, 0.029, 0.019]), 0.008);          // ear
    S.sub(ellipsoid([s * 0.031, 0.011, -0.095], [0.018, 0.011, 0.014]), 0.008);         // eye socket
    S.add(ellipsoid([s * 0.031, 0.0215, -0.0875], [0.0155, 0.0048, 0.0105]), 0.004);   // upper lid
    S.add(ellipsoid([s * 0.031, 0.0005, -0.0868], [0.014, 0.0032, 0.0095]), 0.004);    // lower lid
    S.add(sphere([s * 0.0135, -0.039, -0.108], 0.0088), 0.006);                          // nostril wing
    S.sub(sphere([s * 0.0075, -0.0455, -0.111], 0.0036), 0.002);                         // nostril
  }
  S.add(sphere([0, -0.102, -0.072], 0.019), 0.02);                                         // chin
  S.add(roundCone([-0.044, 0.03, -0.085], [0.044, 0.03, -0.085], 0.0085, 0.0085), 0.016); // brow ridge
  S.add(roundCone([0, 0.014, -0.098], [0, -0.03, -0.117], 0.0075, 0.0105), 0.01);         // nose bridge
  S.add(sphere([0, -0.034, -0.116], 0.0125), 0.008);                                       // nose tip
  S.add(ellipsoid([0, -0.0595, -0.1005], [0.022, 0.0066, 0.0095]), 0.006);               // upper lip
  S.add(ellipsoid([0, -0.0715, -0.098], [0.02, 0.0075, 0.0095]), 0.006);                  // lower lip
  S.sub(ellipsoid([0, -0.0655, -0.11], [0.021, 0.0012, 0.011]), 0.002);                   // mouth line
  S.add(ellipsoid([0, 0.058, 0.002], [0.079, 0.068, 0.097]), 0.008);                        // short hair cap
  S.add(roundCone([0, -0.07, 0.02], [0, -0.19, 0.05], 0.052, 0.058), 0.03);                // neck
  S.post = (d, x, y, z) => (d > 0.01 ? d : d + (y > 0.04 ? vnoise(x * 260, y * 260, z * 260) * 0.0011 : vnoise(x * 120, y * 120, z * 120) * 0.0002));
  const geo = mesh(S, 0.0021, 0.008);
  const hairline = (x, y, z) => { // front hairline curving back over the temples
    const front = 0.052 - Math.abs(x) * 0.15 + (z > -0.05 ? -0.02 : 0);
    return front - y + (Math.abs(x) > 0.06 && z > -0.03 ? -0.035 : 0);
  };
  const paints = [
    { id: 4, f: (x, y, z) => (Math.abs(x) > 0.07 ? ellipsoid([Math.sign(x) * 0.082, -0.005, 0.006], [0.006, 0.02, 0.012]).f(x, y, z) : 1) },
    { id: 3, f: (x, y, z) => (y > -0.02 ? hairline(x, y, z) : 1) },
    { id: 2, f: (x, y, z) => (z < -0.07 && Math.abs(x) > 0.012 && Math.abs(x) < 0.05 ? Math.abs(y - (0.031 + Math.abs(x) * 0.08 - (Math.abs(x) - 0.03) ** 2 * 3)) - 0.0042 : 1) },
    { id: 1, f: (x, y, z) => (z < -0.088 ? Math.min(ellipsoid([0, -0.0595, -0.1005], [0.021, 0.0064, 0.011]).f(x, y, z), ellipsoid([0, -0.0715, -0.098], [0.019, 0.0072, 0.011]).f(x, y, z)) : 1) },
  ];
  return { ...geo, ...paint(geo.position, paints, 0, 0.0012) };
}

/* ------------------------------------------------------------ jeans */
// regions: 0 denim · 1 seams · 2 faded knees/thighs
function jeans() {
  const S = new Shape();
  S.add(ellipsoid([0.005, 0.615, 0.765], [0.185, 0.1, 0.15]));                           // seat
  for (const k of ['L', 'R']) {
    S.add(roundCone(P.hip[k], P.knee[k], 0.088, 0.064), 0.05);
    S.add(sphere(P.knee[k], 0.064), 0.02);
    S.add(roundCone(P.knee[k], P.ankle[k], 0.062, 0.05), 0.02);
    S.add(roundCone(add(P.ankle[k], [0, 0.05, 0]), add(P.ankle[k], [0, -0.005, 0.01]), 0.054, 0.056), 0.02); // stacked hem
  }
  const T = new Shape(); T.add({ f: (x, y, z) => (z > 0.45 ? Math.max(S.eval(x, y, z), 0.52 - y) : S.eval(x, y, z)), min: S.min, max: S.max }); // seat flattens the bottom
  T.post = (d, x, y, z) => {
    if (d > 0.02) return d;
    let n = vnoise(x * 30, y * 30, z * 30) * 0.0025;
    for (const k of ['L', 'R']) { const [dk, tk] = seg([x, y, z], P.knee[k], P.ankle[k]); if (dk < 0.08 && tk > 0.75) n += Math.sin(tk * 90) * 0.003 * sstep(0.75, 1, tk); } // stacking at the hem
    for (const k of ['L', 'R']) { const [dh, th] = seg([x, y, z], P.hip[k], P.knee[k]); if (dh < 0.1 && th < 0.25) n += Math.sin(th * 60 + x * 40) * 0.002 * sstep(0.25, 0, th); } // lap creases
    return d + n;
  };
  const geo = mesh(T, 0.005, 0.01);
  const paints = [
    { id: 2, f: (x, y, z) => { let d = 1; for (const k of ['L', 'R']) { const [dd, t] = seg([x, y, z], P.hip[k], P.knee[k]); if (y > P.hip[k][1] - 0.01 && t > 0.3) d = Math.min(d, Math.abs(x - (P.hip[k][0] + (P.knee[k][0] - P.hip[k][0]) * t)) - 0.035); } return d; } },
    { id: 1, f: (x, y, z) => { let d = 1; for (const k of ['L', 'R']) { const sx = k === 'L' ? -1 : 1, [dd, t] = seg([x, y, z], P.hip[k], P.ankle[k]); if (dd < 0.1) d = Math.min(d, Math.abs(x - (P.hip[k][0] + sx * 0.085)) - 0.0018); } return d; } },
  ];
  return { ...geo, ...paint(geo.position, paints, 0, 0.0015) };
}

export const GUY_JOBS = {
  hoodie: () => ({ parts: { hoodie: hoodie() } }),
  head: () => ({ parts: { head: head() } }),
  jeans: () => ({ parts: { jeans: jeans() } }),
};
