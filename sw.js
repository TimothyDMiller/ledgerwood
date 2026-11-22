// Ledgerwood on a phone, offline (docs/passes/phone-app.md, docs/passes/phone-ready.md): the app's own files,
// kept by the phone so it opens with no signal. Made by the build (vite.pocket.config.mjs fills in FILES and
// VERSION). Only this app's files: never a call to a computer (/api/...), never anything from another site.
//
// Never stranded on a half version: the page is always the kept index.html of THIS version, whose code files
// were all kept together (addAll keeps all or none). A new version installs in the background with all of its
// files, then takes over; the open app picks it up the next time it comes back (see main.tsx). The money
// itself is never here - it is in the phone's own storage (IndexedDB), which no update touches.
const VERSION = '1c76759ccbea';
const FILES = ["./","./index.html","./manifest.webmanifest","./icon-256.png","./favicon-32.png","./icon-192.png","./icon-512.png","./maskable-192.png","./maskable-512.png","./apple-touch-icon.png","./assets/index-B4ECq8H7.js","./assets/index-NoOewd4c.css"];
const CACHE = `ledgerwood-phone-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('ledgerwood-phone-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (e) => { if (e.data === 'version') e.source?.postMessage({ version: VERSION }); });

const scopePath = new URL(self.registration.scope).pathname;

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  if (req.mode === 'navigate' && (url.pathname === scopePath || url.pathname === `${scopePath}index.html`)) {
    // The app itself: this version's kept page at once (fast, and the same with or without signal);
    // the network only if it was never kept.
    e.respondWith(caches.open(CACHE).then((c) => c.match('./index.html')).then((hit) => hit || fetch(req)));
    return;
  }
  if (req.mode === 'navigate') {
    // Another page of the site (the card to print): fresh when there is signal, else a kept copy.
    e.respondWith(fetch(req).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
    return;
  }
  // Code and pictures: the kept copy first (their names change with every version), else the network.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
