/* ============================================================
   LinguiVance Service Worker v1.0
   Cache-first strategy for offline support
   ============================================================ */

const CACHE_NAME = 'linguivance-v1.0';

/* Local assets to pre-cache on install */
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './grammer.json',
  './pharese.json',
  './sinavlar.json'
];

/* ── INSTALL: pre-cache local files ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Pre-cache failed:', err))
  );
});

/* ── ACTIVATE: clean up old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH: cache-first for local, network-first for CDN ── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isLocal = url.origin === self.location.origin;
  const isCDN   = url.hostname.includes('googleapis.com') ||
                  url.hostname.includes('gstatic.com')    ||
                  url.hostname.includes('cloudflare.com') ||
                  url.hostname.includes('fontawesome.com');

  if (isLocal) {
    /* Cache-first for local files (HTML, JSON, etc.) */
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          /* Return cached version if available */
          return caches.match('./index.html');
        });
      })
    );
  } else if (isCDN) {
    /* Network-first with cache fallback for CDN (fonts, icons) */
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
  /* All other requests: let browser handle normally */
});

/* ── MESSAGE: force update from app ── */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
