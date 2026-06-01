// Minimal SW for PWA installability + cache-first for static assets
const CACHE = 'top1pct-v1';
const ASSETS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/favicon.png', '/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-first for navigations (so app updates show up)
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
    return;
  }
  // Cache-first for icons and manifest only
  if (ASSETS.some(a => e.request.url.endsWith(a))) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
