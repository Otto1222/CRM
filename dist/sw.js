// CRM Napelem – Service Worker
// Stratégia: hashed Vite assets → cache-first; minden más → network-first + cache fallback

const CACHE_VERSION = 'v1';
const CACHE_NAME = `crm-napelem-${CACHE_VERSION}`;

// Az alkalmazás shell – ezeket tároljuk azonnal telepítéskor
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-maskable.svg',
];

// ── Install: előre cache-eljük a shell-t ────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: régi cache törlése ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(n => n.startsWith('crm-napelem-') && n !== CACHE_NAME)
          .map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ───────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Csak GET kérések, csak saját origin
  if (request.method !== 'GET') return;
  let url;
  try { url = new URL(request.url); } catch { return; }
  if (url.origin !== location.origin) return;

  // Vite content-hashed assets (/assets/…) → cache-first (immutable)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // Minden más → network-first, cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(cached => {
          if (cached) return cached;
          // Navigációs kéréshez visszaadjuk az index.html-t (SPA offline fallback)
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        })
      )
  );
});
