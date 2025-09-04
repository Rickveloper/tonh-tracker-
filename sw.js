const CACHE = 'tonh-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  // Network-first for API; cache-first for app shell.
  if (request.url.includes('/api/states/all')) return; // don't cache live data
  e.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(resp => {
        // Cache Leaflet CSS/JS opportunistically
        if (request.method === 'GET' && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
        }
        return resp;
      })
    )
  );
});
