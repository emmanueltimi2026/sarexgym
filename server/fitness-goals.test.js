import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApp } from './app.js';
import { FITNESS_GOALS, memberGoalLabel } from '../shared/fitness-goals.js';

const config = {
  NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:3000', SESSION_COOKIE_NAME: 'session',
  SESSION_TTL_HOURS: 1, SESSION_IDLE_TIMEOUT_HOURS: 24, TRUST_PROXY: 'false',
  COOKIE_SAME_SITE: 'lax', CSRF_SECRET: 'test-fitness-goal-secret-with-enough-entropy', secureCookies: false,
};
const memberId = 'd49cf982-dcc9-43bd-974d-2ed0995e9eed';
const userId = 'adf7fbc8-9446-4a57-a68a-5077ce27633c';

function fakeDb({ google = false, authenticated = false } = {}) {
  const memberInserts = [], profileUpdates = [];
  const client = {
    async query(sql, params = []) {
      if (sql === 'SELECT now() now') return { rows: [{ now: new Date() }], rowCount: 1 };
      if (sql.startsWith("UPDATE subscriptions SET status='expired'")) return { rows: [], rowCount: 0 };
      if (sql.startsWith("SELECT DISTINCT member_id FROM subscriptions")) return { rows: [], rowCount: 0 };
      if (sql.startsWith('SELECT * FROM oauth_signup_tokens')) return { rows: google ? [{ id: 'signup-1', email: 'member@sarex.test', first_name: 'Ada', last_name: 'Member', picture_url: null, provider_subject: 'google-sub' }] : [], rowCount: google ? 1 : 0 };
      if (sql.startsWith('SELECT 1 FROM users WHERE lower(email)=')) return { rows: [], rowCount: 0 };
      if (sql.startsWith('INSERT INTO users(')) return { rows: [{ id: userId, email: 'member@sarex.test' }], rowCount: 1 };
      if (sql.startsWith('INSERT INTO members(')) {
        memberInserts.push({ sql, params });
        return { rows: [{ id: memberId, member_number: 'GYM-000001' }], rowCount: 1 };
      }
      if (sql.startsWith('UPDATE members SET first_name=')) { profileUpdates.push({ sql, params }); return { rows: [], rowCount: 1 }; }
      return { rows: [], rowCount: 0 };
    },
  };
  return {
    memberInserts, profileUpdates,
    async transaction(work) { return work(client); },
    async query(sql, params) {
      if (authenticated && sql.includes('FROM sessions s')) return { rows: [{ session_id: 'session-1', id: userId, email: 'member@sarex.test', status: 'active', must_change_password: false, permissions: [], roles: ['member'] }], rowCount: 1 };
      if (sql.startsWith('SELECT id,user_id,profile_image_url,profile_image_public_id FROM members')) return { rows: [{ id: memberId, user_id: userId, profile_image_url: null, profile_image_public_id: null }], rowCount: 1 };
      return client.query(sql, params);
    },
  };
}

async function withApp(db, run) {
  const server = createApp({ db, config }).listen(0);
  try {
    await new Promise(resolve => server.once('listening', resolve));
    return await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('email registration persists the member-selected goal', async () => {
  const db = fakeDb();
  await withApp(db, async base => {
    const response = await fetch(base + '/api/v1/auth/register', {
      method: 'POST', headers: { origin: config.APP_ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ firstName: 'Ada', lastName: 'Member', email: 'member@sarex.test', phone: '08000000000', password: 'strong-password-123', fitnessGoal: 'Build Muscle', fitnessGoalNotes: 'Train three days each week' }),
    });
    assert.equal(response.status, 201);
    assert.equal(db.memberInserts.length, 1);
    assert.match(db.memberInserts[0].sql, /fitness_goal,fitness_goal_notes/);
    assert.deepEqual(db.memberInserts[0].params.slice(-2), ['Build Muscle', 'Train three days each week']);
  });
});

test('Google registration persists the same selected goal', async () => {
  const db = fakeDb({ google: true });
  await withApp(db, async base => {
    const response = await fetch(base + '/api/v1/auth/google/register', {
      method: 'POST', headers: { origin: config.APP_ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'valid-signup-token-with-enough-length', phone: '08000000000', fitnessGoal: 'Improve Endurance', fitnessGoalNotes: '' }),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(db.memberInserts[0].params.slice(-2), ['Improve Endurance', null]);
  });
});

test('invalid goals are rejected without creating a member', async () => {
  const db = fakeDb();
  await withApp(db, async base => {
    const response = await fetch(base + '/api/v1/auth/register', {
      method: 'POST', headers: { origin: config.APP_ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ firstName: 'Ada', lastName: 'Member', email: 'member@sarex.test', phone: '08000000000', password: 'strong-password-123', fitnessGoal: 'Secret trainer target' }),
    });
    assert.equal(response.status, 400);
    assert.equal(db.memberInserts.length, 0);
  });
});

test('existing members without goals remain valid and display Not set', async () => {
  assert.equal(memberGoalLabel(null), 'Not set');
  assert.equal(memberGoalLabel(''), 'Not set');
  assert.equal(memberGoalLabel('Build Muscle'), 'Build Muscle');
  assert.equal(FITNESS_GOALS.length, 8);
  const migration = readFileSync(new URL('./migrations/020_member_fitness_goals.sql', import.meta.url), 'utf8');
  assert.match(migration, /ADD COLUMN fitness_goal text;/);
  const db = fakeDb();
  await withApp(db, async base => {
    const response = await fetch(base + '/api/v1/auth/register', {
      method: 'POST', headers: { origin: config.APP_ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ firstName: 'Ada', lastName: 'Member', email: 'member@sarex.test', phone: '08000000000', password: 'strong-password-123' }),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(db.memberInserts[0].params.slice(-2), [null, null]);
  });
});

test('only the signed-in member can edit their goal through the profile route', async () => {
  const db = fakeDb({ authenticated: true });
  await withApp(db, async base => {
    const headers = { origin: config.APP_ORIGIN, cookie: 'session=session-token' };
    const csrf = await fetch(base + '/api/v1/csrf', { headers });
    const token = (await csrf.json()).csrfToken;
    const profile = { firstName: 'Ada', lastName: 'Member', email: 'member@sarex.test', phone: '08000000000', address: '', photo: '', fitnessGoal: 'Flexibility / Mobility', fitnessGoalNotes: 'Improve hip mobility' };
    const response = await fetch(base + '/api/v1/profile', {
      method: 'PATCH', headers: { ...headers, 'content-type': 'application/json', 'x-csrf-token': token }, body: JSON.stringify(profile),
    });
    assert.equal(response.status, 204);
    assert.equal(db.profileUpdates.length, 1);
    assert.deepEqual(db.profileUpdates[0].params.slice(5, 9), [true, 'Flexibility / Mobility', true, 'Improve hip mobility']);
    assert.equal(db.profileUpdates[0].params.at(-1), memberId);
  });
});

test('goal notes over 500 characters are rejected before registration', async () => {
  const db = fakeDb();
  await withApp(db, async base => {
    const response = await fetch(base + '/api/v1/auth/register', {
      method: 'POST', headers: { origin: config.APP_ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ firstName: 'Ada', lastName: 'Member', email: 'member@sarex.test', phone: '08000000000', password: 'strong-password-123', fitnessGoal: 'Other', fitnessGoalNotes: 'x'.repeat(501) }),
    });
    assert.equal(response.status, 400);
    assert.equal(db.memberInserts.length, 0);
  });
});

test('a member can clear their goal and notes without affecting other profile fields', async () => {
  const db = fakeDb({ authenticated: true });
  await withApp(db, async base => {
    const headers = { origin: config.APP_ORIGIN, cookie: 'session=session-token' };
    const csrf = await fetch(base + '/api/v1/csrf', { headers });
    const token = (await csrf.json()).csrfToken;
    const response = await fetch(base + '/api/v1/profile', {
      method: 'PATCH', headers: { ...headers, 'content-type': 'application/json', 'x-csrf-token': token },
      body: JSON.stringify({ firstName: 'Ada', lastName: 'Member', email: 'member@sarex.test', phone: '08000000000', address: '', photo: '', fitnessGoal: null, fitnessGoalNotes: null }),
    });
    assert.equal(response.status, 204);
    assert.deepEqual(db.profileUpdates[0].params.slice(5, 9), [true, null, true, null]);
  });
});
