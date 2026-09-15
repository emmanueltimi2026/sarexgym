import test from 'node:test';
import assert from 'node:assert/strict';
import { assertManualPaymentReplayMatches } from './routes.js';

const input = {
  memberId: '1ed3213a-4fa2-4dd8-a8a3-c88876c960a2',
  planId: '466c4a17-3e01-4d8d-9243-6ca9308c70cc',
  method: 'Cash'
};

test('manual payment replay accepts the original request only', () => {
  assert.doesNotThrow(() => assertManualPaymentReplayMatches({
    member_id: input.memberId,
    plan_id: input.planId,
    method: input.method
  }, input));
});

test('manual payment replay rejects an idempotency key reused for another payment', () => {
  assert.throws(() => assertManualPaymentReplayMatches({
    member_id: input.memberId,
    plan_id: 'd90e2781-6ed0-4522-a2b8-ac41899d7ed5',
    method: input.method
  }, input), error => error.code === 'IDEMPOTENCY_KEY_REUSED' && error.status === 409);
});