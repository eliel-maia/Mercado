/* ==========================================================================
   CONFIGURAÇÃO DE CACHE E SERVICE WORKER (PWA)
   ========================================================================== */
const CACHE_NAME = 'mercado-v63';
const urlsToCache = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-512.png'
];

// Instalação do Service Worker e salvamento em cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos obsoletos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceção de requisições para funcionamento offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
