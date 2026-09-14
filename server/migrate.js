import 'dotenv/config';
import fs from 'node:fs/promises';
import { createDatabase } from './db.js';
import { loadConfig } from './config.js';
const config=loadConfig(); const db=createDatabase(config.DATABASE_URL,{sslMode:config.DATABASE_SSL_MODE,max:config.DATABASE_POOL_MAX});
try { await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  for(const name of (await fs.readdir(new URL('./migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()){
    const exists=await db.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name]); if(exists.rowCount) continue;
    const sql=await fs.readFile(new URL(`./migrations/${name}`,import.meta.url),'utf8');
    await db.transaction(async c=>{await c.query(sql);await c.query('INSERT INTO schema_migrations(name) VALUES($1)',[name])}); console.log(`Applied ${name}`);
  }
} finally { await db.close(); }

