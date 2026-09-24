import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

const planId = 'f73631f5-81fb-468c-9f37-9ac3d2d535e3';
const routine = [{ id: 'd79dc04b-2e91-4f15-b9a6-30c53c827b9d', dayName: 'Day 1', focus: 'Strength', exercises: [{ id: '3cf1ec5b-24a0-43ea-97a1-fda98bd32753', name: 'Squat', sets: 3, reps: '8', restSeconds: 0 }] }];
const config = { NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:3000', SESSION_COOKIE_NAME: 'session', SESSION_TTL_HOURS: 1, SESSION_IDLE_TIMEOUT_HOURS: 24, COOKIE_SAME_SITE: 'lax', CSRF_SECRET: 'test-workout-completion-secret-with-entropy', TRUST_PROXY: 'false', secureCookies: false };

const withServer = async (role, run) => {
  let writes = 0;
  const query = async (sql, params = []) => {
    if (sql.includes('FROM sessions s')) return { rows: [{ session_id: 'session-1', id: 'member-user-1', email: 'member@sarex.test', status: 'active', permissions: [], roles: [role] }], rowCount: 1 };
    if (sql.includes('FROM workout_plans w')) return { rows: params[0] === planId && params[1] === 'member-user-1' ? [{ id: planId, routine }] : [], rowCount: 1 };
    if (sql.startsWith('SELECT day_key')) return { rows: [] };
    if (sql.startsWith('INSERT INTO workout_exercise_completions')) { writes++; return { rows: [] }; }
    return { rows: [] };
  };
  const db = { query, transaction: work => work({ query }) };
  const server = createApp({ db, config }).listen(0);
  try {
    await new Promise(resolve => server.once('listening', resolve));
    return await run(`http://127.0.0.1:${server.address().port}`, () => writes);
  } finally { await new Promise(resolve => server.close(resolve)); }
};

test('member can load and save only their workout progress with CSRF protection', () => withServer('member', async (base, writes) => {
  const url = `${base}/api/v1/workouts/${planId}/completions/today`;
  assert.equal((await fetch(url)).status, 401);
  const headers = { cookie: 'session=test-token', origin: config.APP_ORIGIN };
  const read = await fetch(url, { headers });
  assert.equal(read.status, 200);
  assert.deepEqual((await read.json()).data.completed, []);
  const body = JSON.stringify({ dayIndex: 0, exerciseIndex: 0, completed: true });
  assert.equal((await fetch(url, { method: 'PUT', headers: { ...headers, 'content-type': 'application/json' }, body })).status, 403);
  const csrf = (await (await fetch(`${base}/api/v1/csrf`, { headers })).json()).csrfToken;
  const saved = await fetch(url, { method: 'PUT', headers: { ...headers, 'content-type': 'application/json', 'x-csrf-token': csrf }, body });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).data.completed, true);
  assert.equal(writes(), 1);
  assert.equal((await fetch(`${base}/api/v1/workouts/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa/completions/today`, { headers })).status, 404);
}));

test('trainer sessions cannot read or mark member workout completions', () => withServer('trainer', async base => {
  const headers = { cookie: 'session=test-token', origin: config.APP_ORIGIN };
  const url = `${base}/api/v1/workouts/${planId}/completions/today`;
  assert.equal((await fetch(url, { headers })).status, 403);
  const csrf = (await (await fetch(`${base}/api/v1/csrf`, { headers })).json()).csrfToken;
  assert.equal((await fetch(url, { method: 'PUT', headers: { ...headers, 'content-type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify({ dayIndex: 0, exerciseIndex: 0, completed: true }) })).status, 403);
}));
