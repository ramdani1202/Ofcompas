(() => {
'use strict';

const CFG = window.APP_CONFIG || {};
const NAME = CFG.nama || 'Jelajah';
const isNative = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const svg = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;

const ICON = {
  heart: svg('<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  back: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  arrow: svg('<path d="M9 6l6 6-6 6"/>'),
  pin: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  compass: svg('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
  tag: svg('<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.4"/>'),
  cal: svg('<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  flag: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  plane: svg('<path d="M21 3L3 10.5l7 2.5 2.5 7z"/><path d="M10 13l4-4"/>'),
  book: svg('<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>'),
  mask: svg('<path d="M4 6c5-2 11-2 16 0v5c0 5-3 8-8 9-5-1-8-4-8-9z"/><circle cx="9" cy="11" r="1"/><circle cx="15" cy="11" r="1"/>')
};

/* ============ DATA ============ */
let ALL = { negara: [], state: [], tujuan: [], objek: [] };
let fav = [];
try { fav = JSON.parse(localStorage.getItem('fav') || '[]'); } catch (e) {}
const saveFav = () => { try { localStorage.setItem('fav', JSON.stringify(fav)); } catch (e) {} };
let query = '';

async function getJSON(p) {
  const r = await fetch(p);
  if (!r.ok) throw new Error(p + ' ' + r.status);
  return r.json();
}
async function loadData() {
  const c = await getJSON('data/countries.json');
  const packs = await Promise.all(
    c.negara.filter((n) => n.file).map((n) => getJSON(n.file).then((d) => ({ n, d })))
  );
  const all = { negara: c.negara, state: [], tujuan: [], objek: [] };
  for (const { n, d } of packs) {
    n.pack = d;
    for (const k of ['state', 'tujuan', 'objek']) for (const it of d[k] || []) all[k].push({ ...it, negara: n.id });
  }
  ALL = all;
}
const find = (k, id) => ALL[k].find((x) => x.id === id);

/* ============ KOMPONEN ============ */
function hue(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function art(it, cls = '') {
  const img = it.foto
    ? `<img src="${esc(it.foto)}" alt="${esc(it.nama)}" loading="lazy" decoding="async" onerror="this.remove()">`
    : '';
  return `<div class="art ${cls}" style="--h:${hue(it.id || it.nama)}"><svg class="scene" viewBox="0 0 200 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><circle cx="150" cy="34" r="14"/><path d="M0 120V84l36-34 28 26 38-48 44 56 20-18 34 32v22z"/></svg>${img}</div>`;
}
const favBtn = (id, cls) => `<button class="${cls}" data-fav="${esc(id)}" aria-pressed="${fav.includes(id)}" aria-label="Simpan ke favorit">${ICON.heart}</button>`;

function pcard(it, type, o = {}) {
  const right = o.right ? esc(o.right) : ICON.arrow;
  const inner = `${art(it)}<span class="pc-panel"><span class="pc-ic">${o.icon || ICON.pin}</span><span class="pc-t"><b>${esc(it.nama)}</b><small>${esc(o.sub || '')}</small></span><span class="pc-r">${right}</span></span>`;
  const body = o.soon
    ? `<div class="pc-link">${inner}</div>`
    : `<a class="pc-link" href="#/${type}/${esc(it.id)}">${inner}</a>`;
  const pill = o.pill ? `<span class="pc-pill">${esc(o.pill)}</span>` : '';
  const fb = o.fav ? favBtn(it.id, 'circle sm') : '';
  return `<article class="card${o.soon ? ' soon' : ''}" style="--i:${Math.min(o.i || 0, 10)}" ${o.extra || ''}>${body}${pill}${fb}</article>`;
}
function row(it, type, sub, i = 0) {
  return `<a class="row" href="#/${type}/${esc(it.id)}" style="--i:${Math.min(i, 12)}">${art(it)}<div><b>${esc(it.nama)}</b><small>${esc(sub)}</small></div></a>`;
}
function top(it, o) {
  const chips = (o.chips || []).length ? `<div class="gchips">${o.chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : '';
  return `<section class="shero">${art(it)}
    <div class="shero-bar"><a class="circle" href="${esc(o.back)}" aria-label="Kembali">${ICON.back}</a>${o.fav ? favBtn(it.id, 'circle') : ''}</div>
    <div class="shero-t"><p class="shero-k">${esc(o.kicker)}</p><h1>${esc(it.nama)}</h1>${chips}</div></section>`;
}
const paras = (t) => String(t || '').split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join('');
const stateName = (id) => (find('state', id) || {}).nama || '';
const tujuanName = (id) => (find('tujuan', id) || {}).nama || '';
const countBy = (k, field, id) => ALL[k].filter((x) => x[field] === id).length;
const notFound = () => ({ html: '<div class="empty">Halaman tidak ditemukan.<br><a href="#/">Kembali ke beranda</a></div>', title: NAME, tab: 'home', kind: 'home' });
const yearOf = (o) => (o.tahun ? String(o.tahun).split('–')[0] : '');

/* ============ HALAMAN ============ */
function recoHTML(cat) {
  const list = ALL.objek
    .filter((o) => cat === 'all' || o.kategori === cat)
    .sort((a, b) => (b.unggulan ? 1 : 0) - (a.unggulan ? 1 : 0))
    .slice(0, 8);
  return list.map((o, i) => pcard(o, 'objek', { sub: `${tujuanName(o.tujuan)}, ${stateName(o.state)}`, right: yearOf(o), pill: o.kategori, fav: true, i })).join('');
}

function home() {
  const cats = [...new Set(ALL.objek.map((o) => o.kategori))].slice(0, 6);
  const countries = ALL.negara.map((n, i) => {
    if (n.aktif && n.pack) {
      return pcard(n, 'negara', { sub: `${countBy('state', 'negara', n.id)} state · ${countBy('objek', 'negara', n.id)} objek`, icon: ICON.globe, i });
    }
    return pcard(n, 'negara', { sub: 'Belum tersedia', right: 'Segera', icon: ICON.globe, soon: true, i });
  }).join('');
  return {
    title: NAME, tab: 'home', kind: 'home',
    html: `<div class="greet"><span class="logo">${ICON.compass}</span><div><b>Halo, Penjelajah</b><small>Pilih perjalanan barumu</small></div></div>
      <p class="kicker" style="margin-top:26px">Selamat datang</p>
      <h1 class="home-h" style="margin-top:6px">Mau pergi ke <mark>mana</mark> hari ini?</h1>
      <a class="searchbar" href="#/cari">${ICON.search}<span>Cari negara, kota, atau tempat…</span></a>
      <div class="sec-h"><h2>Pilih negara</h2></div>
      <div class="rail">${countries}</div>
      <div class="sec-h"><h2>Rekomendasi</h2><a href="#/cari">Lihat semua</a></div>
      <div class="chips" id="cats" role="group" aria-label="Filter kategori"><button class="chip on" data-cat="all">Semua</button>${cats.map((c) => `<button class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="grid" id="reco" style="margin-top:14px">${recoHTML('all')}</div>`
  };
}

function negaraV(id) {
  const n = find('negara', id);
  if (!n || !n.pack) return notFound();
  const p = n.pack;
  const states = ALL.state.filter((s) => s.negara === id);
  const regs = (p.wilayah || []).filter((w) => states.some((s) => s.wilayah === w.id));
  const chips = regs.length > 1
    ? `<div class="chips" role="group" aria-label="Filter wilayah" style="margin-bottom:16px"><button class="chip on" data-r="all">Semua</button>${regs.map((w) => `<button class="chip" data-r="${esc(w.id)}">${esc(w.nama)}</button>`).join('')}</div>`
    : '';
  return {
    title: n.nama, tab: 'home', kind: 'hero',
    html: `${top(n, { back: '#/', kicker: 'Negara', chips: [`${states.length} state`, `${countBy('objek', 'negara', id)} objek`] })}
      <section class="sheet"><i class="handle"></i>
        <div class="prose">${paras(p.intro)}</div>
        <div class="sec-h"><h2>Pilih state</h2></div>${chips}
        <div class="grid" id="stateGrid">${states.map((s, i) => pcard(s, 'state', { sub: s.julukan, right: `${countBy('tujuan', 'state', s.id)} tujuan`, extra: `data-r="${esc(s.wilayah)}"`, i })).join('')}</div>
      </section>`
  };
}

function stateV(id) {
  const s = find('state', id);
  if (!s) return notFound();
  const n = find('negara', s.negara);
  const w = ((n && n.pack && n.pack.wilayah) || []).find((x) => x.id === s.wilayah);
  const tj = ALL.tujuan.filter((t) => t.state === id);
  return {
    title: s.nama, tab: 'home', kind: 'hero',
    html: `${top(s, { back: `#/negara/${s.negara}`, kicker: s.julukan || 'State', chips: [`Ibu kota ${s.ibukota}`, w ? w.nama : '', `${tj.length} tujuan`].filter(Boolean) })}
      <section class="sheet"><i class="handle"></i>
        <div class="prose">${paras(s.ringkas)}</div>
        <div class="sec-h"><h2>Tujuan di ${esc(s.nama)}</h2></div>
        <div class="grid">${tj.map((t, i) => pcard(t, 'tujuan', { sub: t.tipe, right: `${countBy('objek', 'tujuan', t.id)} objek`, i })).join('')}</div>
      </section>`
  };
}

function tujuanV(id) {
  const t = find('tujuan', id);
  if (!t) return notFound();
  const ob = ALL.objek.filter((o) => o.tujuan === id);
  return {
    title: t.nama, tab: 'home', kind: 'hero',
    html: `${top(t, { back: `#/state/${t.state}`, kicker: stateName(t.state), chips: [t.tipe, `${ob.length} tempat`] })}
      <section class="sheet"><i class="handle"></i>
        <div class="prose">${paras(t.cerita)}</div>
        <div class="sec-h"><h2>Tempat yang layak dikunjungi</h2></div>
        <div class="grid">${ob.map((o, i) => pcard(o, 'objek', { sub: o.kategori, right: yearOf(o), pill: o.kategori, fav: true, i })).join('')}</div>
      </section>`
  };
}

function objekV(id) {
  const o = find('objek', id);
  if (!o) return notFound();
  const t = find('tujuan', o.tujuan);
  const others = ALL.objek.filter((x) => x.tujuan === o.tujuan && x.id !== o.id);
  const hasLoc = typeof o.lat === 'number' && typeof o.lng === 'number';
  const osm = hasLoc ? `https://www.openstreetmap.org/?mlat=${o.lat}&mlon=${o.lng}#map=15/${o.lat}/${o.lng}` : '';
  const fc = (ic, txt) => `<span class="fchip"><i>${ic}</i>${esc(txt)}</span>`;
  const chips = [fc(ICON.tag, o.kategori)];
  if (o.tahun) chips.push(fc(ICON.cal, o.tahun));
  chips.push(fc(ICON.flag, stateName(o.state)));
  if (t) chips.push(fc(ICON.pin, t.nama));
  const long = String(o.cerita || o.ringkas || '').length > 230;
  return {
    title: o.nama, tab: 'home', kind: 'objek',
    html: `${top(o, { back: t ? `#/tujuan/${t.id}` : '#/', kicker: `${stateName(o.state)} · ${o.kategori}`, fav: true })}
      <section class="sheet"><i class="handle"></i>
        <div class="sec-h"><h2>Sekilas</h2></div>
        <div class="fchips">${chips.join('')}</div>
        <div class="sec-h"><h2>Cerita</h2></div>
        <div class="desc${long ? ' clamp' : ''}" id="desc">${paras(o.cerita || o.ringkas)}</div>
        ${long ? '<button class="more" data-more>Selengkapnya…</button>' : ''}
        ${o.tips ? `<div class="callout"><b>Tips</b>${esc(o.tips)}</div>` : ''}
        ${others.length ? `<div class="sec-h"><h2>Di sekitar sini</h2></div><div class="thumbs">${others.map((x) => `<a class="thumb" href="#/objek/${esc(x.id)}">${art(x)}<span>${esc(x.nama)}</span></a>`).join('')}</div>` : ''}
      </section>`,
    bar: hasLoc
      ? `<div class="bbar"><div><small>Koordinat</small><b>${o.lat.toFixed(4)}, ${o.lng.toFixed(4)}</b></div><a class="btn acc" href="${osm}" target="_blank" rel="noopener">Lihat di peta ${ICON.arrow}</a></div>`
      : ''
  };
}

function cariV() {
  return {
    title: 'Cari', tab: 'cari', kind: 'plain',
    html: `<h1 class="ptitle">Cari tempat</h1><div class="searchrow"><input id="q" type="search" placeholder="Cari negara, kota, atau tempat…" autocomplete="off" value="${esc(query)}" aria-label="Cari"></div><div class="rows" id="results"></div>`
  };
}
function doSearch() {
  const box = $('#results'); if (!box) return;
  const q = norm(query).trim();
  if (!q) { box.innerHTML = '<div class="empty" style="grid-column:1/-1">Ketik nama tempat, kota, atau state.<br>Contoh: Yosemite, New York, Disney.</div>'; return; }
  const hit = (it, extra = '') => norm(`${it.nama} ${it.ringkas || ''} ${it.kategori || ''} ${it.tipe || ''} ${extra}`).includes(q);
  const out = [];
  ALL.negara.filter((n) => n.aktif && hit(n)).forEach((n) => out.push(row(n, 'negara', 'Negara', out.length)));
  ALL.state.filter((s) => hit(s, s.julukan)).forEach((s) => out.push(row(s, 'state', `State · ${s.julukan}`, out.length)));
  ALL.tujuan.filter((t) => hit(t, stateName(t.state))).forEach((t) => out.push(row(t, 'tujuan', `${t.tipe} · ${stateName(t.state)}`, out.length)));
  ALL.objek.filter((o) => hit(o, stateName(o.state))).forEach((o) => out.push(row(o, 'objek', `${o.kategori} · ${stateName(o.state)}`, out.length)));
  box.innerHTML = out.length ? out.slice(0, 40).join('') : '<div class="empty" style="grid-column:1/-1">Tidak ada hasil. Coba kata lain.</div>';
}

function favV() {
  const list = ALL.objek.filter((o) => fav.includes(o.id));
  return {
    title: 'Favorit', tab: 'favorit', kind: 'plain',
    html: `<h1 class="ptitle">Favorit</h1>` + (list.length
      ? `<div class="grid" style="margin-top:20px">${list.map((o, i) => pcard(o, 'objek', { sub: `${tujuanName(o.tujuan)}, ${stateName(o.state)}`, right: yearOf(o), pill: o.kategori, fav: true, i })).join('')}</div>`
      : '<div class="empty">Belum ada favorit.<br>Ketuk ikon hati pada sebuah tempat untuk menyimpannya.</div>')
  };
}

/* ============ ROUTER ============ */
const view = $('#view');
function route(keep) {
  const [a, id] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  let r;
  try {
    if (!ALL.negara.length) r = { html: '<div class="empty">Data belum tersedia.<br>Sambungkan internet sekali untuk mengunduh isi aplikasi.</div>', title: NAME, tab: 'home', kind: 'home' };
    else if (!a) r = home();
    else if (a === 'negara') r = negaraV(id);
    else if (a === 'state') r = stateV(id);
    else if (a === 'tujuan') r = tujuanV(id);
    else if (a === 'objek') r = objekV(id);
    else if (a === 'cari') r = cariV();
    else if (a === 'favorit') r = favV();
    else r = notFound();
  } catch (e) { console.error(e); r = notFound(); }

  view.classList.toggle('keep', !!keep);
  view.innerHTML = r.html;
  $('#bar').innerHTML = r.bar || '';
  document.body.dataset.k = r.kind || 'plain';
  document.title = r.title === NAME ? NAME : `${r.title} · ${NAME}`;
  $$('.dock a').forEach((x) => { if (x.dataset.tab === r.tab) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
  if (!keep) {
    window.scrollTo(0, 0);
    view.classList.remove('in'); void view.offsetWidth; view.classList.add('in');
  }
  if (a === 'cari') { doSearch(); if (!keep) setTimeout(() => $('#q') && $('#q').focus(), 80); }
}

/* ============ INTERAKSI ============ */
window.addEventListener('hashchange', () => route(false));
document.addEventListener('input', (e) => { if (e.target.id === 'q') { query = e.target.value; doSearch(); } });

document.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip) {
    $$('.chip', chip.parentElement).forEach((c) => c.classList.toggle('on', c === chip));
    if (chip.dataset.r !== undefined) {
      const r = chip.dataset.r;
      $$('#stateGrid .card').forEach((c) => { c.style.display = (r === 'all' || c.dataset.r === r) ? '' : 'none'; });
    } else if (chip.dataset.cat !== undefined) {
      view.classList.remove('keep');
      $('#reco').innerHTML = recoHTML(chip.dataset.cat);
    }
    return;
  }
  const more = e.target.closest('[data-more]');
  if (more) {
    const d = $('#desc'); d.classList.toggle('clamp');
    more.textContent = d.classList.contains('clamp') ? 'Selengkapnya…' : 'Tutup';
    return;
  }
  const fb = e.target.closest('[data-fav]');
  if (fb) {
    const fid = fb.dataset.fav;
    const was = fav.includes(fid);
    fav = was ? fav.filter((x) => x !== fid) : [...fav, fid];
    saveFav();
    $$(`[data-fav="${CSS.escape(fid)}"]`).forEach((b) => b.setAttribute('aria-pressed', String(!was)));
    fb.classList.remove('pop'); void fb.offsetWidth; fb.classList.add('pop');
    if (location.hash === '#/favorit' && was) setTimeout(() => route(true), 250);
  }
});

/* ============ TOAST ============ */
function toast(msg, btnText, onClick) {
  $('#toastTxt').textContent = msg;
  const b = $('#toastBtn'); b.textContent = btnText || 'OK';
  b.onclick = () => { $('#toast').hidden = true; if (onClick) onClick(); };
  $('#toast').hidden = false;
}

/* ============ LAYAR SAMBUTAN (sekali saja) ============ */
function showIntro() {
  let seen = false; try { seen = localStorage.getItem('intro') === '1'; } catch (e) {}
  if (seen || !ALL.objek.length || location.hash.length > 2) return;
  const f = ALL.objek.find((o) => o.unggulan) || ALL.objek[0];
  const el = $('#intro');
  el.innerHTML = `<div class="intro-in">
    <svg class="intro-art" viewBox="0 0 320 300" aria-hidden="true">
      <defs>
        <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9dbcff"/><stop offset="1" stop-color="#4468cc"/></linearGradient>
        <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd9f7"/><stop offset="1" stop-color="#5f93d8"/></linearGradient>
        <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86dccb"/><stop offset="1" stop-color="#2f8f93"/></linearGradient>
      </defs>
      <circle cx="232" cy="74" r="46" fill="#fff" opacity=".55"/>
      <path d="M70 300V170l48-68 42 52 52-92 72 118v120z" fill="url(#ga)"/>
      <path d="M0 300V214l58-58 52 50 50-42 84 88v48z" fill="url(#gb)" opacity=".92"/>
      <path d="M70 300v-60l74-38 62 30 114-48v116z" fill="url(#gc)"/>
      <path d="M6 150C70 60 170 34 244 70" fill="none" stroke="#101828" stroke-width="2.2" stroke-dasharray="2 8" stroke-linecap="round"/>
      <g transform="translate(250 72) rotate(28)"><path d="M16 0L-11 -10L-6 0L-11 10Z" fill="#101828"/><path d="M-6 0H8" stroke="#f5c451" stroke-width="2" stroke-linecap="round"/></g>
    </svg>
    <h1 class="intro-h">Jelajahi <mark>Sejarah</mark> &amp; Budaya</h1>
    <p class="intro-p">Kenali cerita di balik setiap tempat sebelum Anda datang. Tersimpan di HP, bisa dibuka tanpa internet.</p>
    <div class="intro-chips"><span><i>${ICON.globe}</i>Negara</span><span><i>${ICON.book}</i>Sejarah</span><span><i>${ICON.mask}</i>Budaya</span></div>
    <div class="intro-card">${pcard(f, 'objek', { sub: `${tujuanName(f.tujuan)}, ${stateName(f.state)}`, right: yearOf(f), pill: f.kategori })}</div>
    <button class="start" id="startBtn"><span class="dot">${ICON.plane}</span><span class="lbl">Mulai Jelajah</span><span class="chev"><span>›</span><span>›</span><span>›</span></span></button>
  </div>`;
  el.hidden = false;
  const close = () => {
    try { localStorage.setItem('intro', '1'); } catch (e) {}
    el.classList.add('out');
    setTimeout(() => { el.hidden = true; el.classList.remove('out'); el.innerHTML = ''; }, 800);
  };
  $('#startBtn').onclick = close;
  el.addEventListener('click', (e) => { if (e.target.closest('.pc-link')) close(); });
}

/* ============ SINKRONISASI OTOMATIS DARI GITHUB ============
   - Membaca files.json (daftar file + hash) dari GitHub Pages.
   - Mengunduh hanya file yang berubah, menyimpannya ke cache 'content'.
   - Service worker menyajikan cache itu lebih dulu, jadi isi baru tetap ada saat offline.
   - Di APK: data, foto, DAN tampilan (html/css/js) ikut diperbarui.
   - Di situs web: data dan foto (tampilan diperbarui oleh service worker). */
const pill = $('#status');
function setStatus(k, t) { pill.dataset.k = k; pill.querySelector('span').textContent = t; }
const readState = () => { try { return JSON.parse(localStorage.getItem('sync-state') || 'null'); } catch (e) { return null; } };
const writeState = (s) => { try { localStorage.setItem('sync-state', JSON.stringify(s)); } catch (e) {} };
const keyOf = (p) => new Request(new URL(p, document.baseURI).href);
const SHELL_PATHS = ['index.html', 'app.js', 'style.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];

let syncing = false, lastSync = 0;
async function sync() {
  if (syncing) return;
  if (!('caches' in window)) { setStatus('err', 'Offline tidak didukung'); return; }
  if (isNative && /USERNAME|REPO/.test(CFG.remote || 'USERNAME')) { setStatus('off', 'Mode lokal'); return; }
  if (!navigator.onLine) { setStatus('off', 'Offline · tersimpan'); return; }
  syncing = true; setStatus('busy', 'Memeriksa…');
  try {
    const base = isNative ? CFG.remote : '';
    const r = await fetch(base + 'files.json?t=' + Date.now(), { cache: 'no-store' });
    if (r.status === 404) { setStatus('off', 'Mode lokal'); return; }
    if (!r.ok) throw new Error('files.json ' + r.status);
    const remote = await r.json();
    const cache = await caches.open('content');

    let state = readState();
    if (!state && isNative) {            // baseline: file yang sudah ikut terpasang di APK
      try { const b = await (await fetch('files.json?b=' + Date.now())).json(); state = { files: b.files || {}, dl: [] }; } catch (e) {}
    }
    state = state || { files: {}, dl: [] };

    const want = Object.keys(remote.files).filter((p) => isNative || p.startsWith('data/') || p.startsWith('img/'));
    const todo = [];
    for (const p of want) {
      if (state.files[p] !== remote.files[p]) todo.push(p);
      else if (state.dl.includes(p) && !(await cache.match(keyOf(p), { ignoreSearch: true }))) todo.push(p);
    }
    const gone = Object.keys(state.files).filter((p) => !(p in remote.files));

    let done = 0, shellChanged = false, dataChanged = false;
    const queue = [...todo];
    const worker = async () => {
      while (queue.length) {
        const p = queue.shift();
        const res = await fetch(base + p, { cache: 'no-store' });
        if (!res.ok) throw new Error(p + ' ' + res.status);
        await cache.put(keyOf(p), res);
        if (SHELL_PATHS.includes(p)) shellChanged = true;
        if (p.startsWith('data/') || p.startsWith('img/')) dataChanged = true;
        setStatus('busy', `Mengunduh ${++done}/${todo.length}`);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    for (const p of gone) await cache.delete(keyOf(p), { ignoreSearch: true });

    const files = {}; want.forEach((p) => { files[p] = remote.files[p]; });
    const dl = [...new Set([...state.dl, ...todo])].filter((p) => p in files);
    writeState({ files, dl, build: remote.build });
    lastSync = Date.now();

    if (dataChanged || gone.length) { await loadData(); route(true); }
    if (shellChanged && isNative) toast('Pembaruan tampilan siap.', 'Muat ulang', () => location.reload());
    setStatus('ok', todo.length ? 'Diperbarui · siap offline' : 'Siap offline');
  } catch (e) {
    console.warn('sync gagal', e);
    setStatus(navigator.onLine ? 'err' : 'off', navigator.onLine ? 'Gagal memperbarui' : 'Offline · tersimpan');
  } finally { syncing = false; }
}
pill.addEventListener('click', sync);
window.addEventListener('online', sync);
window.addEventListener('offline', () => setStatus('off', 'Offline · tersimpan'));
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastSync > 5 * 60 * 1000) sync(); });

/* ============ MULAI ============ */
(async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  try { await loadData(); } catch (e) { console.warn('data', e); }
  route(false);
  showIntro();
  sync();
})();

})();
