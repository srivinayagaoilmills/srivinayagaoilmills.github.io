/* Sri Vinayaga admin panel. Every action is checked again in the database by role, so hiding a tab here is only for convenience. */
(function () {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const sb = window.supabase.createClient(SV.url, SV.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const dt = s => s ? new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
const dOnly = s => s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const q = async p => { const r = await p; if (r.error) throw r.error; return r.data; };
const cleanPhone = v => { let d = String(v || '').replace(/\D/g, ''); if (d.length > 10) d = d.slice(-10); return d; };
let ME = null, current = 'dash', timer = null;

function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('on'), 2800); }
const fail = e => { console.error(e); toast((e && e.message) ? e.message.replace(/^.*?:\s*/, m => m.length < 12 ? '' : m) : 'Something went wrong'); };
const run = fn => async (...a) => { try { await fn(...a); } catch (e) { fail(e); } };

/* ---------- modal helpers ---------- */
function openModal(html) { $('#sheet').innerHTML = html; $('#modal').hidden = false; document.body.style.overflow = 'hidden'; const f = $('input,select,textarea,button', $('#sheet')); if (f) f.focus(); }
function closeModal() { $('#modal').hidden = true; document.body.style.overflow = ''; }
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
function ask(title, body, okLabel = 'Confirm', danger = false) {
  return new Promise(res => {
    openModal(`<h2>${esc(title)}</h2><p>${esc(body)}</p><div class="foot"><button class="btn line" data-r="0">Cancel</button><button class="btn ${danger ? '' : 'gold'}" style="${danger ? 'background:var(--bad)' : ''}" data-r="1">${esc(okLabel)}</button></div>`);
    $('#sheet').onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; closeModal(); $('#sheet').onclick = null; res(b.dataset.r === '1'); };
  });
}

/* ---------- images ---------- */
const SITE_PHOTOS = [['hero-1', 'Iron expeller with golden oil'], ['hero-2', 'Oil pour close-up'], ['kitchen-1', 'Tempering in an iron kadai'], ['process-1-sundry', 'Seed drying in the sun'], ['process-2-press', 'Seed into the hopper'], ['process-3-settle', 'Settling drums'], ['process-4-bottle', 'Bottling'], ['bulk', 'Drums and tins'], ['texture', 'Sesame seeds and oil']];
const previewSrc = u => !u ? '' : (/^(assets\/)/.test(u) ? '../' + u : u);
async function resizeToBlob(file, max = 1800) {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  let blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.86)); let ext = 'webp';
  if (!blob || blob.type !== 'image/webp') { blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.88)); ext = 'jpg'; }
  return { blob, ext };
}
async function uploadImage(file, folder) {
  const { blob, ext } = await resizeToBlob(file);
  const name = (file.name || 'image').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'image';
  const path = `${folder}/${Date.now()}-${name}.${ext}`;
  const { error } = await sb.storage.from('site-images').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (error) throw error;
  return sb.storage.from('site-images').getPublicUrl(path).data.publicUrl;
}

/* ---------- generic form modal ---------- */
const toLocal = iso => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
function fieldHtml(f, v) {
  const val = v == null ? '' : v; const req = f.req ? 'required' : '';
  const hint = f.hint ? `<small class="hint">${esc(f.hint)}</small>` : '';
  switch (f.type) {
    case 'textarea': return `<label class="fl">${esc(f.label)}<textarea name="${f.k}" ${req}>${esc(val)}</textarea>${hint}</label>`;
    case 'number': return `<label class="fl">${esc(f.label)}<input type="number" name="${f.k}" value="${esc(val)}" step="${f.step || 1}" min="${f.min ?? 0}" ${req}>${hint}</label>`;
    case 'check': return `<label class="ck"><input type="checkbox" name="${f.k}" ${v ? 'checked' : ''}>${esc(f.label)}</label>`;
    case 'select': return `<label class="fl">${esc(f.label)}<select name="${f.k}">${f.opts.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(val) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>${hint}</label>`;
    case 'datetime': return `<label class="fl">${esc(f.label)}<input type="datetime-local" name="${f.k}" value="${esc(toLocal(v))}">${hint}</label>`;
    case 'color': return `<label class="fl">${esc(f.label)}<input type="color" name="${f.k}" value="${esc(val || '#1F4A38')}" style="padding:2px;height:46px">${hint}</label>`;
    case 'image': return `<div class="a-img" data-img="${f.k}" data-folder="${esc(f.folder || 'misc')}"><span style="font-weight:600;font-size:14px">${esc(f.label)}</span>
      <input type="hidden" name="${f.k}" value="${esc(val)}">
      <div class="pv"><img alt="" src="${esc(previewSrc(val))}" ${val ? '' : 'hidden'}><span class="hint" data-st>${val ? '' : 'No image yet'}</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn line sm" style="cursor:pointer">Upload a photo<input type="file" accept="image/*" hidden></label>
      ${f.photos ? `<select data-photo style="width:auto;min-height:36px"><option value="">Use a photo from the site</option>${SITE_PHOTOS.map(p => `<option value="assets/${p[0]}.webp">${esc(p[1])}</option>`).join('')}</select>` : ''}
      <button type="button" class="btn line sm" data-clear>Remove</button></div></div>`;
    default: return `<label class="fl">${esc(f.label)}<input type="text" name="${f.k}" value="${esc(val)}" ${req} ${f.pattern ? `pattern="${f.pattern}"` : ''}>${hint}</label>`;
  }
}
function formModal({ title, fields, values = {}, onSave, saveLabel = 'Save', extraHtml = '', after }) {
  let body = '', row = [];
  const flush = () => { if (row.length) { body += `<div class="row">${row.join('')}</div>`; row = []; } };
  fields.forEach(f => { const h = fieldHtml(f, values[f.k]); if (f.half) { row.push(h); if (row.length === 2) flush(); } else { flush(); body += h; } });
  flush();
  openModal(`<h2>${esc(title)}</h2><form class="f" id="mform" novalidate>${body}${extraHtml}<div class="msg err" id="mmsg" role="alert"></div><div class="foot"><button type="button" class="btn line" data-cancel>Cancel</button><button class="btn" type="submit">${esc(saveLabel)}</button></div></form>`);
  const form = $('#mform');
  if (after) after(form);
  form.addEventListener('click', e => { if (e.target.matches('[data-cancel]')) closeModal(); const c = e.target.closest('[data-clear]'); if (c) { const w = c.closest('[data-img]'); setImg(w, ''); } });
  form.addEventListener('change', run(async e => {
    const w = e.target.closest('[data-img]'); if (!w) return;
    if (e.target.type === 'file' && e.target.files[0]) {
      const st = $('[data-st]', w); st.textContent = 'Uploading…';
      try { setImg(w, await uploadImage(e.target.files[0], w.dataset.folder)); } catch (x) { st.textContent = 'Upload failed: ' + x.message; }
    }
    if (e.target.matches('[data-photo]') && e.target.value) { setImg(w, e.target.value); e.target.value = ''; }
  }));
  form.addEventListener('submit', async e => {
    e.preventDefault(); const m = $('#mmsg'); m.className = 'msg err';
    const out = {};
    for (const f of fields) {
      const el = form.elements[f.k]; if (!el) continue;
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (f.type === 'number') v = v === '' ? null : Number(v);
      else if (f.type === 'datetime') v = v ? new Date(v).toISOString() : null;
      else if (typeof v === 'string') { v = v.trim(); if (v === '' && f.nullable) v = null; }
      if (f.req && (v === '' || v == null)) { m.textContent = f.label + ' is required.'; m.classList.add('show'); return; }
      out[f.k] = v;
    }
    const btn = $('button[type=submit]', form); btn.disabled = true;
    try { await onSave(out, form); closeModal(); } catch (x) { m.textContent = x.message || 'Could not save'; m.classList.add('show'); btn.disabled = false; }
  });
}
function setImg(w, url) {
  $('input[type=hidden]', w).value = url; const im = $('img', w);
  if (url) { im.src = previewSrc(url); im.hidden = false; } else { im.hidden = true; }
  $('[data-st]', w).textContent = url ? '' : 'No image yet';
}

/* ---------- auth ---------- */
async function loadMe() {
  const { data } = await sb.auth.getSession();
  if (!data.session) return null;
  const { data: p } = await sb.from('profiles').select('*').eq('id', data.session.user.id).single();
  return p ? { ...p, email: data.session.user.email } : null;
}
const ROLE_NAME = { owner: 'Owner', staff: 'Staff', editor: 'Editor' };
async function boot() {
  ME = await loadMe();
  if (!ME || ME.role === 'customer') {
    if (ME) { await sb.auth.signOut(); ME = null; showLogin('This account does not have admin access. Ask the owner to give you a role.'); } else showLogin();
    return;
  }
  $('#login').hidden = true; $('#app').hidden = false;
  $('#me').innerHTML = `<b>${esc(ME.full_name || ME.email)}</b><br>${esc(ROLE_NAME[ME.role] || ME.role)}`;
  buildNav(); go(location.hash.slice(1) || 'dash');
  clearInterval(timer); timer = setInterval(refreshBadges, 60000);
}
function showLogin(msg) { $('#app').hidden = true; $('#login').hidden = false; if (msg) { const m = $('#loginMsg'); m.textContent = msg; m.className = 'msg err show'; } }
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const m = $('#loginMsg'); m.className = 'msg err';
  const id = f.id.trim(); const email = id.includes('@') ? id : (/^\d{10,}$/.test(id.replace(/\D/g, '')) ? cleanPhone(id) + '@' + SV.phoneDomain : id);
  const { error } = await sb.auth.signInWithPassword({ email, password: f.password });
  if (error) { m.textContent = 'Email, mobile number or password is not right.'; m.classList.add('show'); return; }
  await boot();
});
$('#logout').addEventListener('click', async () => { await sb.auth.signOut(); ME = null; clearInterval(timer); showLogin(); });

/* ---------- navigation ---------- */
const OPS = ['owner', 'staff'], ED = ['owner', 'editor'], ALL = ['owner', 'staff', 'editor'];
const TABS = [
  { id: 'dash', label: 'Dashboard', roles: ALL },
  { sep: 'Orders and customers', roles: ALL },
  { id: 'orders', label: 'Orders', roles: OPS, badge: 'orders' },
  { id: 'customers', label: 'Customers and points', roles: OPS },
  { id: 'enquiries', label: 'Bulk enquiries', roles: OPS, badge: 'enq' },
  { id: 'suggest', label: 'Suggestions', roles: ALL, badge: 'sug' },
  { id: 'reviews', label: 'Reviews', roles: OPS, badge: 'rev' },
  { sep: 'Shop content', roles: ED },
  { id: 'products', label: 'Products and prices', roles: ED },
  { id: 'combos', label: 'Combos', roles: ED },
  { id: 'offers', label: 'Offers and specials', roles: ED },
  { id: 'promos', label: 'Promo codes', roles: ['owner'] },
  { id: 'hero', label: 'Home banners', roles: ED },
  { id: 'festival', label: 'Festival', roles: ED },
  { sep: 'Owner only', roles: ['owner'] },
  { id: 'settings', label: 'Settings', roles: ['owner'] },
  { id: 'team', label: 'Team', roles: ['owner'] }
];
function buildNav() {
  $('#nav').innerHTML = TABS.filter(t => t.roles.includes(ME.role)).map(t => t.sep ? `<div class="sep">${esc(t.sep)}</div>` : `<button data-t="${t.id}">${esc(t.label)}${t.badge ? `<span class="cnt" data-b="${t.badge}" hidden></span>` : ''}</button>`).join('');
  refreshBadges();
}
$('#nav').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { go(b.dataset.t); $('#side').classList.remove('open'); } });
$('#menuBtn').addEventListener('click', () => $('#side').classList.toggle('open'));
$('#refresh').addEventListener('click', () => go(current, true));
async function refreshBadges() {
  const cnt = async (t, col, val) => { const r = await sb.from(t).select('id', { count: 'exact', head: true }).eq(col, val); return r.count || 0; };
  const set = (k, n) => { const el = $(`[data-b="${k}"]`); if (el) { el.textContent = n; el.hidden = !n; } };
  try {
    if (OPS.includes(ME.role)) { set('orders', await cnt('orders', 'status', 'placed')); set('enq', await cnt('enquiries', 'status', 'new')); set('rev', await cnt('reviews', 'status', 'pending')); }
    set('sug', await cnt('suggestions', 'status', 'new'));
  } catch (e) { /* badges are optional */ }
}
function go(id, keep) {
  const tab = TABS.find(t => t.id === id && t.roles.includes(ME.role)) || TABS[0];
  current = tab.id; if (!keep) history.replaceState(null, '', '#' + tab.id);
  $$('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.t === tab.id ? 'page' : 'false'));
  $('#title').textContent = tab.label;
  const main = $('#main'); main.innerHTML = '<p class="hint">Loading…</p>';
  Promise.resolve(VIEWS[tab.id](main)).catch(e => { main.innerHTML = `<div class="msg err show">${esc(e.message || 'Could not load')}</div>`; });
}

/* ---------- dashboard ---------- */
const VIEWS = {};
VIEWS.dash = async el => {
  const isOps = OPS.includes(ME.role);
  const cnt = async (t, f) => { let r = sb.from(t).select('id', { count: 'exact', head: true }); f.forEach(([k, v]) => { r = r.eq(k, v); }); return (await r).count || 0; };
  let html = `<p style="margin-bottom:20px">Hello ${esc((ME.full_name || '').split(' ')[0] || 'there')}. Here is what needs attention.</p>`;
  if (isOps) {
    const [np, pay, ne, nr] = await Promise.all([cnt('orders', [['status', 'placed']]), cnt('orders', [['payment_status', 'pending'], ['payment_mode', 'online']]), cnt('enquiries', [['status', 'new']]), cnt('reviews', [['status', 'pending']])]);
    html += `<div class="a-cards">
      <button class="a-stat ${np ? 'hot' : ''}" data-go="orders" style="text-align:left;cursor:pointer"><b>${np}</b><span>New orders to confirm</span></button>
      <button class="a-stat ${pay ? 'hot' : ''}" data-go="orders" style="text-align:left;cursor:pointer"><b>${pay}</b><span>Online orders awaiting payment call</span></button>
      <button class="a-stat" data-go="enquiries" style="text-align:left;cursor:pointer"><b>${ne}</b><span>New bulk enquiries</span></button>
      <button class="a-stat" data-go="reviews" style="text-align:left;cursor:pointer"><b>${nr}</b><span>Reviews waiting for approval</span></button></div>
      <div class="a-panel"><h3>Sales, last 30 days</h3><div id="chart"></div></div>`;
  } else {
    html += `<div class="a-empty">Use Products and prices, Combos, Offers and Home banners from the menu.</div>`;
  }
  el.innerHTML = html;
  el.onclick = e => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); };
  if (isOps) {
    try {
      const rows = await q(sb.rpc('admin_sales_summary', { p_days: 30 }));
      const map = Object.fromEntries(rows.map(r => [r.day, r])); const days = [];
      for (let i = 29; i >= 0; i--) { const d = new Date(Date.now() + 5.5 * 3600e3 - i * 864e5).toISOString().slice(0, 10); days.push([d, map[d]]); }
      const max = Math.max(1, ...days.map(d => d[1] ? +d[1].revenue : 0));
      const tot = rows.reduce((a, r) => a + +r.revenue, 0), n = rows.reduce((a, r) => a + +r.orders, 0);
      $('#chart').innerHTML = `<p class="hint">${n} orders, ${inr(tot)} (cancelled orders left out)</p><div class="a-bars">${days.map(([d, r]) => `<i style="height:${r ? Math.max(3, +r.revenue / max * 100) : 1}%" title="${d}: ${r ? inr(r.revenue) + ', ' + r.orders + ' orders' : 'no orders'}"></i>`).join('')}</div><div class="a-axis"><span>${dOnly(days[0][0])}</span><span>${dOnly(days[29][0])}</span></div>`;
    } catch (e) { $('#chart').innerHTML = `<p class="hint">${esc(e.message)}</p>`; }
  }
};

/* ---------- orders ---------- */
const STATUS_LABEL = { placed: 'Placed', confirmed: 'Confirmed', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
const NEXT = { placed: 'confirmed', confirmed: 'packed', packed: 'shipped', shipped: 'delivered' };
let orderFilter = 'open';
VIEWS.orders = async el => {
  const F = [['open', 'Open'], ['placed', 'New'], ['confirmed', 'Confirmed'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['all', 'All']];
  let query = sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(100);
  if (orderFilter === 'open') query = query.in('status', ['placed', 'confirmed', 'packed', 'shipped']); else if (orderFilter !== 'all') query = query.eq('status', orderFilter);
  const rows = await q(query);
  el.innerHTML = `<div class="a-toolbar"><div class="a-chips">${F.map(f => `<button class="chip" data-f="${f[0]}" aria-pressed="${orderFilter === f[0]}">${f[1]}</button>`).join('')}</div></div>
    ${rows.length ? rows.map(orderHtml).join('') : '<div class="a-empty">No orders here.</div>'}`;
  el.onclick = run(async e => {
    const f = e.target.closest('[data-f]'); if (f) { orderFilter = f.dataset.f; go('orders', true); return; }
    const card = e.target.closest('.a-order'); const b = e.target.closest('[data-act]'); if (!card || !b) return;
    const id = card.dataset.id; const o = rows.find(x => x.id === id);
    const note = $('[name=note]', card).value.trim();
    if (b.dataset.act === 'next') {
      const nx = NEXT[o.status];
      const msg = nx === 'delivered' ? `Mark ${o.order_no} as delivered? The customer's points are added now and this cannot be undone.` : `Mark ${o.order_no} as ${STATUS_LABEL[nx].toLowerCase()}?`;
      if (!(await ask('Update order', msg, 'Yes, update'))) return;
      await q(sb.rpc('set_order_status', { p_order: id, p_status: nx, p_note: note || null })); toast('Order updated'); go('orders', true);
    }
    if (b.dataset.act === 'cancel') {
      if (!(await ask('Cancel order', `Cancel ${o.order_no}? Any points the customer redeemed are given back and stock is returned.`, 'Cancel order', true))) return;
      await q(sb.rpc('set_order_status', { p_order: id, p_status: 'cancelled', p_note: note || null })); toast('Order cancelled'); go('orders', true);
    }
    if (b.dataset.act === 'pay') {
      await q(sb.rpc('set_payment_status', { p_order: id, p_status: o.payment_status === 'paid' ? 'pending' : 'paid' })); toast('Payment updated'); go('orders', true);
    }
    if (b.dataset.act === 'savenote') {
      const sel = $('[name=status]', card).value;
      await q(sb.rpc('set_order_status', { p_order: id, p_status: sel, p_note: note || null })); toast('Saved'); go('orders', true);
    }
  });
};
function orderHtml(o) {
  const items = (o.order_items || []).map(i => `<li>${esc(i.item_name)} ${esc(i.item_label)} × ${i.qty} <span style="float:right">${inr(i.line_total)}</span></li>`).join('');
  const call = o.payment_mode === 'online' && o.payment_status === 'pending' && o.status !== 'cancelled';
  const done = o.status === 'delivered' || o.status === 'cancelled';
  return `<article class="a-order ${o.status === 'placed' ? 'new' : ''}" data-id="${o.id}">
    <div class="a-oh"><span class="mono">${esc(o.order_no)}</span><span>${dt(o.created_at)}</span>
      <span class="pill-s ${o.status === 'delivered' ? 'on' : o.status === 'placed' ? 'warn' : ''}">${STATUS_LABEL[o.status]}</span></div>
    <div class="a-og">
      <div><h4>Customer</h4><b>${esc(o.customer_name)}</b><br><a href="tel:+91${esc(o.phone)}">${esc(o.phone)}</a> · <a href="https://wa.me/91${esc(o.phone)}" target="_blank" rel="noopener">WhatsApp</a><br>${esc(o.address)}<br>${esc(o.pincode)}${o.notes ? `<br><i>Note: ${esc(o.notes)}</i>` : ''}</div>
      <div><h4>Items</h4><ul>${items}</ul><div style="margin-top:8px;border-top:1px solid var(--line);padding-top:6px">
        Subtotal ${inr(o.subtotal)}${+o.promo_discount ? ` · promo ${esc(o.promo_code || '')} −${inr(o.promo_discount)}` : ''}${o.points_redeemed ? ` · points used −${inr(o.points_redeemed)}` : ''} · delivery ${o.delivery_fee ? inr(o.delivery_fee) : 'free'}<br><b>Total ${inr(o.total)}</b></div></div>
      <div><h4>Payment</h4>${o.payment_mode === 'online' ? 'Online' : 'Offline'} · <span class="pill-s ${o.payment_status === 'paid' ? 'on' : 'warn'}">${o.payment_status === 'paid' ? 'Paid' : 'Pending'}</span>
        ${call ? '<p class="a-hint" style="margin-top:8px">Call the customer to collect payment.</p>' : ''}
        <h4 style="margin-top:10px">Points</h4>${o.points_credited ? `${o.points_earned} credited` : `about ${o.points_estimate} when delivered`}</div>
    </div>
    <div class="a-oact">
      ${NEXT[o.status] ? `<button class="btn sm" data-act="next">Mark ${STATUS_LABEL[NEXT[o.status]].toLowerCase()}</button>` : ''}
      ${o.status !== 'cancelled' ? `<button class="btn line sm" data-act="pay">${o.payment_status === 'paid' ? 'Mark payment pending' : 'Mark paid'}</button>` : ''}
      ${!done ? '<button class="btn line sm" style="color:var(--bad)" data-act="cancel">Cancel order</button>' : ''}
      <input type="text" name="note" placeholder="Internal note" value="${esc(o.admin_note || '')}" aria-label="Internal note">
      <select name="status" aria-label="Status" hidden><option value="${o.status}" selected>${o.status}</option></select>
      <button class="btn line sm" data-act="savenote">Save note</button>
    </div></article>`;
}

/* ---------- customers ---------- */
VIEWS.customers = async el => {
  const rows = await q(sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(500));
  const draw = term => {
    const t = term.trim().toLowerCase();
    const list = rows.filter(r => !t || [r.full_name, r.phone, r.contact_email, r.referral_code].some(x => (x || '').toLowerCase().includes(t)));
    $('#custBody').innerHTML = list.map(r => `<tr data-id="${r.id}" style="cursor:pointer"><td><b>${esc(r.full_name || '(no name)')}</b>${r.role !== 'customer' ? ` <span class="pill-s warn">${esc(r.role)}</span>` : ''}</td><td>${esc(r.phone || '')}</td><td class="num">${(r.points_balance || 0).toLocaleString('en-IN')}</td><td class="num">${inr(r.lifetime_spend)}</td><td>${esc(r.referral_code)}</td><td>${dOnly(r.created_at)}</td></tr>`).join('') || '<tr><td colspan="6" class="hint">No customers match.</td></tr>';
  };
  el.innerHTML = `<div class="a-toolbar"><input type="search" id="cs" placeholder="Search name, mobile, email or code" aria-label="Search customers"><span class="hint">${rows.length} customers</span></div>
    <div class="a-scroll"><table class="a-t"><thead><tr><th>Name</th><th>Mobile</th><th class="num">Points</th><th class="num">Total purchases</th><th>Referral code</th><th>Joined</th></tr></thead><tbody id="custBody"></tbody></table></div>`;
  draw(''); $('#cs').addEventListener('input', e => draw(e.target.value));
  $('#custBody').addEventListener('click', run(async e => { const tr = e.target.closest('tr[data-id]'); if (tr) await customerModal(rows.find(r => r.id === tr.dataset.id)); }));
};
async function customerModal(c) {
  const [led, ords] = await Promise.all([q(sb.from('points_ledger').select('*').eq('user_id', c.id).order('created_at', { ascending: false }).limit(30)), q(sb.from('orders').select('order_no,status,total,created_at').eq('user_id', c.id).order('created_at', { ascending: false }).limit(10))]);
  const owner = ME.role === 'owner';
  openModal(`<h2>${esc(c.full_name || 'Customer')}</h2>
    <p>${esc(c.phone || '')}${c.contact_email ? ' · ' + esc(c.contact_email) : ''}<br>${esc(c.address || 'No address saved')} ${esc(c.pincode || '')}</p>
    <div class="a-cards" style="margin:14px 0"><div class="a-stat"><b>${(c.points_balance || 0).toLocaleString('en-IN')}</b><span>Points</span></div><div class="a-stat"><b>${inr(c.lifetime_spend)}</b><span>Total purchases</span></div><div class="a-stat"><b>${c.ref_count || 0}</b><span>Friends referred</span></div></div>
    ${owner ? `<form class="f" id="adj"><h3 style="font:600 16px var(--f-body)">Adjust points</h3><div class="row"><label class="fl">Points (use − to remove)<input type="number" name="d" step="1" required></label><label class="fl">Reason<input type="text" name="r" required placeholder="Shown in the customer's history"></label></div><div class="msg err" id="adjm"></div><button class="btn sm" type="submit" style="justify-self:start">Apply</button></form>` : ''}
    <h3 style="font:600 16px var(--f-body);margin:18px 0 8px">Recent orders</h3>${ords.length ? ords.map(o => `<div class="lg"><span>${esc(o.order_no)} · ${dOnly(o.created_at)} · ${STATUS_LABEL[o.status]}</span><b>${inr(o.total)}</b></div>`).join('') : '<p class="hint">None.</p>'}
    <h3 style="font:600 16px var(--f-body);margin:18px 0 8px">Points history</h3>${led.length ? led.map(l => `<div class="lg"><span>${esc(l.reason)}<br><small class="hint">${dOnly(l.created_at)}</small></span><b style="color:var(${l.delta > 0 ? '--good' : '--bad'})">${l.delta > 0 ? '+' : ''}${l.delta}</b></div>`).join('') : '<p class="hint">None.</p>'}
    <div class="foot"><button class="btn line" onclick="document.getElementById('modal').hidden=true;document.body.style.overflow=''">Close</button></div>`);
  const f = $('#adj'); if (f) f.addEventListener('submit', async e => {
    e.preventDefault(); const m = $('#adjm'); const d = parseInt(f.d.value, 10);
    try { await q(sb.rpc('admin_adjust_points', { p_user: c.id, p_delta: d, p_reason: f.r.value })); closeModal(); toast('Points updated'); go('customers', true); }
    catch (x) { m.textContent = /violates check/.test(x.message) ? 'That would take the balance below zero.' : x.message; m.className = 'msg err show'; }
  });
}

/* ---------- enquiries, suggestions, reviews ---------- */
VIEWS.enquiries = async el => {
  const rows = await q(sb.from('enquiries').select('*').order('created_at', { ascending: false }).limit(100));
  const S = ['new', 'contacted', 'quoted', 'won', 'closed'];
  el.innerHTML = rows.length ? rows.map(r => `<article class="a-order ${r.status === 'new' ? 'new' : ''}" data-id="${r.id}">
    <div class="a-oh"><span class="mono">${esc(r.ref_no)}</span><span>${dt(r.created_at)}</span></div>
    <div class="a-og"><div><h4>Contact</h4><b>${esc(r.name)}</b>${r.business ? ' · ' + esc(r.business) : ''}<br><a href="tel:+91${esc(r.phone)}">${esc(r.phone)}</a> · <a href="https://wa.me/91${esc(r.phone)}" target="_blank" rel="noopener">WhatsApp</a><br>${esc(r.city || '')}</div>
      <div><h4>Needs</h4>${esc((r.oils || []).join(', '))}<br>${r.qty_litres ? esc(r.qty_litres) + ' litres/kg · ' : ''}${esc(r.frequency || '')}${r.message ? `<br><i>${esc(r.message)}</i>` : ''}</div>
      <div><h4>Status</h4><select name="st">${S.map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>
    <div class="a-oact"><input type="text" name="note" placeholder="Internal note" value="${esc(r.admin_note || '')}"><button class="btn sm" data-save>Save</button></div></article>`).join('') : '<div class="a-empty">No enquiries yet.</div>';
  el.onclick = run(async e => { const b = e.target.closest('[data-save]'); if (!b) return; const c = b.closest('.a-order'); await q(sb.from('enquiries').update({ status: $('[name=st]', c).value, admin_note: $('[name=note]', c).value.trim() || null }).eq('id', c.dataset.id)); toast('Saved'); refreshBadges(); });
};
VIEWS.suggest = async el => {
  const rows = await q(sb.from('suggestions').select('*').order('created_at', { ascending: false }).limit(200));
  const S = ['new', 'considering', 'added', 'declined'];
  el.innerHTML = rows.length ? `<div class="a-scroll"><table class="a-t"><thead><tr><th>Wanted</th><th>Details</th><th>From</th><th>Date</th><th>Status</th></tr></thead><tbody>${rows.map(r => `<tr data-id="${r.id}"><td><b>${esc(r.product_wanted)}</b></td><td>${esc(r.details || '')}</td><td>${esc(r.name || '')} ${r.phone ? `<a href="tel:+91${esc(r.phone)}">${esc(r.phone)}</a>` : ''}</td><td>${dOnly(r.created_at)}</td><td><select>${S.map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>` : '<div class="a-empty">No suggestions yet.</div>';
  el.onchange = run(async e => { const tr = e.target.closest('tr[data-id]'); if (!tr) return; await q(sb.from('suggestions').update({ status: e.target.value }).eq('id', tr.dataset.id)); toast('Saved'); refreshBadges(); });
};
VIEWS.reviews = async el => {
  const rows = await q(sb.from('reviews').select('*').order('created_at', { ascending: false }).limit(100));
  el.innerHTML = rows.length ? rows.map(r => `<article class="a-order ${r.status === 'pending' ? 'new' : ''}" data-id="${r.id}"><div class="a-oh"><b>${esc(r.display_name)}${r.town ? ', ' + esc(r.town) : ''}</b><span>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span><span class="pill-s ${r.status === 'approved' ? 'on' : r.status === 'pending' ? 'warn' : ''}">${r.status}</span></div><p>${esc(r.body)}</p>
    <div class="a-oact">${r.status !== 'approved' ? '<button class="btn sm" data-s="approved">Show on site</button>' : ''}${r.status !== 'hidden' ? '<button class="btn line sm" data-s="hidden">Hide</button>' : ''}</div></article>`).join('') : '<div class="a-empty">No reviews yet. Customers can write one after a delivered order.</div>';
  el.onclick = run(async e => { const b = e.target.closest('[data-s]'); if (!b) return; await q(sb.from('reviews').update({ status: b.dataset.s }).eq('id', b.closest('.a-order').dataset.id)); toast('Saved'); go('reviews', true); refreshBadges(); });
};

/* ---------- products and prices ---------- */
const PACK = [['bottle', 'Bottle'], ['can', 'Can'], ['tin', 'Tin']];
VIEWS.products = async el => {
  const prods = await q(sb.from('products').select('*, variants(*)').order('sort_order'));
  el.innerHTML = `<div class="a-toolbar"><button class="btn" id="addP">Add a product</button><span class="grow"></span><button class="btn gold" id="saveAll" disabled>Save price changes</button></div>
    <p class="a-hint">Change a price, stock or limit in the table, then press Save price changes. Leave stock empty if you do not want to count it. "Online limit" is the most a customer can order online; above it they are sent to the bulk enquiry.</p>
    ${prods.length ? prods.map(p => productHtml(p)).join('') : '<div class="a-empty">No products yet.</div>'}`;
  const dirty = new Set();
  el.oninput = e => { const tr = e.target.closest('tr[data-v]'); if (tr) { dirty.add(tr.dataset.v); tr.style.background = 'var(--gold-soft)'; $('#saveAll').disabled = false; } };
  el.onclick = run(async e => {
    if (e.target.id === 'addP') return productForm(null, prods.length + 1);
    if (e.target.id === 'saveAll') {
      const btn = e.target; btn.disabled = true;
      for (const id of dirty) {
        const tr = $(`tr[data-v="${id}"]`, el); const num = n => { const v = $(`[name=${n}]`, tr).value; return v === '' ? null : Number(v); };
        const price = num('price'); if (price == null || price < 0) { toast('Enter a valid price'); btn.disabled = false; return; }
        const mrp = num('mrp'); if (mrp != null && mrp < price) { toast('MRP cannot be lower than the selling price'); btn.disabled = false; return; }
        await q(sb.from('variants').update({ price, mrp, stock: num('stock'), max_online_qty: num('max'), is_active: $('[name=act]', tr).checked }).eq('id', id));
      }
      toast('Saved ' + dirty.size + ' change' + (dirty.size > 1 ? 's' : '')); go('products', true); return;
    }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const p = prods.find(x => x.id === (b.closest('[data-p]') || {}).dataset?.p);
    if (b.dataset.act === 'editP') productForm(p);
    if (b.dataset.act === 'addV') variantForm(p);
    if (b.dataset.act === 'editV') variantForm(p, p.variants.find(v => v.id === b.dataset.v));
    if (b.dataset.act === 'delV') { if (await ask('Delete this pack size?', 'It is removed from the shop. Past orders keep their details. If it is part of a combo, remove it there first.', 'Delete', true)) { await q(sb.from('variants').delete().eq('id', b.dataset.v)); toast('Deleted'); go('products', true); } }
    if (b.dataset.act === 'delP') { if (await ask('Delete ' + p.name_en + '?', 'The product and all its pack sizes are removed. To hide it temporarily, edit it and untick "Show on the shop" instead.', 'Delete product', true)) { await q(sb.from('products').delete().eq('id', p.id)); toast('Deleted'); go('products', true); } }
  });
};
function productHtml(p) {
  const vs = (p.variants || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  return `<article class="a-pr ${p.is_active ? '' : 'off'}" data-p="${p.id}"><img src="${esc(previewSrc(p.image_url))}" alt="">
    <div><h3>${esc(p.name_en)} <span class="tam" style="font-size:20px;color:var(--muted)">${esc(p.name_ta)}</span> ${p.is_active ? '' : '<span class="pill-s">Hidden</span>'} ${p.is_signature ? '<span class="pill-s warn">Signature</span>' : ''}</h3>
      <div class="a-scroll" style="margin:10px 0"><table class="a-t"><thead><tr><th>Pack</th><th>MRP (₹)</th><th>Selling price (₹)</th><th>Stock</th><th>Online limit</th><th>On sale</th><th></th></tr></thead><tbody>
      ${vs.map(v => `<tr data-v="${v.id}"><td><b>${esc(v.label)}</b></td><td><input type="number" name="mrp" value="${v.mrp ?? ''}" min="0" step="1" placeholder="none"></td><td><input type="number" name="price" value="${v.price}" min="0" step="1"></td><td><input type="number" name="stock" value="${v.stock ?? ''}" min="0" placeholder="not counted"></td><td><input type="number" name="max" value="${v.max_online_qty ?? ''}" min="1" placeholder="no limit"></td><td><input type="checkbox" name="act" ${v.is_active ? 'checked' : ''} aria-label="On sale"></td><td style="white-space:nowrap"><button class="btn line sm" data-act="editV" data-v="${v.id}">Edit</button> <button class="btn line sm" data-act="delV" data-v="${v.id}" style="color:var(--bad)">Delete</button></td></tr>`).join('')}</tbody></table></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn line sm" data-act="addV">Add a pack size</button><button class="btn line sm" data-act="editP">Edit product details</button><button class="btn line sm" data-act="delP" style="color:var(--bad)">Delete product</button></div></div></article>`;
}
function productForm(p, order) {
  formModal({
    title: p ? 'Edit ' + p.name_en : 'Add a product', saveLabel: p ? 'Save' : 'Add product', values: p || { is_active: true, accent: '#1F4A38', sort_order: order || 1 },
    fields: [
      { k: 'name_en', label: 'Name (English)', req: true, half: true }, { k: 'name_ta', label: 'Name (Tamil)', half: true },
      { k: 'blurb_en', label: 'Short description (English)', type: 'textarea' }, { k: 'blurb_ta', label: 'Short description (Tamil)', type: 'textarea' },
      { k: 'usage_en', label: 'Use (English)', half: true, hint: 'For example: Cooking' }, { k: 'usage_ta', label: 'Use (Tamil)', half: true },
      { k: 'image_url', label: 'Product photo', type: 'image', folder: 'products', hint: '' },
      { k: 'accent', label: 'Accent colour', type: 'color', half: true }, { k: 'sort_order', label: 'Position (1 = first)', type: 'number', half: true },
      { k: 'is_active', label: 'Show on the shop', type: 'check' }, { k: 'is_signature', label: 'This is our signature oil', type: 'check' }
    ],
    onSave: async v => {
      if (p) await q(sb.from('products').update(v).eq('id', p.id));
      else { v.slug = (v.name_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product') + '-' + Math.random().toString(36).slice(2, 5); await q(sb.from('products').insert(v)); }
      toast('Saved'); go('products', true);
    }
  });
}
function variantForm(p, v) {
  formModal({
    title: v ? 'Edit pack size' : 'Add a pack size for ' + p.name_en, values: v || { pack_kind: 'bottle', sort_order: (p.variants.length || 0) + 1, price: 999, is_active: true },
    fields: [
      { k: 'label', label: 'Pack name', req: true, half: true, hint: 'For example: 500 ml, 5 L can, 15 kg tin' }, { k: 'pack_kind', label: 'Type', type: 'select', opts: PACK, half: true },
      { k: 'mrp', label: 'MRP (₹)', type: 'number', half: true, hint: 'Shown crossed out. Leave empty for none' }, { k: 'price', label: 'Selling price (₹)', type: 'number', req: true, half: true },
      { k: 'sort_order', label: 'Position', type: 'number', half: true },
      { k: 'stock', label: 'Stock', type: 'number', half: true, hint: 'Leave empty to not count' }, { k: 'max_online_qty', label: 'Online limit', type: 'number', half: true, hint: 'Leave empty for no limit' },
      { k: 'is_active', label: 'On sale', type: 'check' }
    ],
    onSave: async x => { if (v) await q(sb.from('variants').update(x).eq('id', v.id)); else await q(sb.from('variants').insert({ ...x, product_id: p.id })); toast('Saved'); go('products', true); }
  });
}

/* ---------- combos ---------- */
VIEWS.combos = async el => {
  const [combos, prods] = await Promise.all([q(sb.from('combos').select('*, combo_items(qty, variant_id)').order('sort_order')), q(sb.from('products').select('name_en, variants(id,label)').order('sort_order'))]);
  const vOpts = prods.flatMap(p => (p.variants || []).map(v => [v.id, p.name_en + ' · ' + v.label]));
  const vName = Object.fromEntries(vOpts);
  el.innerHTML = `<div class="a-toolbar"><button class="btn" id="add">Add a combo</button></div>
    ${combos.length ? `<div class="a-grid">${combos.map(c => `<article class="a-item ${c.is_active ? '' : 'off'}" data-id="${c.id}"><div class="im">${c.image_url ? `<img src="${esc(previewSrc(c.image_url))}" alt="">` : ''}</div><div class="tx"><h4>${esc(c.name_en)} <span class="pill-s ${c.is_active ? 'on' : ''}">${c.is_active ? 'Live' : 'Hidden'}</span></h4><b>${inr(c.price)}</b>${(c.combo_items || []).map(i => `<small class="hint">${i.qty} × ${esc(vName[i.variant_id] || '')}</small>`).join('')}${c.ends_at ? `<small class="hint">Ends ${dOnly(c.ends_at)}</small>` : ''}<div class="row"><button class="btn line sm" data-edit>Edit</button><button class="btn line sm" data-del style="color:var(--bad)">Delete</button></div></div></article>`).join('')}</div>` : '<div class="a-empty">No combos yet. Add one and it appears on the shop straight away.</div>'}`;
  const edit = c => comboForm(c, vOpts);
  el.onclick = run(async e => {
    if (e.target.id === 'add') return edit(null);
    const card = e.target.closest('.a-item'); if (!card) return; const c = combos.find(x => x.id === card.dataset.id);
    if (e.target.matches('[data-edit]')) edit(c);
    if (e.target.matches('[data-del]') && await ask('Delete ' + c.name_en + '?', 'Past orders keep their details.', 'Delete', true)) { await q(sb.from('combos').delete().eq('id', c.id)); toast('Deleted'); go('combos', true); }
  });
};
function comboForm(c, vOpts) {
  const items = c ? (c.combo_items || []) : [{ qty: 1, variant_id: vOpts[0] && vOpts[0][0] }];
  const lineHtml = it => `<div class="ln2"><select name="iv">${vOpts.map(o => `<option value="${esc(o[0])}" ${o[0] === it.variant_id ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select><input type="number" name="iq" min="1" value="${it.qty || 1}" aria-label="Quantity"><button type="button" class="btn line sm" data-rm>Remove</button></div>`;
  formModal({
    title: c ? 'Edit combo' : 'Add a combo', values: c || { is_active: true, sort_order: 1 },
    fields: [
      { k: 'name_en', label: 'Name (English)', req: true, half: true }, { k: 'name_ta', label: 'Name (Tamil)', half: true },
      { k: 'blurb_en', label: 'Description (English)', type: 'textarea' }, { k: 'blurb_ta', label: 'Description (Tamil)', type: 'textarea' },
      { k: 'price', label: 'Combo price (₹)', type: 'number', req: true, half: true }, { k: 'sort_order', label: 'Position', type: 'number', half: true },
      { k: 'image_url', label: 'Photo', type: 'image', folder: 'combos', photos: true },
      { k: 'starts_at', label: 'Starts (optional)', type: 'datetime', half: true }, { k: 'ends_at', label: 'Ends (optional)', type: 'datetime', half: true },
      { k: 'is_active', label: 'Show on the shop', type: 'check' }
    ],
    extraHtml: `<div><span style="font-weight:600;font-size:14px">What is in the combo</span><div class="a-lines" id="lines">${items.map(lineHtml).join('')}</div><button type="button" class="btn line sm" id="addLine" style="margin-top:8px">Add another item</button></div>`,
    after: form => { form.addEventListener('click', e => { if (e.target.id === 'addLine') $('#lines').insertAdjacentHTML('beforeend', lineHtml({ qty: 1, variant_id: vOpts[0] && vOpts[0][0] })); if (e.target.matches('[data-rm]') && $$('#lines .ln2').length > 1) e.target.closest('.ln2').remove(); }); },
    onSave: async (v, form) => {
      const lines = $$('#lines .ln2').map(r => ({ variant_id: $('[name=iv]', r).value, qty: Math.max(1, parseInt($('[name=iq]', r).value, 10) || 1) }));
      const merged = Object.values(lines.reduce((a, l) => { a[l.variant_id] = a[l.variant_id] ? { ...l, qty: a[l.variant_id].qty + l.qty } : l; return a; }, {}));
      if (!merged.length) throw new Error('Add at least one item to the combo.');
      let id = c && c.id;
      if (c) await q(sb.from('combos').update(v).eq('id', id)); else { const r = await q(sb.from('combos').insert(v).select('id').single()); id = r.id; }
      await q(sb.from('combo_items').delete().eq('combo_id', id));
      await q(sb.from('combo_items').insert(merged.map(l => ({ ...l, combo_id: id }))));
      toast('Saved'); go('combos', true);
    }
  });
}

/* ---------- offers and specials, home banners ---------- */
VIEWS.offers = async el => {
  const [offers, prods] = await Promise.all([q(sb.from('offers').select('*').order('sort_order')), q(sb.from('products').select('name_en, variants(id,label)').order('sort_order'))]);
  const vOpts = [['', 'None']].concat(prods.flatMap(p => (p.variants || []).map(v => [v.id, p.name_en + ' · ' + v.label])));
  const KIND = { offer: 'Offer', special: 'Special', announcement: 'Top bar message' };
  el.innerHTML = `<div class="a-toolbar"><button class="btn" id="add">Add an offer</button></div>
    <p class="a-hint">Offers and specials show in the Combos and specials section. A top bar message scrolls in the green bar at the very top of every page.</p>
    ${offers.length ? `<div class="a-grid">${offers.map(o => `<article class="a-item ${o.is_active ? '' : 'off'}" data-id="${o.id}">${o.image_url ? `<div class="im"><img src="${esc(previewSrc(o.image_url))}" alt=""></div>` : ''}<div class="tx"><h4>${esc(o.title_en)}</h4><span><span class="pill-s ${o.is_active ? 'on' : ''}">${o.is_active ? 'Live' : 'Hidden'}</span> <span class="pill-s">${KIND[o.kind]}</span>${o.badge ? ` <span class="pill-s warn">${esc(o.badge)}</span>` : ''}</span>${o.body_en ? `<small class="hint">${esc(o.body_en)}</small>` : ''}${o.ends_at ? `<small class="hint">Ends ${dOnly(o.ends_at)}</small>` : ''}<div class="row"><button class="btn line sm" data-edit>Edit</button><button class="btn line sm" data-del style="color:var(--bad)">Delete</button></div></div></article>`).join('')}</div>` : '<div class="a-empty">No offers yet.</div>'}`;
  const edit = o => formModal({
    title: o ? 'Edit offer' : 'Add an offer', values: o || { kind: 'offer', is_active: true, sort_order: offers.length + 1 },
    fields: [
      { k: 'kind', label: 'Type', type: 'select', opts: Object.entries(KIND), half: true }, { k: 'badge', label: 'Badge (optional)', half: true, nullable: true, hint: 'For example: New, 10% off' },
      { k: 'title_en', label: 'Title (English)', req: true }, { k: 'title_ta', label: 'Title (Tamil)' },
      { k: 'body_en', label: 'Details (English)', type: 'textarea' }, { k: 'body_ta', label: 'Details (Tamil)', type: 'textarea' },
      { k: 'image_url', label: 'Photo (optional)', type: 'image', folder: 'offers', photos: true },
      { k: 'variant_id', label: 'Link to a pack (optional)', type: 'select', opts: vOpts, nullable: true, hint: 'Adds a button that takes the customer to that pack' },
      { k: 'starts_at', label: 'Starts (optional)', type: 'datetime', half: true }, { k: 'ends_at', label: 'Ends (optional)', type: 'datetime', half: true },
      { k: 'sort_order', label: 'Position', type: 'number', half: true }, { k: 'is_active', label: 'Show on the shop', type: 'check' }
    ],
    onSave: async v => { if (v.variant_id === '') v.variant_id = null; if (v.image_url === '') v.image_url = null; if (o) await q(sb.from('offers').update(v).eq('id', o.id)); else await q(sb.from('offers').insert(v)); toast('Saved'); go('offers', true); }
  });
  el.onclick = run(async e => {
    if (e.target.id === 'add') return edit(null);
    const card = e.target.closest('.a-item'); if (!card) return; const o = offers.find(x => x.id === card.dataset.id);
    if (e.target.matches('[data-edit]')) edit(o);
    if (e.target.matches('[data-del]') && await ask('Delete this offer?', o.title_en, 'Delete', true)) { await q(sb.from('offers').delete().eq('id', o.id)); toast('Deleted'); go('offers', true); }
  });
};
VIEWS.promos = async el => {
  const [codes, used, st] = await Promise.all([
    q(sb.from('promo_codes').select('*').order('created_at', { ascending: false })),
    q(sb.from('orders').select('promo_code, promo_discount, status').not('promo_code', 'is', null)),
    q(sb.from('site_settings').select('value').eq('key', 'promo_enabled'))
  ]);
  const on = !!(st[0] && (st[0].value === true || st[0].value === 'true' || st[0].value === 'on'));
  const useOf = c => { const u = used.filter(o => o.promo_code === c.code && o.status !== 'cancelled'); return { n: u.length, off: u.reduce((a, o) => a + Number(o.promo_discount || 0), 0) }; };
  const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
  const what = c => c.kind === 'percent' ? c.value + '% off' + (c.max_discount ? ' (up to ' + inr(c.max_discount) + ')' : '') : c.kind === 'flat' ? inr(c.value) + ' off' : 'Free delivery';
  const when = c => { const f = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); const now = Date.now();
    if (c.ends_at && new Date(c.ends_at) < now) return '<span class="pill-s warn">Ended ' + f(c.ends_at) + '</span>';
    if (c.starts_at && new Date(c.starts_at) > now) return 'Starts ' + f(c.starts_at);
    return c.ends_at ? 'Until ' + f(c.ends_at) : 'No end date'; };
  el.innerHTML = `<div class="a-panel"><h3>Promo codes at checkout</h3>
      <label class="chk" style="display:flex;gap:10px;align-items:center;font-weight:600"><input type="checkbox" id="promoOn" ${on ? 'checked' : ''}> Show the promo code box at checkout</label>
      <p class="hint" style="margin-top:8px">${on ? 'ON: customers see a "Have a promo code?" box in the cart. Only codes marked Active below work.' : 'OFF: customers do not see any promo code box, and no code can be used, even if codes exist below.'}</p></div>
    <div class="a-toolbar"><button class="btn" id="add">Add a promo code</button></div>
    ${codes.length ? `<div class="a-scroll"><table class="a-t"><thead><tr><th>Code</th><th>Offer</th><th>Minimum order</th><th>Valid</th><th>Used</th><th>Active</th><th></th></tr></thead><tbody>
      ${codes.map(c => { const u = useOf(c); return `<tr data-id="${c.id}"><td><b style="font-family:var(--f-mono,monospace);letter-spacing:.04em">${esc(c.code)}</b>${c.title ? `<br><small class="hint">${esc(c.title)}</small>` : ''}</td><td>${esc(what(c))}</td><td>${c.min_order ? inr(c.min_order) : 'None'}</td><td>${when(c)}</td>
        <td>${u.n}${c.usage_limit ? ' of ' + c.usage_limit : ''}${u.n ? `<br><small class="hint">${inr(u.off)} given</small>` : ''}${c.per_phone_limit ? `<br><small class="hint">${c.per_phone_limit} per phone</small>` : ''}</td>
        <td>${c.is_active ? '<span class="pill-s">Active</span>' : '<span class="pill-s warn">Off</span>'}</td><td style="white-space:nowrap"><button class="btn line sm" data-edit>Edit</button> <button class="btn line sm" data-del style="color:var(--bad)">Delete</button></td></tr>`; }).join('')}
      </tbody></table></div>` : '<p class="a-hint">No promo codes yet. Add one, then switch the box on above.</p>'}`;
  const edit = c => formModal({
    title: c ? 'Edit promo code' : 'Add a promo code', values: c || { kind: 'percent', is_active: true, min_order: 0 },
    fields: [
      { k: 'code', label: 'Code', req: true, half: true, hint: 'Letters, numbers, - or _. Customers can type it in any case.' }, { k: 'title', label: 'Name (only you see this)', half: true, nullable: true, hint: 'For example: Diwali offer' },
      { k: 'kind', label: 'Offer type', type: 'select', opts: [['percent', 'Percent off the goods'], ['flat', 'Fixed amount off (₹)'], ['free_delivery', 'Free delivery']], half: true },
      { k: 'value', label: 'Value', type: 'number', half: true, hint: 'Percent (for example 10) or rupees (for example 50). Leave empty for free delivery.' },
      { k: 'max_discount', label: 'Highest discount (₹)', type: 'number', half: true, hint: 'Optional cap, mainly for percent offers' }, { k: 'min_order', label: 'Minimum order (₹)', type: 'number', half: true, hint: 'Goods total before delivery. 0 for none.' },
      { k: 'starts_at', label: 'Starts (optional)', type: 'datetime', half: true }, { k: 'ends_at', label: 'Ends (optional)', type: 'datetime', half: true },
      { k: 'usage_limit', label: 'Total uses allowed', type: 'number', half: true, hint: 'Empty for unlimited' }, { k: 'per_phone_limit', label: 'Uses per phone number', type: 'number', half: true, hint: 'Empty for unlimited. Use 1 for one-time offers.' },
      { k: 'is_active', label: 'Active', type: 'check' }
    ],
    onSave: async v => {
      v.code = String(v.code || '').trim().toUpperCase();
      if (!/^[A-Z0-9_-]{3,24}$/.test(v.code)) throw new Error('The code must be 3 to 24 letters, numbers, - or _.');
      v.value = v.value == null ? 0 : v.value;
      if (v.kind === 'percent' && !(v.value > 0 && v.value <= 100)) throw new Error('For a percent offer, enter a value between 1 and 100.');
      if (v.kind === 'flat' && !(v.value > 0)) throw new Error('For a fixed amount offer, enter the rupees off.');
      if (v.kind === 'free_delivery') { v.value = 0; v.max_discount = null; }
      v.min_order = v.min_order == null ? 0 : v.min_order;
      if (v.starts_at && v.ends_at && new Date(v.ends_at) < new Date(v.starts_at)) throw new Error('The end date is before the start date.');
      try { if (c) await q(sb.from('promo_codes').update(v).eq('id', c.id)); else await q(sb.from('promo_codes').insert(v)); }
      catch (x) { throw new Error(/duplicate|unique/i.test(x.message || '') ? 'That code already exists.' : x.message); }
      toast('Saved'); go('promos', true);
    }
  });
  el.onclick = run(async e => {
    if (e.target.id === 'add') return edit(null);
    const row = e.target.closest('tr[data-id]'); if (!row) return; const c = codes.find(x => x.id === row.dataset.id);
    if (e.target.matches('[data-edit]')) edit(c);
    if (e.target.matches('[data-del]') && await ask('Delete ' + c.code + '?', 'The code stops working. Past orders keep their record of it.', 'Delete', true)) { await q(sb.from('promo_codes').delete().eq('id', c.id)); toast('Deleted'); go('promos', true); }
  });
  el.onchange = run(async e => {
    if (e.target.id !== 'promoOn') return;
    await q(sb.from('site_settings').upsert([{ key: 'promo_enabled', value: e.target.checked }], { onConflict: 'key' }));
    toast(e.target.checked ? 'Promo code box is ON' : 'Promo code box is OFF'); go('promos', true);
  });
};
VIEWS.hero = async el => {
  const rows = await q(sb.from('hero_slides').select('*').order('sort_order'));
  el.innerHTML = `<div class="a-toolbar"><button class="btn" id="add">Add a banner</button></div>
    <p class="a-hint">Banners rotate at the top of the home page. Use a wide photo (landscape) with the left side fairly dark or empty, because the headline sits there.</p>
    ${rows.length ? `<div class="a-grid">${rows.map(h => `<article class="a-item ${h.is_active ? '' : 'off'}" data-id="${h.id}"><div class="im"><img src="${esc(previewSrc(h.image_url))}" alt=""></div><div class="tx"><h4>${esc(h.headline_en)}</h4><small class="hint">${esc(h.sub_en)}</small><span><span class="pill-s ${h.is_active ? 'on' : ''}">${h.is_active ? 'Live' : 'Hidden'}</span></span><div class="row"><button class="btn line sm" data-edit>Edit</button><button class="btn line sm" data-del style="color:var(--bad)">Delete</button></div></div></article>`).join('')}</div>` : '<div class="a-empty">No banners. The shop shows a default banner until you add one.</div>'}`;
  const edit = h => formModal({
    title: h ? 'Edit banner' : 'Add a banner', values: h || { is_active: true, sort_order: rows.length + 1, cta_href: '#oils' },
    fields: [
      { k: 'image_url', label: 'Photo', type: 'image', folder: 'hero', photos: true, req: true },
      { k: 'headline_en', label: 'Headline (English)', req: true, hint: 'Each sentence starts a new line. Keep it short.' }, { k: 'headline_ta', label: 'Headline (Tamil)' },
      { k: 'sub_en', label: 'Line under the headline (English)' }, { k: 'sub_ta', label: 'Line under the headline (Tamil)' },
      { k: 'cta_label', label: 'Button text', half: true, nullable: true }, { k: 'cta_href', label: 'Button goes to', half: true, nullable: true, hint: '#oils, #combos, #bulk or #rewards' },
      { k: 'sort_order', label: 'Position', type: 'number', half: true }, { k: 'is_active', label: 'Show on the shop', type: 'check' }
    ],
    onSave: async v => { if (h) await q(sb.from('hero_slides').update(v).eq('id', h.id)); else await q(sb.from('hero_slides').insert(v)); toast('Saved'); go('hero', true); }
  });
  el.onclick = run(async e => {
    if (e.target.id === 'add') return edit(null);
    const card = e.target.closest('.a-item'); if (!card) return; const h = rows.find(x => x.id === card.dataset.id);
    if (e.target.matches('[data-edit]')) edit(h);
    if (e.target.matches('[data-del]') && await ask('Delete this banner?', h.headline_en, 'Delete', true)) { await q(sb.from('hero_slides').delete().eq('id', h.id)); toast('Deleted'); go('hero', true); }
  });
};


/* ---------- festival ---------- */
VIEWS.festival = async el => {
  const rows = await q(sb.from('festivals').select('*').order('sort_order').order('created_at'));
  const on = rows.find(r => r.is_active);
  el.innerHTML = `<div class="a-panel"><h3>Festival mode: ${on ? '<span class="pill-s on">ON</span> ' + esc(on.name_en) : '<span class="pill-s">OFF</span>'}</h3>
    <p class="hint" style="margin-bottom:12px">Pick a festival and turn it on. While it is on, the greeting shows at the top of the home page, on the order-placed screen, on the Track page and on invoices that customers download. Turn it off and the shop goes back to the normal look straight away.</p>
    <div class="a-toolbar"><label class="fl" style="margin:0;min-width:220px">Festival<select id="fsel">${rows.map(r => `<option value="${esc(r.id)}" ${on && on.id === r.id ? 'selected' : ''}>${esc(r.name_en)}</option>`).join('')}</select></label>
      <button class="btn" id="fon">Turn on</button><button class="btn line" id="foff" ${on ? '' : 'disabled'}>Turn off</button><button class="btn line" id="fadd">Add a festival</button></div></div>
    <div class="a-grid">${rows.map(r => `<article class="a-item ${r.is_active ? '' : 'off'}" data-id="${esc(r.id)}"><div class="im"><img src="${esc(previewSrc(r.wish_url || r.logo_url || 'assets/logo-drop.webp'))}" alt=""></div><div class="tx"><h4>${esc(r.name_en)} ${r.name_ta ? '· ' + esc(r.name_ta) : ''}</h4><small class="hint">${esc(r.msg_en)}</small><div class="row"><button class="btn line sm" data-edit>Edit</button><button class="btn line sm" data-del>Delete</button></div></div></article>`).join('')}</div>`;
  const edit = f => formModal({
    title: f ? 'Edit festival' : 'Add a festival', values: f || { sort_order: rows.length + 1 },
    fields: [
      { k: 'name_en', label: 'Festival name (English)', req: true, half: true }, { k: 'name_ta', label: 'Festival name (Tamil)', half: true },
      { k: 'msg_en', label: 'Greeting message (English)', type: 'textarea', req: true }, { k: 'msg_ta', label: 'Greeting message (Tamil)', type: 'textarea' },
      { k: 'logo_url', label: 'Festival logo', type: 'image', folder: 'festival', hint: 'Small, simple picture. Used on invoices and in the banner.' },
      { k: 'wish_url', label: 'Festival wish image', type: 'image', folder: 'festival', hint: 'Larger greeting picture shown after an order is placed.' },
      { k: 'sort_order', label: 'Position', type: 'number', half: true }
    ],
    onSave: async v => {
      if (!f) v.slug = (v.name_en || 'festival').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36).slice(-4);
      if (f) await q(sb.from('festivals').update(v).eq('id', f.id)); else await q(sb.from('festivals').insert(v));
      toast('Saved'); go('festival', true);
    }
  });
  el.onclick = run(async e => {
    if (e.target.id === 'fon') { await q(sb.rpc('set_festival', { p_id: $('#fsel').value })); toast('Festival mode is ON'); return go('festival', true); }
    if (e.target.id === 'foff') { await q(sb.rpc('set_festival', { p_id: null })); toast('Festival mode is OFF'); return go('festival', true); }
    if (e.target.id === 'fadd') return edit(null);
    const card = e.target.closest('.a-item'); if (!card) return; const f = rows.find(x => x.id === card.dataset.id);
    if (e.target.matches('[data-edit]')) edit(f);
    if (e.target.matches('[data-del]') && await ask('Delete this festival?', f.name_en, 'Delete', true)) { await q(sb.from('festivals').delete().eq('id', f.id)); toast('Deleted'); go('festival', true); }
  });
};

/* ---------- settings (owner) ---------- */
VIEWS.settings = async el => {
  const rows = await q(sb.from('site_settings').select('*')); const S = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const c = Object.assign({}, S.contact || {}); const tiers = (S.points_tiers || [{ min: 0, rate: 0.02 }]);
  const num = (k, label, hint) => `<label class="fl">${label}<input type="number" name="${k}" value="${esc(S[k] ?? '')}" min="0" step="1">${hint ? `<small class="hint">${hint}</small>` : ''}</label>`;
  const tx = (k, label) => `<label class="fl">${label}<input type="text" name="c_${k}" value="${esc(c[k] || '')}"></label>`;
  const tierRow = t => `<div class="ln2"><label class="fl" style="font-weight:500">Total purchases from (₹)<input type="number" name="tmin" min="0" value="${t.min}"></label><label class="fl" style="font-weight:500">Points rate (%)<input type="number" name="trate" min="0" step="0.1" value="${Math.round(t.rate * 1000) / 10}"></label><button type="button" class="btn line sm" data-rm style="align-self:end">Remove</button></div>`;
  el.innerHTML = `<form class="f" id="setForm" novalidate>
    <div class="a-panel"><h3>Delivery and points</h3><div class="f"><div class="row">${num('delivery_fee', 'Delivery fee (₹)')}${num('free_delivery_above', 'Free delivery above (₹)', 'Checked after points are used')}</div>
      <div class="row">${num('min_redeem_points', 'Minimum points to redeem')}${num('low_stock_threshold', 'Show "Only N left" when stock is at or below', '0 turns it off. Uses real stock numbers only.')}<label class="fl">Add points when the order is<select name="credit_points_on"><option value="delivered" ${S.credit_points_on === 'delivered' ? 'selected' : ''}>Delivered (recommended)</option><option value="placed" ${S.credit_points_on === 'placed' ? 'selected' : ''}>Placed</option></select></label></div>
      <div class="row">${num('referral_referrer_points', 'Referral: points for the person who refers')}${num('referral_friend_points', 'Referral: points for the new customer')}</div></div></div>
    <div class="a-panel"><h3>Points tiers</h3><p class="hint" style="margin-bottom:10px">The rate depends on the customer's total purchases before the current order. Keep the first tier at ₹0.</p><div class="a-lines" id="tiers">${tiers.map(tierRow).join('')}</div><button type="button" class="btn line sm" id="addTier" style="margin-top:10px">Add a tier</button></div>
    <div class="a-panel"><h3>Contact details shown on the shop</h3><div class="f"><div class="row">${tx('phone1', 'Phone 1')}${tx('phone2', 'Phone 2')}</div><div class="row">${tx('wa_md', 'WhatsApp: Managing Director (with 91, no spaces)')}${tx('wa_admin', 'WhatsApp: Admin team (with 91, no spaces)')}</div><div class="row">${tx('email', 'Email')}${tx('maps_url', 'Google Maps directions link')}</div><div class="row">${tx('instagram', 'Instagram link (leave empty to hide)')}${tx('facebook', 'Facebook link (leave empty to hide)')}</div><div class="row">${tx('threads', 'Threads link (leave empty to hide)')}</div>
      <div class="row">${tx('hours_en', 'Working hours (English)')}${tx('hours_ta', 'Working hours (Tamil)')}</div>${tx('address', 'Address')}<label class="fl">Site address (website link)<input type="text" name="site_url" value="${esc(S.site_url || '')}" placeholder="https://www.yourdomain.in"><small class="hint">Used for the website line on invoices, search results, sitemap and share previews. Leave empty until the domain is ready.</small></label><div class="row">${tx('fssai', 'FSSAI number')}${tx('gstin', 'GSTIN')}</div></div></div>
    <div class="msg" id="setMsg" role="status"></div><button class="btn" type="submit" style="justify-self:start">Save settings</button></form>`;
  el.insertAdjacentHTML('beforeend', `<div class="a-panel" id="upiPanel"><h3>UPI accounts</h3><p class="hint" style="margin-bottom:10px">Customers see only the default one (with a QR code) after they place an online order. The others stay private to you. Choose the default, rename, add or remove here; changes save straight away.</p><div id="upiList"></div><div class="row" style="margin-top:12px"><label class="fl">UPI ID<input type="text" id="upiNewId" placeholder="name@bank" autocapitalize="off"></label><label class="fl">Shown to you as<input type="text" id="upiNewLabel" placeholder="Savings SBI"></label></div><button class="btn line" type="button" id="upiAdd" style="margin-top:10px">Add UPI ID</button><div class="msg" id="upiMsg" role="status"></div></div>`);
  upiPanel();
  el.onclick = e => { if (e.target.id === 'addTier') $('#tiers').insertAdjacentHTML('beforeend', tierRow({ min: 0, rate: 0.02 })); if (e.target.matches('[data-rm]') && $$('#tiers .ln2').length > 1) e.target.closest('.ln2').remove(); };
  $('#setForm').addEventListener('submit', run(async e => {
    e.preventDefault(); const f = e.target; const m = $('#setMsg');
    const n = k => Number(f.elements[k].value || 0);
    const tr = $$('#tiers .ln2').map(r => ({ min: Number($('[name=tmin]', r).value || 0), rate: Number($('[name=trate]', r).value || 0) / 100 })).sort((a, b) => a.min - b.min);
    if (!tr.length || tr[0].min !== 0) { m.textContent = 'The first tier must start at ₹0.'; m.className = 'msg err show'; return; }
    const contact = {}; ['phone1', 'phone2', 'wa_md', 'wa_admin', 'email', 'maps_url', 'instagram', 'facebook', 'threads', 'hours_en', 'hours_ta', 'address', 'fssai', 'gstin'].forEach(k => { contact[k] = f.elements['c_' + k].value.trim(); });
    const out = [['delivery_fee', n('delivery_fee')], ['free_delivery_above', n('free_delivery_above')], ['min_redeem_points', n('min_redeem_points')], ['referral_referrer_points', n('referral_referrer_points')], ['referral_friend_points', n('referral_friend_points')], ['low_stock_threshold', n('low_stock_threshold')], ['credit_points_on', f.elements.credit_points_on.value], ['site_url', f.elements.site_url.value.trim().replace(/\/+$/, '')], ['points_tiers', tr], ['contact', contact]].map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
    await q(sb.from('site_settings').upsert(out, { onConflict: 'key' }));
    m.textContent = 'Saved. The shop uses the new values straight away.'; m.className = 'msg ok show';
  }));
};


async function upiPanel() {
  const list = $('#upiList'), m = $('#upiMsg');
  const say = (t, ok) => { m.textContent = t; m.className = 'msg ' + (ok ? 'ok' : 'err') + ' show'; };
  const load = async () => {
    const rows = await q(sb.from('upi_accounts').select('*').order('sort').order('created_at'));
    list.innerHTML = rows.map(r => `<div class="ln2" data-id="${esc(r.id)}" style="align-items:center"><label style="display:flex;gap:10px;align-items:center;font-weight:500"><input type="radio" name="upiDef" value="${esc(r.id)}" ${r.is_default ? 'checked' : ''}><span><b>${esc(r.label || 'Unnamed')}</b><br><span class="mono" style="font-size:13px;color:var(--muted)">${esc(r.upi_id)}</span></span></label>${r.is_default ? '<span class="pill-s on">Default (customers see this)</span>' : ''}<button type="button" class="btn line" data-ren="${esc(r.id)}">Rename</button><button type="button" class="btn line" data-del="${esc(r.id)}" ${r.is_default ? 'disabled title="Choose another default first"' : ''}>Remove</button></div>`).join('') || '<p class="hint">No UPI IDs yet. Add one below.</p>';
  };
  await load();
  list.onchange = run(async e => { if (e.target.name !== 'upiDef') return; await q(sb.rpc('set_default_upi', { p_id: e.target.value })); say('Default changed. Customers now see this UPI ID.', true); await load(); });
  list.onclick = run(async e => {
    const ren = e.target.closest('[data-ren]'), del = e.target.closest('[data-del]');
    if (ren) { const cur = ren.closest('.ln2').querySelector('b').textContent; const v = prompt('Name for this UPI ID', cur); if (v === null) return; await q(sb.from('upi_accounts').update({ label: v.trim() }).eq('id', ren.dataset.ren)); say('Renamed.', true); await load(); }
    if (del && !del.disabled) { if (!confirm('Remove this UPI ID?')) return; await q(sb.from('upi_accounts').delete().eq('id', del.dataset.del)); say('Removed.', true); await load(); }
  });
  $('#upiAdd').onclick = run(async () => {
    const id = $('#upiNewId').value.trim(), label = $('#upiNewLabel').value.trim();
    if (!/^[A-Za-z0-9._-]{2,}@[A-Za-z0-9]{2,}$/.test(id)) return say('Enter a valid UPI ID like name@bank.', false);
    await q(sb.from('upi_accounts').insert({ upi_id: id, label, sort: 100 })); $('#upiNewId').value = ''; $('#upiNewLabel').value = ''; say('Added.', true); await load();
  });
}

/* ---------- team (owner) ---------- */
VIEWS.team = async el => {
  el.innerHTML = `<div class="a-panel"><h3>Team members</h3><div id="teamList"></div></div>
    <div class="a-panel"><h3>Give someone a role</h3><p class="hint" style="margin-bottom:10px">Ask them to create a normal account on the shop first (mobile number and password). Then find them here and choose a role.</p>
      <div class="a-toolbar"><input type="search" id="ts" placeholder="Search by name or mobile number" aria-label="Search people"><button class="btn" id="tgo">Search</button></div><div id="tres"></div></div>
    <p class="a-hint"><b>Owner</b>: everything. <b>Staff</b>: orders, customers, enquiries, reviews. <b>Editor</b>: products, prices, combos, offers and banners. Customers have no admin access.</p>`;
  const roleSel = (id, role) => `<select data-u="${id}">${['customer', 'staff', 'editor', 'owner'].map(r => `<option ${r === role ? 'selected' : ''}>${r}</option>`).join('')}</select>`;
  const rowH = r => `<tr><td><b>${esc(r.full_name || '(no name)')}</b></td><td>${esc(r.phone || '')}</td><td>${roleSel(r.id, r.role)}</td></tr>`;
  const tbl = rows => `<div class="a-scroll"><table class="a-t"><thead><tr><th>Name</th><th>Mobile</th><th>Role</th></tr></thead><tbody>${rows.map(rowH).join('')}</tbody></table></div>`;
  const draw = async () => { const rows = await q(sb.from('profiles').select('id,full_name,phone,role').neq('role', 'customer').order('created_at')); $('#teamList').innerHTML = tbl(rows); };
  await draw();
  const search = run(async () => {
    const t = $('#ts').value.trim(); if (t.length < 3) { $('#tres').innerHTML = '<p class="hint">Type at least 3 characters.</p>'; return; }
    const rows = await q(sb.from('profiles').select('id,full_name,phone,role').or(`phone.ilike.%${t.replace(/[%,()]/g, '')}%,full_name.ilike.%${t.replace(/[%,()]/g, '')}%`).limit(20));
    $('#tres').innerHTML = rows.length ? tbl(rows) : '<p class="hint">Nobody found.</p>';
  });
  $('#tgo').onclick = search; $('#ts').addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
  el.onchange = run(async e => {
    const s = e.target.closest('select[data-u]'); if (!s) return;
    try { await q(sb.rpc('set_user_role', { p_user: s.dataset.u, p_role: s.value })); toast('Role updated'); await draw(); } catch (x) { toast(x.message.includes('CANNOT_DEMOTE_SELF') ? 'You cannot remove your own owner role.' : x.message); await draw(); }
  });
};

boot();
})();
