import test from 'node:test';
import assert from 'node:assert/strict';
import { createSharedRateLimit } from './rate-limit.js';
import { createExpiryNotifications } from './expiry-notifications.js';

test('production rate limiter uses the shared database counter',async()=>{
 let count=0,passed=0,status;
 const limiter=createSharedRateLimit({db:{query:async()=>({rows:[{request_count:++count}]})},config:{NODE_ENV:'production'},name:'test',windowMs:60_000,limit:2,key:()=> 'subject'});
 const req={ip:'127.0.0.1',body:{},requestId:'request'},res={setHeader(){},status(value){status=value;return this},json(){}};
 await limiter(req,res,()=>passed++);await limiter(req,res,()=>passed++);await limiter(req,res,()=>passed++);
 assert.equal(passed,2);assert.equal(status,429);assert.equal(count,3);
});

test('expiry task reports repeat-safe notification counts',async()=>{
 let inserts=0;
 const db={query:async sql=>sql.includes('INSERT INTO notifications')?{rowCount:inserts++?0:2}:{rows:[]}};
 const first=await createExpiryNotifications(db,{}),second=await createExpiryNotifications(db,{});
 assert.deepEqual(first,{created:2,emailSent:0,emailFailed:0});assert.deepEqual(second,{created:0,emailSent:0,emailFailed:0});
});
