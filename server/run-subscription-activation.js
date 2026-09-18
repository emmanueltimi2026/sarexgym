import 'dotenv/config';
import { loadConfig } from './config.js';
import { createDatabase } from './db.js';
import { runActivateSubscriptionsJob } from './jobs.js';

const config = loadConfig();
const db = createDatabase(config.DATABASE_URL, { sslMode: config.DATABASE_SSL_MODE, ca: config.DATABASE_CA_CERT, max: Math.min(config.DATABASE_POOL_MAX, 2) });
try {
  const result = await runActivateSubscriptionsJob({ db, config, requestId: 'cli' });
  console.log(JSON.stringify({ ok: true, job: result.job, activated: result.activated, expired: result.expired, skipped: result.skipped }));
} catch (error) {
  console.error(JSON.stringify({ level: 'error', event: 'activate_subscriptions_job_failed', message: error instanceof Error ? error.message : 'Unknown failure' }));
  process.exitCode = 1;
} finally {
  await db.close();
}
