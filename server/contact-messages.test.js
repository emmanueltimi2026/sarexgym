import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

const config={NODE_ENV:'test',APP_ORIGIN:'http://localhost:3000',SESSION_COOKIE_NAME:'session',SESSION_TTL_HOURS:1,SESSION_IDLE_TIMEOUT_HOURS:24,TRUST_PROXY:'false',secureCookies:false,COOKIE_SAME_SITE:'lax'};

test('public contact submissions are saved and notify every active admin and staff user',async()=>{
 const notifications=[];
 const saved={id:'message-1',name:'Casey Member',email:'casey@example.com',phone:'+2348000000000',message:'Please tell me about membership plans.',status:'new',received_at:new Date('2026-11-02T10:00:00Z'),resolved_at:null};
 const db={
  query:async sql=>sql==='SELECT 1'?{rows:[{ok:1}],rowCount:1}:{rows:[],rowCount:0},
  transaction:async work=>work({query:async(sql,params=[])=>{
   if(sql.startsWith('INSERT INTO contact_messages'))return{rows:[saved],rowCount:1};
   if(sql.includes("WHERE r.code IN ('admin','staff')"))return{rows:[{id:'admin-user'},{id:'staff-user'}],rowCount:2};
   if(sql.startsWith('INSERT INTO notifications')){notifications.push({recipient:params[0],title:'New website enquiry',message:params[1],metadata:params[2]});return{rows:[],rowCount:1};}
   return{rows:[],rowCount:0};
  }})
 };
 const server=createApp({db,config}).listen(0);
 try{
  await new Promise(resolve=>server.once('listening',resolve));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/v1/public/contact-messages`,{method:'POST',headers:{origin:config.APP_ORIGIN,'content-type':'application/json'},body:JSON.stringify({name:saved.name,email:saved.email,phone:saved.phone,message:saved.message})});
  const body=await response.json();
  assert.equal(response.status,201);
  assert.equal(body.data.id,saved.id);
  assert.deepEqual(notifications.map(item=>item.recipient),['admin-user','staff-user']);
  assert.ok(notifications.every(item=>item.title==='New website enquiry'));
 }finally{await new Promise(resolve=>server.close(resolve));}
});
