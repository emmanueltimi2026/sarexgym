import 'dotenv/config';
import { z } from 'zod';
import { createDatabase } from './db.js';
import { loadConfig } from './config.js';
import { hashPassword } from './security.js';
const input=z.object({ADMIN_EMAIL:z.string().email(),ADMIN_PASSWORD:z.string().min(14).max(200),ADMIN_NAME:z.string().min(2).default('System Administrator')}).parse(process.env);
const config=loadConfig(); const db=createDatabase(config.DATABASE_URL,{sslMode:config.DATABASE_SSL_MODE,max:config.DATABASE_POOL_MAX});
try {
 const passwordHash=await hashPassword(input.ADMIN_PASSWORD);
 await db.transaction(async c=>{
   const user=await c.query(`INSERT INTO users(email,password_hash,status,email_verified_at) VALUES(lower($1),$2,'active',now()) ON CONFLICT((lower(email))) DO NOTHING RETURNING id`,[input.ADMIN_EMAIL,passwordHash]);
   if(!user.rowCount) throw new Error('Administrator email already exists; bootstrap does not overwrite credentials');
   await c.query(`INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE code='admin'`,[user.rows[0].id]);
   await c.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,new_values) VALUES($1,'user.bootstrap_admin','user',$1,$2)`,[user.rows[0].id,JSON.stringify({email:input.ADMIN_EMAIL,name:input.ADMIN_NAME})]);
 });
 console.log('Administrator created. Remove ADMIN_PASSWORD from the environment.');
} finally { await db.close(); }

