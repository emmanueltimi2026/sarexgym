import { timingSafeEqualText } from './security.js';
import { activateDueScheduledSubscriptions } from './subscriptions.js';
import { createExpiryNotifications } from './expiry-notifications.js';

export const JOBS = {
  activateSubscriptions: 'activate-subscriptions',
  expiryNotifications: 'expiry-notifications'
};

const lockKey = job => `sarex:job:${job}`;
const nowIso = () => new Date().toISOString();

export function requireCronSecret(req, res, next) {
  const expected = req.app.locals.config.CRON_SECRET;
  if (!expected) return res.status(503).json({ ok:false, error:{ code:'CRON_SECRET_NOT_CONFIGURED', message:'Internal scheduler is not configured', requestId:req.requestId } });
  const header = req.get('authorization') || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!supplied || !timingSafeEqualText(supplied, expected)) {
    return res.status(401).json({ ok:false, error:{ code:'INVALID_CRON_SECRET', message:'Invalid scheduler authorization', requestId:req.requestId } });
  }
  next();
}

export async function runJobWithLock({ db, config, job, requestId = 'cli', runner }) {
  const startedAt = Date.now();
  const logBase = { job, requestId };
  console.log(JSON.stringify({ timestamp:nowIso(), level:'info', event:'job_started', ...logBase }));
  try {
    const result = await db.transaction(async c => {
      const lock = await c.query('SELECT pg_try_advisory_xact_lock(hashtext($1)) locked', [lockKey(job)]);
      if (!lock.rows[0]?.locked) return { ok:true, job, alreadyRunning:true, scanned:0, activated:0, created:0, skipped:1, failures:0 };
      return runner(c, config);
    }, 'READ COMMITTED');
    const durationMs = Date.now() - startedAt;
    console.log(JSON.stringify({
      timestamp:nowIso(),
      level:'info',
      event:'job_completed',
      ...logBase,
      durationMs,
      rowsScanned: result.scanned || 0,
      activated: result.activated || 0,
      created: result.created || 0,
      skipped: result.skipped || 0,
      failures: result.failures || result.emailFailed || 0,
      alreadyRunning: Boolean(result.alreadyRunning)
    }));
    return { ok:true, job, ...result, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(JSON.stringify({ timestamp:nowIso(), level:'error', event:'job_failed', ...logBase, durationMs, message:error instanceof Error ? error.message : 'Unknown failure' }));
    throw error;
  }
}

export const runActivateSubscriptionsJob = ({ db, config = {}, requestId }) =>
  runJobWithLock({
    db,
    config,
    job: JOBS.activateSubscriptions,
    requestId,
    runner: async c => {
      const result = await activateDueScheduledSubscriptions(c);
      return {
        ok:true,
        job: JOBS.activateSubscriptions,
        scanned: result.scanned || 0,
        activated: result.activated || 0,
        expired: result.expired || 0,
        skipped: result.skipped || 0,
        failures: 0
      };
    }
  });

export const runExpiryNotificationsJob = ({ db, config, requestId }) =>
  runJobWithLock({
    db,
    config,
    job: JOBS.expiryNotifications,
    requestId,
    runner: async c => {
      const result = await createExpiryNotifications(c, config);
      return {
        ok:true,
        job: JOBS.expiryNotifications,
        scanned: result.scanned || 0,
        created: result.created || 0,
        skipped: result.skipped || 0,
        emailSent: result.emailSent || 0,
        emailFailed: result.emailFailed || 0,
        failures: result.emailFailed || 0
      };
    }
  });

export async function runWithTimeout(work, timeoutMs = 25_000) {
  let timer;
  try {
    return await Promise.race([
      work(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error('Job request timed out'), { status:504, code:'JOB_TIMEOUT' })), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
