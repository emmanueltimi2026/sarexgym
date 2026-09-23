export function decideRenewalPeriod({ current, latestSamePlan, latestQueued, planId, durationDays, now = new Date() }) {
  const hasCurrent = Boolean(current);
  const currentEnds = current ? new Date(current.ends_at) : null;
  const latestSameEnds = latestSamePlan ? new Date(latestSamePlan.ends_at) : null;
  const latestQueuedEnds = latestQueued ? new Date(latestQueued.ends_at) : null;
  const isPlanChange = Boolean(current && current.plan_id !== planId);
  const startsAt = latestQueuedEnds && latestQueuedEnds > now
    ? latestQueuedEnds
    : latestSameEnds && latestSameEnds > now
      ? latestSameEnds
      : currentEnds && currentEnds > now
        ? currentEnds
        : now;
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + Number(durationDays));
  return {
    startsAt,
    endsAt,
    status: startsAt > now ? 'scheduled' : 'active',
    planChange: isPlanChange,
    preservesCurrent: hasCurrent && startsAt >= currentEnds
  };
}

export async function createPaidSubscriptionPeriod(db, { memberId, planId, startsAt, endsAt, status, amountMinor, currency, isFirstPurchase }) {
  if (isFirstPurchase) {
    const pending = (await db.query(`
      SELECT s.id FROM subscriptions s
      WHERE s.member_id=$1 AND s.status='pending'
        AND NOT EXISTS(SELECT 1 FROM payments py WHERE py.subscription_id=s.id)
      ORDER BY s.created_at,s.id LIMIT 1 FOR UPDATE OF s
    `, [memberId])).rows[0];
    if (pending) {
      return (await db.query(`
        UPDATE subscriptions SET plan_id=$2,starts_at=$3,ends_at=$4,status=$5,amount_minor=$6,currency=$7,updated_at=now()
        WHERE id=$1 AND status='pending'
        RETURNING id,status,starts_at,ends_at
      `, [pending.id, planId, startsAt, endsAt, status, amountMinor, currency])).rows[0];
    }
  }
  return (await db.query(`
    INSERT INTO subscriptions(member_id,plan_id,starts_at,ends_at,status,amount_minor,currency)
    VALUES($1,$2,$3,$4,$5,$6,$7)
    RETURNING id,status,starts_at,ends_at
  `, [memberId, planId, startsAt, endsAt, status, amountMinor, currency])).rows[0];
}

export async function activateDueScheduledSubscriptions(db) {
  const run = async c => {
    const nowResult = await c.query('SELECT now() now');
    const now = nowResult.rows[0]?.now || new Date();
    const expired = await c.query("UPDATE subscriptions SET status='expired',updated_at=now() WHERE status='active' AND ends_at<=now() RETURNING member_id");
    const due = await c.query("SELECT DISTINCT member_id FROM subscriptions WHERE status='scheduled' AND starts_at<=now() ORDER BY member_id");
    let activated = 0, skipped = 0;
    for (const row of due.rows) {
      await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`subscription:${row.member_id}`]);
      const active = (await c.query("SELECT id,ends_at FROM subscriptions WHERE member_id=$1 AND status='active' ORDER BY ends_at DESC LIMIT 1 FOR UPDATE", [row.member_id])).rows[0];
      if (active && new Date(active.ends_at) > now) { skipped++; continue; }
      if (active) await c.query("UPDATE subscriptions SET status='expired',updated_at=now() WHERE id=$1", [active.id]);
      const next = (await c.query("SELECT id FROM subscriptions WHERE member_id=$1 AND status='scheduled' AND starts_at<=now() ORDER BY starts_at,created_at LIMIT 1 FOR UPDATE", [row.member_id])).rows[0];
      if (!next) { skipped++; continue; }
      await c.query("UPDATE subscriptions SET status='active',updated_at=now() WHERE id=$1", [next.id]);
      await c.query("UPDATE subscriptions SET status='expired',updated_at=now() WHERE member_id=$1 AND id<>$2 AND status='active'", [row.member_id, next.id]);
      activated++;
    }
    return { activated, expired: expired.rowCount || 0, scanned: due.rowCount || due.rows.length, skipped };
  };
  return typeof db.transaction === 'function' ? db.transaction(run, 'SERIALIZABLE') : run(db);
}
