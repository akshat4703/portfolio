import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Monotone cubic (PCHIP) — smooth, overshoot-free mapping through keyframes.
export function pchip(xs, ys) {
  const n = xs.length, h = [], d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
  };
}

export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
// Supersampled canvas: draw in logical W×H units, stored at W*s × H*s pixels.
export function hiCanvas(w, h, s = 2) { const [c, g] = makeCanvas(Math.round(w * s), Math.round(h * s)); g.scale(s, s); return [c, g]; }
let ANISO = 8;
export const setAniso = (n) => { ANISO = n; };
export function toTex(c, { srgb = true, repeat = null } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

export const mat = (color, roughness = 0.6, metalness = 0, o = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...o });
export const glow = (color, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });
export const RB = (w, h, d, r = 0.01, s = 3) => new RoundedBoxGeometry(w, h, d, s, Math.min(r, Math.min(w, h, d) / 2 - 1e-4));

// Objects hidden while the AO pass renders its normal/depth buffer (additive glows, glass…)
export const noAO = [];

export function add(geo, m, x = 0, y = 0, z = 0, parent, shadow = true) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow; mesh.receiveShadow = shadow;
  parent.add(mesh);
  return mesh;
}

/* --------------------------------------------------------------- noise → textures */
function makeNoise(seed) {
  const R = rng(seed), N = 256, P = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) P[i] = R();
  return (x, y, p) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const x0 = ((xi % p) + p) % p, x1 = (x0 + 1) % p, y0 = ((yi % p) + p) % p, y1 = (y0 + 1) % p;
    const a = P[x0 + y0 * N], b = P[x1 + y0 * N], c = P[x0 + y1 * N], d = P[x1 + y1 * N];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
// Tileable fractal noise, values ~0..1
export function fbm(w, h, { seed = 1, scale = 8, oct = 4, gain = 0.5, sx = 1 } = {}) {
  const noise = makeNoise(seed), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let f = scale, amp = 1, s = 0, n = 0;
    for (let o = 0; o < oct; o++) { s += amp * noise((x / w) * f * sx, (y / h) * f, f * sx); n += amp; amp *= gain; f *= 2; }
    out[x + y * w] = s / n;
  }
  return out;
}
export function normalCanvas(data, w, h, strength = 2) {
  const [c, g] = makeCanvas(w, h), img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = data[((x + 1) % w) + y * w] - data[((x - 1 + w) % w) + y * w];
    const dy = data[x + ((y + 1) % h) * w] - data[x + ((y - 1 + h) % h) * w];
    let nx = -dx * strength, ny = dy * strength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (x + y * w) * 4;
    img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}
export function normalTex(opts, strength, repeat) {
  const w = opts.w || 256, h = opts.h || 256;
  return toTex(normalCanvas(fbm(w, h, opts), w, h, strength), { srgb: false, repeat });
}
