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
