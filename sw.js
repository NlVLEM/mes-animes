// Offline shell: the page opens without network; TMDB and Firebase calls always go to the network.
const SHELL = 'mes-animes-v26', IMG = 'mes-animes-img';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // network first so updates show up at once, cache when offline
    e.respondWith((req.mode === 'navigate' ? fetch(req.url, {cache:'no-cache', credentials:'same-origin'}) : fetch(req, {cache:'no-cache'})).then(r => { if (r.ok) caches.open(SHELL).then(c => c.put(req, r.clone())); return r; }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
  } else if (url.hostname === 'image.tmdb.org') {
    // posters: cache first, they never change
    e.respondWith(caches.open(IMG).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { c.put(req, r.clone()); return r; }))));
  }
});
