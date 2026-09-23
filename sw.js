/* =========================================================
   Service Worker — MIS FINANZAS
   Estrategia: cache-first para el shell, network-first
   para recursos externos. Ignora Supabase y CDNs.
========================================================= */

const CACHE = 'mis-finanzas-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

/* Instalación: precachear el shell */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

/* Activación: limpiar cachés antiguos */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch */
self.addEventListener('fetch', event => {
  const req = event.request;

  /* Solo GET */
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Ignorar peticiones a Supabase, CDNs y APIs externas */
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('jsdelivr.net')) return;
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('gstatic.com')) return;
  if (url.hostname.includes('workers.dev')) return;

  /* Navegación (abrir la app): network-first con fallback a index.html */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* Recursos propios: cache-first */
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req)
        .then(res => {
          if (url.origin === location.origin) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});