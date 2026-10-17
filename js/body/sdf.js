// Tiny signed-distance-field toolkit + Surface Nets mesher. No three.js dependency
// (runs inside a Web Worker). Distances in metres.

export const smin = (a, b, k) => {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
export const smax = (a, b, k) => -smin(-a, -b, k);
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/* ---------------------------------------------------------------- primitives
   Each returns { f(x,y,z), min:[..], max:[..] } */
export function sphere(c, r) {
  const [cx, cy, cz] = c;
  return { f: (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - r, min: [cx - r, cy - r, cz - r], max: [cx + r, cy + r, cz + r] };
}
export function ellipsoid(c, rad) {
  const [cx, cy, cz] = c, [rx, ry, rz] = rad, m = Math.min(rx, ry, rz);
  return {
    f: (x, y, z) => {
      const px = x - cx, py = y - cy, pz = z - cz;
      const k0 = Math.hypot(px / rx, py / ry, pz / rz), k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
      return k1 === 0 ? -m : (k0 * (k0 - 1)) / k1;
    },
    min: [cx - rx, cy - ry, cz - rz], max: [cx + rx, cy + ry, cz + rz],
  };
}
// iq's exact round cone (tapered capsule) from a (radius r1) to b (radius r2)
export function roundCone(a, b, r1, r2) {
  const [ax, ay, az] = a, bax = b[0] - ax, bay = b[1] - ay, baz = b[2] - az;
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const R = Math.max(r1, r2);
  return {
    f: (x, y, z) => {
      const pax = x - ax, pay = y - ay, paz = z - az;
      const yy = pax * bax + pay * bay + paz * baz, zz = yy - l2;
      const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
      const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
      const k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
      if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
    },
    min: [Math.min(ax, b[0]) - R, Math.min(ay, b[1]) - R, Math.min(az, b[2]) - R],
    max: [Math.max(ax, b[0]) + R, Math.max(ay, b[1]) + R, Math.max(az, b[2]) + R],
  };
}
// ring lying in the xz-plane
export function torusY(c, R, r) {
  const [cx, cy, cz] = c;
  return { f: (x, y, z) => Math.hypot(Math.hypot(x - cx, z - cz) - R, y - cy) - r, min: [cx - R - r, cy - r, cz - R - r], max: [cx + R + r, cy + r, cz + R + r] };
}

/* ---------------------------------------------------------------- shapes */
export class Shape {
  constructor() { this.items = []; this.min = [Infinity, Infinity, Infinity]; this.max = [-Infinity, -Infinity, -Infinity]; this.post = null; }
  add(p, k = 0) { this.items.push({ f: p.f, k, sub: false, lo: p.min, hi: p.max }); for (let i = 0; i < 3; i++) { this.min[i] = Math.min(this.min[i], p.min[i]); this.max[i] = Math.max(this.max[i], p.max[i]); } return this; }
  sub(p, k = 0) { this.items.push({ f: p.f, k, sub: true }); return this; }
  eval(x, y, z) {
    let d = 1e9; const it = this.items;
    for (let i = 0; i < it.length; i++) {
      const o = it[i];
      if (o.sub) { d = smax(d, -o.f(x, y, z), o.k); continue; }
      if (o.lo) { // bbox distance is a lower bound of the primitive's distance → skip if it can't matter
        const dx = Math.max(o.lo[0] - x, 0, x - o.hi[0]), dy = Math.max(o.lo[1] - y, 0, y - o.hi[1]), dz = Math.max(o.lo[2] - z, 0, z - o.hi[2]);
        if (dx * dx + dy * dy + dz * dz > (d + o.k) * (d + o.k) && d + o.k > 0) continue;
      }
      d = smin(d, o.f(x, y, z), o.k);
    }
    return this.post ? this.post(d, x, y, z) : d;
  }
}

/* ---------------------------------------------------------------- value noise */
function hash3(i, j, k) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1440662683)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function vnoise(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  let fx = x - i, fy = y - j, fz = z - k;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash3(i, j, k), hash3(i + 1, j, k), fx), l(hash3(i, j + 1, k), hash3(i + 1, j + 1, k), fx), fy),
    l(l(hash3(i, j, k + 1), hash3(i + 1, j, k + 1), fx), l(hash3(i, j + 1, k + 1), hash3(i + 1, j + 1, k + 1), fx), fy), fz) * 2 - 1;
}

/* ---------------------------------------------------------------- Surface Nets */
const OFF = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];

export function mesh(shape, h, pad = 0.01) {
  const min = shape.min.map((v) => v - pad), max = shape.max.map((v) => v + pad);
  const nx = Math.ceil((max[0] - min[0]) / h) + 1, ny = Math.ceil((max[1] - min[1]) / h) + 1, nz = Math.ceil((max[2] - min[2]) / h) + 1;
  const F = new Float32Array(nx * ny * nz), I = (i, j, k) => i + nx * (j + ny * k);
  const fn = (x, y, z) => shape.eval(x, y, z);

  // sparse sampling: skip blocks the surface cannot reach
  const B = 4;
  for (let k0 = 0; k0 < nz; k0 += B) for (let j0 = 0; j0 < ny; j0 += B) for (let i0 = 0; i0 < nx; i0 += B) {
    const i1 = Math.min(i0 + B, nx), j1 = Math.min(j0 + B, ny), k1 = Math.min(k0 + B, nz);
    const d = fn(min[0] + ((i0 + i1 - 1) / 2) * h, min[1] + ((j0 + j1 - 1) / 2) * h, min[2] + ((k0 + k1 - 1) / 2) * h);
    const far = Math.abs(d) > Math.hypot(i1 - i0, j1 - j0, k1 - k0) * 0.5 * h * 1.6;
    for (let k = k0; k < k1; k++) for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++)
      F[I(i, j, k)] = far ? d : fn(min[0] + i * h, min[1] + j * h, min[2] + k * h);
  }

  const cx = nx - 1, cy = ny - 1, C = (i, j, k) => i + cx * (j + cy * k);
  const vid = new Int32Array(cx * cy * (nz - 1)).fill(-1);
  const pos = []; const v = new Float32Array(8); let count = 0;
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { v[c] = F[I(i + OFF[c][0], j + OFF[c][1], k + OFF[c][2])]; if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of EDGES) {
      if (((mask >> a) & 1) === ((mask >> b) & 1)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += OFF[a][0] + t * (OFF[b][0] - OFF[a][0]); sy += OFF[a][1] + t * (OFF[b][1] - OFF[a][1]); sz += OFF[a][2] + t * (OFF[b][2] - OFF[a][2]); n++;
    }
    pos.push(min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h);
    vid[C(i, j, k)] = count++;
  }

  const ind = [];
  const quad = (a, b, c, d, inside, ax) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    // orientation: normal should point from inside to outside along the crossed axis
    const P = (q, o) => pos[q * 3 + o];
    const d1 = [P(c, 0) - P(a, 0), P(c, 1) - P(a, 1), P(c, 2) - P(a, 2)], d2 = [P(d, 0) - P(b, 0), P(d, 1) - P(b, 1), P(d, 2) - P(b, 2)];
    const n = [d1[1] * d2[2] - d1[2] * d2[1], d1[2] * d2[0] - d1[0] * d2[2], d1[0] * d2[1] - d1[1] * d2[0]];
    if ((n[ax] > 0) !== inside) ind.push(a, d, c, a, c, b); else ind.push(a, b, c, a, c, d);
  };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const inside = F[I(i, j, k)] < 0;
    if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1 && inside !== F[I(i + 1, j, k)] < 0)
      quad(vid[C(i, j - 1, k - 1)], vid[C(i, j, k - 1)], vid[C(i, j, k)], vid[C(i, j - 1, k)], inside, 0);
    if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && inside !== F[I(i, j + 1, k)] < 0)
      quad(vid[C(i - 1, j, k - 1)], vid[C(i - 1, j, k)], vid[C(i, j, k)], vid[C(i, j, k - 1)], inside, 1);
    if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && inside !== F[I(i, j, k + 1)] < 0)
      quad(vid[C(i - 1, j - 1, k)], vid[C(i, j - 1, k)], vid[C(i, j, k)], vid[C(i - 1, j, k)], inside, 2);
  }

  const P = new Float32Array(pos), IX = new Uint32Array(ind), N = new Float32Array(P.length);
  for (let t = 0; t < IX.length; t += 3) {
    const a = IX[t] * 3, b = IX[t + 1] * 3, c = IX[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], wx = P[c] - P[a], wy = P[c + 1] - P[a + 1], wz = P[c + 2] - P[a + 2];
    const nx2 = uy * wz - uz * wy, ny2 = uz * wx - ux * wz, nz2 = ux * wy - uy * wx;
    for (const q of [a, b, c]) { N[q] += nx2; N[q + 1] += ny2; N[q + 2] += nz2; }
  }
  for (let q = 0; q < N.length; q += 3) { const l = Math.hypot(N[q], N[q + 1], N[q + 2]) || 1; N[q] /= l; N[q + 1] /= l; N[q + 2] /= l; }
  return { position: P, normal: N, index: IX };
}

/* ---------------------------------------------------------------- extra primitives for props */
export function roundBox(c, half, r) {
  const [cx, cy, cz] = c, [hx, hy, hz] = half;
  return {
    f: (x, y, z) => {
      const qx = Math.abs(x - cx) - hx + r, qy = Math.abs(y - cy) - hy + r, qz = Math.abs(z - cz) - hz + r;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
    },
    min: [cx - hx, cy - hy, cz - hz], max: [cx + hx, cy + hy, cz + hz],
  };
}
// 2D distance (in xz) extruded along y between y0..y1 with rounded edges of radius r
export function extrude(d2, y0, y1, r, min, max) {
  const cy = (y0 + y1) / 2, h = (y1 - y0) / 2;
  return {
    f: (x, y, z) => {
      const w0 = d2(x, z) + r, w1 = Math.abs(y - cy) - h + r;
      return Math.min(Math.max(w0, w1), 0) + Math.hypot(Math.max(w0, 0), Math.max(w1, 0)) - r;
    },
    min: [min[0], y0, min[1]], max: [max[0], y1, max[1]],
  };
}
// Assign regions per vertex with a soft edge: returns {region (top), under (below), blend 0..1}.
// Last paint whose f(p) < 0 wins; within ±h of its edge the colour blends so boundaries are anti-aliased.
export function paint(position, paints, base = 0, h = 0.0014) {
  const n = position.length / 3, top = new Uint8Array(n), under = new Uint8Array(n), blend = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = position[i * 3], y = position[i * 3 + 1], z = position[i * 3 + 2];
    let cur = base, prev = base, t = 1;
    for (const p of paints) {
      const d = p.f(x, y, z);
      if (d < h) { const k = sstep(h, -h, d); if (k > 0.5 || cur === base) { prev = cur; cur = p.id; t = k; } else if (k > 0) { prev = p.id; t = 1 - k; } }
    }
    top[i] = cur; under[i] = prev; blend[i] = cur === prev ? 1 : t;
  }
  return { region: top, under, blend };
}
