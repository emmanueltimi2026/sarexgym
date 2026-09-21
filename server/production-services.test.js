import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

test('bootstrap payment feed includes Paystack event payments and normalizes methods',async()=>{
 const routes=await readFile(new URL('./routes.js',import.meta.url),'utf8');
 assert.match(routes,/UNION ALL\s+SELECT r\.id,r\.receipt_number,r\.provider_reference/s);
 assert.match(routes,/FROM event_registrations r\s+JOIN members m ON m\.id=r\.member_id\s+JOIN events e ON e\.id=r\.event_id/s);
 assert.match(routes,/r\.status='confirmed' AND r\.amount_minor>0/);
 assert.match(routes,/const paymentMethodLabel=method=>method==='paystack'\?'Paystack':method/);
});

test('membership checkout validates the queued subscription window before Paystack initialization',async()=>{
 const routes=await readFile(new URL('./routes.js',import.meta.url),'utf8');
 const ordersRoute=routes.slice(routes.indexOf("app.post('/api/v1/payments/orders'"),routes.indexOf("app.get('/api/v1/payments/confirm/:reference'"));
 assert.match(ordersRoute,/latestQueued=.*status IN \('active','scheduled','frozen'\).*ORDER BY ends_at DESC LIMIT 1 FOR UPDATE/s);
 assert.match(ordersRoute,/decideRenewalPeriod\(\{current,latestSamePlan,latestQueued,planId:plan\.id,durationDays:plan\.duration_days\}\)/);
 assert.ok(ordersRoute.indexOf('tstzrange(starts_at,ends_at') < ordersRoute.indexOf("fetch('https://api.paystack.co/transaction/initialize'"));
});

test('shared payment confirmation route dispatches event references to the event finalizer',async()=>{
 const routes=await readFile(new URL('./routes.js',import.meta.url),'utf8');
 const confirmRoute=routes.slice(routes.indexOf("app.get('/api/v1/payments/confirm/:reference'"),routes.indexOf("app.get('/api/v1/events'"));
 assert.match(confirmRoute,/findConfirmedEventPayment\(db,\{reference,memberId\}\)/);
 assert.match(confirmRoute,/reference\.startsWith\('sarex_event_'\)\|\|verified\.metadata\?\.kind==='event'/);
 assert.match(confirmRoute,/finalizePaystackEventPayment/);
 assert.match(confirmRoute,/finalizePaystackMembershipPayment/);
});

test('payment receipt stops polling on terminal backend errors',async()=>{
 const receipt=await readFile(new URL('../src/components/ui/PaymentReceipt.tsx',import.meta.url),'utf8');
 assert.match(receipt,/else if\(r\.status===202&&tries<40\)/);
 assert.match(receipt,/setError\(r\.status===202\?'':body\?\.error\?\.message/);
 assert.match(receipt,/Payment needs review/);
});

test('member and public event listings keep active multi-day events visible until the event ends',async()=>{
 const routes=await readFile(new URL('./routes.js',import.meta.url),'utf8');
 assert.match(routes,/public\/events'.*e\.status='published' AND e\.ends_at>now\(\)/s);
 assert.match(routes,/public\/events\/:id'.*e\.status='published' AND e\.ends_at>now\(\)/s);
 assert.match(routes,/app\.get\('\/api\/v1\/events'.*e\.status='published' AND e\.ends_at>now\(\)/s);
 assert.match(routes,/app\.get\('\/api\/v1\/events\/:id'.*e\.status='published' AND e\.ends_at>now\(\)/s);
 assert.doesNotMatch(routes,/e\.status='published' AND e\.starts_at>now\(\)/);
});

test('event registration uses a separate registration window',async()=>{
 const routes=await readFile(new URL('./routes.js',import.meta.url),'utf8');
 const registerRoute=routes.slice(routes.indexOf("app.post('/api/v1/events/:id/register'"),routes.indexOf("app.get('/api/v1/classes'"));
 assert.match(routes,/registrationStartsAt:z\.string\(\)\.datetime\(\)/);
 assert.match(routes,/registrationEndsAt:z\.string\(\)\.datetime\(\)/);
 assert.match(routes,/registration_starts_at/);
 assert.match(routes,/registration_ends_at/);
 assert.match(registerRoute,/registration_starts_at/);
 assert.match(registerRoute,/registration_ends_at/);
 assert.match(registerRoute,/EVENT_REGISTRATION_CLOSED/);
});

test('homepage renders active public events from the public events endpoint',async()=>{
 const home=await readFile(new URL('../src/pages/public/PublicHome.tsx',import.meta.url),'utf8');
 assert.match(home,/\/api\/v1\/public\/events/);
 assert.match(home,/public-events-preview/);
 assert.doesNotMatch(home,/events\.length > 0 &&/);
 assert.match(home,/No upcoming event yet/);
 assert.match(home,/navigate\(`\/events\/\$\{event\.id\}`\)/);
 assert.match(home,/registration_starts_at/);
 assert.match(home,/registration_ends_at/);
});

test('editable number inputs keep text form state until submit',async()=>{
 const [events,plans]=await Promise.all([
  readFile(new URL('../src/pages/shared/EventManagement.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/pages/admin/AdminPlans.tsx',import.meta.url),'utf8')
 ]);
 assert.doesNotMatch(events,/Number\(e\.target\.value\)/);
 assert.match(events,/capacity:'40'/);
 assert.match(events,/price:'0'/);
 assert.match(events,/capacity:Number\(form\.capacity\)/);
 assert.match(events,/price:Number\(form\.price\)/);
 assert.doesNotMatch(plans,/price: Number\(e\.target\.value\)/);
 assert.doesNotMatch(plans,/durationDays: Number\(e\.target\.value\)/);
 assert.match(plans,/price: Number\(editingPlan\.price\)/);
 assert.match(plans,/durationDays: Number\(editingPlan\.durationDays\)/);
});
