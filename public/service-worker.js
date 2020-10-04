const cacheName = 'twilio-sms-covid19-v1';

self.addEventListener('install', (event) => {
  console.log('Inside the UPDATED install handler:', event);
  event.waitUntil(
    caches.open(cacheName)
      .then((cache) => cache.addAll(
        [
          '/',
          '/index',
          '/twilio-badge-red.475897ec8.svg',
        ],
      ).then(() => self.skipWaiting())),
  );
});

self.addEventListener('activate', (event) => {
  console.log('Inside the activate handler:', event);

  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  console.log('Inside the fetch handler:', event);

  event.respondWith(
    caches.open(cacheName)
      .then((cache) => cache.match(event.request, { ignoreSearch: true }))
      .then((response) => response || fetch(event.request)),
  );
});
