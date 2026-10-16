/*
 * SaqlainiApp service worker.
 *
 * Deliberately small and safe:
 *  - Only static, public files are cached (hashed Next bundles, icons, fonts,
 *    images). Pages, API calls, Supabase and Google Sheets data are NEVER
 *    cached, so nobody - least of all an admin - can see stale or someone
 *    else's data from the cache.
 *  - If a page can't be reached (no internet), /offline.html is shown instead
 *    of the browser's dinosaur page.
 *
 * Bump VERSION to drop every old cache on the next visit.
 */
const VERSION = 'v1';
const STATIC_CACHE = `saqlaini-static-${VERSION}`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192x192.png']))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

function isStaticAsset(url) {
    const p = url.pathname;
    return (
        p.startsWith('/_next/static/') ||
        p.startsWith('/icons/') ||
        p.startsWith('/fonts/') ||
        p.startsWith('/upload/') ||
        p === '/_next/image' ||
        /\.(?:png|jpe?g|webp|svg|ico|woff2?)$/i.test(p)
    );
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/')) return;

    // Opening / navigating to a page: always the network; offline page as the fallback.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
        );
        return;
    }

    // Static files: serve instantly from cache, refresh it in the background.
    if (isStaticAsset(url)) {
        event.respondWith(
            caches.open(STATIC_CACHE).then((cache) =>
                cache.match(request).then((cached) => {
                    const network = fetch(request)
                        .then((response) => {
                            if (response && response.status === 200) cache.put(request, response.clone());
                            return response;
                        })
                        .catch(() => cached || Response.error());
                    return cached || network;
                })
            )
        );
    }
});
