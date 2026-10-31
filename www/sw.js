/* Service worker: membuat situs dan APK bisa dipakai offline.
   Urutan pencarian file:
   1) cache 'content'  -> file yang diunduh otomatis dari GitHub (paling baru)
   2) cache shell      -> file bawaan yang disimpan saat pertama kali dibuka
   3) jaringan         -> lalu disimpan ke cache 'runtime'
   Nilai BUILD diganti otomatis oleh GitHub Actions di setiap build. */
const BUILD = 'dev';
const SHELL = 'shell-' + BUILD;
const KEEP = [SHELL, 'content', 'runtime'];
const SHELL_FILES = [
  'index.html', 'app.js', 'style.css', 'config.js',
  'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'data/countries.json', 'data/us.json'
];
const scope = self.registration.scope;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await Promise.allSettled(SHELL_FILES.map((f) => c.add(new Request(scope + f, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (!KEEP.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/files.json')) return; // daftar versi selalu dari jaringan
  e.respondWith(handle(req));
});

async function handle(req) {
  const isNav = req.mode === 'navigate';
  const key = isNav ? new Request(scope + 'index.html') : req;
  const opts = { ignoreSearch: true };

  const content = await caches.open('content');
  let hit = await content.match(key, opts);
  if (hit) return hit;

  const shell = await caches.open(SHELL);
  hit = await shell.match(key, opts);
  if (hit) return hit;

  const runtime = await caches.open('runtime');
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === 'basic') runtime.put(req, res.clone());
    return res;
  } catch (err) {
    hit = await runtime.match(key, opts);
    if (hit) return hit;
    if (isNav) {
      const idx = await shell.match(new Request(scope + 'index.html'));
      if (idx) return idx;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
