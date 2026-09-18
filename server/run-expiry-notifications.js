import 'dotenv/config';
import { loadConfig } from './config.js';
import { createDatabase } from './db.js';
import { runExpiryNotificationsJob } from './jobs.js';

const config=loadConfig();
const db=createDatabase(config.DATABASE_URL,{sslMode:config.DATABASE_SSL_MODE,ca:config.DATABASE_CA_CERT,max:Math.min(config.DATABASE_POOL_MAX,2)});
try {
  const result=await runExpiryNotificationsJob({db,config,requestId:'cli'});
  await db.query("DELETE FROM rate_limit_windows WHERE window_start < now()-interval '2 days'");
  console.log(JSON.stringify({ok:true,job:result.job,created:result.created,skipped:result.skipped,emailSent:result.emailSent,emailFailed:result.emailFailed}));
} catch(error) {
  console.error(JSON.stringify({level:'error',event:'expiry_job_failed',message:error instanceof Error?error.message:'Unknown failure'}));
  process.exitCode=1;
} finally { await db.close(); }
