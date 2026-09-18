import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { activateDueScheduledSubscriptions, decideRenewalPeriod } from './subscriptions.js';

const now = new Date('2026-09-18T10:00:00.000Z');
const current = {
  id: 'current-subscription',
  member_id: 'member-1',
  plan_id: 'foundation',
  starts_at: '2026-09-01T00:00:00.000Z',
  ends_at: '2026-10-01T00:00:00.000Z'
};

test('same-plan early renewal starts after the current period and preserves remaining days', () => {
  const renewal = decideRenewalPeriod({
    current,
    latestSamePlan: current,
    planId: 'foundation',
    durationDays: 30,
    now
  });

  assert.equal(renewal.status, 'scheduled');
  assert.equal(renewal.planChange, false);
  assert.equal(renewal.preservesCurrent, true);
  assert.equal(renewal.startsAt.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(renewal.endsAt.toISOString(), '2026-10-31T00:00:00.000Z');
});

test('different-plan early renewal is scheduled and does not start immediately', () => {
  const renewal = decideRenewalPeriod({
    current,
    latestSamePlan: null,
    planId: 'performance',
    durationDays: 30,
    now
  });

  assert.equal(renewal.status, 'scheduled');
  assert.equal(renewal.planChange, true);
  assert.equal(renewal.preservesCurrent, true);
  assert.equal(renewal.startsAt.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(renewal.endsAt.toISOString(), '2026-10-31T00:00:00.000Z');
});

test('Paystack different-plan renewal uses the shared scheduled renewal rule', () => {
  const renewal = decideRenewalPeriod({
    current,
    latestSamePlan: null,
    planId: 'elite',
    durationDays: 45,
    now
  });

  assert.equal(renewal.status, 'scheduled');
  assert.equal(renewal.startsAt.toISOString(), current.ends_at);
  assert.equal(renewal.endsAt.toISOString(), '2026-11-15T00:00:00.000Z');
});

test('cash/manual different-plan renewal uses the shared scheduled renewal rule', () => {
  const renewal = decideRenewalPeriod({
    current,
    latestSamePlan: null,
    planId: 'standard',
    durationDays: 60,
    now
  });

  assert.equal(renewal.status, 'scheduled');
  assert.equal(renewal.startsAt.toISOString(), current.ends_at);
  assert.equal(renewal.endsAt.toISOString(), '2026-11-30T00:00:00.000Z');
});

test('additional same-plan renewal chains after the latest scheduled same-plan period', () => {
  const latestSamePlan = {
    ...current,
    id: 'scheduled-foundation',
    starts_at: '2026-10-01T00:00:00.000Z',
    ends_at: '2026-10-31T00:00:00.000Z'
  };
  const renewal = decideRenewalPeriod({
    current,
    latestSamePlan,
    planId: 'foundation',
    durationDays: 30,
    now
  });

  assert.equal(renewal.startsAt.toISOString(), '2026-10-31T00:00:00.000Z');
  assert.equal(renewal.endsAt.toISOString(), '2026-11-30T00:00:00.000Z');
});

test('scheduled activation skips members who still have a current active subscription', async () => {
  const db = fakeActivationDb({
    activeRow: { id: 'active-subscription', ends_at: '2026-10-01T00:00:00.000Z' },
    dueRows: [{ member_id: 'member-1' }],
    now
  });

  const result = await activateDueScheduledSubscriptions(db);

  assert.deepEqual(result, { activated: 0, expired: 0, scanned: 1, skipped: 1 });
  assert.equal(db.updatesToActive, 0);
});

test('scheduled activation activates the next due subscription after current expiry', async () => {
  const db = fakeActivationDb({
    activeRow: null,
    dueRows: [{ member_id: 'member-1' }],
    nextRow: { id: 'scheduled-subscription' },
    expiredCount: 1,
    now
  });

  const result = await activateDueScheduledSubscriptions(db);

  assert.deepEqual(result, { activated: 1, expired: 1, scanned: 1, skipped: 0 });
  assert.equal(db.updatesToActive, 1);
});

test('scheduled activation job is safe when repeated', async () => {
  const db = fakeActivationDb({
    activeRow: null,
    dueRows: [{ member_id: 'member-1' }],
    nextRow: { id: 'scheduled-subscription' },
    now,
    emptyAfterActivation: true
  });

  assert.equal((await activateDueScheduledSubscriptions(db)).activated, 1);
  assert.equal((await activateDueScheduledSubscriptions(db)).activated, 0);
  assert.equal(db.updatesToActive, 1);
});

test('database migration prevents overlapping active, scheduled, or frozen subscription periods', async () => {
  const migration = await readFile(new URL('./migrations/015_scheduled_subscription_constraints.sql', import.meta.url), 'utf8');

  assert.match(migration, /EXCLUDE USING gist/i);
  assert.ok(migration.includes("tstzrange(starts_at, ends_at, '[)')"));
  assert.ok(migration.includes("status IN ('active', 'scheduled', 'frozen')"));
});

test('Paystack webhook remains idempotent before inserting subscription and payment records', async () => {
  const appSource = await readFile(new URL('./app.js', import.meta.url), 'utf8');

  assert.match(appSource, /INSERT INTO webhook_events\(provider,event_key,payload_hash\).*ON CONFLICT DO NOTHING RETURNING id/s);
  assert.match(appSource, /if\(!inserted\.rowCount\) return/);
});

function fakeActivationDb({ activeRow, dueRows, nextRow, expiredCount = 0, now: fixedNow, emptyAfterActivation = false }) {
  const state = {
    updatesToActive: 0,
    async transaction(work) {
      return work(this);
    },
    async query(sql) {
      if (/SELECT now\(\) now/.test(sql)) return { rows: [{ now: fixedNow }] };
      if (/UPDATE subscriptions SET status='expired'.*status='active' AND ends_at<=now\(\)/.test(sql)) return { rowCount: expiredCount, rows: [] };
      if (/SELECT DISTINCT member_id/.test(sql)) {
        if (emptyAfterActivation && state.updatesToActive > 0) return { rows: [] };
        return { rows: dueRows };
      }
      if (/pg_advisory_xact_lock/.test(sql)) return { rows: [] };
      if (/SELECT id,ends_at FROM subscriptions/.test(sql)) return { rows: activeRow ? [activeRow] : [] };
      if (/WHERE id=\$1/.test(sql) && /SET status='expired'/.test(sql)) return { rowCount: 1, rows: [] };
      if (/SELECT id FROM subscriptions/.test(sql)) return { rows: nextRow && !(emptyAfterActivation && state.updatesToActive > 0) ? [nextRow] : [] };
      if (/SET status='active'/.test(sql)) {
        state.updatesToActive += 1;
        return { rowCount: 1, rows: [] };
      }
      if (/id<>\$2/.test(sql) && /status='active'/.test(sql)) return { rowCount: 0, rows: [] };
      throw new Error(`Unexpected query in test fake: ${sql}`);
    }
  };
  return state;
}
