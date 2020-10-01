// self.addEventListener('install', (event) => {
//   console.log('Inside the UPDATED install handler:', event);
// });

const CACHE_NAME = 'sw-v1';

self.addEventListener('install', (event) => {
  console.log('Inside the UPDATED install handler:', event);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll('./404.html')),
  );
});

self.addEventListener('activate', (event) => {
  console.log('Inside the activate handler:', event);
});

// self.addEventListener(fetch, (event) => {
//   console.log('Inside the fetch handler:', event);
// });

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request)
      .then((cached) => {
        var networked = fetch(event.request)
          .then((response) => {
            let cacheCopy = response.clone()
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, cacheCopy))
            return response;
          })
          .catch(() => caches.match(offlinePage));
        return cached || networked;
      })
    )
  }
  return;
});
