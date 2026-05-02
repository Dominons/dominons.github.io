const CACHE_NAME = 'danifu777-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './Favicon.ico',
  './manifest.json'
];

// 1. INSTALACIÓN: Guardamos los archivos estáticos en caché
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker y caché inicial');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Archivos cacheados');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(err => console.error('[SW] Error al cachear:', err))
  );
  // Forzamos la activación inmediata del nuevo SW
  self.skipWaiting();
});

// 2. ACTIVACIÓN: Limpiamos cachés viejas si cambiamos la versión
self.addEventListener('activate', event => {
  console.log('[SW] Service Worker activado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tomamos control de todas las pestañas abiertas inmediatamente
  self.clients.claim();
});

// 3. FETCH: Estrategia "Cache First" (Caché primero, red después)
self.addEventListener('fetch', event => {
  // Ignoramos peticiones que no son GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Si está en caché, lo devolvemos (offline instantáneo)
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Si no está en caché (ej: APIs externas), intentamos la red
        return fetch(event.request)
          .then(networkResponse => {
            // Opcional: Si queremos cachear dinámicamente algo que no teníamos, lo hacemos aquí
            // Pero para evitar llenar la caché con basura de YouTube/Firebase, solo devolvemos la red
            return networkResponse;
          })
          .catch(() => {
            // Si no hay red y no estaba en caché, devolvemos una respuesta de fallback
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            return new Response('Offline', { status: 503, statusText: 'Sin conexión' });
          });
      })
  );
});
