// SDF-sculpted props, meshed in a worker. Each returns geometry + per-vertex region ids.
import { Shape, sphere, ellipsoid, roundCone, roundBox, torusY, extrude, mesh, paint, vnoise, smin, sstep } from './sdf.js';

/* ------------------------------------------------------------ sneaker
   local: +x toe, y up, z across. Regions:
   0 base upper · 1 toe/eyestay overlay · 2 heel counter · 3 side stripe · 4 collar · 5 midsole · 6 outsole · 7 laces */
function footprint(x, z) {
  const c = [[-0.105, 0, 0.04], [-0.05, 0, 0.037], [0.02, 0.003, 0.042], [0.075, 0.004, 0.049], [0.118, 0.002, 0.035]];
  let d = 1e9; for (const [cx, cz, r] of c) d = smin(d, Math.hypot(x - cx, z - cz) - r, 0.04);
  return d;
}
function sneaker(high) {
  const S = new Shape(), lace = new Shape();
  const fpMin = [-0.15, -0.06], fpMax = [0.16, 0.06];
  S.add(extrude((x, z) => footprint(x, z) + 0.001, 0, 0.014, 0.004, fpMin, fpMax));                // outsole
  S.add(extrude((x, z) => footprint(x, z) - 0.001, 0.012, 0.036, 0.007, fpMin, fpMax), 0.004);    // midsole
  const up = new Shape();
  up.add(ellipsoid([-0.085, 0.075, 0], [0.05, 0.05, 0.044]));
  up.add(ellipsoid([-0.015, 0.068, 0], [0.075, 0.042, 0.05]), 0.02);
  up.add(ellipsoid([0.06, 0.05, 0.003], [0.055, 0.028, 0.05]), 0.02);
  up.add(ellipsoid([0.105, 0.042, 0.002], [0.032, 0.022, 0.036]), 0.02);
  if (high) up.add(roundCone([-0.095, 0.09, 0], [-0.088, 0.165, 0], 0.046, 0.042), 0.03);
  const topY = high ? 0.175 : 0.115;
  up.sub(ellipsoid([-0.066, topY + 0.018, 0], [0.042, 0.034, 0.03]), 0.008);                          // ankle opening (shallow)
  up.add(torusY([-0.066, topY - 0.006, 0], 0.036, 0.009), 0.01);                                        // padded collar rim
  S.add({ f: (x, y, z) => Math.max(up.eval(x, y, z), 0.028 - y), min: up.min, max: up.max }, 0.006);
  // tongue (tilted back)
  const tg = ellipsoid([0, 0, 0], [0.027, high ? 0.042 : 0.03, 0.022]), ty = high ? 0.14 : 0.1, tx = -0.028, ta = 0.45;
  S.add({ f: (x, y, z) => { const px = x - tx, py = y - ty; return tg.f(px * Math.cos(ta) - py * Math.sin(ta), px * Math.sin(ta) + py * Math.cos(ta), z); }, min: [tx - 0.05, ty - 0.05, -0.03], max: [tx + 0.05, ty + 0.05, 0.03] }, 0.012);
  // laces: bars across the vamp, rising toward the collar
  for (let i = 0; i < 5; i++) {
    const t = i / 4, x = 0.045 - t * 0.075, y = 0.084 + t * (high ? 0.04 : 0.026) + 0.004;
    const a = [x, y - 0.002, -0.024], m = [x - 0.004, y + 0.004, 0], b = [x, y - 0.002, 0.024];
    const l1 = roundCone(a, m, 0.003, 0.003), l2 = roundCone(m, b, 0.003, 0.003);
    S.add(l1, 0.002); S.add(l2, 0.002); lace.add(l1); lace.add(l2);
  }
  const toeCapS = ellipsoid([0.108, 0.04, 0], [0.052, 0.045, 0.07]);
  const seam = (e) => 0.00055 * Math.max(0, 1 - Math.abs(e) / 0.0011);
  S.post = (d, x, y, z) => d
    + (y > 0.04 ? seam(toeCapS.f(x, y, z)) : 0)                                            // stitched toe-cap seam
    + (y > 0.04 && x < -0.03 ? seam(x + 0.058 + (y - 0.04) * 0.3) : 0)                    // heel counter seam
    + Math.sin(x * 420) * 0.0006 * sstep(0.03, 0.06, x) * sstep(0.1, 0.07, x) * sstep(0.05, 0.07, y); // toe-box creases
  const geo = mesh(S, 0.003, 0.008);
  const toeCap = ellipsoid([0.108, 0.04, 0], [0.052, 0.045, 0.07]);
  const paints = [
    { id: 1, f: (x, y, z) => (y > 0.03 ? toeCap.f(x, y, z) : 1) },
    { id: 1, f: (x, y, z) => (y > 0.075 && Math.abs(z) < 0.034 && x > -0.055 && x < 0.07 ? -1 : 1) },                 // eyestay
    { id: 2, f: (x, y, z) => (y > 0.03 && x < -0.058 - (y - 0.04) * 0.3 && y < (high ? 0.12 : 0.1) ? -1 : 1) },
    { id: 3, f: (x, y, z) => { if (Math.abs(z) < 0.028 || y < 0.036) return 1; const t = Math.min(1, Math.max(0, (x + 0.09) / 0.13)); const cy = 0.048 + t * 0.045 + Math.sin(t * Math.PI) * 0.01; return Math.abs(y - cy) - 0.0085 * (1.2 - t * 0.7); } },
    { id: 4, f: (x, y, z) => (y > (high ? 0.148 : 0.098) && x < -0.02 ? -1 : 1) },
    { id: 5, f: (x, y) => (y < 0.037 && y > 0.0135 ? -1 : 1) },
    { id: 6, f: (x, y) => (y < 0.0135 ? -1 : 1) },
    { id: 7, f: (x, y, z) => lace.eval(x, y, z) - 0.0012 },
  ];
  return { ...geo, ...paint(geo.position, paints, 0) };
}

/* ------------------------------------------------------------ DualSense (x right, y up, z toward player)
   0 white shell · 1 black core/sticks/buttons · 2 touchpad */
function dualsense() {
  const S = new Shape();
  S.add(ellipsoid([0, 0, -0.004], [0.072, 0.019, 0.037]));
  for (const sx of [-1, 1]) {
    S.add(roundCone([sx * 0.042, -0.001, 0.0], [sx * 0.062, -0.011, 0.056], 0.024, 0.019), 0.022);
    S.add(sphere([sx * 0.052, 0.012, -0.026], 0.013), 0.014);                                   // shoulder/trigger bumps
    S.add(roundCone([sx * 0.024, 0.011, 0.013], [sx * 0.024, 0.026, 0.013], 0.0068, 0.0062), 0.003); // stick shaft
    S.add(ellipsoid([sx * 0.024, 0.029, 0.013], [0.0105, 0.0038, 0.0105]), 0.002);            // stick cap
  }
  S.add(roundBox([0, 0.0165, -0.012], [0.027, 0.0035, 0.016], 0.003), 0.004);                 // touchpad
  for (const [dx, dz] of [[0, -0.008], [0, 0.008], [-0.008, 0], [0.008, 0]]) {
    S.add(sphere([0.046 + dx, 0.0125, -0.004 + dz], 0.0045), 0.002);                           // face buttons
    S.add(roundBox([-0.046 + dx * 0.9, 0.0135, -0.004 + dz * 0.9], [0.004, 0.002, 0.004], 0.0015), 0.002); // d-pad
  }
  const geo = mesh(S, 0.0015, 0.006);
  const paints = [
    { id: 1, f: (x, y, z) => (Math.abs(x) < 0.036 && y > 0.004 && z > -0.03 ? -1 : 1) },
    { id: 1, f: (x, y, z) => Math.min(Math.hypot(x - 0.024, z - 0.013), Math.hypot(x + 0.024, z - 0.013)) - 0.0115 + (y < 0.01 ? 1 : 0) },
    { id: 1, f: (x, y, z) => (y > 0.009 && Math.abs(Math.abs(x) - 0.046) < 0.013 && Math.abs(z + 0.004) < 0.013 ? Math.min(Math.hypot(Math.abs(x) - 0.046, z + 0.004) - 0.0105, 0.0) - 0.0001 : 1) },
    { id: 2, f: (x, y, z) => (y > 0.017 && Math.abs(x) < 0.027 && z < 0.004 && z > -0.028 ? -1 : 1) },
  ];
  return { ...geo, ...paint(geo.position, paints, 0) };
}

/* ------------------------------------------------------------ mouse (x right, y up, z toward player)
   0 matte shell · 1 buttons · 2 wheel */
function mouse() {
  const S = new Shape();
  const body = ellipsoid([0, 0.004, 0.004], [0.031, 0.032, 0.058]);
  S.add({ f: (x, y, z) => Math.max(body.f(x, y, z), -y), min: body.min, max: body.max });
  S.add(ellipsoid([0.0, 0.002, 0.03], [0.03, 0.02, 0.032]), 0.02);                              // palm hump
  S.sub(roundBox([0, 0.03, -0.03], [0.0006, 0.03, 0.03], 0.0003), 0.0008);                       // button split
  S.sub(roundBox([0, 0.032, -0.028], [0.0045, 0.01, 0.013], 0.002), 0.001);                     // wheel well
  S.add(roundCone([-0.0022, 0.029, -0.028], [0.0022, 0.029, -0.028], 0.0085, 0.0085), 0.0005);  // wheel
  S.add(roundCone([-0.031, 0.012, -0.012], [-0.031, 0.013, 0.012], 0.0025, 0.0025), 0.002);      // side buttons
  const geo = mesh(S, 0.0014, 0.004);
  const paints = [
    { id: 1, f: (x, y, z) => (z < -0.004 && y > 0.018 ? -1 : 1) },
    { id: 2, f: (x, y, z) => (Math.abs(x) < 0.0035 && y > 0.02 && Math.abs(z + 0.028) < 0.011 ? -1 : 1) },
  ];
  return { ...geo, ...paint(geo.position, paints, 0) };
}

export const PROP_JOBS = {
  sneakerHigh: () => ({ props: { sneakerHigh: sneaker(true) } }),
  sneakerLow: () => ({ props: { sneakerLow: sneaker(false) } }),
  pad: () => ({ props: { dualsense: dualsense() } }),
  mouse: () => ({ props: { mouse: mouse() } }),
};
