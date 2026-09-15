import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceptionCheckInToken, verifyReceptionCheckInToken } from './check-in-token.js';

const secret = 'test-reception-secret-with-enough-entropy';
const branchId = 'd49cf982-dcc9-43bd-974d-2ed0995e9eed';

test('reception check-in codes are signed and permanent', () => {
  const token = createReceptionCheckInToken({ branchId, secret });
  assert.deepEqual(verifyReceptionCheckInToken(token, secret), { branchId, purpose: 'reception-check-in' });
});

test('reception check-in codes reject tampering', () => {
  const token = createReceptionCheckInToken({ branchId, secret });
  const [payload, signature] = token.split('.');
  assert.equal(verifyReceptionCheckInToken(payload + 'x.' + signature, secret), null);
});
