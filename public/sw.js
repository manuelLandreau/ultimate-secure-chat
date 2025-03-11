// Service Worker for SecureChat PWA

// Cache name - increment version to force update
const CACHE_NAME = 'securechat-cache-v1';

// Files to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/masked-icon.svg',
  '/notification.mp3'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Install completed');
        return self.skipWaiting(); // Force activation
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...');
  event.waitUntil(
    caches.keys()
      .then(keyList => {
        return Promise.all(keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        }));
      })
      .then(() => {
        console.log('[Service Worker] Activation complete!');
        return self.clients.claim(); // Take control of all clients
      })
  );
});

// Fetch event - serve from cache or fetch from network
self.addEventListener('fetch', event => {
  // Skip non-GET requests and non-HTTP(S) URLs
  if (event.request.method !== 'GET' || 
      !event.request.url.startsWith('http')) {
    return;
  }
  
  // Skip WebRTC, WebSocket and API requests
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('socket.io') ||
      event.request.headers.get('upgrade') === 'websocket') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        // Make network request
        return fetch(fetchRequest)
          .then(response => {
            // Check if received response is valid
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Return fallback for HTML
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // Return error for other resources
            return new Response('Network error', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  if (!event.data) {
    return;
  }
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New message received',
      icon: '/pwa-192x192.png',
      badge: '/masked-icon.svg',
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification('SecureChat', options)
    );
  } catch (error) {
    console.error('[Service Worker] Push notification error:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        const url = notification.data?.url || '/';
        
        // Check if there is already a window open
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if needed
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
}); 