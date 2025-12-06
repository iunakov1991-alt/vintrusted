/**
 * Service Worker для офлайн режима дашборда
 */

const CACHE_NAME = 'monster8-dashboard-v1';
const CACHE_URLS = [
  '/',
  '/index-8.0.html',
  '/dashboard-8.0.css',
  '/dashboard-8.0.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.socket.io/4.5.4/socket.io.min.js'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_URLS);
    })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  // Только для нашего дашборда
  if (!event.request.url.includes('localhost:3001') && !event.request.url.includes('vintrusted.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Возвращаем из кэша если есть
      if (response) {
        return response;
      }
      
      // Иначе пытаемся загрузить из сети
      return fetch(event.request).then((response) => {
        // Кэшируем успешные ответы
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // При ошибке сети возвращаем кэш или fallback
        return caches.match(event.request) || new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});

