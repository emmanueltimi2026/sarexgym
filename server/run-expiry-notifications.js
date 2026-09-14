import 'dotenv/config';
import { loadConfig } from './config.js';
import { createDatabase } from './db.js';
import { createExpiryNotifications } from './expiry-notifications.js';

const timestamp=()=>new Date().toISOString();
const config=loadConfig();
const db=createDatabase(config.DATABASE_URL,{sslMode:config.DATABASE_SSL_MODE,ca:config.DATABASE_CA_CERT,max:Math.min(config.DATABASE_POOL_MAX,2)});
console.log(JSON.stringify({timestamp:timestamp(),level:'info',event:'expiry_job_started'}));
try {
  const result=await createExpiryNotifications(db,config);
  await db.query("DELETE FROM rate_limit_windows WHERE window_start < now()-interval '2 days'");
  console.log(JSON.stringify({timestamp:timestamp(),level:'info',event:'expiry_job_completed',notificationsCreated:result.created,emailSent:result.emailSent,emailFailed:result.emailFailed}));
} catch(error) {
  console.error(JSON.stringify({timestamp:timestamp(),level:'error',event:'expiry_job_failed',message:error instanceof Error?error.message:'Unknown failure'}));
  process.exitCode=1;
} finally { await db.close(); }
