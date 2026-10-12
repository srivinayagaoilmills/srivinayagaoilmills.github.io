/* Welcome splash (about 2 s, once per visit) and the short feature tour that follows (once per browser). */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const lang = () => document.documentElement.lang === 'ta' ? 'ta' : 'en';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  /* ---------- splash ---------- */
  function endSplash() {
    const el = $('#intro');
    const done = () => { document.documentElement.classList.remove('has-intro'); try { sessionStorage.setItem('sv_intro', '1'); } catch (e) {} setTimeout(startTour, 700); };
    if (!el) { done(); return; }
    el.classList.add('out'); setTimeout(() => { el.remove(); }, 650); done();
  }
  function runSplash() {
    const el = $('#intro'); if (!el) { startTour(); return; }
    const minMs = reduce ? 1200 : 2000, left = Math.max(0, minMs - performance.now());
    let loaded = document.readyState === 'complete', timeUp = false, fired = false;
    const go = () => { if (fired || !loaded || !timeUp) return; fired = true; endSplash(); };
    setTimeout(() => { timeUp = true; go(); }, left);
    if (!loaded) addEventListener('load', () => { loaded = true; go(); }, { once: true });
    setTimeout(() => { loaded = true; timeUp = true; go(); }, 4500);
  }

  /* ---------- feature tour ---------- */
  const STEPS = [
    { sel: '#langBtn', en: ['Your language', 'Switch between English and தமிழ்'], ta: ['உங்கள் மொழி', 'ஆங்கிலம் / தமிழ் மாற்றலாம்'] },
    { sel: '#themeBtn', en: ['Light or dark', 'Pick the look that is easy on your eyes'], ta: ['ஒளி அல்லது இருள்', 'உங்கள் கண்களுக்கு இதமான தோற்றம்'] },
    { sel: '#cartBtn', en: ['Your cart', 'Everything you add waits here until you order'], ta: ['உங்கள் கூடை', 'சேர்த்தவை அனைத்தும் இங்கே'] },
    { sel: '#hero .btn.gold, #hero .btn', en: ['Shop the oils', 'Five oils, pack sizes and combos'], ta: ['எண்ணெய் வாங்க', 'ஐந்து எண்ணெய்கள், அளவுகள், காம்போக்கள்'] },
    { scroll: true, en: ['Scroll down', 'Our story, rewards, tracking and more'], ta: ['கீழே நகருங்கள்', 'எங்கள் கதை, பரிசுப் புள்ளிகள், ஆர்டர் நிலை'] }
  ];
  const NS = 'http://www.w3.org/2000/svg';
  let tour = null;
  const vis = r => r && r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  function ringPath(r) { const p = 9, x = r.left - p, y = r.top - p, w = r.width + 2 * p, h = r.height + 2 * p, cx = x + w / 2, cy = y + h / 2, rx = w / 2 + 3, ry = h / 2 + 3;
    return `M ${cx - rx * .2} ${cy - ry} C ${cx + rx * .9} ${cy - ry * 1.05}, ${cx + rx * 1.05} ${cy + ry * .9}, ${cx - rx * .1} ${cy + ry * 1.02} C ${cx - rx * 1.1} ${cy + ry * 1.05}, ${cx - rx * 1.08} ${cy - ry * .9}, ${cx + rx * .3} ${cy - ry * 1.02} C ${cx + rx * .6} ${cy - ry * 1.03}, ${cx + rx * .7} ${cy - ry * .95}, ${cx + rx * .72} ${cy - ry * .9}`; }
  function arrowPath(from, to) { const dx = to.x - from.x, dy = to.y - from.y, bend = Math.min(60, Math.abs(dx) * .4 + 24) * (dx >= 0 ? -1 : 1), c1 = { x: from.x + dx * .1 + bend * .5, y: from.y + dy * .5 }, c2 = { x: to.x - dx * .1 + bend, y: to.y - dy * .35 };
    const a = Math.atan2(to.y - c2.y, to.x - c2.x), h = 13, l = a + 2.55, r = a - 2.55;
    return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y} M ${to.x + Math.cos(l) * h} ${to.y + Math.sin(l) * h} L ${to.x} ${to.y} L ${to.x + Math.cos(r) * h} ${to.y + Math.sin(r) * h}`; }
  const P = d => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('pathLength', '1'); return p; };
  function buildStep(s) {
    const L = lang(), vw = innerWidth, vh = innerHeight, step = document.createElement('div'); step.className = 'tour-step';
    let r, below = true;
    if (s.scroll) { r = { left: vw / 2 - 22, top: vh - 70, width: 44, height: 44, right: vw / 2 + 22, bottom: vh - 26 }; }
    else { const el = $(s.sel); r = el && el.getBoundingClientRect(); if (!vis(r)) return null; }
    const tw = Math.min(230, vw - 24), cx = r.left + r.width / 2;
    below = !s.scroll && r.bottom + 150 < vh && r.top < vh * .6;
    const tipLeft = Math.max(12, Math.min(vw - tw - 12, cx - tw / 2));
    const tip = document.createElement('div'); tip.className = 'tour-tip'; tip.style.width = tw + 'px'; tip.style.left = tipLeft + 'px';
    tip.innerHTML = `<b>${s[L][0]}</b><span>${s[L][1]}</span>`; step.appendChild(tip);
    document.body.appendChild(tip); const th = tip.offsetHeight; step.appendChild(tip);
    let tipTop, from, to;
    if (below) { tipTop = r.bottom + 84; from = { x: Math.max(tipLeft + 20, Math.min(tipLeft + tw - 20, cx)), y: tipTop - 4 }; to = { x: cx, y: r.bottom + 14 }; }
    else { tipTop = Math.max(70, r.top - 90 - th); from = { x: Math.max(tipLeft + 20, Math.min(tipLeft + tw - 20, cx)), y: tipTop + th + 4 }; to = { x: cx, y: r.top - 14 }; }
    tip.style.top = tipTop + 'px';
    const mk = (cls, d) => { const sv = document.createElementNS(NS, 'svg'); sv.setAttribute('class', cls); sv.setAttribute('width', vw); sv.setAttribute('height', vh); sv.appendChild(P(d)); return sv; };
    if (!s.scroll) step.appendChild(mk('tour-ring', ringPath(r)));
    step.appendChild(mk('tour-arrow', arrowPath(from, to)));
    return step;
  }
  function startTour(force) {
    if (tour) return;
    if (!force && (get('sv_tour') === '1' || scrollY > 200)) return;
    const steps = STEPS.map(buildStep).filter(Boolean); if (!steps.length) return;
    tour = document.createElement('div'); tour.className = 'tour'; tour.setAttribute('aria-hidden', 'true'); document.body.appendChild(tour);
    const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'tour-skip'; skip.setAttribute('aria-label', 'Skip the tour');
    skip.innerHTML = `<span>${lang() === 'ta' ? 'தவிர்' : 'Skip'}</span><i>${steps.map(() => '<u></u>').join('')}</i>`; document.body.appendChild(skip);
    const dots = [...skip.querySelectorAll('u')]; let i = 0, timer = null, closed = false;
    const STEP_MS = reduce ? 1700 : 1500;
    const show = n => { steps.forEach((s, k) => s.classList.toggle('on', k === n)); dots.forEach((d, k) => d.classList.toggle('on', k === n)); };
    const close = () => { if (closed) return; closed = true; clearTimeout(timer); set('sv_tour', '1'); tour.classList.add('out'); skip.style.opacity = '0'; setTimeout(() => { tour.remove(); skip.remove(); tour = null; }, 450); removeEventListener('pointerdown', close, true); removeEventListener('keydown', close, true); removeEventListener('scroll', onScroll); };
    const onScroll = () => { if (scrollY > 160) close(); };
    steps.forEach(s => tour.appendChild(s));
    const next = () => { if (closed) return; if (i >= steps.length) { timer = setTimeout(close, 900); return; } show(i++); timer = setTimeout(next, STEP_MS); };
    skip.addEventListener('click', close);
    addEventListener('pointerdown', e => { if (!e.target.closest('.tour-skip')) close(); }, { capture: true, once: true });
    addEventListener('keydown', close, { capture: true, once: true }); addEventListener('scroll', onScroll, { passive: true });
    next();
  }
  window.SVTour = { start: () => {
    /* replay from the footer: go back to the top first (the tour points at the header), then run */
    const go = () => setTimeout(() => startTour(true), 80);
    if (scrollY < 8) return go();
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    let n = 0; const wait = setInterval(() => { if (scrollY < 8 || ++n > 40) { clearInterval(wait); go(); } }, 50);
  } };

  if (document.documentElement.classList.contains('has-intro')) runSplash(); else setTimeout(startTour, 900);
})();
