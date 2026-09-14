import 'dotenv/config';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDatabase } from './db.js';
const config=loadConfig(); const db=createDatabase(config.DATABASE_URL,{sslMode:config.DATABASE_SSL_MODE,ca:config.DATABASE_CA_CERT,max:config.DATABASE_POOL_MAX});
await db.query('SELECT 1');
const app=createApp({db,config});
const server=app.listen(config.PORT,'0.0.0.0',()=>console.log(JSON.stringify({timestamp:new Date().toISOString(),level:'info',event:'server_started',port:config.PORT})));
const shutdown=signal=>{console.log(JSON.stringify({level:'info',event:'shutdown',signal}));server.close(async()=>{await db.close();process.exit(0)});setTimeout(()=>process.exit(1),10_000).unref()};
process.on('SIGTERM',()=>shutdown('SIGTERM')); process.on('SIGINT',()=>shutdown('SIGINT'));

