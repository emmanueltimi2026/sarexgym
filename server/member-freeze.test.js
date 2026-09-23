import test from 'node:test';
import assert from 'node:assert/strict';
import { setMemberFreeze } from './member-freeze.js';

function fixture({ memberExists = true, subscriptionExists = true } = {}) {
  const state = { frozen: false, inserts: 0, releases: 0, notices: 0, audits: [] };
  const client = { query: async sql => {
    if (sql.startsWith('SELECT id,user_id,member_number FROM members')) return { rows: memberExists ? [{ id: 'member-1', user_id: 'user-1', member_number: 'GYM-1' }] : [] };
    if (sql.startsWith('SELECT id,ends_at FROM subscriptions')) return { rows: subscriptionExists ? [{ id: 'subscription-1', ends_at: new Date('2026-10-23T00:00:00Z') }] : [] };
    if (sql.startsWith('SELECT id FROM subscription_freezes')) return { rows: state.frozen ? [{ id: 'freeze-1' }] : [] };
    if (sql.startsWith('INSERT INTO subscription_freezes')) { state.frozen = true; state.inserts++; return { rowCount: 1 }; }
    if (sql.startsWith('UPDATE subscription_freezes')) { state.frozen = false; state.releases++; return { rowCount: 1 }; }
    if (sql.startsWith('INSERT INTO notifications')) { state.notices++; return { rowCount: 1 }; }
    throw new Error(`Unexpected freeze query: ${sql}`);
  } };
  return { state, db: { transaction: work => work(client) }, audit: async (_client, action, id, values) => state.audits.push({ action, id, values }) };
}

test('admin freeze and unfreeze retain subscription dates and audit once per change', async () => {
  const { db, state, audit } = fixture();
  const args = { memberId: 'member-1', actorId: 'admin-1', audit };
  assert.deepEqual(await setMemberFreeze(db, { ...args, frozen: true }), { frozen: true, changed: true });
  assert.deepEqual(await setMemberFreeze(db, { ...args, frozen: true }), { frozen: true, changed: false });
  assert.deepEqual(await setMemberFreeze(db, { ...args, frozen: false }), { frozen: false, changed: true });
  assert.deepEqual(await setMemberFreeze(db, { ...args, frozen: false }), { frozen: false, changed: false });
  assert.equal(state.inserts, 1);
  assert.equal(state.releases, 1);
  assert.equal(state.notices, 2);
  assert.deepEqual(state.audits.map(item => item.action), ['subscription.frozen', 'subscription.unfrozen']);
});

test('freeze rejects missing members and subscriptions without changing access', async () => {
  for (const options of [{ memberExists: false }, { subscriptionExists: false }]) {
    const { db, state, audit } = fixture(options);
    await assert.rejects(setMemberFreeze(db, { memberId: 'member-1', actorId: 'admin-1', frozen: true, audit }), error => error.status === (options.memberExists === false ? 404 : 409));
    assert.equal(state.inserts, 0);
    assert.equal(state.notices, 0);
  }
});
