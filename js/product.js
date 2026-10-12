/* Oil page: language switch, live sizes and prices from the shop database, add to cart (same cart the shop uses), live price in the Product schema. */
(function () {
  'use strict';
  var H = document.documentElement, main = document.querySelector('.pp-main'), slug = main.dataset.slug;
  var T = {
    size: ['Pack size', 'அளவு'], qty: ['Quantity', 'எண்ணிக்கை'], add: ['Add to cart', 'கூடையில் சேர்'], out: ['Out of stock', 'இருப்பு இல்லை'],
    added: ['Added to your cart.', 'கூடையில் சேர்க்கப்பட்டது.'], view: ['View cart', 'கூடையைப் பார்'], more: ['Keep browsing', 'மேலும் பார்'],
    max: ['Online orders are limited to %1 of this size. For more, use the bulk enquiry.', 'இந்த அளவில் ஆன்லைனில் %1 வரை மட்டுமே. அதிகம் தேவையெனில் மொத்த விசாரணையைப் பயன்படுத்துங்கள்.'],
    fail: ['Could not load prices. Please open the shop to order.', 'விலைகளை ஏற்ற முடியவில்லை. ஆர்டர் செய்ய கடையைத் திறக்கவும்.'], shop: ['Open the shop', 'கடையைத் திற'],
    left: ['Only %1 left', 'இன்னும் %1 மட்டுமே'], pay: ['Free delivery above the amount shown in your cart.', 'கூடையில் காட்டப்படும் தொகைக்கு மேல் டெலிவரி இலவசம்.']
  };
  var lang = function () { return H.lang === 'ta' ? 1 : 0; };
  var t = function (k, a) { var s = T[k][lang()]; return a === undefined ? s : s.replace('%1', a); };
  var inr = function (n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* language buttons */
  var btns = document.querySelectorAll('.pp-top .lang button');
  function setLang(l, save) { H.lang = l; btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.l === l)); }); if (save) store.set('sv_lang', l); if (state.p) render(); }
  btns.forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.l, true); }); });

  /* cart */
  function readCart() { try { return JSON.parse(store.get('sv_cart') || '[]').filter(function (x) { return x && x.id && x.qty > 0; }); } catch (e) { return []; } }
  function badge() { var n = readCart().reduce(function (a, l) { return a + l.qty; }, 0), el = document.getElementById('ppN'); el.textContent = n; el.hidden = !n; }
  function addLine(id, qty, max) {
    var c = readCart(), ex = c.find(function (l) { return l.k === 'v' && l.id === id; }), n = (ex ? ex.qty : 0) + qty, capped = false;
    if (n > max) { n = max; capped = true; }
    if (ex) ex.qty = n; else c.push({ k: 'v', id: id, qty: n });
    store.set('sv_cart', JSON.stringify(c)); badge(); return capped ? max : 0;
  }

  var state = { p: null, v: null, q: 1, msg: '' };
  var vOf = function () { return state.p.variants.find(function (x) { return x.id === state.v; }); };
  function render() {
    var p = state.p, v = vOf(), box = document.getElementById('ppBuy'), max = v.max_online_qty || 100;
    var out = v.stock === 0;
    box.innerHTML = '<div class="chips" role="group" aria-label="' + esc(t('size')) + '">' + p.variants.map(function (x) {
      return '<button type="button" class="chip" data-v="' + x.id + '" aria-pressed="' + (x.id === state.v) + '"' + (x.stock === 0 ? ' disabled' : '') + '>' + esc(x.label) + '</button>'; }).join('') + '</div>' +
      (v.stock > 0 && v.stock <= 5 ? '<p class="low">' + esc(t('left', v.stock)) + '</p>' : '') +
      '<div class="pp-row"><div class="price">' + inr(v.price) + '</div>' +
      '<div class="qty" role="group" aria-label="' + esc(t('qty')) + '"><button type="button" data-q="-1" aria-label="−">−</button><output>' + state.q + '</output><button type="button" data-q="1" aria-label="+">+</button></div>' +
      '<button type="button" class="btn" data-add' + (out ? ' disabled' : '') + '>' + esc(out ? t('out') : t('add')) + '</button></div>' +
      '<p class="hint">' + esc(t('pay')) + '</p>' +
      (state.msg ? '<p class="pp-msg" role="status">' + esc(state.msg) + ' <a href="../index.html#cart">' + esc(t('view')) + '</a></p>' : '');
  }
  main.addEventListener('click', function (e) {
    if (!state.p) return;
    var c = e.target.closest('.chip[data-v]'); if (c) { state.v = c.dataset.v; state.q = 1; state.msg = ''; render(); return; }
    var q = e.target.closest('[data-q]'); if (q) { var max = vOf().max_online_qty || 100; state.q = Math.min(max, Math.max(1, state.q + (+q.dataset.q))); render(); return; }
    if (e.target.closest('[data-add]')) {
      var v = vOf(), capped = addLine(v.id, state.q, v.max_online_qty || 100);
      state.msg = capped ? t('max', capped) : t('added'); render();
    }
  });

  function schema(p) {
    var el = [].slice.call(document.querySelectorAll('script[type="application/ld+json"]')).find(function (s) { return /"@type": ?"Product"/.test(s.textContent); });
    if (!el) return;
    try {
      var o = JSON.parse(el.textContent), here = location.href.split('#')[0];
      o.offers = p.variants.map(function (v) { return { '@type': 'Offer', name: p.name_en + ' ' + v.label, price: String(v.price), priceCurrency: 'INR', availability: (v.stock === null || v.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: here }; });
      el.textContent = JSON.stringify(o);
    } catch (e) { /* schema stays without prices */ }
  }

  function fail() { document.getElementById('ppBuy').innerHTML = '<p class="pp-wait">' + esc(t('fail')) + '</p><a class="btn" href="../index.html#p-' + slug + '">' + esc(t('shop')) + '</a>'; }
  var l0 = H.lang === 'ta' ? 'ta' : 'en'; setLang(l0, false); badge();
  try {
    var sb = window.supabase.createClient(SV.url, SV.key);
    sb.from('products').select('id,slug,name_en,variants(id,label,price,stock,max_online_qty,is_active,sort_order)').eq('slug', slug).eq('is_active', true).maybeSingle().then(function (r) {
      var p = r && r.data; if (!p) return fail();
      p.variants = (p.variants || []).filter(function (v) { return v.is_active; }).sort(function (a, b) { return a.sort_order - b.sort_order; });
      if (!p.variants.length) return fail();
      state.p = p; var first = p.variants.find(function (v) { return v.stock !== 0; }) || p.variants[0]; state.v = first.id; render(); schema(p);
    }, fail);
  } catch (e) { fail(); }
})();
