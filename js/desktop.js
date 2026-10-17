// The monitor desktop wallpaper (canvas texture, 1600×900). Up close, main.js crossfades the screen into a live
// view of the inside of the PC (js/showcase.js), so scrolling dives through the screen rather than into an icon.
import { hiCanvas } from './lib.js';
import { timeStr, dayStr } from './art.js';

export const ART = { W: 1600, H: 900 };
const ICONS = [{ y: 130, label: 'resume.pdf', kind: 'pdf' }, { y: 260, label: 'games', kind: 'dir' }, { y: 390, label: 'sneakers.db', kind: 'db' }];
const MENU = ['File', 'Edit', 'View', 'Go', 'Window'];
const DOCK = [['#ff2d3f', '#7a0d17'], ['#5068ff', '#1b227a'], ['#1e1e26', '#0b0b0f'], ['#3ddc84', '#0f5a33'], ['#f5b06b', '#8a4a12'], ['#e9e9ef', '#8d8d98']];
const clock = () => `${dayStr()} ${timeStr()}`;

export function drawDesktopCanvas() {
  const { W, H } = ART; const [c, g] = hiCanvas(W, H, 1.5);
  g.fillStyle = '#07070b'; g.fillRect(0, 0, W, H);
  let rg = g.createRadialGradient(192, 900, 0, 192, 900, 992); rg.addColorStop(0, 'rgba(230,30,50,.5)'); rg.addColorStop(1, 'rgba(230,30,50,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  rg = g.createRadialGradient(1472, 0, 0, 1472, 0, 880); rg.addColorStop(0, 'rgba(70,90,255,.45)'); rg.addColorStop(1, 'rgba(70,90,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.035)';
  for (let x = 0; x < W; x += 40) g.fillRect(x, 0, 1, H);
  for (let y = 0; y < H; y += 40) g.fillRect(0, y, W, 1);
  // menubar
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, 34);
  g.font = '500 15px "JetBrains Mono"'; g.textBaseline = 'middle';
  g.fillStyle = '#ff2d3f'; g.fillText('◆', 18, 17);
  g.fillStyle = '#cfcfd8'; let mx = 48; for (const t of MENU) { g.fillText(t, mx, 17); mx += g.measureText(t).width + 26; }
  const clk = clock(); g.textAlign = 'right'; g.fillText(clk, W - 18, 17); g.fillText('⌁ 100%', W - 36 - g.measureText(clk).width, 17); g.textAlign = 'left';
  // icons
  for (const ic of ICONS) {
    const cx = 76, y = ic.y;
    if (ic.kind === 'pdf') { g.fillStyle = '#e9e9ef'; g.fillRect(cx - 22, y - 30, 44, 56); g.fillStyle = '#ff2d3f'; g.fillRect(cx - 16, y + 6, 32, 12); }
    else if (ic.kind === 'db') { g.fillStyle = '#15151b'; g.beginPath(); g.ellipse(cx, y, 26, 30, 0, 0, 7); g.fill(); g.fillStyle = '#26262f'; g.beginPath(); g.ellipse(cx, y - 18, 26, 9, 0, 0, 7); g.fill(); }
    else { g.fillStyle = '#44444f'; g.beginPath(); g.roundRect(cx - 30, y - 22, 60, 46, 5); g.fill(); g.fillStyle = '#2a2a34'; g.fillRect(cx - 30, y - 28, 26, 10); }
    g.fillStyle = '#dcdce4'; g.font = '13px "JetBrains Mono"'; g.textAlign = 'center'; g.fillText(ic.label, cx, y + 48); g.textAlign = 'left';
  }
  // dock
  g.fillStyle = 'rgba(20,20,26,.6)'; g.beginPath(); g.roundRect(620, 814, 360, 68, 18); g.fill();
  DOCK.forEach(([a, b], i) => { const x = 638 + i * 56; const gr = g.createLinearGradient(x, 826, x + 44, 870); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.beginPath(); g.roundRect(x, 826, 44, 44, 11); g.fill(); });
  return c;
}
