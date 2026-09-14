import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './security.js';
test('password hashing verifies without retaining plaintext',async()=>{const hash=await hashPassword('Correct horse battery staple');assert.equal(hash.includes('Correct'),false);assert.equal(await verifyPassword('Correct horse battery staple',hash),true);assert.equal(await verifyPassword('wrong password',hash),false)});
