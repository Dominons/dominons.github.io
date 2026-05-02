// =============================================
//  DANIFU777 - Service Worker (PWA Offline)
// =============================================

const CACHE_NAME = 'danifu777-v1';

// Recursos propios que se guardan en caché al instalar
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './Favicon.ico'
  // Si tenés iconos PNG propios, agregálos aquí:
  // './icon-192.png',
  // './icon-512.png',
];

// CDN externos que también se cachean (estrategia: Cache First)
const CDN_CACHE_NAME = 'danifu777-cdn-v1';
const CDN_ORIGINS = [
  'https://cdnjs.cloudflare.com',
  'https://www.gstatic.com',
  'https://www.googleapis.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

// ── INSTALL: pre-cachear recursos propios ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar cachés viejas ───────────────────────────────────────
self.addEventListener('activate', event => {
  const validCaches = [CACHE_NAME, CDN_CACHE_NAME];
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => !validCaches.includes(key))
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── FETCH: estrategia según el tipo de recurso ────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones que no sean GET o que sean chrome-extension
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  // Firebase Firestore / Auth → siempre Network First (datos en tiempo real)
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken')
  ) {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // iframes de TradingView y YouTube → solo Network (no cachear)
  if (
    url.hostname.includes('tradingview.com') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('ytimg.com') ||
    url.hostname.includes('youtu.be')
  ) {
    event.respondWith(fetch(request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // CDN externos (Font Awesome, Firebase SDK, etc.) → Cache First
  if (CDN_ORIGINS.some(origin => request.url.startsWith(origin))) {
    event.respondWith(cacheFirst(request, CDN_CACHE_NAME));
    return;
  }

  // Recursos propios (index.html, manifest, iconos) → Cache First con fallback a index.html
  event.respondWith(cacheFirstWithFallback(request));
});

// ── ESTRATEGIAS DE CACHÉ ──────────────────────────────────────────────────

/** Cache First: devuelve caché si existe; si no, fetch y guarda */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Sin conexión y sin caché para este recurso.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

/** Network First: intenta red; si falla, devuelve caché */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Sin conexión.', { status: 503 });
  }
}

/** Cache First con fallback a index.html para navegación offline */
async function cacheFirstWithFallback(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Si es una navegación, servir index.html como fallback
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    return new Response('Sin conexión.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
