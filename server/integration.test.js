import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import { createDatabase } from './db.js';
import { sha256 } from './security.js';

const url=process.env.TEST_DATABASE_URL;
const origin='http://localhost:3000';
const config={NODE_ENV:'test',APP_ORIGIN:origin,FRONTEND_URL:origin,SESSION_COOKIE_NAME:'session',SESSION_TTL_HOURS:1,SESSION_IDLE_TIMEOUT_HOURS:1,PAYSTACK_SECRET_KEY:'test-secret-key',TRUST_PROXY:'false',secureCookies:false,COOKIE_SAME_SITE:'lax',CSRF_SECRET:'integration-csrf-secret-with-more-than-32-characters'};
const cookieFrom=response=>(response.headers.get('set-cookie')||'').split(';')[0];
const rawCookie=cookie=>decodeURIComponent(cookie.slice(cookie.indexOf('=')+1));

test('PostgreSQL authentication lifecycle integration',{skip:!url},async()=>{
 const db=createDatabase(url),server=createApp({db,config}).listen(0);await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`,email=`integration-${Date.now()}@sarex.test`,password='Integration-Test-2026!';
 const login=()=>fetch(base+'/api/v1/auth/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email,password})});
 const session=cookie=>fetch(base+'/api/v1/session',{headers:{cookie,origin}});
 try {
  const register=await fetch(base+'/api/v1/auth/register',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({firstName:'Integration',lastName:'Member',email,phone:'+2348000000000',password})});
  assert.equal(register.status,201);assert.match(register.headers.get('set-cookie')||'',/HttpOnly/i);
  let response=await login();assert.equal(response.status,200);let cookie=cookieFrom(response);assert.deepEqual((await response.json()).user.roles,['member']);assert.equal((await session(cookie)).status,200);

  await db.query('UPDATE sessions SET revoked_at=now() WHERE token_hash=$1',[sha256(rawCookie(cookie))]);assert.equal((await session(cookie)).status,401);
  response=await login();cookie=cookieFrom(response);await db.query("UPDATE sessions SET expires_at=now()-interval '1 minute' WHERE token_hash=$1",[sha256(rawCookie(cookie))]);assert.equal((await session(cookie)).status,401);
  response=await login();cookie=cookieFrom(response);await db.query("UPDATE users SET status='suspended' WHERE email=$1",[email]);assert.equal((await session(cookie)).status,401);await db.query("UPDATE users SET status='active' WHERE email=$1",[email]);

  response=await login();cookie=cookieFrom(response);const csrf=await fetch(base+'/api/v1/csrf',{headers:{cookie,origin}}),token=(await csrf.json()).csrfToken;
  assert.equal((await fetch(base+'/api/v1/auth/logout',{method:'POST',headers:{cookie,origin}})).status,403);
  assert.equal((await fetch(base+'/api/v1/auth/logout',{method:'POST',headers:{cookie,origin,'x-csrf-token':token}})).status,204);assert.equal((await session(cookie)).status,401);
  await db.query("UPDATE users SET status='disabled' WHERE email=$1",[email]);assert.equal((await login()).status,401);
 } finally {
  await db.query('DELETE FROM members WHERE user_id=(SELECT id FROM users WHERE email=$1)',[email]);await db.query('DELETE FROM users WHERE email=$1',[email]);
  await new Promise(resolve=>server.close(resolve));await db.close();
 }
});
