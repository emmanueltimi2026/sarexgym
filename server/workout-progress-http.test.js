import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

const memberId = '7f07e15c-82ae-4cef-93b4-029916326130';
const config = { NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:3000', SESSION_COOKIE_NAME: 'session', SESSION_TTL_HOURS: 1, SESSION_IDLE_TIMEOUT_HOURS: 24, COOKIE_SAME_SITE: 'lax', CSRF_SECRET: 'test-trainer-progress-secret-with-entropy', TRUST_PROXY: 'false', secureCookies: false };

async function withServer(role, assigned, run) {
  let historyQueries = 0;
  const query = async sql => {
    if (sql.includes('FROM sessions s')) return { rows: [{ session_id: 'session-1', id: 'trainer-user', email: 'trainer@sarex.test', status: 'active', permissions: [], roles: [role] }], rowCount: 1 };
    if (sql.includes('FROM trainer_assignments a JOIN trainers t')) return { rows: assigned ? [{ '?column?': 1 }] : [], rowCount: assigned ? 1 : 0 };
    if (sql.includes('FROM workout_plans w WHERE w.member_id=$1')) { historyQueries++; return { rows: [{ id: 'plan-1', member_id: memberId, trainer_id: 'trainer-1', title: 'Strength', status: 'active', routine: [{ id: 'day-1', dayName: 'Day 1', focus: 'Strength', exercises: [{ id: 'e1', name: 'Squat' }] }], days_per_week: 1, program_started_on: '2026-10-01' }], rowCount: 1 }; }
    if (sql.includes('FROM workout_day_completions WHERE member_id=$1')) { historyQueries++; return { rows: [], rowCount: 0 }; }
    return { rows: [] };
  };
  const server = createApp({ db: { query, transaction: work => work({ query }) }, config }).listen(0);
  try {
    await new Promise(resolve => server.once('listening', resolve));
    return await run(`http://127.0.0.1:${server.address().port}`, () => historyQueries);
  } finally { await new Promise(resolve => server.close(resolve)); }
}

test('trainer can view assigned member weekly completion history; other roles and assignments are denied', async () => {
  for (const [role, assigned, expected] of [['trainer', true, 200], ['trainer', false, 404], ['member', true, 403]]) {
    await withServer(role, assigned, async (base, historyQueries) => {
      const response = await fetch(`${base}/api/v1/members/${memberId}/training-progress`, { headers: { cookie: 'session=test-token' } });
      assert.equal(response.status, expected);
      if (expected === 200) {
        const body = await response.json();
        assert.equal(body.data.plans[0].currentWeek.assignedWorkouts, 1);
        assert.ok(Array.isArray(body.data.plans[0].history));
      }
      assert.equal(historyQueries(), expected === 200 ? 2 : 0);
    });
  }
});
