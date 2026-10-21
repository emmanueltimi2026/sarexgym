import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

const planId = 'f73631f5-81fb-468c-9f37-9ac3d2d535e3';
const memberId = '9161a9d2-f19e-4f78-ad29-f23510456a70';
const routine = [
  { id: 'day-1', dayName: 'Day 1', focus: 'Strength', exercises: [{ id: 'squat', name: 'Squat', sets: 3, reps: '8' }] },
  { id: 'day-2', dayName: 'Day 2', focus: 'Conditioning', exercises: [{ id: 'run', name: 'Run', sets: 3, reps: '10 min' }] }
];
const config = { NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:3000', SESSION_COOKIE_NAME: 'session', SESSION_TTL_HOURS: 1, SESSION_IDLE_TIMEOUT_HOURS: 24, COOKIE_SAME_SITE: 'lax', CSRF_SECRET: 'test-workout-cycle-secret-with-entropy', TRUST_PROXY: 'false', secureCookies: false };

const withServer = async (role, run) => {
  const rows = new Map();
  let writes = 0;
  const query = async (sql, params = []) => {
    if (sql.includes('FROM sessions s')) return { rows: [{ session_id: 'session-1', id: 'member-user-1', email: 'member@sarex.test', status: 'active', permissions: [], roles: [role] }], rowCount: 1 };
    if (sql.includes('FROM workout_plans w JOIN members m')) return { rows: params[0] === planId && params[1] === 'member-user-1' ? [{ id: planId, member_id: memberId, trainer_id: 'trainer-1', routine, days_per_week: 2, status: 'active', program_started_on: '2026-09-24' }] : [], rowCount: params[0] === planId ? 1 : 0 };
    if (sql.startsWith('INSERT INTO workout_day_completions')) {
      writes++;
      const key = `${params[0]}|${params[1]}|${params[2]}|${params[4]}`;
      if (rows.has(key)) return { rows: [], rowCount: 0 };
      rows.set(key, { workout_day_id: params[2], program_week_number: params[3], program_week_start: params[4], completed_at: '2026-09-25T10:00:00.000Z' });
      return { rows: [{ id: 'completion-1' }], rowCount: 1 };
    }
    if (sql.includes('FROM workout_day_completions')) return { rows: [...rows.values()], rowCount: rows.size };
    return { rows: [], rowCount: 0 };
  };
  const db = { query, transaction: work => work({ query }) };
  const server = createApp({ db, config }).listen(0);
  try {
    await new Promise(resolve => server.once('listening', resolve));
    return await run(`http://127.0.0.1:${server.address().port}`, () => writes);
  } finally { await new Promise(resolve => server.close(resolve)); }
};

test('member can retrieve weekly progress and persist a workout-day completion with CSRF protection', () => withServer('member', async (base, writes) => {
  const headers = { cookie: 'session=test-token', origin: config.APP_ORIGIN };
  const url = `${base}/api/v1/workouts/${planId}/progress`;
  assert.equal((await fetch(url)).status, 401);
  const loaded = await fetch(url, { headers });
  assert.equal(loaded.status, 200);
  assert.equal((await loaded.json()).data.currentWeek.assignedWorkouts, 2);
  const markUrl = `${base}/api/v1/workouts/${planId}/days/0/complete`;
  assert.equal((await fetch(markUrl, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: '{}' })).status, 403);
  const csrf = (await (await fetch(`${base}/api/v1/csrf`, { headers })).json()).csrfToken;
  const saved = await fetch(markUrl, { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'x-csrf-token': csrf }, body: '{}' });
  assert.equal(saved.status, 200);
  const result = (await saved.json()).data;
  assert.equal(result.currentWeek.completedWorkouts, 1);
  assert.equal(result.currentWeek.days[0].status, 'completed');
  assert.equal(writes(), 1);
  assert.equal((await fetch(`${base}/api/v1/workouts/${planId}/completions/today`, { headers })).status, 404);
}));

test('members cannot complete another member plan and non-members cannot access completion routes', async () => {
  await withServer('member', async base => {
    const headers = { cookie: 'session=test-token', origin: config.APP_ORIGIN };
    assert.equal((await fetch(`${base}/api/v1/workouts/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa/progress`, { headers })).status, 404);
  });
  await withServer('trainer', async base => {
    const headers = { cookie: 'session=test-token', origin: config.APP_ORIGIN };
    assert.equal((await fetch(`${base}/api/v1/workouts/${planId}/progress`, { headers })).status, 403);
    const csrf = (await (await fetch(`${base}/api/v1/csrf`, { headers })).json()).csrfToken;
    assert.equal((await fetch(`${base}/api/v1/workouts/${planId}/days/0/complete`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'x-csrf-token': csrf }, body: '{}' })).status, 403);
  });
});
