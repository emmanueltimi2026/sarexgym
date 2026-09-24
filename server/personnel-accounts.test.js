import test from 'node:test';
import assert from 'node:assert/strict';
import { savePersonnelAccount } from './personnel-accounts.js';
import { createApp } from './app.js';
import { hashPassword, verifyPassword } from './security.js';

const input = { email: '  STAFF@EXAMPLE.COM  ', password: 'new-temporary-password', firstName: 'New', lastName: 'Name', phone: '08012345678' };
const conflict = (code) => (error) => error.code === code && error.status === 409;

function database(initial = {}) {
  let state = {
    users: [], staff: [], trainers: [], members: [], roles: [], sessions: [], resets: [], audits: [],
    ...structuredClone(initial),
  };
  let queue = Promise.resolve();
  const db = {
    get state() { return state; },
    async transaction(work) {
      const previous = queue;
      let release;
      queue = new Promise(resolve => { release = resolve; });
      await previous;
      const draft = structuredClone(state);
      const client = {
        async query(sql, params = []) {
          const [id, second] = params;
          const rows = value => ({ rows: value, rowCount: value.length });
          if (sql.startsWith('SELECT id,status FROM users')) { assert.match(sql, /FOR UPDATE/); return rows(draft.users.filter(u => u.email.toLowerCase() === id).map(u => ({ id: u.id, status: u.status }))); }
          if (sql === 'SELECT now() now') return rows([{ now: new Date() }]);
          if (sql.startsWith("UPDATE subscriptions SET status='expired'")) return rows([]);
          if (sql.startsWith("SELECT DISTINCT member_id FROM subscriptions")) return rows([]);
          if (sql.startsWith('SELECT id,active FROM staff')) return rows(draft.staff.filter(p => p.userId === id).map(p => ({ id: p.id, active: p.active })));
          if (sql.startsWith('SELECT id,active FROM trainers')) return rows(draft.trainers.filter(p => p.userId === id).map(p => ({ id: p.id, active: p.active })));
          if (sql.startsWith('SELECT id FROM members')) return rows(draft.members.filter(p => p.userId === id));
          if (sql.startsWith('SELECT r.code FROM user_roles')) return rows(draft.roles.filter(r => r.userId === id).map(r => ({ code: r.code })));
          if (sql.startsWith('INSERT INTO audit_logs')) { draft.audits.push({ action: params[1] }); return rows([]); }
          if (sql.startsWith('INSERT INTO users')) {
            if (draft.users.some(u => u.email.toLowerCase() === id)) throw Object.assign(new Error('duplicate'), { code: '23505', constraint: 'users_email_unique' });
            const user = { id: 'user-' + (draft.users.length + 1), email: id, hash: second, status: 'active', mustChange: true, credentialVersion: 1 };
            draft.users.push(user);
            return rows([{ id: user.id }]);
          }
          if (sql.startsWith('UPDATE users SET status=')) {
            Object.assign(draft.users.find(u => u.id === id), { status: 'active', hash: second, mustChange: true });
            draft.users.find(u => u.id === id).credentialVersion++;
            return rows([]);
          }
          if (sql.startsWith('UPDATE sessions')) { for (const session of draft.sessions.filter(s => s.userId === id && !s.revoked)) session.revoked = true; return rows([]); }
          if (sql.startsWith('UPDATE password_reset_tokens')) { for (const token of draft.resets.filter(t => t.userId === id && !t.consumed)) token.consumed = true; return rows([]); }
          if (sql.startsWith('DELETE FROM user_roles')) { draft.roles = draft.roles.filter(r => r.userId !== id || r.code === second); return rows([]); }
          if (sql.startsWith('INSERT INTO user_roles')) { if (!draft.roles.some(r => r.userId === id && r.code === second)) draft.roles.push({ userId: id, code: second }); return rows([]); }
          if (sql.startsWith('UPDATE staff SET')) { Object.assign(draft.staff.find(p => p.id === id), { branchId: second, firstName: params[2], lastName: params[3], phone: params[4], active: true }); return rows([]); }
          if (sql.startsWith('UPDATE trainers SET')) { Object.assign(draft.trainers.find(p => p.id === id), { firstName: second, lastName: params[2], phone: params[3], specialization: params[4], bio: params[5], active: true }); return rows([]); }
          if (sql.startsWith('INSERT INTO staff')) { const p = { id: 'staff-' + (draft.staff.length + 1), userId: id, branchId: second, firstName: params[2], lastName: params[3], phone: params[4], active: true }; draft.staff.push(p); return rows([{ id: p.id }]); }
          if (sql.startsWith('INSERT INTO trainers')) { const p = { id: 'trainer-' + (draft.trainers.length + 1), userId: id, firstName: second, lastName: params[2], phone: params[3], active: true }; draft.trainers.push(p); return rows([{ id: p.id }]); }
          throw new Error('Unexpected query: ' + sql);
        },
      };
      try { const result = await work(client); state = draft; return result; }
      finally { release(); }
    },
  };
  return db;
}

const seedStaff = async (overrides = {}) => ({
  users: [{ id: 'existing-user', email: 'staff@example.com', hash: await hashPassword('old-password'), status: 'disabled', mustChange: false, credentialVersion: 4, ...overrides.user }],
  staff: [{ id: 'existing-staff', userId: 'existing-user', branchId: 'old-branch', firstName: 'Old', lastName: 'Name', phone: 'old-phone', active: false, ...overrides.staff }],
  roles: [{ userId: 'existing-user', code: 'staff' }, ...(overrides.roles || [])],
  sessions: [{ userId: 'existing-user', revoked: false }],
  resets: [{ userId: 'existing-user', consumed: false }],
});

const save = (db, options = {}) => savePersonnelAccount({
  db, kind: 'staff', input, branchId: 'new-branch', reactivate: options.reactivate,
  audit: async (_client, action, type, id, values) => {
    if (options.failAudit) throw new Error('audit failed');
    db.state.auditObserver?.(action);
    // The real audit insert participates in the same transaction; the fake records calls separately.
    options.auditCalls?.push({ action, type, id, values });
  },
});

test('new staff creation normalizes email and creates one user/profile with first-login change', async () => {
  const db = database(), auditCalls = [];
  const result = await save(db, { auditCalls });
  assert.deepEqual(result, { status: 'created', staffId: 'staff-1', trainerId: undefined, userId: 'user-1' });
  assert.equal(db.state.users.length, 1);
  assert.equal(db.state.staff.length, 1);
  assert.equal(db.state.users[0].email, 'staff@example.com');
  assert.equal(db.state.users[0].mustChange, true);
  assert.equal(await verifyPassword(input.password, db.state.users[0].hash), true);
  assert.deepEqual(db.state.roles, [{ userId: 'user-1', code: 'staff' }]);
  assert.equal(auditCalls[0].action, 'staff.created');
});

test('active staff email returns a friendly conflict without inserting rows', async () => {
  const db = database(await seedStaff({ user: { status: 'active' }, staff: { active: true } }));
  await assert.rejects(save(db), conflict('STAFF_EMAIL_ALREADY_ACTIVE'));
  assert.equal(db.state.users.length, 1);
  assert.equal(db.state.staff.length, 1);
});

test('disabled staff requires explicit confirmation before any account changes', async () => {
  const db = database(await seedStaff());
  await assert.rejects(save(db), conflict('STAFF_REACTIVATION_REQUIRED'));
  assert.equal(db.state.users[0].status, 'disabled');
  assert.equal(db.state.sessions[0].revoked, false);
});

test('reactivation reuses IDs, replaces password, revokes sessions/tokens, and restores role', async () => {
  const seed = await seedStaff({ roles: [{ userId: 'existing-user', code: 'trainer' }] });
  const db = database(seed), auditCalls = [];
  const result = await save(db, { reactivate: true, auditCalls });
  assert.equal(result.status, 'reactivated');
  assert.equal(result.userId, 'existing-user');
  assert.equal(result.staffId, 'existing-staff');
  assert.equal(db.state.users.length, 1);
  assert.equal(db.state.staff.length, 1);
  assert.equal(db.state.users[0].status, 'active');
  assert.equal(db.state.staff[0].active, true);
  assert.equal(db.state.staff[0].branchId, 'new-branch');
  assert.equal(db.state.staff[0].firstName, 'New');
  assert.equal(db.state.staff[0].phone, '08012345678');
  assert.equal(db.state.users[0].mustChange, true);
  assert.equal(db.state.users[0].credentialVersion, 5);
  assert.equal(await verifyPassword(input.password, db.state.users[0].hash), true);
  assert.equal(await verifyPassword('old-password', db.state.users[0].hash), false);
  assert.equal(db.state.sessions[0].revoked, true);
  assert.equal(db.state.resets[0].consumed, true);
  assert.deepEqual(db.state.roles, [{ userId: 'existing-user', code: 'staff' }]);
  assert.deepEqual(auditCalls.map(a => a.action), ['staff.roles_corrected', 'staff.reactivated']);
});

test('disabled user with staff role but missing profile can be restored without a second user', async () => {
  const seed = await seedStaff(); seed.staff = [];
  const db = database(seed);
  const result = await save(db, { reactivate: true });
  assert.equal(result.userId, 'existing-user');
  assert.equal(db.state.users.length, 1);
  assert.equal(db.state.staff.length, 1);
});

test('member/admin identities and trainer-to-staff conversion fail safely', async () => {
  const seed = await seedStaff(); seed.trainers = [{ id: 'trainer-1', userId: 'existing-user', active: false }];
  await assert.rejects(save(database(seed), { reactivate: true }), conflict('ACCOUNT_ROLE_CONFLICT'));
  seed.trainers = []; seed.members = [{ id: 'member-1', userId: 'existing-user' }];
  await assert.rejects(save(database(seed), { reactivate: true }), conflict('ACCOUNT_ROLE_CONFLICT'));
  seed.members = []; seed.roles.push({ userId: 'existing-user', code: 'admin' });
  await assert.rejects(save(database(seed), { reactivate: true }), conflict('ACCOUNT_ROLE_CONFLICT'));
});

test('failed audit rolls back all reactivation writes', async () => {
  const db = database(await seedStaff());
  await assert.rejects(save(db, { reactivate: true, failAudit: true }), /audit failed/);
  assert.equal(db.state.users[0].status, 'disabled');
  assert.equal(db.state.staff[0].active, false);
  assert.equal(db.state.sessions[0].revoked, false);
});

test('concurrent reactivation attempts never duplicate rows', async () => {
  const db = database(await seedStaff());
  const outcomes = await Promise.allSettled([save(db, { reactivate: true }), save(db, { reactivate: true })]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter(result => result.status === 'rejected' && result.reason.code === 'STAFF_EMAIL_ALREADY_ACTIVE').length, 1);
  assert.equal(db.state.users.length, 1);
  assert.equal(db.state.staff.length, 1);
});

test('trainer creation and soft-deleted trainer reactivation use the same service', async () => {
  const db = database();
  const trainerInput = { ...input, specialization: 'Strength', bio: 'Coach' };
  const options = { db, kind: 'trainer', input: trainerInput, audit: async () => {} };
  const created = await savePersonnelAccount(options);
  assert.equal(created.status, 'created');
  db.state.users[0].status = 'disabled';
  db.state.trainers[0].active = false;
  await assert.rejects(savePersonnelAccount(options), conflict('TRAINER_REACTIVATION_REQUIRED'));
  const restored = await savePersonnelAccount({ ...options, reactivate: true });
  assert.equal(restored.status, 'reactivated');
  assert.equal(restored.trainerId, created.trainerId);
  assert.equal(db.state.users.length, 1);
  assert.equal(db.state.trainers.length, 1);
});

test('staff API returns a confirmation conflict, then a clean reactivated response', async () => {
  const db = database(await seedStaff());
  db.query = async sql => {
    if (sql.includes('FROM sessions s')) return { rows: [{ session_id: 'admin-session', id: 'admin-user', email: 'admin@sarex.test', status: 'active', permissions: ['staff.manage'], roles: ['admin'] }] };
    return { rows: [], rowCount: 0 };
  };
  const config = {
    NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:3000', SESSION_COOKIE_NAME: 'session',
    SESSION_TTL_HOURS: 1, SESSION_IDLE_TIMEOUT_HOURS: 24, TRUST_PROXY: 'false',
    COOKIE_SAME_SITE: 'lax', CSRF_SECRET: 'test-personnel-secret-with-enough-entropy', secureCookies: false,
  };
  const server = createApp({ db, config }).listen(0);
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const headers = { cookie: 'session=session-token', origin: config.APP_ORIGIN };
    const csrf = await fetch(base + '/api/v1/csrf', { headers });
    const token = (await csrf.json()).csrfToken;
    const submit = async reactivate => {
      const response = await fetch(base + '/api/v1/staff', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ ...input, branchId: 'd49cf982-dcc9-43bd-974d-2ed0995e9eed', reactivate }),
      });
      return { status: response.status, body: await response.json() };
    };
    const needsConfirmation = await submit(false);
    assert.equal(needsConfirmation.status, 409);
    assert.equal(needsConfirmation.body.error.code, 'STAFF_REACTIVATION_REQUIRED');
    assert.doesNotMatch(needsConfirmation.body.error.message, /duplicate key|unique constraint/i);
    const restored = await submit(true);
    assert.equal(restored.status, 200);
    assert.equal(restored.body.data.status, 'reactivated');
    assert.equal(restored.body.data.staffId, 'existing-staff');
    assert.equal(restored.body.data.userId, 'existing-user');
    assert.equal(db.state.audits.at(-1).action, 'staff.reactivated');
    const duplicate = await submit(false);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, 'STAFF_EMAIL_ALREADY_ACTIVE');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('temporary-password sessions cannot use portal APIs until password is changed', async () => {
  let mustChange = true;
  const db = {
    async query(sql) {
      if (sql.includes('FROM sessions s')) return { rows: [{ session_id: 'session-1', id: 'staff-user', email: 'staff@example.com', status: 'active', must_change_password: mustChange, permissions: [], roles: ['staff'] }] };
      return { rows: [], rowCount: 0 };
    },
    async transaction(work) {
      return work({ query: async sql => {
        if (sql.startsWith('UPDATE users SET password_hash=')) mustChange = false;
        return { rows: [], rowCount: 0 };
      } });
    },
  };
  const config = {
    NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:3000', SESSION_COOKIE_NAME: 'session',
    SESSION_TTL_HOURS: 1, SESSION_IDLE_TIMEOUT_HOURS: 24, TRUST_PROXY: 'false',
    COOKIE_SAME_SITE: 'lax', CSRF_SECRET: 'test-personnel-secret-with-enough-entropy', secureCookies: false,
  };
  const server = createApp({ db, config }).listen(0);
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const headers = { cookie: 'session=session-token', origin: config.APP_ORIGIN };
    const session = await fetch(base + '/api/v1/session', { headers });
    assert.equal((await session.json()).user.mustChangePassword, true);
    const csrf = await fetch(base + '/api/v1/csrf', { headers });
    const token = (await csrf.json()).csrfToken;
    const blocked = await fetch(base + '/api/v1/notifications', { headers });
    assert.equal(blocked.status, 403);
    assert.equal((await blocked.json()).error.code, 'PASSWORD_CHANGE_REQUIRED');
    const changed = await fetch(base + '/api/v1/auth/change-initial-password', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json', 'x-csrf-token': token },
      body: JSON.stringify({ password: 'permanent-new-password' }),
    });
    assert.equal(changed.status, 204);
    const allowed = await fetch(base + '/api/v1/notifications', { headers });
    assert.equal(allowed.status, 200);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('email unique race maps to a business conflict rather than leaking PostgreSQL details', async () => {
  const db = {
    async transaction() {
      throw Object.assign(new Error('duplicate key value violates unique constraint users_email_unique'), {
        code: '23505', constraint: 'users_email_unique',
      });
    },
  };
  await assert.rejects(save(db), error =>
    error.code === 'STAFF_EMAIL_ALREADY_ACTIVE' &&
    error.status === 409 &&
    !/duplicate key|unique constraint/i.test(error.message));
});

test('missing staff role is restored and audited for an existing inactive profile', async () => {
  const seed = await seedStaff();
  seed.roles = [];
  const db = database(seed), auditCalls = [];
  await save(db, { reactivate: true, auditCalls });
  assert.deepEqual(db.state.roles, [{ userId: 'existing-user', code: 'staff' }]);
  assert.equal(auditCalls[0].action, 'staff.roles_corrected');
  assert.equal(auditCalls[0].values.addedRole, 'staff');
});
