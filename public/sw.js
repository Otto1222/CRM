// CRM Napelem – Service Worker
// Stratégia:
//   1) Navigáció (SPA HTML)        → network-first, a HTML-t SOHA nem cache-eljük
//   2) Hashed Vite asset (/assets) → cache-first (immutable, hash a fájlnévben)
//   3) Minden más GET              → network-first + cache fallback
//
// A HTML-t szándékosan NEM cache-eljük, így deploy után nem ragadhat be elavult
// index.html, ami már nem létező (régi hash-ű) asset-fájlokra hivatkozna → ez
// okozta a "beragadt fehér oldalt" és a HTML/JS verzióütközést.

const CACHE_VERSION = 'v2';
const CACHE_NAME = `crm-napelem-${CACHE_VERSION}`;

// Az alkalmazás shell – ezeket tároljuk azonnal telepítéskor (offline tartalék)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-maskable.svg',
];

// Csak ÉP, TELJES, saját-origin választ szabad cache-be tenni.
// Kizárva: hibás (nem ok / nem 200), részleges (206 Range), és nem-"basic"
// (opaque/cors) válasz – ezekből sérült bejegyzés kerülne a cache-be.
function isCacheable(response) {
  return !!response &&
    response.ok &&
    response.status === 200 &&
    response.type === 'basic';
}

// A Response-t a HÍVÓ klónozza SZINKRON módon (response.clone() a fetch .then-jében,
// MIELŐTT a body-t a böngésző elkezdené olvasni), és a kész másolatot adja át ide.
// Így a body sosem fogy el kétszer → nincs "Response body is already used".
function putInCache(request, responseClone) {
  caches.open(CACHE_NAME)
    .then(cache => cache.put(request, responseClone))
    .catch(() => { /* a cache-írás nem kritikus – a válasz már ment a lapnak */ });
}

// ── Install: előre cache-eljük a shell-t ────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: régi verziók cache-ének törlése ───────────────────
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

  // 1) Navigációs kérés (SPA HTML) → MINDIG network-first, a HTML-t SOHA nem
  //    cache-eljük. Offline tartalék: az install-kor előre cache-elt index.html.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then(cached => cached || Response.error())
      )
    );
    return;
  }

  // 2) Vite content-hashed asset (/assets/…) → cache-first (immutable)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          // szinkron clone MIELŐTT a body-t felhasználnánk
          if (isCacheable(response)) putInCache(request, response.clone());
          return response;
        });
      })
    );
    return;
  }

  // 3) Minden más GET → network-first, cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (isCacheable(response)) putInCache(request, response.clone());
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || Response.error()))
  );
});
