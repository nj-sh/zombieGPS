// Zombie Apocalypse - Service Worker
const CACHE_NAME = 'zombie-apocalypse-v5';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/menu.css',
  '/css/hud.css',
  '/css/map.css',
  '/css/animations.css',
  '/js/game.js',
  '/js/menu.js',
  '/js/map.js',
  '/js/player.js',
  '/js/hud.js',
  '/js/audio.js',
  '/js/socket.js',
  '/js/gps.js',
  '/js/orientation.js',
  '/js/notifications.js',
  '/js/settings.js',
  '/js/pwa.js',
  '/js/particles.js',
  '/js/utils.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).catch(() => {
        // Return a fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
