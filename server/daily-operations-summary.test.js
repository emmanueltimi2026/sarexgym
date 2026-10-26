import test from 'node:test';
import assert from 'node:assert/strict';
import { dismissDailyOperationsSummary, getDailyOperationsSummary, getSummaryPresentation } from './daily-operations-summary.js';
import { createApp } from './app.js';

const windowStart = new Date('2026-10-24T23:00:00.000Z'); // 25 Oct 00:00 in Africa/Lagos.
const windowEnd = new Date('2026-10-25T23:00:00.000Z');

function summaryDb({ dismissed = false, empty = false } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes('SELECT COALESCE(\n      (SELECT timezone')) return { rows: [{ timezone: 'Africa/Lagos' }] };
      if (sql.includes('AS report_date')) return { rows: [{ display_date: '2026-10-26', report_date: '2026-10-25', start_at: windowStart, end_at: windowEnd }] };
      if (sql.includes("count(*) FILTER (WHERE status='completed')")) return { rows: [{ successful_check_ins: empty ? '0' : '7', unique_members: empty ? '0' : '5', denied_attempts: empty ? '0' : '2' }] };
      if (sql.includes("status='denied'")) return { rows: empty ? [] : [{ reason: 'No active membership', attempts: '2' }] };
      if (sql.includes("date_trunc('hour'")) return { rows: empty ? [] : [{ period: '18:00', visits: '3' }] };
      if (sql.includes('FROM payments WHERE status=\'successful\'')) return { rows: empty ? [] : [
        { currency: 'NGN', method: 'cash', successful_count: '2', successful_minor: '46000' },
        { currency: 'USD', method: 'paystack', successful_count: '1', successful_minor: '1250' },
      ] };
      if (sql.includes('FROM members WHERE created_at')) return { rows: [{ total: empty ? '0' : '3' }] };
      if (sql.includes('SELECT count(DISTINCT p.id)')) return { rows: [{ total: empty ? '0' : '1' }] };
      if (sql.includes("FROM subscriptions\n      WHERE status='expired'")) return { rows: [{ total: empty ? '0' : '2' }] };
      if (sql.includes('INSERT INTO daily_operations_summary_views')) return dismissed
        ? { rows: [], rowCount: 0 }
        : { rows: [{ dismissed_at: null }], rowCount: 1 };
      if (sql.includes('SELECT dismissed_at FROM daily_operations_summary_views')) return { rows: [{ dismissed_at: dismissed ? new Date('2026-10-26T00:00:00.000Z') : null }] };
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
}

test('daily summary uses gym-local half-open bounds and groups financial totals by currency', async () => {
  const db = summaryDb();
  const data = await getDailyOperationsSummary(db);
  assert.equal(data.reportDate, '2026-10-25');
  assert.equal(data.displayDate, '2026-10-26');
  assert.equal(data.timezone, 'Africa/Lagos');
  assert.deepEqual(data.interval, { start: windowStart, endExclusive: windowEnd });
  assert.deepEqual(data.attendance, {
    successfulCheckIns: 7, uniqueMembers: 5, deniedAttempts: 2,
    denialsByReason: [{ reason: 'No active membership', attempts: 2 }],
    peakPeriod: { hour: '18:00', checkIns: 3 },
  });
  assert.equal(data.revenue.currencies.length, 2);
  assert.equal(data.revenue.currencies[0].revenueMinor, '46000');
  assert.equal(data.revenue.currencies[1].revenueMinor, '1250');
  assert.deepEqual(data.memberships, { newMembers: 3, paidRenewals: 1, expiredMemberships: 2 });
  const eventQueries = db.calls.filter(call => /FROM attendance|FROM payments|FROM members WHERE created_at|FROM subscriptions\s+WHERE status='expired'/.test(call.sql));
  assert.ok(eventQueries.every(({ sql, params }) => sql.includes('>= $1') && sql.includes('< $2') && params[0] === windowStart && params[1] === windowEnd));
  const revenueQuery = db.calls.find(call => call.sql.includes('FROM payments WHERE status=\'successful\''));
  assert.match(revenueQuery.sql, /status='successful' AND paid_at >= \$1 AND paid_at < \$2/);
  assert.doesNotMatch(revenueQuery.sql, /pending|refunded|payment_orders/);
});

test('empty operations produce zero metrics and absent peak/revenue data', async () => {
  const data = await getDailyOperationsSummary(summaryDb({ empty: true }));
  assert.equal(data.attendance.successfulCheckIns, 0);
  assert.equal(data.attendance.deniedAttempts, 0);
  assert.deepEqual(data.attendance.denialsByReason, []);
  assert.equal(data.attendance.peakPeriod, null);
  assert.deepEqual(data.revenue.currencies, []);
  assert.deepEqual(data.memberships, { newMembers: 0, paidRenewals: 0, expiredMemberships: 0 });
});

test('summary dismissal is stored once per user and reopen does not change dismissed state', async () => {
  const dismissedDb = summaryDb({ dismissed: true });
  const automatically = await getSummaryPresentation(dismissedDb, 'staff-user');
  assert.equal(automatically.shouldDisplay, false);
  assert.equal(automatically.dismissed, true);
  const reopened = await getSummaryPresentation(dismissedDb, 'staff-user', true);
  assert.equal(reopened.shouldDisplay, true);
  assert.equal(reopened.dismissed, true);
  const insert = dismissedDb.calls.find(call => call.sql.includes('INSERT INTO daily_operations_summary_views'));
  assert.match(insert.sql, /ON CONFLICT \(user_id, display_date\) DO NOTHING/);
  assert.match(insert.sql, /SELECT \$1, \$2::date, now\(\)/);
});

test('concurrent dashboard sessions converge on one user/day presentation record', async () => {
  const db = summaryDb();
  let inserted = false;
  let insertAttempts = 0;
  const query = db.query.bind(db);
  db.query = async (sql, params = []) => {
    if (sql.includes('INSERT INTO daily_operations_summary_views')) {
      insertAttempts += 1;
      if (inserted) return { rows: [], rowCount: 0 };
      inserted = true;
      return { rows: [{ dismissed_at: null }], rowCount: 1 };
    }
    if (sql.includes('SELECT dismissed_at FROM daily_operations_summary_views')) return { rows: [{ dismissed_at: null }] };
    return query(sql, params);
  };
  const [first, second] = await Promise.all([
    getSummaryPresentation(db, 'staff-user'),
    getSummaryPresentation(db, 'staff-user'),
  ]);
  assert.equal(inserted, true);
  assert.equal(first.shouldDisplay, true);
  assert.equal(second.shouldDisplay, true);
  assert.equal(insertAttempts, 2);
});

test('dismissal is persisted against the server-derived gym-local display date', async () => {
  const db = summaryDb();
  await dismissDailyOperationsSummary(db, 'staff-user');
  const dismissal = db.calls.find(call => call.sql.includes('INSERT INTO daily_operations_summary_views'));
  assert.match(dismissal.sql, /now\(\) AT TIME ZONE COALESCE/);
  assert.match(dismissal.sql, /ON CONFLICT \(user_id,display_date\) DO UPDATE/);
  assert.deepEqual(dismissal.params, ['staff-user']);
});

test('daily summary API permits authorized staff/admin and rejects member/trainer roles', async () => {
  const config = { NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:3000', SESSION_COOKIE_NAME: 'session', SESSION_IDLE_TIMEOUT_HOURS: 24, SESSION_TTL_HOURS: 1, TRUST_PROXY: 'false', secureCookies: false };
  async function requestAs(role, permissions) {
    const db = summaryDb();
    const originalQuery = db.query.bind(db);
    db.query = async (sql, params = []) => {
      if (sql.includes('FROM sessions s')) return { rows: [{ session_id: 'session-id', id: 'user-id', email: 'user@sarex.test', status: 'active', must_change_password: false, permissions, roles: [role] }] };
      if (sql.startsWith('UPDATE sessions SET last_seen_at')) return { rows: [], rowCount: 1 };
      return originalQuery(sql, params);
    };
    db.transaction = async work => work({ query: async sql => {
      if (sql === 'SELECT now() now') return { rows: [{ now: new Date('2026-10-26T00:00:00Z') }] };
      if (sql.includes("UPDATE subscriptions SET status='expired'")) return { rows: [], rowCount: 0 };
      if (sql.includes("SELECT DISTINCT member_id FROM subscriptions WHERE status='scheduled'")) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    } });
    const server = createApp({ db, config }).listen(0);
    try {
      await new Promise(resolve => server.once('listening', resolve));
      return await fetch(`http://127.0.0.1:${server.address().port}/api/v1/operations/daily-summary`, { headers: { cookie: 'session=valid-session' } });
    } finally { await new Promise(resolve => server.close(resolve)); }
  }
  assert.equal((await requestAs('staff', ['payments.view'])).status, 200);
  assert.equal((await requestAs('admin', ['payments.view'])).status, 200);
  assert.equal((await requestAs('member', ['payments.view'])).status, 403);
  assert.equal((await requestAs('trainer', ['payments.view'])).status, 403);
  assert.equal((await requestAs('staff', [])).status, 403);
});
