// DOM micro-interactions for the chapter panels (independent of the 3D scene).
//  - cascade order: each panel's children get --i, so they stagger in when main.js locks the chapter (.on)
//  - magnetic links: contact buttons lean toward the cursor (transform only, rAF-throttled, spring back on leave)
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

for (const sec of document.querySelectorAll('.slide')) [...sec.children].forEach((el, i) => el.style.setProperty('--i', i));

/* ---------------- magnetic links */
if (!reduce && matchMedia('(pointer: fine)').matches) {
  const PULL = 0.28, MAX = 10;
  for (const el of document.querySelectorAll('.mag')) {
    let raf = 0, tx = 0, ty = 0;
    const apply = () => { raf = 0; el.style.setProperty('--mx', `${tx}px`); el.style.setProperty('--my', `${ty}px`); };
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      tx = Math.max(-MAX, Math.min(MAX, (e.clientX - (r.left + r.width / 2)) * PULL));
      ty = Math.max(-MAX, Math.min(MAX, (e.clientY - (r.top + r.height / 2)) * PULL));
      if (!raf) raf = requestAnimationFrame(apply);
    });
    el.addEventListener('pointerleave', () => { tx = ty = 0; if (!raf) raf = requestAnimationFrame(apply); });
  }
}
