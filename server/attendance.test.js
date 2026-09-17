import test from 'node:test';
import assert from 'node:assert/strict';
import { recordDeniedAttendance } from './attendance.js';

test('denied check-in is persisted against the identified member', async () => {
  const calls = [];
  const client = {
    query: async (text, params) => {
      calls.push({ text, params });
      return { rows: [{ id: 'attendance-1', denial_reason: params[4] }] };
    },
  };

  const result = await recordDeniedAttendance(client, {
    memberId: 'member-1',
    branchId: 'branch-1',
    scannerUserId: 'user-1',
    method: 'reception_qr',
    reason: 'You do not have an active membership',
  });

  assert.equal(result.id, 'attendance-1');
  assert.equal(calls.length, 1);
  assert.match(calls[0].text, /'denied'/);
  assert.match(calls[0].text, /denial_reason/);
  assert.deepEqual(calls[0].params, [
    'member-1',
    'branch-1',
    'user-1',
    'reception_qr',
    'You do not have an active membership',
  ]);
});

test('denied check-in cannot be recorded without an identified member', async () => {
  let queried = false;
  const client = { query: async () => { queried = true; } };

  await assert.rejects(
    recordDeniedAttendance(client, {
      memberId: '',
      branchId: 'branch-1',
      scannerUserId: 'user-1',
      method: 'reception_qr',
      reason: 'Denied',
    }),
    /registered member/,
  );
  assert.equal(queried, false);
});
