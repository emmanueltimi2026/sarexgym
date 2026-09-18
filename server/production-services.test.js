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
 const db={query:async sql=>sql.includes('SELECT count(*)')?{rows:[{count:2}]}:sql.includes('INSERT INTO notifications')?{rowCount:inserts++?0:2}:{rows:[]}};
 const first=await createExpiryNotifications(db,{}),second=await createExpiryNotifications(db,{});
 assert.deepEqual(first,{scanned:2,created:2,skipped:0,emailSent:0,emailFailed:0});assert.deepEqual(second,{scanned:2,created:0,skipped:2,emailSent:0,emailFailed:0});
});

test('failed expiry email does not duplicate the in-app notification',async()=>{
 const originalFetch=global.fetch;
 let fetchCalls=0;
 global.fetch=async()=>{fetchCalls++;return{ok:false,status:503};};
 try{
  let inserts=0,attempted=false;
  const db={query:async sql=>{
   if(sql.includes('SELECT count(*)'))return{rows:[{count:1}]};
   if(sql.includes('INSERT INTO notifications'))return{rowCount:inserts++?0:1};
   if(sql.includes("FROM notifications n JOIN users"))return{rows:attempted?[]:[{id:'notice-1',title:'Expiry',message:'Renew',email:'member@example.com'}]};
   if(sql.includes("emailAttemptedAt")){attempted=true;return{rows:[{id:'notice-1'}],rowCount:1};}
   return{rows:[],rowCount:0};
  }};
  const first=await createExpiryNotifications(db,{RESEND_API_KEY:'resend-secret',EMAIL_FROM:'gym@example.com',FRONTEND_URL:'https://gym.example'});
  const second=await createExpiryNotifications(db,{RESEND_API_KEY:'resend-secret',EMAIL_FROM:'gym@example.com',FRONTEND_URL:'https://gym.example'});
  assert.equal(first.created,1);
  assert.equal(first.emailFailed,1);
  assert.equal(second.created,0);
  assert.equal(second.emailFailed,0);
  assert.equal(fetchCalls,1);
 }finally{global.fetch=originalFetch;}
});
