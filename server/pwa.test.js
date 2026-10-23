import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import {
  INSTALL_DISMISS_FOR_MS,
  INSTALL_DISMISSED_UNTIL_KEY,
  INSTALL_SUCCEEDED_KEY,
  isStandaloneDisplayMode,
  persistInstallDismissal,
  persistInstallSuccess,
  requestInstall,
  shouldShowInstallToast,
} from '../src/lib/pwaInstall.js';

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

test('new service worker waits for old controlled tabs and cleans only superseded SAREX caches on activation', async () => {
  const worker = await loadWorker();
  worker.cacheNames.add('sarex-static-old-build');
  worker.cacheNames.add('sarex-offline-old-build');
  worker.cacheNames.add('unrelated-cache');
  worker.cacheData.set('sarex-static-old-build', new Map());
  worker.cacheData.set('sarex-offline-old-build', new Map());
  worker.cacheData.set('unrelated-cache', new Map());

  let installPromise;
  worker.listeners.get('install')({ waitUntil: promise => { installPromise = promise; } });
  await installPromise;
  assert.equal(worker.skippedWaiting, false, 'the new worker must not skip the browser waiting lifecycle');

  let activationPromise;
  worker.listeners.get('activate')({ waitUntil: promise => { activationPromise = promise; } });
  await activationPromise;
  assert.equal(worker.cacheNames.has('sarex-static-old-build'), false);
  assert.equal(worker.cacheNames.has('sarex-offline-old-build'), false);
  assert.equal(worker.cacheNames.has('sarex-offline-test-build'), true, 'the new build has its own refreshed offline asset cache');
  assert.equal(worker.cacheNames.has('unrelated-cache'), true);
});

test('PWA update flow has no update toast, forced reload, or skip-waiting action', async () => {
  const source = await readFile(new URL('src/components/pwa/PwaExperience.tsx', projectRoot), 'utf8');
  const worker = await readFile(new URL('public/service-worker.js', projectRoot), 'utf8');
  assert.doesNotMatch(source, /updateReady|Update SAREX|A new version is ready|location\.reload\(\)|SKIP_WAITING/);
  assert.doesNotMatch(worker, /skipWaiting|clients\.claim/);
  assert.match(source, /nextRegistration\.update\(\)/, 'the browser is asked to check and download updates quietly');
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

const installToastArgs = overrides => ({
  available: true,
  installed: false,
  standalone: false,
  dismissedUntil: 0,
  now: 1_000,
  route: '/member/dashboard',
  modalOpen: false,
  engaged: true,
  ...overrides,
});

test('install toast appears when a browser install prompt is available after engagement', () => {
  assert.equal(shouldShowInstallToast(installToastArgs({ available: true })), true);
  assert.equal(shouldShowInstallToast(installToastArgs({ engaged: false })), false);
});

test('Install invokes the saved browser prompt from the button action and returns its choice', async () => {
  let calls = 0;
  const promptEvent = {
    prompt: async () => { calls += 1; },
    userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
  };
  assert.deepEqual(await requestInstall(promptEvent), { outcome: 'accepted', platform: 'web' });
  assert.equal(calls, 1);
  assert.equal(await requestInstall(null), null);
});

test('dismissal persists for fourteen days and suppresses the toast until expiry', () => {
  const now = 10_000;
  const values = new Map();
  persistInstallDismissal({ setItem: (key, value) => values.set(key, value) }, now);
  const dismissedUntil = Number(values.get(INSTALL_DISMISSED_UNTIL_KEY));
  assert.equal(dismissedUntil, now + INSTALL_DISMISS_FOR_MS);
  assert.equal(shouldShowInstallToast(installToastArgs({ now, dismissedUntil })), false);
  assert.equal(shouldShowInstallToast(installToastArgs({ now: dismissedUntil + 1, dismissedUntil })), true);
  assert.equal(INSTALL_DISMISSED_UNTIL_KEY, 'sarex.pwa.install-dismissed-until');
});

test('standalone, installed, modal, and critical check-in or payment flows suppress install UI', () => {
  assert.equal(isStandaloneDisplayMode(true), true);
  assert.equal(isStandaloneDisplayMode(false, true), true);
  assert.equal(shouldShowInstallToast(installToastArgs({ standalone: true })), false);
  assert.equal(shouldShowInstallToast(installToastArgs({ installed: true })), false);
  assert.equal(shouldShowInstallToast(installToastArgs({ modalOpen: true })), false);
  assert.equal(shouldShowInstallToast(installToastArgs({ route: '/member/check-in' })), false);
  assert.equal(shouldShowInstallToast(installToastArgs({ route: '/checkout/secure' })), false);
  assert.equal(shouldShowInstallToast(installToastArgs({ route: '/payment/checkout' })), false);
});

test('iOS can show Home Screen guidance without a native browser prompt', () => {
  assert.equal(shouldShowInstallToast(installToastArgs({ available: true })), true);
  assert.equal(shouldShowInstallToast(installToastArgs({ available: false })), false);
});

test('appinstalled success is persisted so later visits remain suppressed', () => {
  const values = new Map();
  persistInstallSuccess({ setItem: (key, value) => values.set(key, value) });
  assert.equal(values.get(INSTALL_SUCCEEDED_KEY), 'true');
  assert.equal(shouldShowInstallToast(installToastArgs({ installed: values.get(INSTALL_SUCCEEDED_KEY) === 'true' })), false);
});
