import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const projectRoot = new URL('../', import.meta.url);
const origin = 'https://sarex.test';

const loadWorker = async ({ fetchImpl = async () => new Response('network') } = {}) => {
  const source = await readFile(new URL('public/service-worker.js', projectRoot), 'utf8');
  const listeners = new Map();
  const cacheData = new Map();
  const cacheNames = new Set();
  let skippedWaiting = false;

  const keyFor = input => new URL(typeof input === 'string' ? input : input.url, origin).href;
  const cacheStorage = {
    async open(name) {
      cacheNames.add(name);
      if (!cacheData.has(name)) cacheData.set(name, new Map());
      const data = cacheData.get(name);
      return {
        match: async request => data.get(keyFor(request)),
        put: async (request, response) => data.set(keyFor(request), response),
        addAll: async requests => {
          for (const request of requests) data.set(keyFor(request), new Response(`cached:${request}`));
        },
      };
    },
    async match(request) {
      for (const data of cacheData.values()) {
        const response = data.get(keyFor(request));
        if (response) return response;
      }
      return undefined;
    },
    async keys() { return [...cacheNames]; },
    async delete(name) { cacheNames.delete(name); cacheData.delete(name); return true; },
  };

  const self = {
    location: new URL(`${origin}/service-worker.js?build=test-build`),
    clients: { claim: async () => undefined },
    addEventListener: (name, listener) => listeners.set(name, listener),
    skipWaiting: () => { skippedWaiting = true; },
  };
  runInNewContext(source, { self, caches: cacheStorage, URL, Response, fetch: fetchImpl, Promise });

  const dispatchFetch = async request => {
    let responsePromise;
    listeners.get('fetch')({ request, respondWith: promise => { responsePromise = Promise.resolve(promise); } });
    return responsePromise;
  };
  return { cacheData, cacheNames, dispatchFetch, listeners, get skippedWaiting() { return skippedWaiting; } };
};

test('PWA service worker leaves same-origin API requests unintercepted', async () => {
  let networkRequests = 0;
  const worker = await loadWorker({ fetchImpl: async () => { networkRequests += 1; return new Response('live API'); } });
  const response = await worker.dispatchFetch(new Request(`${origin}/api/v1/session`));
  assert.equal(response, undefined, 'API calls are handled directly by the browser network stack');
  assert.equal(networkRequests, 0, 'the worker neither caches nor proxies API traffic');
  assert.equal(worker.cacheNames.size, 0);
});

test('offline navigation returns only the branded fallback, never a cached portal route', async () => {
  const worker = await loadWorker({ fetchImpl: async () => { throw new TypeError('offline'); } });
  let installPromise;
  worker.listeners.get('install')({ waitUntil: promise => { installPromise = promise; } });
  await installPromise;
  const response = await worker.dispatchFetch({ method: 'GET', url: `${origin}/member/dashboard`, mode: 'navigate' });
  assert.match(await response.text(), /cached:\/offline\.html/);
  const cachedUrls = [...worker.cacheData.values()].flatMap(cache => [...cache.keys()]);
  assert.equal(cachedUrls.some(url => url.includes('/member/dashboard')), false);
});

test('service worker caches same-origin static assets but does not cache navigation documents', async () => {
  let networkRequests = 0;
  const worker = await loadWorker({ fetchImpl: async () => {
    networkRequests += 1;
    const response = new Response('static bundle');
    Object.defineProperty(response, 'type', { value: 'basic' });
    return response;
  } });
  const request = new Request(`${origin}/assets/app-hash.js`);
  const first = await worker.dispatchFetch(request);
  assert.equal(await first.text(), 'static bundle');
  const second = await worker.dispatchFetch(request);
  assert.equal(await second.text(), 'static bundle');
  assert.equal(networkRequests, 1);
  assert.equal([...worker.cacheData.values()].some(cache => cache.has(`${origin}/assets/app-hash.js`)), true);
});

test('PWA manifest declares install icons and stable member shortcuts', async () => {
  const manifest = JSON.parse(await readFile(new URL('public/manifest.webmanifest', projectRoot), 'utf8'));
  assert.equal(manifest.name, 'SAREX Fitness Clinic');
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.icons.map(icon => icon.sizes).sort(), ['192x192', '192x192', '512x512', '512x512']);
  assert.deepEqual(manifest.shortcuts.map(shortcut => shortcut.url), ['/member/dashboard', '/member/workout', '/member/check-in']);
});

test('PWA install assets exist and Vercel serves worker updates without stale caching', async () => {
  const manifest = JSON.parse(await readFile(new URL('public/manifest.webmanifest', projectRoot), 'utf8'));
  for (const icon of [...manifest.icons, { src: '/icons/apple-touch-icon.png' }]) {
    const iconPath = new URL(`public${icon.src}`, projectRoot);
    const iconStat = await stat(iconPath);
    const header = await readFile(iconPath, { flag: 'r' });
    assert.ok(iconStat.size > 1000, `${icon.src} should be a generated image, not a placeholder`);
    assert.equal(header.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${icon.src} should be a PNG`);
  }

  const vercel = JSON.parse(await readFile(new URL('vercel.json', projectRoot), 'utf8'));
  assert.equal(vercel.rewrites[0].source, '/api/:path*', 'Render API proxy remains first in rewrite order');
  assert.ok(vercel.headers.some(entry => entry.source === '/service-worker.js'
    && entry.headers.some(header => header.key === 'Cache-Control' && header.value.includes('no-store'))));
  assert.ok(vercel.rewrites[1].source.includes('service-worker'));
  assert.ok(await stat(new URL('public/offline.html', projectRoot)));
});
