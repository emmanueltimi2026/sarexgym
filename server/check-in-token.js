import crypto from 'node:crypto';

const encode = value => Buffer.from(value).toString('base64url');

export function createReceptionCheckInToken({ branchId, secret }) {
  const payload = encode(JSON.stringify({ branchId, purpose: 'reception-check-in' }));
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return payload + '.' + signature;
}

export function verifyReceptionCheckInToken(token, secret) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof value.branchId !== 'string' || value.purpose !== 'reception-check-in') return null;
    return value;
  } catch {
    return null;
  }
}
