(() => {
'use strict';

const CFG = window.APP_CONFIG || {};
const NAME = CFG.nama || 'Ofcompas';
const isNative = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  mask: svg('<path d="M4 6c5-2 11-2 16 0v5c0 5-3 8-8 9-5-1-8-4-8-9z"/><circle cx="9" cy="11" r="1"/><circle cx="15" cy="11" r="1"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="3"')
};

/* ============ BAHASA ============ */
const LANGS = window.LANGS || [{ code: 'en', name: 'English', sub: 'English' }];
const DICT = window.I18N || {};
let lang = 'en';                                   // bahasa awal selalu Inggris
try { const s = localStorage.getItem('lang'); if (s && LANGS.some((l) => l.code === s)) lang = s; } catch (e) {}
document.documentElement.lang = lang;

function t(key, vars) {
  let s = (DICT[lang] && DICT[lang][key]) ?? (DICT.en && DICT.en[key]) ?? key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
const lookup = (grp, k) => (DICT[lang] && DICT[lang][grp] && DICT[lang][grp][k]) || (DICT.en[grp] && DICT.en[grp][k]) || k;
const catL = (k) => lookup('cat', k);
const tipeL = (k) => lookup('tipe', k);
const cname = (n) => lookup('countries', n.id) === n.id ? n.nama : lookup('countries', n.id);

function applyStatic() {
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $('#toastBtn').textContent = t('toast_btn');
  document.documentElement.lang = lang;
}

/* ============ DATA ============ */
let RAW = null, TXT = {};
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
async function loadStruct() {
  const c = await getJSON('data/countries.json');
  const packs = await Promise.all(c.negara.filter((n) => n.file).map((n) => getJSON(n.file).then((d) => ({ n, d }))));
  RAW = { negara: c.negara, packs };
}
async function ensureTxt(code) {
  for (const { n } of RAW.packs) {
    if (!n.lang) continue;
    const key = n.id + ':' + code;
    if (key in TXT) continue;
    try { TXT[key] = await getJSON(`${n.lang}.${code}.json`); } catch (e) { TXT[key] = null; }
  }
}
function build() {
  const all = { negara: RAW.negara.map((n) => ({ ...n })), state: [], tujuan: [], objek: [] };
  for (const { n, d } of RAW.packs) {
    const base = TXT[n.id + ':en'] || {}, over = TXT[n.id + ':' + lang] || {};
    const pick = (k, id) => ({ ...((base[k] || {})[id] || {}), ...((over[k] || {})[id] || {}) });
    const nn = all.negara.find((x) => x.id === n.id);
    nn.pack = { ...d, intro: over.intro || base.intro || '' };
    for (const k of ['state', 'tujuan', 'objek']) for (const it of d[k] || []) all[k].push({ ...it, ...pick(k, it.id), negara: n.id });
  }
  ALL = all;
}
async function loadData() {
  await loadStruct();
  await ensureTxt('en');
  if (lang !== 'en') await ensureTxt(lang);
  build();
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
const favBtn = (id, cls) => `<button class="${cls}" data-fav="${esc(id)}" aria-pressed="${fav.includes(id)}" aria-label="${esc(t('fav_aria'))}">${ICON.heart}</button>`;

function pcard(it, type, o = {}) {
  const right = o.right ? esc(o.right) : ICON.arrow;
  const inner = `${art(it)}<span class="pc-panel"><span class="pc-ic">${o.icon || ICON.pin}</span><span class="pc-t"><b>${esc(o.title || it.nama)}</b><small>${esc(o.sub || '')}</small></span><span class="pc-r">${right}</span></span>`;
  const body = o.soon
    ? `<div class="pc-link">${inner}</div>`
    : `<a class="pc-link" href="#/${type}/${esc(it.id)}">${inner}</a>`;
  const pill = o.pill ? `<span class="pc-pill">${esc(o.pill)}</span>` : '';
  const fb = o.fav ? favBtn(it.id, 'circle sm') : '';
  return `<article class="card${o.soon ? ' soon' : ''}" data-rv ${o.extra || ''}>${body}${pill}${fb}</article>`;
}
function row(it, type, sub) {
  return `<a class="row" data-rv href="#/${type}/${esc(it.id)}">${art(it)}<div><b>${esc(it.title || it.nama)}</b><small>${esc(sub)}</small></div></a>`;
}
function top(it, o) {
  const chips = (o.chips || []).length ? `<div class="gchips">${o.chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : '';
  return `<section class="shero">${art(it)}
    <div class="shero-bar"><a class="circle" href="${esc(o.back)}" aria-label="${esc(t('back'))}">${ICON.back}</a>${o.fav ? favBtn(it.id, 'circle') : ''}</div>
    <div class="shero-t"><p class="shero-k">${esc(o.kicker)}</p><h1>${esc(o.title || it.nama)}</h1>${chips}</div></section>`;
}
const secH = (txt, link) => `<div class="sec-h" data-rv><h2>${txt}</h2>${link || ''}</div>`;
const paras = (s) => String(s || '').split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join('');
const stateName = (id) => (find('state', id) || {}).nama || '';
const tujuanName = (id) => (find('tujuan', id) || {}).nama || '';
const countBy = (k, field, id) => ALL[k].filter((x) => x[field] === id).length;
const notFound = () => ({ html: `<div class="empty">${esc(t('nf'))}<br><a href="#/">${esc(t('nf_back'))}</a></div>`, title: NAME, tab: 'home', kind: 'home' });
const yearOf = (o) => (o.tahun ? String(o.tahun).split('–')[0] : '');

/* ============ HALAMAN ============ */
function recoHTML(cat) {
  const list = ALL.objek
    .filter((o) => cat === 'all' || o.kategori === cat)
    .sort((a, b) => (b.unggulan ? 1 : 0) - (a.unggulan ? 1 : 0))
    .slice(0, 8);
  return list.map((o) => pcard(o, 'objek', { sub: `${tujuanName(o.tujuan)}, ${stateName(o.state)}`, right: yearOf(o), pill: catL(o.kategori), fav: true })).join('');
}

function home() {
  const cats = [...new Set(ALL.objek.map((o) => o.kategori))].slice(0, 6);
  const countries = ALL.negara.map((n) => {
    if (n.aktif && n.pack) {
      return pcard(n, 'negara', { title: cname(n), sub: t('country_stats', { s: countBy('state', 'negara', n.id), o: countBy('objek', 'negara', n.id) }), icon: ICON.globe });
    }
    return pcard(n, 'negara', { title: cname(n), sub: t('not_available'), right: t('soon'), icon: ICON.globe, soon: true });
  }).join('');
  return {
    title: NAME, tab: 'home', kind: 'home',
    html: `<div class="greet"><span class="logo">${ICON.compass}</span><div><b>${esc(t('greet_t'))}</b><small>${esc(t('greet_s'))}</small></div></div>
      <p class="kicker" style="margin-top:26px">${esc(t('welcome'))}</p>
      <h1 class="home-h" style="margin-top:6px">${t('home_h')}</h1>
      <a class="searchbar" href="#/cari">${ICON.search}<span>${esc(t('search_bar'))}</span></a>
      ${secH(esc(t('choose_country')))}
      <div class="rail">${countries}</div>
      ${secH(esc(t('recommended')), `<a href="#/cari">${esc(t('see_all'))}</a>`)}
      <div class="chips" id="cats" role="group"><button class="chip on" data-cat="all">${esc(t('all'))}</button>${cats.map((c) => `<button class="chip" data-cat="${esc(c)}">${esc(catL(c))}</button>`).join('')}</div>
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
    ? `<div class="chips" role="group" style="margin-bottom:16px"><button class="chip on" data-r="all">${esc(t('all'))}</button>${regs.map((w) => `<button class="chip" data-r="${esc(w.id)}">${esc(w.nama)}</button>`).join('')}</div>`
    : '';
  return {
    title: cname(n), tab: 'home', kind: 'hero',
    html: `${top(n, { title: cname(n), back: '#/', kicker: t('kick_country'), chips: [t('n_states', { n: states.length }), t('n_places', { n: countBy('objek', 'negara', id) })] })}
      <section class="sheet"><i class="handle"></i>
        <div class="prose" data-rv>${paras(p.intro)}</div>
        ${secH(esc(t('choose_state')))}${chips}
        <div class="grid" id="stateGrid">${states.map((s) => pcard(s, 'state', { sub: s.julukan, right: t('n_dest', { n: countBy('tujuan', 'state', s.id) }), extra: `data-r="${esc(s.wilayah)}"` })).join('')}</div>
      </section>`
  };
}

function stateV(id) {
  const s = find('state', id);
  if (!s) return notFound();
  const n = find('negara', s.negara);
  const w = ((n && n.pack && n.pack.wilayah) || []).find((x) => x.id === s.wilayah);
  const tj = ALL.tujuan.filter((x) => x.state === id);
  return {
    title: s.nama, tab: 'home', kind: 'hero',
    html: `${top(s, { back: `#/negara/${s.negara}`, kicker: s.julukan || '', chips: [t('capital', { x: s.ibukota }), w ? w.nama : '', t('n_dest', { n: tj.length })].filter(Boolean) })}
      <section class="sheet"><i class="handle"></i>
        <div class="prose" data-rv>${paras(s.ringkas)}</div>
        ${secH(esc(t('dest_in', { x: s.nama })))}
        <div class="grid">${tj.map((x) => pcard(x, 'tujuan', { sub: tipeL(x.tipe), right: t('n_places', { n: countBy('objek', 'tujuan', x.id) }) })).join('')}</div>
      </section>`
  };
}

function tujuanV(id) {
  const x = find('tujuan', id);
  if (!x) return notFound();
  const ob = ALL.objek.filter((o) => o.tujuan === id);
  return {
    title: x.nama, tab: 'home', kind: 'hero',
    html: `${top(x, { back: `#/state/${x.state}`, kicker: stateName(x.state), chips: [tipeL(x.tipe), t('n_places', { n: ob.length })] })}
      <section class="sheet"><i class="handle"></i>
        <div class="prose" data-rv>${paras(x.cerita)}</div>
        ${secH(esc(t('worth')))}
        <div class="grid">${ob.map((o) => pcard(o, 'objek', { sub: catL(o.kategori), right: yearOf(o), pill: catL(o.kategori), fav: true })).join('')}</div>
      </section>`
  };
}

function objekV(id) {
  const o = find('objek', id);
  if (!o) return notFound();
  const tj = find('tujuan', o.tujuan);
  const others = ALL.objek.filter((x) => x.tujuan === o.tujuan && x.id !== o.id);
  const hasLoc = typeof o.lat === 'number' && typeof o.lng === 'number';
  const osm = hasLoc ? `https://www.openstreetmap.org/?mlat=${o.lat}&mlon=${o.lng}#map=15/${o.lat}/${o.lng}` : '';
  const fc = (ic, txt) => `<span class="fchip"><i>${ic}</i>${esc(txt)}</span>`;
  const chips = [fc(ICON.tag, catL(o.kategori))];
  if (o.tahun) chips.push(fc(ICON.cal, o.tahun));
  chips.push(fc(ICON.flag, stateName(o.state)));
  if (tj) chips.push(fc(ICON.pin, tj.nama));
  const text = o.cerita || o.ringkas || '';
  const long = String(text).length > 230;
  return {
    title: o.nama, tab: 'home', kind: 'objek',
    html: `${top(o, { back: tj ? `#/tujuan/${tj.id}` : '#/', kicker: `${stateName(o.state)} · ${catL(o.kategori)}`, fav: true })}
      <section class="sheet"><i class="handle"></i>
        ${secH(esc(t('at_glance')))}
        <div class="fchips" data-rv>${chips.join('')}</div>
        ${secH(esc(t('story')))}
        <div class="desc${long ? ' clamp' : ''}" id="desc" data-rv>${paras(text)}</div>
        ${long ? `<button class="more" data-more>${esc(t('read_more'))}</button>` : ''}
        ${o.tips ? `<div class="callout" data-rv><b>${esc(t('tips'))}</b>${esc(o.tips)}</div>` : ''}
        ${others.length ? `${secH(esc(t('nearby')))}<div class="thumbs" data-rv>${others.map((x) => `<a class="thumb" href="#/objek/${esc(x.id)}">${art(x)}<span>${esc(x.nama)}</span></a>`).join('')}</div>` : ''}
      </section>`,
    bar: hasLoc
      ? `<div class="bbar"><div><small>${esc(t('coords'))}</small><b>${o.lat.toFixed(4)}, ${o.lng.toFixed(4)}</b></div><a class="btn acc" href="${osm}" target="_blank" rel="noopener">${esc(t('view_map'))} ${ICON.arrow}</a></div>`
      : ''
  };
}

function cariV() {
  return {
    title: t('search_title'), tab: 'cari', kind: 'plain',
    html: `<h1 class="ptitle">${esc(t('search_title'))}</h1><div class="searchrow"><input id="q" type="search" placeholder="${esc(t('search_ph'))}" autocomplete="off" value="${esc(query)}" aria-label="${esc(t('search_title'))}"></div><div class="rows" id="results"></div>`
  };
}
function doSearch() {
  const box = $('#results'); if (!box) return;
  const q = norm(query).trim();
  if (!q) { box.innerHTML = `<div class="empty" style="grid-column:1/-1">${t('search_hint')}</div>`; return; }
  const hit = (it, extra = '') => norm(`${it.nama} ${it.title || ''} ${it.ringkas || ''} ${catL(it.kategori || '')} ${tipeL(it.tipe || '')} ${extra}`).includes(q);
  const out = [];
  ALL.negara.filter((n) => n.aktif && hit({ ...n, title: cname(n) })).forEach((n) => out.push(row({ ...n, title: cname(n) }, 'negara', t('type_country'))));
  ALL.state.filter((s) => hit(s, s.julukan)).forEach((s) => out.push(row(s, 'state', t('type_state', { x: s.julukan }))));
  ALL.tujuan.filter((x) => hit(x, stateName(x.state))).forEach((x) => out.push(row(x, 'tujuan', `${tipeL(x.tipe)} · ${stateName(x.state)}`)));
  ALL.objek.filter((o) => hit(o, stateName(o.state))).forEach((o) => out.push(row(o, 'objek', `${catL(o.kategori)} · ${stateName(o.state)}`)));
  box.innerHTML = out.length ? out.slice(0, 40).join('') : `<div class="empty" style="grid-column:1/-1">${esc(t('no_results'))}</div>`;
  setupReveal(false);
}

function favV() {
  const list = ALL.objek.filter((o) => fav.includes(o.id));
  return {
    title: t('fav_title'), tab: 'favorit', kind: 'plain',
    html: `<h1 class="ptitle">${esc(t('fav_title'))}</h1>` + (list.length
      ? `<div class="grid" style="margin-top:20px">${list.map((o) => pcard(o, 'objek', { sub: `${tujuanName(o.tujuan)}, ${stateName(o.state)}`, right: yearOf(o), pill: catL(o.kategori), fav: true })).join('')}</div>`
      : `<div class="empty">${t('fav_empty')}</div>`)
  };
}

function settingsV() {
  const build = (readState() || {}).build || 'dev';
  const langs = LANGS.map((l) => `<button class="lang-row${l.code === lang ? ' on' : ''}" data-lang="${l.code}" role="radio" aria-checked="${l.code === lang}"><span class="lr-t"><b>${esc(l.name)}</b><small>${esc(l.sub)}</small></span><i class="lr-c">${ICON.check}</i></button>`).join('');
  return {
    title: t('set_title'), tab: 'settings', kind: 'plain',
    html: `<h1 class="ptitle">${esc(t('set_title'))}</h1>
      <section class="set-group" data-rv><h2>${esc(t('set_lang'))}</h2><p>${esc(t('set_lang_d'))}</p><div class="lang-list" role="radiogroup" aria-label="${esc(t('set_lang'))}">${langs}</div></section>
      <section class="set-group" data-rv><h2>${esc(t('set_updates'))}</h2><p>${esc(t('set_updates_d'))}</p>
        <div class="set-line"><span>${esc(t('set_status'))}</span><b id="setStatus"></b></div>
        <button class="btn" data-act="check">${esc(t('set_check'))}</button></section>
      <section class="set-group" data-rv><h2>${esc(t('set_about'))}</h2>
        <div class="set-line"><span>${esc(t('set_version'))}</span><b>${esc(String(build))}</b></div>
        <div class="set-line"><span>${esc(t('set_dev'))}</span><b></b></div>
        <div class="set-line"><span>${esc(t('set_built'))}</span><b></b></div>
        <button class="btn ghost" data-act="intro">${esc(t('set_intro'))}</button></section>`
  };
}

/* ============ ANIMASI: muncul saat scroll, parallax, dock ============ */
let io = null;
function setupReveal(instant) {
  if (io) io.disconnect();
  const els = $$('#view [data-rv], #results [data-rv]');
  const done = (el) => { el.removeAttribute('data-rv'); el.classList.remove('rv-in'); el.style.removeProperty('--d'); };
  if (instant || reduceMotion || !('IntersectionObserver' in window)) { els.forEach(done); return; }
  io = new IntersectionObserver((entries) => {
    let n = 0;
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target; io.unobserve(el);
      el.style.setProperty('--d', Math.min(n++, 6) * 70 + 'ms');
      el.classList.add('rv-in');
      let fin = false;
      const end = () => { if (fin) return; fin = true; done(el); };
      el.addEventListener('transitionend', (e) => { if (e.propertyName === 'transform') end(); });
      setTimeout(end, 1500);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
  els.forEach((e) => io.observe(e));
}

let ticking = false, lastY = 0;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const y = Math.max(0, window.scrollY);
    const h = $('.shero');
    if (h && !reduceMotion && y < h.offsetHeight + 120) {
      const a = h.querySelector('.art'), tt = h.querySelector('.shero-t');
      a.style.transform = `translate3d(0,${Math.min(y * 0.38, 130)}px,0) scale(${1 + Math.min(y, 420) / 2600})`;
      tt.style.transform = `translate3d(0,${y * 0.2}px,0)`;
      tt.style.opacity = String(Math.max(0, 1 - y / (h.offsetHeight * 0.62)));
    }
    if (y > lastY + 10 && y > 140) document.body.classList.add('dock-hide');
    else if (y < lastY - 6 || y < 90) document.body.classList.remove('dock-hide');
    lastY = y;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });

/* ============ ROUTER ============ */
const view = $('#view');
let firstRender = true;
function compute() {
  const [a, id] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  let r;
  try {
    if (!ALL.negara.length) r = { html: `<div class="empty">${t('no_data')}</div>`, title: NAME, tab: 'home', kind: 'home' };
    else if (!a) r = home();
    else if (a === 'negara') r = negaraV(id);
    else if (a === 'state') r = stateV(id);
    else if (a === 'tujuan') r = tujuanV(id);
    else if (a === 'objek') r = objekV(id);
    else if (a === 'cari') r = cariV();
    else if (a === 'favorit') r = favV();
    else if (a === 'settings') r = settingsV();
    else r = notFound();
  } catch (e) { console.error(e); r = notFound(); }
  r.route = a || '';
  return r;
}

function route(mode) {                       // false = pindah halaman, true = muat ulang diam-diam, 'lang' = ganti bahasa
  const keep = mode === true || mode === 'lang';
  const r = compute();
  const apply = () => {
    view.innerHTML = r.html;
    $('#bar').innerHTML = r.bar || '';
    document.body.dataset.k = r.kind || 'plain';
    document.body.classList.remove('dock-hide');
    document.title = r.title === NAME ? NAME : `${r.title} · ${NAME}`;
    $$('.dock a').forEach((x) => { if (x.dataset.tab === r.tab) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
    if (!keep) { window.scrollTo(0, 0); lastY = 0; }
    setupReveal(mode === true || mode === 'lang');
    if (r.route === 'cari') { doSearch(); if (!keep) setTimeout(() => $('#q') && $('#q').focus({ preventScroll: true }), 120); }
    if (r.route === 'settings') renderStatus();
    onScroll();
  };
  const vt = document.startViewTransition && !reduceMotion && !firstRender && mode !== true;
  if (vt) {
    try { document.startViewTransition(apply); } catch (e) { apply(); }
  } else {
    apply();
    if (!keep) { view.classList.remove('in'); void view.offsetWidth; view.classList.add('in'); }
  }
  firstRender = false;
}

/* ============ BAHASA: ganti ============ */
async function setLang(code) {
  if (code === lang || !LANGS.some((l) => l.code === code)) return;
  lang = code;
  try { localStorage.setItem('lang', code); } catch (e) {}
  await ensureTxt(code);
  build();
  applyStatic();
  renderStatus();
  route('lang');
}

/* ============ INTERAKSI ============ */
window.addEventListener('hashchange', () => route(false));
document.addEventListener('input', (e) => { if (e.target.id === 'q') { query = e.target.value; doSearch(); } });

document.addEventListener('click', (e) => {
  const lg = e.target.closest('[data-lang]');
  if (lg) { setLang(lg.dataset.lang); return; }
  const act = e.target.closest('[data-act]');
  if (act) {
    if (act.dataset.act === 'check') sync(true);
    if (act.dataset.act === 'intro') { try { localStorage.removeItem('intro'); } catch (er) {} location.hash = '#/'; setTimeout(() => showIntro(true), 350); }
    return;
  }
  const chip = e.target.closest('.chip');
  if (chip) {
    $$('.chip', chip.parentElement).forEach((c) => c.classList.toggle('on', c === chip));
    if (chip.dataset.r !== undefined) {
      const r = chip.dataset.r;
      $$('#stateGrid .card').forEach((c) => { c.style.display = (r === 'all' || c.dataset.r === r) ? '' : 'none'; });
    } else if (chip.dataset.cat !== undefined) {
      $('#reco').innerHTML = recoHTML(chip.dataset.cat);
      setupReveal(false);
    }
    return;
  }
  const more = e.target.closest('[data-more]');
  if (more) {
    const d = $('#desc'); d.classList.toggle('clamp');
    more.textContent = d.classList.contains('clamp') ? t('read_more') : t('close');
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
function toast(msg, onClick) {
  $('#toastTxt').textContent = msg;
  const b = $('#toastBtn'); b.textContent = t('toast_btn');
  b.onclick = () => { $('#toast').hidden = true; if (onClick) onClick(); };
  $('#toast').hidden = false;
}

/* ============ LAYAR SAMBUTAN ============ */
function showIntro(force) {
  let seen = false; try { seen = localStorage.getItem('intro') === '1'; } catch (e) {}
  if (!force && (seen || !ALL.objek.length || location.hash.length > 2)) return;
  if (!ALL.objek.length) return;
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
    <h1 class="intro-h">${t('intro_h')}</h1>
    <p class="intro-p">${esc(t('intro_p'))}</p>
    <div class="intro-chips"><span><i>${ICON.globe}</i>${esc(t('chip_countries'))}</span><span><i>${ICON.book}</i>${esc(t('chip_history'))}</span><span><i>${ICON.mask}</i>${esc(t('chip_culture'))}</span></div>
    <div class="intro-card">${pcard(f, 'objek', { sub: `${tujuanName(f.tujuan)}, ${stateName(f.state)}`, right: yearOf(f), pill: catL(f.kategori) }).replace(' data-rv', '')}</div>
    <button class="start" id="startBtn"><span class="dot">${ICON.plane}</span><span class="lbl">${esc(t('start'))}</span><span class="chev"><span>›</span><span>›</span><span>›</span></span></button>
  </div>`;
  el.hidden = false;
  const close = () => {
    try { localStorage.setItem('intro', '1'); } catch (e) {}
    el.classList.add('out');
    setTimeout(() => { el.hidden = true; el.classList.remove('out'); el.innerHTML = ''; }, 800);
  };
  $('#startBtn').onclick = close;
  el.onclick = (e) => { if (e.target.closest('.pc-link')) close(); };
}

/* ============ SINKRONISASI OTOMATIS DARI GITHUB ============
   Mengunduh hanya file yang berubah (lewat files.json), menyimpannya di HP,
   lalu service worker menyajikannya, jadi tetap tersedia saat offline.
   APK: data, foto, dan tampilan ikut diperbarui. Situs web: data dan foto. */
const pill = $('#status');
let lastStatus = { k: 'busy', key: 'st_checking', vars: null };
function setStatus(k, key, vars) { lastStatus = { k, key, vars }; renderStatus(); }
function renderStatus() {
  const txt = t(lastStatus.key, lastStatus.vars);
  pill.dataset.k = lastStatus.k;
  pill.querySelector('span').textContent = txt;
  const s = $('#setStatus'); if (s) { s.textContent = txt; s.dataset.k = lastStatus.k; }
}
const readState = () => { try { return JSON.parse(localStorage.getItem('sync-state') || 'null'); } catch (e) { return null; } };
const writeState = (s) => { try { localStorage.setItem('sync-state', JSON.stringify(s)); } catch (e) {} };
const keyOf = (p) => new Request(new URL(p, document.baseURI).href);
const SHELL_PATHS = ['index.html', 'app.js', 'i18n.js', 'style.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];

let syncing = false, lastSync = 0;
async function sync() {
  if (syncing) return;
  if (!('caches' in window)) { setStatus('err', 'st_unsup'); return; }
  if (isNative && /USERNAME|REPO/.test(CFG.remote || 'USERNAME')) { setStatus('off', 'st_local'); return; }
  if (!navigator.onLine) { setStatus('off', 'st_off'); return; }
  syncing = true; setStatus('busy', 'st_checking');
  try {
    const base = isNative ? CFG.remote : '';
    const r = await fetch(base + 'files.json?t=' + Date.now(), { cache: 'no-store' });
    if (r.status === 404) { setStatus('off', 'st_local'); return; }
    if (!r.ok) throw new Error('files.json ' + r.status);
    const remote = await r.json();
    const cache = await caches.open('content');

    let state = readState();
    if (!state && isNative) {
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
        setStatus('busy', 'st_dl', { a: ++done, b: todo.length });
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    for (const p of gone) await cache.delete(keyOf(p), { ignoreSearch: true });

    const files = {}; want.forEach((p) => { files[p] = remote.files[p]; });
    const dl = [...new Set([...state.dl, ...todo])].filter((p) => p in files);
    writeState({ files, dl, build: remote.build });
    lastSync = Date.now();

    if (dataChanged || gone.length) { TXT = {}; await loadData(); route(true); }
    if (shellChanged && isNative) toast(t('toast_upd'), () => location.reload());
    setStatus('ok', todo.length ? 'st_upd' : 'st_ok');
  } catch (e) {
    console.warn('sync gagal', e);
    if (navigator.onLine) setStatus('err', 'st_err'); else setStatus('off', 'st_off');
  } finally { syncing = false; }
}
pill.addEventListener('click', () => sync());
window.addEventListener('online', () => sync());
window.addEventListener('offline', () => setStatus('off', 'st_off'));
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastSync > 5 * 60 * 1000) sync(); });

/* ============ MULAI ============ */
(async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  applyStatic();
  renderStatus();
  try { await loadData(); } catch (e) { console.warn('data', e); }
  route(false);
  showIntro();
  sync();
})();

})();
