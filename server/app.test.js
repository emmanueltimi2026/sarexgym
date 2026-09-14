import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

const config={NODE_ENV:'test',APP_ORIGIN:'http://localhost:3000',SESSION_COOKIE_NAME:'session',SESSION_TTL_HOURS:1,TRUST_PROXY:'false',secureCookies:false};
const db={query:async text=>({rows:text==='SELECT 1'?[{ok:1}]:[],rowCount:text==='SELECT 1'?1:0}),transaction:async work=>work({query:async()=>({rows:[],rowCount:0})})};
async function withServer(run){const server=createApp({db,config}).listen(0);try{await new Promise(r=>server.once('listening',r));return await run(`http://127.0.0.1:${server.address().port}`)}finally{await new Promise(r=>server.close(r))}}
test('health endpoints and security headers are available',()=>withServer(async base=>{const response=await fetch(base+'/health/ready');assert.equal(response.status,200);assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(await response.json(),{status:'ready'})}));
test('protected endpoint fails closed without session',()=>withServer(async base=>{const response=await fetch(base+'/api/v1/session');assert.equal(response.status,401);assert.equal((await response.json()).error.code,'UNAUTHENTICATED')}));
test('login validates input and never assigns a role from email text',()=>withServer(async base=>{const response=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{'content-type':'application/json','origin':config.APP_ORIGIN},body:JSON.stringify({email:'admin@example.com',password:'short'})});assert.equal(response.status,400);assert.equal((await response.json()).error.code,'VALIDATION_ERROR')}));
test('unsafe requests reject an unrelated browser origin',()=>withServer(async base=>{const response=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{'content-type':'application/json','origin':'https://evil.example'},body:JSON.stringify({email:'admin@example.com',password:'long-enough-password'})});assert.equal(response.status,403)}));
