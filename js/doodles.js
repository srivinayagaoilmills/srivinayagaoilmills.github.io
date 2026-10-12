/* Pulli kolam motifs (dot-and-loop designs) placed in the empty padding bands of each section.
   Purely decorative: aria-hidden, no pointer events, never over text or pictures (checked at run time). */
(function () {
  const N = 'stroke-linecap="round" stroke-linejoin="round"';
  const dot = (x, y, r = 2) => `<circle class="pl" cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`;
  const P = d => `<path pathLength="1" fill="none" d="${d}"/>`;
  /* lotus: eight petals around a centre dot, a pulli inside each petal */
  const lotus = (() => {
    let s = '';
    for (let k = 0; k < 8; k++) {
      const t = k * Math.PI / 4, a = .43, c = Math.cos, n = Math.sin, f = (r, th) => `${(32 + r * c(th)).toFixed(1)} ${(32 + r * n(th)).toFixed(1)}`;
      s += P(`M32 32Q${f(18, t - a)} ${f(28, t)}Q${f(18, t + a)} 32 32`) + dot((32 + 15 * c(t)).toFixed(1), (32 + 15 * n(t)).toFixed(1), 1.7);
    }
    return s + dot(32, 32, 2.3);
  })();
  /* diamond sikku: scalloped diamond rope round a diamond of nine dots */
  const diamond = P('M32 3C38 11 52 24 61 32C52 40 38 53 32 61C26 53 12 40 3 32C12 24 26 11 32 3Z') + P('M32 14C38 21 43 26 50 32C43 38 38 43 32 50C26 43 21 38 14 32C21 26 26 21 32 14Z') +
    dot(32, 32) + dot(21, 32) + dot(43, 32) + dot(32, 21) + dot(32, 43) + dot(32, 8, 1.8) + dot(32, 56, 1.8) + dot(8, 32, 1.8) + dot(56, 32, 1.8);
  /* 3 x 3 pulli grid wrapped by a rounded rope and a ring round the centre */
  const grid = '<rect pathLength="1" x="8" y="8" width="48" height="48" rx="20" transform="rotate(45 32 32)" fill="none"/>' + '<circle pathLength="1" cx="32" cy="32" r="9" fill="none"/>' +
    [18, 32, 46].map(y => [18, 32, 46].map(x => dot(x, y, x === 32 && y === 32 ? 2.4 : 1.8)).join('')).join('') + dot(32, 4, 1.6) + dot(32, 60, 1.6) + dot(4, 32, 1.6) + dot(60, 32, 1.6);
  /* braided strip: two waves crossing, a pulli in every loop */
  const strip = (() => {
    const w = 160, mid = 10, amp = 4.6, per = 32; let a = '', b = '';
    for (let x = 0; x <= w; x += 2) { const s = Math.sin(2 * Math.PI * x / per); a += (x ? 'L' : 'M') + x + ' ' + (mid + amp * s).toFixed(2); b += (x ? 'L' : 'M') + x + ' ' + (mid - amp * s).toFixed(2); }
    let d = ''; for (let k = 0; k < w / (per / 2); k++) d += dot(per / 4 + per / 2 * k, mid, 1.9);
    return { v: `0 0 ${w} 20`, h: P(a) + P(b) + d };
  })();
  const SET = { lotus: { v: '0 0 64 64', h: lotus }, diamond: { v: '0 0 64 64', h: diamond }, grid: { v: '0 0 64 64', h: grid }, strip };
  const svg = n => { const s = SET[n]; return `<svg viewBox="${s.v}" fill="none" stroke="currentColor" stroke-width="2.1" ${N} aria-hidden="true" focusable="false">${s.h}</svg>`; };
  /* [section, design, band (top/bottom), side (left/right/center), size px] */
  const MAP = [
    ['#oils', 'lotus', 'top', 'right', 64], ['#oils', 'strip', 'bottom', 'center', 200],
    ['#combos', 'diamond', 'top', 'right', 60], ['#combos', 'strip', 'bottom', 'center', 200],
    ['#process', 'grid', 'top', 'right', 62], ['#process', 'lotus', 'bottom', 'left', 56],
    ['#story', 'lotus', 'top', 'right', 64], ['#story', 'strip', 'bottom', 'center', 200],
    ['#why', 'diamond', 'top', 'right', 60], ['#why', 'strip', 'bottom', 'center', 200],
    ['#track', 'grid', 'top', 'right', 58], ['#track', 'strip', 'bottom', 'center', 200],
    ['#rewards', 'lotus', 'top', 'right', 62], ['#rewards', 'strip', 'bottom', 'center', 200],
    ['#reviews', 'diamond', 'top', 'right', 60], ['#reviews', 'strip', 'bottom', 'center', 200],
    ['#bulk', 'grid', 'top', 'right', 58], ['#bulk', 'strip', 'bottom', 'center', 200],
    ['#mill', 'lotus', 'top', 'right', 56],
    ['footer', 'strip', 'top', 'center', 220]
  ];
  const out = [];
  const hit = (a, b, m = 8) => a.left < b.right + m && a.right > b.left - m && a.top < b.bottom + m && a.bottom > b.top - m;
  const CONTENT = 'h1,h2,h3,h4,p,li,a,button,img,figure,input,textarea,select,label,address,blockquote,small,b,cite,.card,.combo,.step,.rev,.tl,.ft-map';
  function layout() {
    out.forEach(({ el, host, band, side, size, wrapSel }) => {
      const w = host.querySelector(wrapSel) || host, hr = host.getBoundingClientRect(), wr = w.getBoundingClientRect();
      const small = innerWidth < 700, sz = Math.round(size * (small ? .66 : 1)), h = el.dataset.d === 'strip' ? Math.round(sz / 8) : sz;
      el.style.width = sz + 'px'; el.style.height = h + 'px';
      const pad = parseFloat(getComputedStyle(host).paddingTop) || 0, padB = parseFloat(getComputedStyle(host).paddingBottom) || 0;
      const room = band === 'top' ? pad : padB;
      /* only use the band if it is really empty and big enough */
      if (room < h + 24) { el.style.display = 'none'; return; }
      el.style.display = '';
      const gap = Math.max(10, (room - h) / 2);
      el.style.top = band === 'top' ? gap + 'px' : 'auto'; el.style.bottom = band === 'bottom' ? gap + 'px' : 'auto';
      const left = wr.left - hr.left, right = hr.right - wr.right;
      if (side === 'left') { el.style.left = Math.max(14, left + 4) + 'px'; el.style.right = 'auto'; }
      else if (side === 'right') { el.style.right = Math.max(14, right + 4) + 'px'; el.style.left = 'auto'; }
      else { el.style.left = '50%'; el.style.right = 'auto'; el.style.marginLeft = (-sz / 2) + 'px'; }
      /* guard: never overlap any text or picture */
      const r = el.getBoundingClientRect(); let clash = false;
      host.querySelectorAll(CONTENT).forEach(c => { if (clash || el.contains(c) || c.closest('.dd') || c.closest('.intro')) return; const cr = c.getBoundingClientRect(); if (cr.width && cr.height && hit(r, cr)) clash = true; });
      if (clash) el.style.display = 'none';
    });
  }
  function place() {
    MAP.forEach(([sel, d, band, side, size]) => {
      const host = document.querySelector(sel); if (!host) return;
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      const el = document.createElement('span'); el.className = 'dd'; el.dataset.d = d; el.setAttribute('aria-hidden', 'true'); el.innerHTML = svg(d);
      host.appendChild(el); out.push({ el, host, band, side, size, wrapSel: ':scope > .wrap, :scope > div > .wrap' });
    });
    layout(); let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(layout, 150); });
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(layout, 300); }).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
    addEventListener('load', () => setTimeout(layout, 400));
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { out.forEach(o => o.el.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .1 });
    out.forEach(o => io.observe(o.el));
  }
  window.SVD = { svg, place, layout };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place); else place();
})();
