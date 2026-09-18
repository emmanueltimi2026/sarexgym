import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import { runActivateSubscriptionsJob, runJobWithLock } from './jobs.js';

const cronSecret = 'test-cron-secret-that-is-long-enough-12345';
const config = {
  NODE_ENV: 'test',
  APP_ORIGIN: 'http://localhost:3000',
  FRONTEND_URL: 'http://localhost:3000',
  SESSION_COOKIE_NAME: 'session',
  SESSION_TTL_HOURS: 1,
  SESSION_IDLE_TIMEOUT_HOURS: 1,
  COOKIE_SAME_SITE: 'lax',
  TRUST_PROXY: 'false',
  CRON_SECRET: cronSecret,
  secureCookies: false
};

async function withServer(db, run, overrideConfig = {}) {
  const server = createApp({ db, config: { ...config, ...overrideConfig } }).listen(0);
  try {
    await new Promise(resolve => server.once('listening', resolve));
    return await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('internal cron endpoint accepts a valid secret', () => withServer(routeDb(), async base => {
  const response = await fetch(`${base}/api/internal/jobs/activate-subscriptions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cronSecret}` }
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.job, 'activate-subscriptions');
}));

test('internal cron endpoint rejects a missing secret', () => withServer(routeDb(), async base => {
  const response = await fetch(`${base}/api/internal/jobs/activate-subscriptions`, { method: 'POST' });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'INVALID_CRON_SECRET');
}));

test('internal cron endpoint rejects an invalid secret', () => withServer(routeDb(), async base => {
  const response = await fetch(`${base}/api/internal/jobs/expiry-notifications`, {
    method: 'POST',
    headers: { authorization: 'Bearer wrong-secret-that-is-long-enough-12345' }
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'INVALID_CRON_SECRET');
}));

test('internal cron endpoint does not allow normal sessions without the cron secret', () => withServer(routeDb(), async base => {
  const response = await fetch(`${base}/api/internal/jobs/activate-subscriptions`, {
    method: 'POST',
    headers: { cookie: 'session=fake-session' }
  });
  assert.equal(response.status, 401);
}));

test('missing server cron secret returns non-success configuration status', () => withServer(routeDb(), async base => {
  const response = await fetch(`${base}/api/internal/jobs/activate-subscriptions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cronSecret}` }
  });
  assert.equal(response.status, 503);
}, { CRON_SECRET: undefined }));

test('lock contention returns an already_running response', async () => {
  const result = await runJobWithLock({
    db: lockDb(false),
    config,
    job: 'activate-subscriptions',
    requestId: 'test',
    runner: async () => assert.fail('runner should not execute during lock contention')
  });
  assert.equal(result.alreadyRunning, true);
  assert.equal(result.skipped, 1);
});

test('duplicate invocation is idempotent when the first run already activated due work', async () => {
  const db = routeDb({ dueRowsFirst: [{ member_id: 'member-1' }], nextRow: { id: 'scheduled-1' }, emptyAfterActivation: true });
  const first = await runActivateSubscriptionsJob({ db, config, requestId: 'first' });
  const second = await runActivateSubscriptionsJob({ db, config, requestId: 'second' });
  assert.equal(first.activated, 1);
  assert.equal(second.activated, 0);
});

test('missed-run catch-up activates overdue scheduled subscriptions once', async () => {
  const result = await runActivateSubscriptionsJob({
    db: routeDb({ dueRowsFirst: [{ member_id: 'member-1' }], nextRow: { id: 'scheduled-overdue' } }),
    config,
    requestId: 'catch-up'
  });
  assert.equal(result.scanned, 1);
  assert.equal(result.activated, 1);
});

test('future scheduled subscription does not activate early', async () => {
  const result = await runActivateSubscriptionsJob({
    db: routeDb({ dueRowsFirst: [] }),
    config,
    requestId: 'future'
  });
  assert.equal(result.scanned, 0);
  assert.equal(result.activated, 0);
});

test('previous active subscription expires correctly during overdue activation', async () => {
  const result = await runActivateSubscriptionsJob({
    db: routeDb({ dueRowsFirst: [{ member_id: 'member-1' }], nextRow: { id: 'scheduled-1' }, expiredCount: 1 }),
    config,
    requestId: 'expire-current'
  });
  assert.equal(result.expired, 1);
  assert.equal(result.activated, 1);
});

test('activation job issues cleanup that prevents overlapping active subscriptions', async () => {
  const db = routeDb({ dueRowsFirst: [{ member_id: 'member-1' }], nextRow: { id: 'scheduled-1' } });
  await runActivateSubscriptionsJob({ db, config, requestId: 'overlap' });
  assert.equal(db.cleanedOtherActiveSubscriptions, true);
});

test('database failure from internal job endpoint returns a non-success status', () => withServer({
  async query() { throw new Error('database unavailable'); },
  async transaction(work) { return work(this); }
}, async base => {
  const response = await fetch(`${base}/api/internal/jobs/activate-subscriptions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cronSecret}` }
  });
  assert.equal(response.status, 500);
}));

function lockDb(locked) {
  return {
    async transaction(work) { return work(this); },
    async query(sql) {
      if (/pg_try_advisory_xact_lock/.test(sql)) return { rows: [{ locked }] };
      throw new Error(`Unexpected query: ${sql}`);
    }
  };
}

function routeDb({ dueRowsFirst = [], nextRow = null, expiredCount = 0, emptyAfterActivation = false } = {}) {
  let rateCount = 0, updatesToActive = 0;
  const db = {
    cleanedOtherActiveSubscriptions: false,
    async transaction(work) { return work(this); },
    async query(sql) {
      if (/rate_limit_windows/.test(sql)) return { rows: [{ request_count: ++rateCount }] };
      if (/pg_try_advisory_xact_lock/.test(sql)) return { rows: [{ locked: true }] };
      if (/SELECT now\(\) now/.test(sql)) return { rows: [{ now: new Date('2026-09-18T10:00:00.000Z') }] };
      if (/UPDATE subscriptions SET status='expired'.*status='active' AND ends_at<=now\(\)/.test(sql)) return { rowCount: expiredCount, rows: [] };
      if (/SELECT DISTINCT member_id/.test(sql)) return { rows: emptyAfterActivation && updatesToActive ? [] : dueRowsFirst, rowCount: emptyAfterActivation && updatesToActive ? 0 : dueRowsFirst.length };
      if (/pg_advisory_xact_lock/.test(sql)) return { rows: [] };
      if (/SELECT id,ends_at FROM subscriptions/.test(sql)) return { rows: [] };
      if (/SELECT id FROM subscriptions/.test(sql)) return { rows: nextRow && !(emptyAfterActivation && updatesToActive) ? [nextRow] : [] };
      if (/SET status='active'/.test(sql)) { updatesToActive++; return { rowCount: 1, rows: [] }; }
      if (/id<>\$2/.test(sql) && /status='active'/.test(sql)) { db.cleanedOtherActiveSubscriptions = true; return { rowCount: 0, rows: [] }; }
      if (/SELECT count\(\*\) count/.test(sql)) return { rows: [{ count: 0 }] };
      if (/INSERT INTO notifications/.test(sql)) return { rowCount: 0, rows: [] };
      if (/FROM notifications n JOIN users/.test(sql)) return { rows: [] };
      return { rows: [], rowCount: 0 };
    }
  };
  return db;
}
