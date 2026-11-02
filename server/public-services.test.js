import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApp } from './app.js';

const config={NODE_ENV:'test',APP_ORIGIN:'http://localhost:3000',SESSION_COOKIE_NAME:'session',SESSION_TTL_HOURS:1,SESSION_IDLE_TIMEOUT_HOURS:24,TRUST_PROXY:'false',secureCookies:false,COOKIE_SAME_SITE:'lax'};

test('public services endpoint returns active service content with homepage and Facilities descriptions',async()=>{
 const sqlCalls=[];
 const db={query:async sql=>{sqlCalls.push(sql);if(sql==='SELECT 1')return{rows:[{ok:1}],rowCount:1};if(sql.includes('FROM public_services'))return{rows:[{id:'service-1',category:'Recovery',title:'Massage',image_url:'/massage.webp',alt_text:'Massage treatment at the clinic',short_description:'Short homepage copy for massage.',full_description:'Full details about the massage service and how it supports recovery.',features:['Appointment-based sessions'],sort_order:2,active:true,updated_at:new Date('2026-11-02T10:00:00.000Z')}],rowCount:1};return{rows:[],rowCount:0}},transaction:async work=>work({query:async()=>({rows:[],rowCount:0})})};
 const server=createApp({db,config}).listen(0);
 try{
  await new Promise(resolve=>server.once('listening',resolve));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/v1/public/services`);
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(body.data[0],{id:'service-1',category:'Recovery',title:'Massage',imageUrl:'/massage.webp',altText:'Massage treatment at the clinic',shortDescription:'Short homepage copy for massage.',fullDescription:'Full details about the massage service and how it supports recovery.',features:['Appointment-based sessions'],sortOrder:2,active:true,updatedAt:'2026-11-02T10:00:00.000Z'});
  assert.match(sqlCalls.find(sql=>sql.includes('FROM public_services')),/WHERE active ORDER BY sort_order/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('service migration grants management to admins and seeds current public services',async()=>{
 const migration=await readFile(new URL('./migrations/027_public_services.sql',import.meta.url),'utf8');
 assert.match(migration,/short_description text NOT NULL/);
 assert.match(migration,/full_description text NOT NULL/);
 assert.match(migration,/alt_text text NOT NULL/);
 assert.match(migration,/WHERE r\.code = 'admin' AND p\.code = 'services\.manage'/);
 assert.match(migration,/Open gym floor/);
 assert.match(migration,/Pregnancy and after-birth fitness/);
 assert.equal((migration.match(/\),\n\('/g)||[]).length,5);
});
