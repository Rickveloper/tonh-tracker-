const CACHE = 'tonh-v7';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './app/main.js',
  './app/map.js',
  './app/ui/drawer.js',
  './app/ui/card.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (
    request.url.includes('/api/states/all') ||
    request.url.includes('opensky-network.org') ||
    request.url.includes('adsbexchange.com')
  ) return; // never cache API
  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(resp => {
        if (request.method === 'GET' && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
        }
        return resp;
      })
    )
  );
});
