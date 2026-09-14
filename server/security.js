import crypto from 'node:crypto';

const b64url = value => Buffer.from(value).toString('base64url');
export const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const timingSafeEqualText = (a, b) => {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export async function hashPassword(password, salt = crypto.randomBytes(16)) {
  const derived = await new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (e, key) => e ? reject(e) : resolve(key)));
  return `scrypt$16384$8$1$${b64url(salt)}$${b64url(derived)}`;
}

export async function verifyPassword(password, encoded) {
  try {
    const [algorithm, n, r, p, salt, hash] = encoded.split('$');
    if (algorithm !== 'scrypt') return false;
    const derived = await new Promise((resolve, reject) => crypto.scrypt(password, Buffer.from(salt, 'base64url'), 64, { N: Number(n), r: Number(r), p: Number(p) }, (e, key) => e ? reject(e) : resolve(key)));
    return timingSafeEqualText(b64url(derived), hash);
  } catch { return false; }
}

