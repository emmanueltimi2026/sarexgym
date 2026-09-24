import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

const planId = 'f73631f5-81fb-468c-9f37-9ac3d2d535e3';
const config = { NODE_ENV:'test', APP_ORIGIN:'http://localhost:3000', SESSION_COOKIE_NAME:'session', SESSION_TTL_HOURS:1, SESSION_IDLE_TIMEOUT_HOURS:24, COOKIE_SAME_SITE:'lax', CSRF_SECRET:'test-workout-edit-secret-with-entropy', TRUST_PROXY:'false', secureCookies:false };

test('workout edits cannot reassign a member or reset omitted program fields', async () => {
  const updates = [];
  const query = async (sql, params = []) => {
    if (sql.includes('FROM sessions s')) return { rows:[{session_id:'session-1',id:'trainer-user',email:'trainer@sarex.test',status:'active',permissions:['workouts.create'],roles:['trainer']}],rowCount:1 };
    if (sql.startsWith('SELECT id,status,days_per_week FROM workout_plans')) return { rows:[{id:planId,status:'active',days_per_week:4}],rowCount:1 };
    if (sql.startsWith('UPDATE workout_plans SET')) { updates.push({sql,params}); return {rows:[],rowCount:1}; }
    return {rows:[],rowCount:0};
  };
  const server = createApp({db:{query,transaction:work=>work({query})},config}).listen(0);
  try {
    await new Promise(resolve => server.once('listening',resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const headers = {cookie:'session=test-token',origin:config.APP_ORIGIN};
    const csrf = (await (await fetch(`${base}/api/v1/csrf`,{headers})).json()).csrfToken;
    const patch = body => fetch(`${base}/api/v1/workouts/${planId}`,{method:'PATCH',headers:{...headers,'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify(body)});
    assert.equal((await patch({memberId:'7f07e15c-82ae-4cef-93b4-029916326130'})).status,400);
    assert.equal((await patch({title:'Updated program'})).status,204);
    assert.equal(updates.length,1);
    assert.deepEqual(updates[0].params,['Updated program',planId]);
    assert.doesNotMatch(updates[0].sql,/member_id|days_per_week|routine/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('completing a trainer-owned program is repeat-safe', async () => {
  let status = 'active';
  let writes = 0;
  const query = async sql => {
    if (sql.includes('FROM sessions s')) return {rows:[{session_id:'session-1',id:'trainer-user',email:'trainer@sarex.test',status:'active',permissions:['workouts.create'],roles:['trainer']}],rowCount:1};
    if (sql.startsWith('SELECT id,status FROM workout_plans')) return {rows:[{id:planId,status}],rowCount:1};
    if (sql.startsWith('UPDATE workout_plans SET status=')) {status='completed';writes++;return {rows:[],rowCount:1};}
    return {rows:[],rowCount:0};
  };
  const server = createApp({db:{query,transaction:work=>work({query})},config}).listen(0);
  try {
    await new Promise(resolve => server.once('listening',resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const headers = {cookie:'session=test-token',origin:config.APP_ORIGIN};
    const csrf = (await (await fetch(`${base}/api/v1/csrf`,{headers})).json()).csrfToken;
    const complete = () => fetch(`${base}/api/v1/workouts/${planId}/complete`,{method:'POST',headers:{...headers,'x-csrf-token':csrf}});
    const first = await complete();
    assert.equal(first.status,200);
    assert.equal((await first.json()).data.alreadyCompleted,false);
    const repeat = await complete();
    assert.equal(repeat.status,200);
    assert.equal((await repeat.json()).data.alreadyCompleted,true);
    assert.equal(writes,1);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
