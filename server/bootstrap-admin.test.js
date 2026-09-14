import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapAdmin } from './bootstrap-admin.js';

const input={ADMIN_EMAIL:'admin@sarex.test',ADMIN_PASSWORD:'Bootstrap-Admin-2026!',ADMIN_NAME:'SAREX Admin'};

test('bootstrap admin creates user, assigns admin role, and writes audit log',async()=>{
 const userId='7ad9f4d7-bc16-4b96-8887-ae48c093eb1a',queries=[];
 const client={query:async(text,params)=>{
  queries.push({text,params});
  if(text.startsWith('INSERT INTO users')) return {rowCount:1,rows:[{id:userId}]};
  return {rowCount:1,rows:[]};
 }};
 const db={transaction:async work=>work(client)};

 await bootstrapAdmin(db,input);

 assert.equal(queries.length,3);
 assert.match(queries[0].text,/INSERT INTO users/);
 assert.equal(queries[0].params[0],input.ADMIN_EMAIL);
 assert.match(queries[0].params[1],/^scrypt\$16384\$8\$1\$/);
 assert.match(queries[1].text,/INSERT INTO user_roles/);
 assert.deepEqual(queries[1].params,[userId]);
 assert.match(queries[2].text,/\$1::uuid/);
 assert.match(queries[2].text,/\$1::text/);
 assert.match(queries[2].text,/\$2::jsonb/);
 assert.deepEqual(queries[2].params,[userId,JSON.stringify({email:input.ADMIN_EMAIL,name:input.ADMIN_NAME})]);
});

test('bootstrap admin duplicate email fails before role or audit writes',async()=>{
 const queries=[];
 const client={query:async(text,params)=>{
  queries.push({text,params});
  return {rowCount:0,rows:[]};
 }};
 const db={transaction:async work=>work(client)};

 await assert.rejects(()=>bootstrapAdmin(db,input),/Administrator email already exists/);
 assert.equal(queries.length,1);
 assert.match(queries[0].text,/ON CONFLICT\(\(lower\(email\)\)\) DO NOTHING/);
});
