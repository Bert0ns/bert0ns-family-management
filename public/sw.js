/**
 * Service Worker for Offline PWA App Shell
 *
 * Implements:
 * 1. Cache-first strategy for static assets (JS bundles, CSS, icons, fonts).
 * 2. Network-first with offline fallback for navigation requests (SPA shell).
 * 3. Strict passthrough for external requests (e.g. Supabase, APIs).
 */

const CACHE_NAME = 'bert0ns-family-v1';

// Critical app shell assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => {
        console.warn('[SW] Pre-caching encountered an issue:', err);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 2. Strict origin isolation: do not intercept external APIs (e.g. Supabase, telemetry)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 3. Do not cache the service worker script or development hot reload endpoints
  if (
    url.pathname === '/sw.js' ||
    url.pathname.includes('hot-update') ||
    url.pathname.includes('symbolicate')
  ) {
    return;
  }

  // 4. Navigation requests (HTML pages): Network-first with Cache fallback for SPA shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse =
            (await caches.match(request)) ||
            (await caches.match('/')) ||
            (await caches.match('/index.html'));
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response('Offline - Bert0n Family Management', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        }),
    );
    return;
  }

  // 5. Static assets: Cache-first, network fallback with background cache population
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      });
    }),
  );
});
