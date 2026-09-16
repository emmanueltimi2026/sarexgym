import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPortalPollInterval,
  mutateAndRefresh,
  PORTAL_POLL_INTERVALS,
  startVisibilityAwarePolling,
} from '../src/lib/refreshPolicy.ts';

function createTargets() {
  const documentListeners = new Map();
  const windowListeners = new Map();
  let intervalCallback = () => {};
  const documentTarget = {
    visibilityState: 'visible',
    addEventListener(type, listener) { documentListeners.set(type, listener); },
    removeEventListener(type) { documentListeners.delete(type); },
  };
  const windowTarget = {
    addEventListener(type, listener) { windowListeners.set(type, listener); },
    removeEventListener(type) { windowListeners.delete(type); },
    setInterval(callback) { intervalCallback = callback; return 1; },
    clearInterval() { intervalCallback = () => {}; },
  };
  return { documentTarget, windowTarget, documentListeners, windowListeners, tick: () => intervalCallback() };
}

test('successful mutations refresh their affected data', async () => {
  const calls = [];
  const result = await mutateAndRefresh(
    async () => { calls.push('mutation'); return { id: 'member-1' }; },
    async () => { calls.push('refresh'); },
  );
  assert.deepEqual(calls, ['mutation', 'refresh']);
  assert.equal(result.id, 'member-1');
});

test('polling refreshes stale data and prevents overlapping requests', async () => {
  const targets = createTargets();
  let requests = 0;
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const polling = startVisibilityAwarePolling({
    ...targets,
    intervalMs: 30_000,
    refresh: async () => { requests += 1; await pending; },
  });

  const first = polling.run();
  targets.tick();
  assert.equal(requests, 1);
  release();
  await first;
  await polling.run();
  assert.equal(requests, 2);
  polling.stop();
});

test('polling stops and aborts active work when its owner unmounts', async () => {
  const targets = createTargets();
  let aborted = false;
  const polling = startVisibilityAwarePolling({
    ...targets,
    intervalMs: 12_000,
    refresh: signal => new Promise(resolve => signal.addEventListener('abort', () => { aborted = true; resolve(); }, { once: true })),
  });

  const activeRun = polling.run();
  polling.stop();
  await activeRun;
  assert.equal(aborted, true);
  assert.equal(targets.documentListeners.size, 0);
  assert.equal(targets.windowListeners.size, 0);
});

test('polling pauses while hidden and refreshes when focus returns', async () => {
  const targets = createTargets();
  let requests = 0;
  targets.documentTarget.visibilityState = 'hidden';
  const polling = startVisibilityAwarePolling({
    ...targets,
    intervalMs: 30_000,
    refresh: async () => { requests += 1; },
  });

  targets.tick();
  assert.equal(requests, 0);
  targets.documentTarget.visibilityState = 'visible';
  targets.windowListeners.get('focus')();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests, 1);
  polling.stop();
});

test('failed background refresh preserves the last displayed data', async () => {
  const targets = createTargets();
  const displayed = ['existing member'];
  let capturedError;
  const polling = startVisibilityAwarePolling({
    ...targets,
    intervalMs: 30_000,
    refresh: async () => { throw new Error('temporary network failure'); },
    onError: error => { capturedError = error; },
  });

  await polling.run();
  assert.deepEqual(displayed, ['existing member']);
  assert.match(capturedError.message, /temporary network failure/);
  polling.stop();
});

test('route policy polls operational screens but leaves static settings alone', () => {
  assert.equal(getPortalPollInterval('/staff/dashboard'), PORTAL_POLL_INTERVALS.staffLive);
  assert.equal(getPortalPollInterval('/member/dashboard'), PORTAL_POLL_INTERVALS.portal);
  assert.equal(getPortalPollInterval('/trainer/dashboard'), PORTAL_POLL_INTERVALS.portal);
  assert.equal(getPortalPollInterval('/admin/members'), PORTAL_POLL_INTERVALS.portal);
  assert.equal(getPortalPollInterval('/admin/settings'), null);
  assert.equal(getPortalPollInterval('/about'), null);
});
