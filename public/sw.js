// Service Worker for background meeting support
const CACHE_NAME = 'meeting-cache-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/static/js/bundle.js',
        '/static/css/main.css',
      ]);
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
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

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Background sync for meeting heartbeat
self.addEventListener('sync', (event) => {
  if (event.tag === 'meeting-heartbeat') {
    event.waitUntil(sendHeartbeat());
  }
});

// Message handling for meeting events
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'MEETING_START') {
    console.log('Meeting started in service worker');
  } else if (event.data && event.data.type === 'MEETING_END') {
    console.log('Meeting ended in service worker');
  }
});

async function sendHeartbeat() {
  try {
    // Send a heartbeat to maintain meeting connection
    console.log('Background heartbeat sent');
    return Promise.resolve();
  } catch (error) {
    console.error('Background heartbeat failed:', error);
    return Promise.reject(error);
  }
}