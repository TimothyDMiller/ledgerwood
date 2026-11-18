// Ledgerwood on a phone, offline (docs/passes/phone-app.md): the app's own files, kept by the phone so it
// opens with no internet. Made by the build (vite.pocket.config.mjs fills in FILES and VERSION). Only this
// app's files: never a call to a computer (/api/...), never anything from another site.
const VERSION = '6ff7627c4f2f';
const FILES = ["./","./index.html","./manifest.webmanifest","./icon-256.png","./icon-512.png","./assets/index-CLqVb404.js","./assets/index-DBd5K2bX.css"];
const CACHE = `ledgerwood-phone-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('ledgerwood-phone-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  if (req.mode === 'navigate') {
    // The page: fresh when there is a connection (a new version shows at once), the kept one when not.
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); return res; }).catch(() => caches.match('./', { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
    return;
  }
  // Files with a version in their name never change: the kept copy first.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
