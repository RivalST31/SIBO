// Advanced Service Worker for SIBO PWA
const CACHE_NAME = 'sibo-cache-v3';

// Cache only essential offline shell, never cache index.html or root to prevent blank screens on new deployments!
const urlsToCache = [
  '/manifest.json',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting(); // Force active immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Instantly claim all client tabs
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass Service Worker cache for API calls, search, maps grounding, and other external requests
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    return; // Let browser fetch normally
  }

  // 2. Network-First strategy for index.html / root / document requests to avoid loading stale index.html referencing deleted assets
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If offline, try matching from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3. Cache-First with Network Fallback for static assets (like /assets/*, fonts, images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Only cache successful standard GET requests
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          // Don't cache range requests or large media files dynamically
          if (!event.request.url.includes('/assets/') && !event.request.url.endsWith('.js') && !event.request.url.endsWith('.css')) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
