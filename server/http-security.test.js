import test from 'node:test';
import assert from 'node:assert/strict';
import { csrfTokenForRequest, requireCsrf, sessionCookieOptions } from './http-security.js';

const config={SESSION_COOKIE_NAME:'sarex_session',COOKIE_SAME_SITE:'none',secureCookies:true,FRONTEND_URL:'https://sarex.vercel.app',CSRF_SECRET:'test-secret-that-is-at-least-thirty-two-characters'};

test('temporary cross-site cookie is Secure, HttpOnly and SameSite=None',()=>{
 const expires=new Date(Date.now()+60_000),options=sessionCookieOptions(config,expires);
 assert.equal(options.httpOnly,true);assert.equal(options.secure,true);assert.equal(options.sameSite,'none');assert.equal(options.path,'/');assert.ok(options.maxAge>0);
});

test('state-changing request without CSRF token is rejected',()=>{
 const req={method:'POST',cookies:{sarex_session:'session-token'},get:name=>name==='origin'?config.FRONTEND_URL:undefined,requestId:'request'};
 let status,body;const res={status:value=>(status=value,res),json:value=>{body=value}};
 requireCsrf(config)(req,res,()=>assert.fail('request should not pass'));
 assert.equal(status,403);assert.equal(body.error.code,'CSRF_REJECTED');
});

test('valid session-bound CSRF token is accepted',()=>{
 const req={method:'PATCH',cookies:{sarex_session:'session-token'},get(name){if(name==='origin')return config.FRONTEND_URL;if(name==='x-csrf-token')return csrfTokenForRequest(this,config)},requestId:'request'};
 let passed=false;requireCsrf(config)(req,{},()=>{passed=true});assert.equal(passed,true);
});

test('safe GET does not require CSRF token',()=>{let passed=false;requireCsrf(config)({method:'GET'},{},()=>{passed=true});assert.equal(passed,true)});
