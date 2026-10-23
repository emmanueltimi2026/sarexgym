/* Static-only offline support. API and navigation responses always go to the network. */
const buildId = new URL(self.location.href).searchParams.get('build') || 'dev';
const cachePrefix = 'sarex-static-';
const staticCacheName = `${cachePrefix}${buildId}`;
const offlineCacheName = 'sarex-offline-v1';
const offlineUrl = '/offline.html';
const offlineAssets = [offlineUrl, '/icons/icon-192.png', '/icons/icon-512.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(offlineCacheName).then(cache => cache.addAll(offlineAssets)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(cachePrefix) && key !== staticCacheName)
    .map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const offlinePage = await caches.match(offlineUrl);
      return offlinePage || new Response('You are offline. Connect to the internet and try again.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }));
    return;
  }

  const isVersionedStaticAsset = url.pathname.startsWith('/assets/');
  const isPwaAsset = url.pathname === '/manifest.webmanifest' || url.pathname.startsWith('/icons/');
  if (!isVersionedStaticAsset && !isPwaAsset) return;

  event.respondWith(caches.open(isVersionedStaticAsset ? staticCacheName : offlineCacheName).then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
    return response;
  }));
});
