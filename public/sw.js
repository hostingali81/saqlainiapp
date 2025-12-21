const CACHE_NAME = 'saqlaini-v2';
const urlsToCache = [
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Never cache API calls, profile pages, or dynamic routes
    if (url.pathname.startsWith('/api/') || 
        url.pathname.startsWith('/profile/') ||
        url.pathname === '/' ||
        event.request.method !== 'GET') {
        event.respondWith(fetch(event.request));
        return;
    }
    
    // Only cache static assets
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

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
    self.clients.claim();
});