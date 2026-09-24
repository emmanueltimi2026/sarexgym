import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

const memberIds = ['7f07e15c-82ae-4cef-93b4-029916326130','94ec9a43-807f-46ba-bedd-b47224b42fad'];
const config = {NODE_ENV:'test',APP_ORIGIN:'http://localhost:3000',SESSION_COOKIE_NAME:'session',SESSION_TTL_HOURS:1,SESSION_IDLE_TIMEOUT_HOURS:24,COOKIE_SAME_SITE:'lax',CSRF_SECRET:'test-workout-create-secret-with-entropy',TRUST_PROXY:'false',secureCookies:false};

test('creating assigned workout plans notifies each member in the same transaction', async () => {
  const notifications = [];
  const audits = [];
  let transactions = 0;
  let inTransaction = false;
  const notificationTransactions = [];
  const query = async (sql, params = []) => {
    if (sql.includes('FROM sessions s')) return {rows:[{session_id:'session-1',id:'trainer-user',email:'trainer@sarex.test',status:'active',permissions:['workouts.create'],roles:['trainer']}],rowCount:1};
    if (sql.startsWith('SELECT id FROM trainers WHERE')) return {rows:[{id:'trainer-1'}],rowCount:1};
    if (sql.startsWith('SELECT DISTINCT a.member_id')) return {rows:memberIds.map(member_id=>({member_id})),rowCount:2};
    if (sql.startsWith('INSERT INTO workout_plans')) return {rows:memberIds.map((member_id,index)=>({id:`00000000-0000-4000-8000-00000000000${index}`,member_id})),rowCount:2};
    if (sql.startsWith('INSERT INTO notifications')) {notifications.push(params);notificationTransactions.push(inTransaction);return {rows:[],rowCount:1};}
    if (sql.startsWith('INSERT INTO audit_logs')) {audits.push(params);return {rows:[],rowCount:1};}
    return {rows:[],rowCount:0};
  };
  const server = createApp({db:{query,transaction:async work=>{transactions++;inTransaction=true;try{return await work({query})}finally{inTransaction=false}}},config}).listen(0);
  try {
    await new Promise(resolve=>server.once('listening',resolve));
    const base=`http://127.0.0.1:${server.address().port}`;
    const headers={cookie:'session=test-token',origin:config.APP_ORIGIN};
    const csrf=(await(await fetch(`${base}/api/v1/csrf`,{headers})).json()).csrfToken;
    const response=await fetch(`${base}/api/v1/workouts`,{method:'POST',headers:{...headers,'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify({title:'Strength',description:'Two-day plan',difficulty:'Beginner',daysPerWeek:1,memberIds,routine:[{dayName:'Day 1',focus:'Full body',exercises:[{name:'Squat',sets:3,reps:'8',restSeconds:60}]}]})});
    assert.equal(response.status,201);
    assert.equal((await response.json()).data.count,2);
    assert.ok(transactions>=1);
    assert.deepEqual(notifications.map(params=>params[0]),memberIds);
    assert.deepEqual(notificationTransactions,[true,true]);
    assert.equal(audits.filter(params=>params[1]==='workout.created').length,2);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
