/* Invoice (design A, classic green band). Built in the browser as an A4 page and saved as a PDF.
   English invoice: English labels. Tamil invoice: Tamil labels; English only where it cannot be avoided
   (email, website, UPI ID, order number, FSSAI, GST), each with its Tamil equivalent beside it. */
(function () {
  'use strict';
  const G = '#1F4A38', GOLD = '#D9A441', INK = '#12261C', MUTE = '#5B6B62', LINE = '#DDE2D8', PAPER = '#F5F6F1';
  const MONO = "'IBM Plex Mono',monospace", SERIF = "'Cormorant Garamond',serif", SANS = "'Hanken Grotesk',sans-serif", TAM = "'Noto Serif Tamil',serif";
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = n => '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const SITE = { name_en: 'Sri Vinayaga Oil & Flour Mills', addr_en: '120 Vellalar Street, Kondayampettai Agraharam, Thiruvanaikoil, Srirangam, Trichy - 620005', addr_ta: '120 வேளாளர் தெரு, கொண்டையம்பேட்டை அக்ரஹாரம், திருவானைக்கோவில், ஸ்ரீரங்கம், திருச்சி - 620005', email: 'vinayagaoilmills@gmail.com', phones: '99658 42548 · 63798 09495', fssai: '22424592000420' };

  const TXT = {
    en: {
      title: 'INVOICE', sub: 'Oil & Flour Mills, since 1935', brand: 'Sri Vinayaga',
      no: 'Invoice no.', date: 'Date', pay: 'Payment', status: 'Status',
      billed: 'Billed to', sold: 'Sold by', fssai: 'FSSAI Lic. No.',
      th: ['No.', 'Item', 'Qty', 'Unit price', 'Amount'],
      payHead: 'Payment', scan: 'Scan to pay', upiId: 'UPI ID',
      sub1: 'Subtotal', pts: 'Points discount', fee: 'Delivery fee', free: 'Free', total: 'Total', gst: 'All prices include GST',
      thanks: 'Thank you for choosing Sri Vinayaga',
      ret: 'Return policy: food products are not returnable. For a genuine quality issue, report within 2 days of delivery with an unboxing video.',
      help: 'Helpline', web: 'Website', festFrom: 'From all of us at the mill in Thiruvanaikoil.',
      mode: { online: 'Online payment (UPI)', offline: 'Cash on delivery' }, st: { pending: 'Pending', paid: 'Paid' },
      note: { pending_online: 'Please pay by UPI and mention the order number.', pending_offline: 'Please pay the delivery partner on receipt, or scan to pay by UPI.', paid: 'Payment received. Thank you.' }
    },
    ta: {
      title: 'விலைப்பட்டியல்', sub: 'ஆயில் & ஃப்ளவர் மில்ஸ், 1935 முதல்', brand: 'ஸ்ரீ விநாயகா',
      no: 'விலைப்பட்டியல் எண்', date: 'தேதி', pay: 'கட்டணம்', status: 'நிலை',
      billed: 'பெறுபவர்', sold: 'விற்பவர்', fssai: 'உணவுப் பாதுகாப்பு உரிம எண் (FSSAI)',
      th: ['எண்', 'பொருள்', 'அளவு', 'விலை', 'தொகை'],
      payHead: 'கட்டணம்', scan: 'ஸ்கேன் செய்து செலுத்துங்கள்', upiId: 'UPI ஐடி',
      sub1: 'துணைத் தொகை', pts: 'புள்ளிகள் தள்ளுபடி', fee: 'டெலிவரி கட்டணம்', free: 'இலவசம்', total: 'மொத்தம்', gst: 'அனைத்து விலைகளும் GST (சரக்கு மற்றும் சேவை வரி) உட்பட',
      thanks: 'ஸ்ரீ விநாயகாவைத் தேர்ந்தெடுத்ததற்கு நன்றி',
      ret: 'திருப்பியளிப்புக் கொள்கை: உணவுப் பொருட்களைத் திருப்பி எடுக்க இயலாது. உண்மையான தரக் குறைபாடு இருந்தால், டெலிவரி ஆன 2 நாட்களுக்குள் பார்சல் திறக்கும் வீடியோவுடன் தெரிவிக்கவும்.',
      help: 'உதவி எண்', web: 'இணையதளம்', festFrom: 'திருவானைக்கோவில் மில்லின் அனைவரிடமிருந்தும்.',
      mode: { online: 'ஆன்லைன் கட்டணம் (UPI)', offline: 'டெலிவரியில் ரொக்கம்' }, st: { pending: 'நிலுவை', paid: 'செலுத்தப்பட்டது' },
      note: { pending_online: 'UPI மூலம் செலுத்தி, ஆர்டர் எண்ணைக் குறிப்பிடவும்.', pending_offline: 'பெறும்போது டெலிவரி நபரிடம் செலுத்தவும், அல்லது UPI மூலம் ஸ்கேன் செய்து செலுத்தவும்.', paid: 'பணம் பெறப்பட்டது. நன்றி.' }
    }
  };

  const UNITS = [[/\bml\b/gi, 'மிலி'], [/\bkg\b/gi, 'கிலோ'], [/\bL\b/g, 'லி'], [/\bg\b/g, 'கி'], [/\btin\b/gi, 'டின்'], [/\bcan\b/gi, 'கேன்'], [/\bbottle\b/gi, 'பாட்டில்'], [/\bcombo\b/gi, 'காம்போ'], [/\bpouch\b/gi, 'பை']];
  const tamilLabel = l => UNITS.reduce((s, [re, ta]) => s.replace(re, ta), String(l || ''));

  const row = (cells, bg, S) => `<tr style="background:${bg};border-bottom:0.2mm solid ${LINE}">${cells}</tr>`;
  const cap = (en, ta) => `<div style="font-size:7pt;font-weight:600;letter-spacing:${ta ? '0' : '0.16em'};text-transform:${ta ? 'none' : 'uppercase'};color:${MUTE}">${esc(en)}</div>`;

  function build(d, lang, opt) {
    opt = opt || {}; const T = TXT[lang] || TXT.en, ta = lang === 'ta';
    const bodyFont = ta ? `${TAM},${SANS}` : SANS;
    const status = d.payStatus === 'paid' ? 'paid' : 'pending';
    const showQr = status === 'pending' && opt.qrSvg;
    const noteKey = status === 'paid' ? 'paid' : 'pending_' + d.payMode;
    const rows = d.lines.map((l, i) => row(
      `<td style="padding:1.1mm 3mm;font-family:${MONO};font-size:8pt;color:${MUTE};vertical-align:top">${String(i + 1).padStart(2, '0')}</td>
       <td style="padding:1.1mm 3mm"><div style="font-weight:500;font-size:9pt;line-height:1.25">${esc(ta ? (opt.tamilName ? opt.tamilName(l.name) : l.name) : l.name)}</div>${l.label ? `<div style="font-size:7.5pt;line-height:1.2;color:${MUTE}">${esc(ta ? tamilLabel(l.label) : l.label)}</div>` : ''}</td>
       <td style="padding:1.1mm 3mm;text-align:right;font-family:${MONO};font-size:8.5pt;vertical-align:top">${l.qty}</td>
       <td style="padding:1.1mm 3mm;text-align:right;font-family:${MONO};font-size:8.5pt;vertical-align:top">${inr(l.price)}</td>
       <td style="padding:1.1mm 3mm;text-align:right;font-family:${MONO};font-size:8.5pt;font-weight:500;vertical-align:top">${inr(l.price * l.qty)}</td>`,
      i % 2 ? PAPER : '#fff')).join('');
    const sum = (k, v) => `<div style="display:flex;justify-content:space-between;padding:1.3mm 3mm;border-bottom:0.2mm solid ${LINE}"><span style="color:${MUTE}">${esc(k)}</span><span style="font-family:${MONO};font-size:8.5pt">${v}</span></div>`;
    const meta = [[T.no, d.no, 500], [T.date, d.dateStr, 400], [T.pay, T.mode[d.payMode] || T.mode.offline, 400], [T.status, T.st[status], 600]]
      .map(([k, v, w]) => `<div style="color:${GOLD};white-space:nowrap">${esc(k)}</div><div style="font-family:${ta && k !== T.no ? TAM : MONO};font-weight:${w};text-align:right;white-space:nowrap;color:${PAPER}">${esc(v)}</div>`).join('');
    const fest = opt.festival ? (() => {
      const f = opt.festival, msg = ta ? (f.msg_ta || f.msg_en) : (f.msg_en || f.msg_ta);
      return `<div style="background:${PAPER};border-radius:2mm;padding:3.5mm 5mm;margin-top:6mm;display:flex;align-items:center;gap:4mm">
        ${opt.festLogo ? `<img src="${esc(opt.festLogo)}" crossorigin="anonymous" alt="" style="width:14mm;height:14mm;object-fit:contain;border-radius:50%;flex-shrink:0">` : `<div style="width:14mm;height:14mm;border:0.3mm solid ${GOLD};border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:${GOLD};font-size:12pt">✦</div>`}
        <div><div style="font-family:${ta ? TAM : SERIF};${ta ? '' : 'font-style:italic;'}font-weight:600;font-size:${ta ? '11' : '14'}pt;line-height:1.25;color:${G}">${esc(msg)}</div>
        <div style="font-size:8pt;color:${MUTE};margin-top:0.6mm">${esc(T.festFrom)}</div></div></div>`;
    })() : '';
    const web = opt.site ? `<div style="font-size:7pt;color:${MUTE}">${esc(T.web)}: <span style="font-family:${MONO}">${esc(opt.site)}</span></div>` : '';
    return `<div class="inv-sheet" style="width:210mm;min-height:297mm;padding:14mm;background:#fff;color:${INK};font-family:${bodyFont};font-size:9pt;line-height:1.45;display:flex;flex-direction:column;position:relative;box-sizing:border-box">
    <div style="background:${G};border-radius:2mm;padding:4mm 6mm;display:flex;justify-content:space-between;align-items:center;gap:6mm">
      <div style="display:flex;align-items:center;gap:4mm">
        <img src="assets/logo-drop.png" alt="" style="height:16mm;width:auto;display:block">
        <div style="display:flex;flex-direction:column;gap:2.2mm">
          <div style="font-family:${ta ? TAM : SERIF};font-weight:600;font-size:${ta ? '20' : '26'}pt;line-height:1.3;color:${PAPER}">${esc(T.brand)}</div>
          <div style="font-size:7.5pt;line-height:1.3;font-weight:500;letter-spacing:${ta ? '0' : '0.14em'};text-transform:${ta ? 'none' : 'uppercase'};white-space:nowrap;color:${GOLD}">${esc(T.sub)}</div>
        </div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3mm">
        <div style="font-family:${ta ? TAM : SERIF};font-weight:600;font-size:${ta ? '22' : '30'}pt;line-height:1.3;letter-spacing:${ta ? '0' : '0.08em'};color:${GOLD}">${esc(T.title)}</div>
        <div style="border:0.25mm solid ${GOLD};border-radius:1.5mm;padding:2mm 3mm;display:grid;grid-template-columns:auto auto;gap:0.8mm 4mm;font-size:7.5pt">${meta}</div>
      </div></div>
    <div style="height:0.25mm;background:${LINE};margin-top:4mm"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin-top:5mm">
      <div style="display:flex;flex-direction:column;gap:1mm"><div style="margin-bottom:1.5mm">${cap(T.billed, ta)}</div>
        <div style="font-weight:600;font-size:10.5pt">${esc(d.name)}</div><div style="font-family:${MONO};font-size:8.5pt">${esc(d.phone)}</div>
        <div>${esc(d.address)}${d.pin ? ' - ' + esc(d.pin) : ''}</div></div>
      <div style="display:flex;flex-direction:column;gap:1mm"><div style="margin-bottom:1.5mm">${cap(T.sold, ta)}</div>
        <div style="font-weight:600;font-size:10.5pt">${ta ? 'ஸ்ரீ விநாயகா ஆயில் & ஃப்ளவர் மில்ஸ்' : esc(SITE.name_en)}</div>
        <div>${esc(ta ? SITE.addr_ta : SITE.addr_en)}</div>
        <div style="font-family:${MONO};font-size:8.5pt">${SITE.phones}</div>
        <div style="font-family:${MONO};font-size:8.5pt">${SITE.email}</div>
        <div style="font-size:8pt;color:${MUTE}">${esc(T.fssai)} <span style="font-family:${MONO};color:${INK}">${SITE.fssai}</span></div></div></div>
    <table style="width:100%;border-collapse:collapse;margin-top:5mm">
      <thead><tr style="background:${G};color:${PAPER};font-size:7.5pt;font-weight:600;letter-spacing:${ta ? '0' : '0.1em'};text-transform:${ta ? 'none' : 'uppercase'}">
        <th style="text-align:left;padding:2.2mm 3mm;width:12mm;font-weight:600">${esc(T.th[0])}</th><th style="text-align:left;padding:2.2mm 3mm;font-weight:600">${esc(T.th[1])}</th>
        <th style="text-align:right;padding:2.2mm 3mm;width:14mm;font-weight:600">${esc(T.th[2])}</th><th style="text-align:right;padding:2.2mm 3mm;width:30mm;font-weight:600">${esc(T.th[3])}</th>
        <th style="text-align:right;padding:2.2mm 3mm;width:32mm;font-weight:600">${esc(T.th[4])}</th></tr></thead>
      <tbody>${rows}</tbody></table>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10mm;margin-top:5mm">
      <div style="display:flex;gap:5mm;align-items:flex-start">
        <div style="display:flex;flex-direction:column;gap:1mm;max-width:62mm"><div style="margin-bottom:1mm">${cap(T.payHead, ta)}</div>
          <div style="font-weight:500">${esc(T.mode[d.payMode] || T.mode.offline)}</div>
          <div style="font-size:8pt;color:${MUTE}">${esc(T.note[noteKey])}</div></div>
        ${showQr ? `<div style="display:flex;flex-direction:column;align-items:center;gap:1.2mm"><div style="width:24mm;height:24mm;background:#fff;border:0.2mm solid ${LINE};padding:0.8mm;box-sizing:border-box">${opt.qrSvg}</div>
          ${cap(T.scan, ta)}<div style="font-family:${MONO};font-size:6pt;color:${MUTE}">${esc(opt.upiId)}</div></div>` : ''}
      </div>
      <div style="width:74mm;flex-shrink:0">${sum(T.sub1, inr(d.subtotal))}${d.redeem ? sum(T.pts, '− ' + inr(d.redeem)) : ''}${sum(T.fee, d.fee ? inr(d.fee) : esc(T.free))}
        <div style="background:${G};color:${PAPER};border-radius:1.5mm;padding:2.6mm 3mm;margin-top:2.5mm;display:flex;justify-content:space-between;align-items:center">
          <div style="font-family:${ta ? TAM : SERIF};font-weight:700;font-size:${ta ? '12' : '15'}pt;line-height:1">${esc(T.total)}</div>
          <div style="font-family:${MONO};font-weight:600;font-size:12pt">${inr(d.total)}</div></div>
        <div style="font-size:7pt;color:${MUTE};text-align:right;margin-top:1.5mm">${esc(T.gst)}</div></div></div>
    ${fest}
    <div style="margin-top:auto;padding-top:5mm">
      <div style="height:3.7mm;opacity:0.55;margin-bottom:4mm"><svg width="100%" height="14" style="display:block;height:3.7mm"><defs><pattern id="kolamInv" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 7 C3.5 1 10.5 1 14 7 M0 7 C3.5 13 10.5 13 14 7" fill="none" stroke="${GOLD}" stroke-width="0.8"></path><circle cx="7" cy="7" r="1.1" fill="${GOLD}"></circle></pattern></defs><rect width="100%" height="14" fill="url(#kolamInv)"></rect></svg></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8mm">
        <div style="display:flex;flex-direction:column;gap:1.5mm;max-width:125mm">
          <div style="font-family:${ta ? TAM : SERIF};font-weight:600;font-size:${ta ? '12' : '16'}pt;line-height:1.2;color:${G}">${esc(T.thanks)}</div>
          <div style="font-size:7pt;line-height:1.5;color:${MUTE}">${esc(T.ret)}</div>${web}</div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5mm;font-size:7pt;color:${MUTE};flex-shrink:0"><div style="letter-spacing:${ta ? '0' : '0.12em'};text-transform:${ta ? 'none' : 'uppercase'};font-weight:600">${esc(T.help)}</div>
          <div style="font-family:${MONO};font-size:8pt;color:${INK}">${SITE.phones}</div></div></div></div></div>`;
  }

  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('load ' + src)); document.head.appendChild(s); });
  let libs;
  const ensureLibs = () => libs || (libs = Promise.all([window.html2canvas ? 0 : load('js/vendor/html2canvas.min.js'), window.jspdf ? 0 : load('js/vendor/jspdf.umd.min.js')]));

  async function toPdf(d, lang, opt) {
    await ensureLibs();
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:-12000px;top:0;width:210mm;z-index:-1;pointer-events:none';
    host.innerHTML = build(d, lang, opt);
    document.body.appendChild(host);
    try {
      const imgs = [...host.querySelectorAll('img')];
      await Promise.all(imgs.map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; setTimeout(r, 4000); })));
      imgs.forEach(im => { if (!im.naturalWidth) im.remove(); });
      if (document.fonts) {
        const probe = lang === 'ta' ? ['600 16px "Noto Serif Tamil"', '500 16px "Noto Serif Tamil"'] : [];
        await Promise.all(probe.concat(['600 16px "Cormorant Garamond"', '500 16px "Hanken Grotesk"', '500 16px "IBM Plex Mono"']).map(f => document.fonts.load(f, lang === 'ta' ? 'விலை' : 'Invoice').catch(() => 0)));
        await document.fonts.ready;
      }
      const sheet = host.firstElementChild;
      const canvas = await window.html2canvas(sheet, { scale: 2.4, backgroundColor: '#ffffff', useCORS: true, logging: false });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      const pw = 210, ph = 297, pxPerMm = canvas.width / pw, pagePx = Math.floor(ph * pxPerMm);
      const k = canvas.width / sheet.getBoundingClientRect().width, sTop = sheet.getBoundingClientRect().top;
      const cuts = [...sheet.querySelectorAll('tbody tr')].map(r => r.getBoundingClientRect().bottom - sTop)
        .concat([...sheet.children].map(c => c.getBoundingClientRect().top - sTop)).map(v => Math.round(v * k)).sort((a, b) => a - b);
      let y = 0, first = true;
      while (y < canvas.height - 2) {
        let end = Math.min(y + pagePx, canvas.height);
        if (end < canvas.height) { const c = cuts.filter(v => v > y + pagePx * 0.5 && v <= end); if (c.length) end = c[c.length - 1]; }
        const h = end - y;
        const part = document.createElement('canvas'); part.width = canvas.width; part.height = h;
        const c2 = part.getContext('2d'); c2.fillStyle = '#fff'; c2.fillRect(0, 0, part.width, h); c2.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (!first) pdf.addPage('a4', 'portrait');
        pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pw, h / pxPerMm, undefined, 'FAST');
        y = end; first = false;
      }
      pdf.save('Invoice-' + d.no + '.pdf');
      return true;
    } finally { host.remove(); }
  }
  /* Fallback when the PDF cannot be drawn (for example the page is opened as a local file, or the browser blocks canvas): the same invoice goes to the browser's print dialog, where "Save as PDF" works everywhere. */
  async function printFallback(d, lang, opt) {
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;left:-12000px;top:0;width:210mm;height:297mm;border:0';
    const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
    fr.srcdoc = '<!doctype html><html lang="' + lang + '"><head><meta charset="utf-8"><title>Invoice-' + esc(d.no) + '</title><base href="' + esc(base) + '"><link rel="stylesheet" href="css/style.css"><style>@page{size:A4;margin:0}html,body{margin:0;background:#fff}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>' + build(d, lang, opt) + '</body></html>';
    document.body.appendChild(fr);
    await new Promise(r => { fr.onload = r; setTimeout(r, 3000); });
    try { if (fr.contentDocument.fonts) await fr.contentDocument.fonts.ready; } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
    fr.contentWindow.focus(); fr.contentWindow.print();
    setTimeout(() => fr.remove(), 60000);
    return true;
  }
  window.SVInvoice = { build, toPdf, printFallback, TXT, tamilLabel };
})();
