import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { errorHandler } from './middleware.js';

test('trainer assignment migration rejects existing duplicate active members before creating a unique index', async () => {
  const sql = await fs.readFile(new URL('./migrations/022_one_active_trainer_per_member.sql', import.meta.url), 'utf8');
  assert.match(sql, /WHERE active\s+GROUP BY member_id\s+HAVING count\(\*\) > 1/);
  assert.match(sql, /CREATE UNIQUE INDEX one_active_trainer_per_member\s+ON trainer_assignments\(member_id\) WHERE active/);
  assert.doesNotMatch(sql, /DELETE\s+FROM\s+trainer_assignments/i);
});

test('concurrent trainer assignment conflict has a clear response without database details', () => {
  let status;
  let body;
  const response = { status(value) { status = value; return this; }, json(value) { body = value; return this; } };
  errorHandler({ code: '23505', constraint: 'one_active_trainer_per_member', message: 'duplicate key value violates unique constraint' }, { requestId: 'request-1' }, response, () => {});
  assert.equal(status, 409);
  assert.equal(body.error.code, 'MEMBER_TRAINER_CONFLICT');
  assert.doesNotMatch(body.error.message, /duplicate key|constraint/i);
});
