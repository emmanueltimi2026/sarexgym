import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import { createReceptionCheckInToken } from './check-in-token.js';

const config={NODE_ENV:'test',APP_ORIGIN:'http://localhost:3000',SESSION_COOKIE_NAME:'session',SESSION_TTL_HOURS:1,TRUST_PROXY:'false',secureCookies:false};
const db={query:async text=>({rows:text==='SELECT 1'?[{ok:1}]:[],rowCount:text==='SELECT 1'?1:0}),transaction:async work=>work({query:async()=>({rows:[],rowCount:0})})};
async function withServer(run){const server=createApp({db,config}).listen(0);try{await new Promise(r=>server.once('listening',r));return await run(`http://127.0.0.1:${server.address().port}`)}finally{await new Promise(r=>server.close(r))}}
test('health endpoints and security headers are available',()=>withServer(async base=>{const response=await fetch(base+'/health/ready');assert.equal(response.status,200);assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(await response.json(),{status:'ready'})}));
test('protected endpoint fails closed without session',()=>withServer(async base=>{const response=await fetch(base+'/api/v1/session');assert.equal(response.status,401);assert.equal((await response.json()).error.code,'UNAUTHENTICATED')}));
test('login validates input and never assigns a role from email text',()=>withServer(async base=>{const response=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{'content-type':'application/json','origin':config.APP_ORIGIN},body:JSON.stringify({email:'admin@example.com',password:'short'})});assert.equal(response.status,400);assert.equal((await response.json()).error.code,'VALIDATION_ERROR')}));
test('unsafe requests reject an unrelated browser origin',()=>withServer(async base=>{const response=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{'content-type':'application/json','origin':'https://evil.example'},body:JSON.stringify({email:'admin@example.com',password:'long-enough-password'})});assert.equal(response.status,403)}));

test('staff cannot freeze a member even if granted the freeze permission',async()=>{
 const frozenMemberId='7f07e15c-82ae-4cef-93b4-029916326130';
 let memberLockQueries=0;
 const freezeDb={query:async sql=>sql.includes('FROM sessions s')?{rows:[{session_id:'session-1',id:'staff-1',email:'staff@sarex.test',status:'active',permissions:['subscriptions.freeze'],roles:['staff']}],rowCount:1}:{rows:[],rowCount:0},transaction:async work=>work({query:async sql=>{if(sql==='SELECT now() now')return{rows:[{now:new Date()}]};if(sql.includes('FROM members WHERE id=$1 FOR UPDATE'))memberLockQueries++;return{rows:[],rowCount:0};}})};
 const localConfig={...config,SESSION_IDLE_TIMEOUT_HOURS:24,COOKIE_SAME_SITE:'lax',CSRF_SECRET:'test-freeze-secret-with-enough-entropy'};
 const server=createApp({db:freezeDb,config:localConfig}).listen(0);
 try{
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`,headers={cookie:'session=session-token',origin:localConfig.APP_ORIGIN};
  const csrfResponse=await fetch(base+'/api/v1/csrf',{headers}),csrfToken=(await csrfResponse.json()).csrfToken;
  const response=await fetch(`${base}/api/v1/members/${frozenMemberId}/freeze`,{method:'POST',headers:{...headers,'content-type':'application/json','x-csrf-token':csrfToken},body:JSON.stringify({frozen:true})});
  assert.equal(response.status,403);
  assert.equal(memberLockQueries,0);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('duplicate reception scan returns the existing successful check-in idempotently',async()=>{
 const branchId='d49cf982-dcc9-43bd-974d-2ed0995e9eed',checkedInAt=new Date('2026-09-17T08:30:00.000Z'),transactionQueries=[];
 const duplicateDb={
  async query(text){
   if(text.includes('FROM sessions s'))return{rows:[{session_id:'session-1',id:'user-1',email:'member@sarex.test',status:'active',permissions:[],roles:['member']}]};
   return{rows:[],rowCount:0};
  },
  async transaction(work){return work({query:async(text)=>{
   transactionQueries.push(text);
   if(text.includes('FROM members m JOIN users u'))return{rows:[{id:'member-1',member_number:'GYM-000001',first_name:'Test',last_name:'Member',profile_image_url:null,home_branch_id:branchId,user_status:'active'}]};
   if(text.includes('FROM branches'))return{rows:[{id:branchId,name:'SAREX Main Branch',timezone:'Africa/Lagos'}]};
   if(text.includes('FROM subscriptions s'))return{rows:[{id:'subscription-1',plan_name:'Performance',ends_at:new Date('2026-10-17T00:00:00.000Z')}]};
   if(text.includes("FROM attendance WHERE member_id=$1 AND status='completed'"))return{rows:[{id:'attendance-1',checked_in_at:checkedInAt}]};
   return{rows:[],rowCount:0};
  }});}
 };
 const duplicateConfig={...config,SESSION_IDLE_TIMEOUT_HOURS:24,COOKIE_SAME_SITE:'lax',CSRF_SECRET:'test-reception-secret-with-enough-entropy'};
 const app=createApp({db:duplicateDb,config:duplicateConfig}),server=app.listen(0);
 try{
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`,cookie='session=session-token',origin=duplicateConfig.APP_ORIGIN;
  const csrfResponse=await fetch(base+'/api/v1/csrf',{headers:{cookie,origin}}),csrfToken=(await csrfResponse.json()).csrfToken;
  const token=createReceptionCheckInToken({branchId,secret:duplicateConfig.CSRF_SECRET});
  const response=await fetch(base+'/api/v1/attendance/reception-check-in',{method:'POST',headers:{cookie,origin,'content-type':'application/json','x-csrf-token':csrfToken},body:JSON.stringify({token})});
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.data.duplicate,true);
  assert.equal(body.data.id,'attendance-1');
  assert.equal(body.data.member.memberId,'GYM-000001');
  assert.equal(transactionQueries.some(text=>text.startsWith('INSERT INTO attendance')),false);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('bootstrap returns mixed membership and event payments with UNION-compatible text statuses',async()=>{
 const captured=[];
 const now=new Date('2026-09-18T12:00:00.000Z');
 const bootstrapDb={
  async transaction(work){return work(this);},
  async query(text){
   captured.push(text);
   if(text.includes('FROM sessions s'))return{rows:[{session_id:'session-1',id:'user-1',email:'member@sarex.test',status:'active',permissions:[],roles:['member']}],rowCount:1};
   if(text.startsWith('UPDATE sessions SET last_seen_at'))return{rows:[],rowCount:1};
   if(text==='SELECT now() now')return{rows:[{now}],rowCount:1};
   if(text.includes("UPDATE subscriptions SET status='expired',updated_at=now() WHERE status='active'"))return{rows:[],rowCount:0};
   if(text.includes("SELECT DISTINCT member_id FROM subscriptions WHERE status='scheduled'"))return{rows:[],rowCount:0};
   if(text.includes('SELECT m.*,u.email'))return{rows:[{
    id:'member-1',user_id:'user-1',member_number:'GYM-000001',first_name:'Ada',last_name:'Member',email:'member@sarex.test',phone:'08000000000',
    gender:null,date_of_birth:null,address:null,profile_image_url:null,joined_at:now,user_status:'active',
    subscription_status:'active',starts_at:new Date('2026-09-01T00:00:00.000Z'),ends_at:new Date('2026-10-01T00:00:00.000Z'),amount_minor:2500000,
    plan_id:'plan-1',plan_name:'Standard Plan',trainer_access:false,workout_plan_access:false,registration_fee_paid_at:now,
    next_subscription_id:'sub-next',next_plan_id:'plan-2',next_subscription_status:'scheduled',next_starts_at:new Date('2026-10-01T00:00:00.000Z'),next_ends_at:new Date('2026-10-31T00:00:00.000Z'),next_plan_name:'Premium',
    trainer_id:null,trainer_name:null,last_check_in:null
   }],rowCount:1};
   if(text.includes("SELECT *,COALESCE(features,'[]'::jsonb) features FROM membership_plans"))return{rows:[{id:'plan-1',name:'Standard Plan',description:'Standard',price_minor:2500000,duration_days:30,active:true,features:[],trainer_access:false,workout_plan_access:false,registration_fee_minor:0}],rowCount:1};
   if(text.includes('FROM attendance a JOIN members'))return{rows:[],rowCount:0};
   if(text.includes('SELECT * FROM (')&&text.includes('UNION ALL')&&text.includes('event_registrations')) {
    assert.match(text,/py\.status::text status/);
    assert.match(text,/r\.status::text status/);
    assert.match(text,/NULL::text notes/);
    assert.match(text,/'Event'::text kind/);
    return{rows:[
     {id:'payment-1',receipt_number:'SRX-M-1',provider_reference:'sarex_member_ref',member_number:'GYM-000001',member_name:'Ada Member',plan_id:'plan-1',plan_name:'Standard Plan',amount_minor:2500000,currency:'NGN',method:'paystack',status:'successful',paid_at:now,created_at:now,notes:null,kind:'Membership'},
     {id:'registration-1',receipt_number:'SRX-E-1',provider_reference:'sarex_event_ref',member_number:'GYM-000001',member_name:'Ada Member',plan_id:'event-1',plan_name:'Open Adventure',amount_minor:1500000,currency:'NGN',method:'paystack',status:'confirmed',paid_at:now,created_at:now,notes:null,kind:'Event'}
    ],rowCount:2};
   }
   if(text.includes('FROM trainers t JOIN users'))return{rows:[],rowCount:0};
   if(text.includes('FROM workout_plans'))return{rows:[],rowCount:0};
   if(text.includes('FROM member_progress'))return{rows:[],rowCount:0};
   if(text.includes('SELECT * FROM gym_settings'))return{rows:[{id:true,gym_name:'SAREX Fitness Clinic'}],rowCount:1};
   return{rows:[],rowCount:0};
  }
 };
 const app=createApp({db:bootstrapDb,config:{...config,SESSION_IDLE_TIMEOUT_HOURS:24,COOKIE_SAME_SITE:'lax',CSRF_SECRET:'test-bootstrap-secret-with-enough-entropy'}}),server=app.listen(0);
 try{
  await new Promise(resolve=>server.once('listening',resolve));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/v1/bootstrap`,{headers:{cookie:'session=session-token'}});
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.data.payments.length,2);
  assert.equal(body.data.payments[0].status,'Successful');
  assert.equal(body.data.payments[1].planName,'Event: Open Adventure');
  assert.ok(captured.some(text=>text.includes('py.status::text status')&&text.includes('r.status::text status')));
 }finally{await new Promise(resolve=>server.close(resolve));}
});
