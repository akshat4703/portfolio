// Procedural canvas artwork for every texture in the room.
import { makeCanvas, hiCanvas, rng, fbm } from './lib.js';

export const timeStr = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const dayStr = () => new Date().toLocaleDateString([], { weekday: 'short' });

export function drawSpider(g, cx, cy, s, color, sy = 1) {
  g.save(); g.translate(cx, cy); g.scale(1, sy); g.fillStyle = color; g.strokeStyle = color;
  g.lineWidth = s * 0.055; g.lineJoin = 'miter'; g.lineCap = 'butt';
  const legs = [
    [[-0.07, -0.18], [-0.33, -0.46], [-0.4, -0.8]],
    [[-0.09, -0.08], [-0.46, -0.2], [-0.6, -0.48]],
    [[-0.09, 0.06], [-0.46, 0.14], [-0.6, 0.44]],
    [[-0.07, 0.16], [-0.32, 0.42], [-0.38, 0.8]],
  ];
  for (const sg of [1, -1]) for (const L of legs) {
    g.beginPath(); g.moveTo(L[0][0] * s * sg, L[0][1] * s); g.lineTo(L[1][0] * s * sg, L[1][1] * s); g.lineTo(L[2][0] * s * sg, L[2][1] * s); g.stroke();
  }
  g.beginPath(); g.ellipse(0, -0.2 * s, 0.09 * s, 0.13 * s, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(0, -0.08 * s); g.lineTo(0.13 * s, 0.12 * s); g.lineTo(0, 0.5 * s); g.lineTo(-0.13 * s, 0.12 * s); g.closePath(); g.fill();
  g.restore();
}

export function drawCode() {
  const W = 1280, H = 720; const [c, g] = hiCanvas(W, H, 1.5);
  g.fillStyle = '#0c0c11'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#121218'; g.fillRect(0, 0, W, 40); g.fillRect(0, 40, 220, H);
  g.font = '15px "JetBrains Mono"'; g.textBaseline = 'middle';
  g.fillStyle = '#ff2d3f'; g.fillRect(240, 38, 120, 2);
  g.fillStyle = '#e6e6ee'; g.fillText('room.js', 262, 20); g.fillStyle = '#6b6b78'; g.fillText('scroll.js    folder.ts', 390, 20);
  ['▾ akshat-os', '  ▸ public', '  ▾ src', '    room.js', '    scroll.js', '    folder.ts', '    shaders/', '  package.json', '  README.md'].forEach((t, i) => { g.fillStyle = i === 3 ? '#fff' : '#7d7d8a'; g.fillText(t, 16, 70 + i * 28); });
  const lines = [
    "import * as THREE from 'three';", '', '// akshat.os - room.js', 'export function buildRoom(scene) {',
    '  const desk = new Desk({ monitors: 3 });', '  const shelf = new Shelf({ discs: 30, pairs: 6 });',
    "  scene.add(desk, shelf, new Hoodie('miles'));", '', '  onScroll((t) => {',
    '    camera.position.lerp(path.getPoint(t), 0.08);', "    if (t > 0.9) openFolder('portfolio');", '  });', '}', '',
    "const stack = ['ts', 'react', 'node', 'three'];", '', 'async function ship(idea) {', '  const build = await compile(idea);',
    "  return deploy(build, { at: '02:00' });", '}',
  ];
  const kw = new Set(['import', 'from', 'export', 'function', 'const', 'new', 'return', 'async', 'await', 'if', 'as']);
  lines.forEach((ln, i) => {
    const y = 72 + i * 30; g.fillStyle = '#3d3d48'; g.textAlign = 'right'; g.fillText(String(i + 1), 272, y); g.textAlign = 'left';
    let x = 300; const re = /(\/\/.*$)|('[^']*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|(.)/g; let m;
    while ((m = re.exec(ln))) {
      const tok = m[0]; let col = '#d6d6e0';
      if (m[1]) col = '#5c5f6e'; else if (m[2]) col = '#9fe3b5'; else if (m[3]) col = '#f5b06b';
      else if (m[4]) { if (kw.has(tok)) col = '#ff5a6a'; else if (ln[re.lastIndex] === '(') col = '#7aa2ff'; else if (/^[A-Z]/.test(tok)) col = '#f0c674'; }
      else if (m[6]) col = '#8b8b98';
      g.fillStyle = col; g.fillText(tok, x, y); x += g.measureText(tok).width;
    }
  });
  g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(220, 72 + 9 * 30 - 14, W - 220, 28);
  g.fillStyle = '#121218'; g.fillRect(0, H - 30, W, 30); g.fillStyle = '#6b6b78'; g.font = '13px "JetBrains Mono"';
  g.fillText('main ✓   ln 10, col 58   UTF-8   JavaScript', 16, H - 15);
  return c;
}

export function createPlayer() {
  const W = 960, H = 540; const [c, g] = hiCanvas(W, H, 1.33);
  const [ac, ag] = makeCanvas(300, 300);
  const gr = ag.createLinearGradient(0, 0, 300, 300); gr.addColorStop(0, '#ff2d3f'); gr.addColorStop(0.55, '#5a1a7a'); gr.addColorStop(1, '#2436c9');
  ag.fillStyle = gr; ag.fillRect(0, 0, 300, 300);
  ag.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < 300; y += 10) for (let x = 0; x < 300; x += 10) { ag.beginPath(); ag.arc(x + 5, y + 5, 1 + (3.2 * (x + y)) / 600, 0, 7); ag.fill(); }
  drawSpider(ag, 156, 150, 150, 'rgba(80,104,255,.9)'); drawSpider(ag, 146, 150, 150, 'rgba(255,45,63,.9)'); drawSpider(ag, 150, 150, 150, '#0a0a0e');
  const draw = (t) => {
    g.fillStyle = '#09090d'; g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(200, 200, 0, 200, 200, 520); rg.addColorStop(0, 'rgba(120,40,160,.35)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.font = '500 14px "JetBrains Mono"'; g.textBaseline = 'middle'; g.fillStyle = '#ff2d3f'; g.fillText('▶ NOW PLAYING', 44, 42);
    g.fillStyle = '#6b6b78'; g.textAlign = 'right'; g.fillText('LIVE · 144 FPS', W - 44, 42); g.textAlign = 'left';
    g.drawImage(ac, 44, 76, 230, 230);
    g.fillStyle = '#fff'; g.font = '700 46px "Geist"'; g.fillText('Sunflower', 304, 130);
    g.fillStyle = '#a4a4b0'; g.font = '22px "Geist"'; g.fillText('Post Malone, Swae Lee', 306, 176);
    g.fillStyle = '#6b6b78'; g.font = '14px "JetBrains Mono"'; g.fillText('SPIDER-VERSE OST', 306, 214);
    const p = (t * 0.02) % 1; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(306, 270, 610, 3); g.fillStyle = '#ff2d3f'; g.fillRect(306, 270, 610 * p, 3);
    g.beginPath(); g.arc(306 + 610 * p, 271.5, 7, 0, 7); g.fillStyle = '#fff'; g.fill();
    const n = 56, bw = (W - 88) / n;
    for (let i = 0; i < n; i++) {
      const v = 0.5 + 0.5 * Math.sin(t * 3.1 + i * 0.45) * Math.sin(t * 1.7 + i * 0.13) + 0.25 * Math.sin(t * 7 + i);
      const h = 16 + Math.max(0, v) * 150;
      const bg = g.createLinearGradient(0, H - 40 - h, 0, H - 40); bg.addColorStop(0, '#ff2d3f'); bg.addColorStop(1, '#5068ff');
      g.fillStyle = bg; g.fillRect(44 + i * bw, H - 40 - h, bw - 5, h);
    }
  };
  draw(0);
  return { canvas: c, draw };
}

export function drawTerminal() {
  const [c, g] = hiCanvas(800, 500, 1.5);
  g.fillStyle = '#0b0b0f'; g.fillRect(0, 0, 800, 500); g.fillStyle = '#16161c'; g.fillRect(0, 0, 800, 34);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((cl, i) => { g.fillStyle = cl; g.beginPath(); g.arc(20 + i * 20, 17, 6, 0, 7); g.fill(); });
  g.font = '17px "JetBrains Mono"'; g.textBaseline = 'middle';
  const L = [['#7aa2ff', 'akshat@mbp ~/portfolio % ', '#e6e6ee', 'npm run dev'], ['#6b6b78', ''], ['#3ddc84', '  VITE v6.0.0  ready in 312 ms'], ['#6b6b78', ''], ['#e6e6ee', '  ➜  Local:   http://localhost:5173/'], ['#6b6b78', '  ➜  press h + enter to show help'], ['#6b6b78', ''], ['#ff2d3f', '  [hmr] room.js updated'], ['#7aa2ff', 'akshat@mbp ~/portfolio % ', '#e6e6ee', '▍']];
  L.forEach((l, i) => { const y = 68 + i * 32; g.fillStyle = l[0]; g.fillText(l[1], 22, y); if (l[2]) { g.fillStyle = l[2]; g.fillText(l[3], 22 + g.measureText(l[1]).width, y); } });
  return c;
}

export function drawKeyboard() {
  const W = 1024, H = 292; const [c, g] = makeCanvas(W, H);
  g.fillStyle = '#050507'; g.fillRect(0, 0, W, H);
  const rows = [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2], [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5], [1.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.2], [2.3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.7], [1.3, 1.3, 1.3, 6.3, 1.3, 1.3, 1.3, 1.3]];
  const u = (W - 24) / 15, kh = (H - 24) / 5;
  rows.forEach((row, r) => { let x = 12; row.forEach((w) => {
    const hue = 355 - (x / W) * 125; g.shadowColor = `hsl(${hue},100%,55%)`; g.shadowBlur = 10;
    g.fillStyle = '#131318'; g.beginPath(); g.roundRect(x + 3, 12 + r * kh + 3, w * u - 6, kh - 6, 6); g.fill();
    g.shadowBlur = 0; g.strokeStyle = `hsla(${hue},100%,58%,.85)`; g.lineWidth = 2; g.stroke(); x += w * u;
  }); });
  return c;
}

export function drawSpine(title, color, text = '#fff') {
  const [c, g] = hiCanvas(64, 512, 2);
  g.fillStyle = color; g.fillRect(0, 0, 64, 512);
  g.fillStyle = '#0070d1'; g.fillRect(0, 0, 64, 70);
  g.fillStyle = '#fff'; g.font = '700 22px "Geist"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PS5', 32, 36);
  g.save(); g.translate(32, 290); g.rotate(Math.PI / 2); g.fillStyle = text; g.font = '600 24px "Geist"'; g.fillText(title, 0, 0); g.restore();
  g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(22, 478, 20, 14);
  return c;
}

export function drawMat() {
  const [c, g] = hiCanvas(1024, 372, 2);
  g.fillStyle = '#0e0e12'; g.fillRect(0, 0, 1024, 372);
  g.strokeStyle = '#b3131f'; g.lineWidth = 6; g.strokeRect(8, 8, 1008, 356);
  g.strokeStyle = 'rgba(255,45,63,.14)'; g.lineWidth = 2;
  for (let i = 1; i < 7; i++) { g.beginPath(); g.arc(1016, 364, i * 46, Math.PI, Math.PI * 1.5); g.stroke(); }
  for (let a = 0; a < 6; a++) { const t = Math.PI + (a / 5) * (Math.PI / 2); g.beginPath(); g.moveTo(1016, 364); g.lineTo(1016 + Math.cos(t) * 320, 364 + Math.sin(t) * 320); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.2)'; g.font = '16px "JetBrains Mono"'; g.fillText('AKSHAT.OS', 30, 340);
  return c;
}

/* --------------------------------------------------------------- neon */
export function drawNeon(lines, W, H, { align = 'center', font = '"Tilt Neon"' } = {}) {
  const [c, g] = makeCanvas(W, H);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.textAlign = align; g.textBaseline = 'middle';
  const x = align === 'left' ? W * 0.06 : W / 2;
  for (const l of lines) {
    g.font = `400 ${l.size}px ${font}`;
    g.shadowColor = l.color; g.shadowBlur = l.size * 0.28; g.fillStyle = l.color; g.fillText(l.t, x, l.y);
    g.shadowBlur = l.size * 0.08; g.fillStyle = l.core || '#ffffff'; g.globalAlpha = 0.85; g.fillText(l.t, x, l.y); g.globalAlpha = 1;
  }
  return c;
}
export function drawControllerNeon() {
  const W = 512, H = 340; const [c, g] = makeCanvas(W, H);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.lineWidth = 14; g.lineJoin = 'round'; g.lineCap = 'round';
  const path = () => {
    g.beginPath(); g.moveTo(150, 90); g.lineTo(362, 90);
    g.bezierCurveTo(430, 90, 470, 160, 478, 230); g.bezierCurveTo(486, 300, 420, 320, 392, 270);
    g.lineTo(360, 222); g.lineTo(152, 222); g.lineTo(120, 270);
    g.bezierCurveTo(92, 320, 26, 300, 34, 230); g.bezierCurveTo(42, 160, 82, 90, 150, 90); g.closePath();
    g.moveTo(130, 135); g.lineTo(130, 185); g.moveTo(105, 160); g.lineTo(155, 160);
    g.moveTo(392, 138); g.arc(382, 138, 10, 0, 7); g.moveTo(420, 168); g.arc(410, 168, 10, 0, 7);
    g.moveTo(362, 168); g.arc(352, 168, 10, 0, 7); g.moveTo(392, 198); g.arc(382, 198, 10, 0, 7);
  };
  g.shadowColor = '#2f6bff'; g.shadowBlur = 30; g.strokeStyle = '#2f6bff'; path(); g.stroke();
  g.shadowBlur = 6; g.lineWidth = 5; g.strokeStyle = '#dfe8ff'; path(); g.stroke();
  return c;
}

/* --------------------------------------------------------------- posters */
export function drawPosterSpider() {
  const W = 512, H = 720; const [c, g] = hiCanvas(W, H, 2);
  g.fillStyle = '#0c0c12'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 12) for (let x = 0; x < W; x += 12) {
    const d = Math.hypot(x - W / 2, y - H * 0.42) / 360; const r = Math.max(0, 5.2 * (1 - d));
    g.fillStyle = '#e0192d'; g.beginPath(); g.arc(x + 6, y + 6, r, 0, 7); g.fill();
  }
  drawSpider(g, W / 2 + 10, H * 0.42, 300, 'rgba(80,104,255,.95)'); drawSpider(g, W / 2, H * 0.42, 300, '#07070a');
  g.fillStyle = '#f2f2f6'; g.font = '800 64px "Geist"'; g.fillText('NO.42', 34, H - 110);
  g.font = '15px "JetBrains Mono"'; g.fillStyle = '#9a9aa6'; g.fillText('BROOKLYN, AFTER DARK', 36, H - 66);
  g.fillStyle = '#ff2d3f'; g.fillRect(36, H - 48, 60, 3);
  return c;
}
export function drawPosterRonin() {
  const W = 512, H = 720; const [c, g] = hiCanvas(W, H, 2); const R = rng(11);
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#e9dcc6'); sky.addColorStop(1, '#cdb99a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.fillStyle = '#c8202c'; g.beginPath(); g.arc(W / 2, H * 0.36, 150, 0, 7); g.fill();
  for (let layer = 0; layer < 3; layer++) {
    g.fillStyle = ['#8d7f6c', '#4a4038', '#16120f'][layer]; g.beginPath(); g.moveTo(0, H);
    let x = 0; const base = H * (0.55 + layer * 0.1);
    while (x <= W) { g.lineTo(x, base - R() * (120 - layer * 30)); x += 40 + R() * 60; }
    g.lineTo(W, H); g.fill();
  }
  g.fillStyle = '#16120f'; g.fillRect(W * 0.52, H * 0.46, 5, 130); g.beginPath(); g.moveTo(W * 0.5, H * 0.6); g.lineTo(W * 0.56, H * 0.6); g.lineTo(W * 0.53, H * 0.44); g.fill();
  g.fillStyle = '#16120f'; g.font = '800 70px "Geist"'; g.fillText('RONIN', 36, H - 70);
  g.font = '14px "JetBrains Mono"'; g.fillText('CHAPTER 04: THE LONG NIGHT', 38, H - 34);
  return c;
}
export function drawPosterCity() {
  const W = 512, H = 720; const [c, g] = hiCanvas(W, H, 2); const R = rng(5);
  g.fillStyle = '#f3e21b'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#111'; for (let i = 0; i < 26; i++) { const y = R() * H; g.fillRect(0, y, W, 1 + R() * 3); }
  g.fillStyle = '#101010'; g.beginPath(); g.ellipse(W * 0.55, H * 0.36, 90, 110, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(W * 0.2, H); g.quadraticCurveTo(W * 0.3, H * 0.52, W * 0.55, H * 0.5); g.quadraticCurveTo(W * 0.85, H * 0.52, W * 0.95, H); g.fill();
  g.fillStyle = '#00e0ff'; g.fillRect(W * 0.45, H * 0.33, 110, 16);
  g.fillStyle = '#ff2a6d'; g.fillRect(W * 0.43, H * 0.345, 110, 6);
  g.save(); g.translate(40, H - 40); g.rotate(-Math.PI / 2); g.fillStyle = '#111'; g.font = '800 88px "Geist"'; g.fillText('AFTERLIFE', 0, 0); g.restore();
  g.fillStyle = '#111'; g.font = '13px "JetBrains Mono"'; g.fillText('NIGHT CITY · 2077', 160, 60);
  return c;
}

/* --------------------------------------------------------------- surfaces */
export function drawWood() {
  const W = 1024, H = 1024; const [c, g] = makeCanvas(W, H); const [rc, rg] = makeCanvas(W, H); const R = rng(21);
  const pw = W / 11; // ~0.18m planks for a 2m tile
  const grain = fbm(128, 512, { seed: 4, scale: 2, oct: 5, sx: 1 });
  for (let col = 0; col < 11; col++) {
    let y = -R() * 600;
    while (y < H) {
      const len = 380 + R() * 520; const l = 10 + R() * 7; const hue = 18 + R() * 8;
      g.fillStyle = `hsl(${hue},32%,${l}%)`; g.fillRect(col * pw, y, pw, len);
      rg.fillStyle = `rgb(${95 + R() * 40 | 0},0,0)`; rg.fillRect(col * pw, y, pw, len);
      for (let i = 0; i < 26; i++) {
        const gx = col * pw + R() * pw; g.strokeStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,220,190'},${0.03 + R() * 0.05})`; g.lineWidth = 1 + R() * 2;
        g.beginPath(); for (let s = 0; s <= 20; s++) { const yy = y + (len * s) / 20; const xx = gx + Math.sin(yy * 0.02 + i) * 3 + (grain[((yy & 511) * 128 + (i * 5 & 127))] - 0.5) * 10; s ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(col * pw, y, pw, 2); rg.fillStyle = '#fff'; rg.fillRect(col * pw, y, pw, 2);
      y += len;
    }
    g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(col * pw, 0, 2, H); rg.fillStyle = '#fff'; rg.fillRect(col * pw, 0, 2, H);
  }
  // roughness lives in green channel for three.js
  const img = rg.getImageData(0, 0, W, H); for (let i = 0; i < img.data.length; i += 4) { img.data[i + 1] = img.data[i]; img.data[i + 2] = img.data[i]; } rg.putImageData(img, 0, 0);
  return { color: c, rough: rc };
}

export function drawRug() {
  const W = 1024, H = 760; const [c, g] = hiCanvas(W, H, 1.5);
  g.fillStyle = '#131218'; g.fillRect(0, 0, W, H);
  const n = fbm(256, 190, { seed: 3, scale: 16, oct: 3 });
  const [nc, ng] = makeCanvas(256, 190); const img = ng.createImageData(256, 190);
  for (let i = 0; i < n.length; i++) { const v = 60 + n[i] * 80; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  ng.putImageData(img, 0, 0); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.6; g.drawImage(nc, 0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 3; g.strokeRect(30, 30, W - 60, H - 60);
  g.save(); g.translate(W / 2, H / 2); g.rotate(-0.08);
  g.font = 'italic 800 150px "Geist"'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowBlur = 30; g.shadowColor = '#3a55ff'; g.fillStyle = 'rgba(58,85,255,.75)'; g.fillText('AFTER', 10, -70); g.fillText('DARK', 10, 80);
  g.shadowColor = '#ff2d6a'; g.fillStyle = 'rgba(255,45,106,.85)'; g.fillText('AFTER', -4, -76); g.fillText('DARK', -4, 74);
  g.restore();
  const R = rng(8); g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.5})`; g.fillRect(R() * W, R() * H, 2 + R() * 5, 2 + R() * 5); }
  g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#131218'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
  return c;
}

export function drawGalaxy() {
  const W = 768, H = 384; const [c, g] = makeCanvas(W, H);
  const a = fbm(W, H, { seed: 12, scale: 3, oct: 5, sx: 2 }), b = fbm(W, H, { seed: 13, scale: 2, oct: 4, sx: 2 });
  const img = g.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const d = Math.pow(Math.max(0, a[i] - 0.35) / 0.65, 2.2), m = b[i];
    img.data[i * 4] = 6 + d * (120 + m * 140); img.data[i * 4 + 1] = 4 + d * (30 + (1 - m) * 60); img.data[i * 4 + 2] = 14 + d * 230; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const R = rng(2); for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(255,255,255,${R() * 0.9})`; const s = R() < 0.95 ? 1 : 2; g.fillRect(R() * W, R() * H, s, s); }
  return c;
}

export function drawTV() {
  const W = 1280, H = 720; const [c, g] = hiCanvas(W, H, 1.5); const R = rng(31);
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0b1030'); bg.addColorStop(1, '#05060c'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff'; g.font = '600 26px "Geist"'; g.fillText('Play', 70, 80);
  g.fillStyle = '#8a90b0'; g.font = '18px "Geist"'; g.fillText('Games     Media     Explore', 150, 80); g.fillText(timeStr(), W - 130, 80);
  const tiles = [['#c41225', '#2b0b3a', 'SPIDER-MAN 2'], ['#1f3a5a', '#0a1422', 'GHOST OF TSUSHIMA'], ['#6a5a1a', '#1a1408', 'ELDEN RING'], ['#2a6a4a', '#0a1a12', 'THE LAST OF US'], ['#3a2a8a', '#0a0822', 'ASTRO BOT']];
  tiles.forEach(([a, b, t], i) => {
    const x = 70 + i * 232, y = 130, w = i === 0 ? 300 : 210, h = i === 0 ? 300 : 210; const xx = i === 0 ? x : x + 90;
    const gr = g.createLinearGradient(xx, y, xx + w, y + h); gr.addColorStop(0, a); gr.addColorStop(1, b);
    g.fillStyle = gr; g.beginPath(); g.roundRect(xx, y, w, h, 14); g.fill();
    for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(255,255,255,${R() * 0.12})`; g.beginPath(); g.arc(xx + R() * w, y + R() * h, 10 + R() * 60, 0, 7); g.fill(); }
    if (i === 0) { g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke(); drawSpider(g, xx + w / 2, y + h / 2, 150, 'rgba(0,0,0,.75)'); }
    g.fillStyle = '#fff'; g.font = `700 ${i === 0 ? 24 : 16}px "Geist"`; g.fillText(t, xx + 16, y + h - 20);
  });
  g.fillStyle = '#fff'; g.font = '700 44px "Geist"'; g.fillText("Marvel's Spider-Man 2", 70, 510);
  g.fillStyle = '#9aa0c0'; g.font = '20px "Geist"'; g.fillText('Continue · 62% complete', 72, 552);
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(70, 590, 200, 56, 28); g.fill(); g.fillStyle = '#0b1030'; g.font = '600 22px "Geist"'; g.fillText('Play', 145, 626);
  return c;
}
