const asCount = value => Number(value || 0);

export async function getDailyOperationsSummary(db) {
  const timezoneResult = await db.query(`
    SELECT COALESCE(
      (SELECT timezone FROM branches WHERE active ORDER BY created_at, id LIMIT 1),
      'Africa/Lagos'
    ) AS timezone
  `);
  const timezone = timezoneResult.rows[0]?.timezone || 'Africa/Lagos';
  const bounds = (await db.query(`
    SELECT
      (now() AT TIME ZONE $1)::date AS display_date,
      ((now() AT TIME ZONE $1)::date - 1) AS report_date,
      (((now() AT TIME ZONE $1)::date - 1)::timestamp AT TIME ZONE $1) AS start_at,
      ((now() AT TIME ZONE $1)::date::timestamp AT TIME ZONE $1) AS end_at
  `, [timezone])).rows[0];
  const { start_at: startAt, end_at: endAt, report_date: reportDate, display_date: displayDate } = bounds;

  const [attendance, denials, peak, payments, registrations, renewals, expirations] = await Promise.all([
    db.query(`SELECT count(*) FILTER (WHERE status='completed') successful_check_ins,
      count(DISTINCT member_id) FILTER (WHERE status='completed') unique_members,
      count(*) FILTER (WHERE status='denied') denied_attempts
      FROM attendance WHERE checked_in_at >= $1 AND checked_in_at < $2
        AND status IN ('completed','denied')`, [startAt, endAt]),
    db.query(`SELECT COALESCE(NULLIF(btrim(denial_reason),''),'Reason not recorded') reason, count(*) attempts
      FROM attendance WHERE status='denied' AND checked_in_at >= $1 AND checked_in_at < $2
      GROUP BY COALESCE(NULLIF(btrim(denial_reason),''),'Reason not recorded') ORDER BY attempts DESC, reason`, [startAt, endAt]),
    db.query(`SELECT to_char(date_trunc('hour',checked_in_at AT TIME ZONE $3),'HH24:00') period, count(*) visits
      FROM attendance WHERE status='completed' AND checked_in_at >= $1 AND checked_in_at < $2
      GROUP BY 1 ORDER BY visits DESC, period LIMIT 1`, [startAt, endAt, timezone]),
    db.query(`SELECT currency, method,
      count(*) successful_count,
      COALESCE(sum(amount_minor),0)::text successful_minor
      FROM payments WHERE status='successful' AND paid_at >= $1 AND paid_at < $2
      GROUP BY currency, method ORDER BY currency, method`, [startAt, endAt]),
    db.query(`SELECT count(*)::text total FROM members WHERE created_at >= $1 AND created_at < $2`, [startAt, endAt]),
    db.query(`SELECT count(DISTINCT p.id)::text total FROM payments p
      WHERE p.status='successful' AND p.subscription_id IS NOT NULL AND p.paid_at >= $1 AND p.paid_at < $2
        AND EXISTS (SELECT 1 FROM payments previous WHERE previous.member_id=p.member_id
          AND previous.status='successful' AND previous.subscription_id IS NOT NULL
          AND previous.paid_at < p.paid_at)`, [startAt, endAt]),
    db.query(`SELECT count(*)::text total FROM subscriptions
      WHERE status='expired' AND ends_at >= $1 AND ends_at < $2`, [startAt, endAt]),
  ]);

  const currencyMap = new Map();
  for (const row of payments.rows) {
    const currency = String(row.currency || 'NGN').trim();
    const item = currencyMap.get(currency) || { currency, successfulPaymentCount: 0, revenueMinor: '0', methods: [] };
    const successfulCount = asCount(row.successful_count);
    item.successfulPaymentCount += successfulCount;
    item.revenueMinor = (BigInt(item.revenueMinor) + BigInt(row.successful_minor || 0)).toString();
    if (successfulCount) item.methods.push({ method: row.method, paymentCount: successfulCount, amountMinor: String(row.successful_minor || '0') });
    currencyMap.set(currency, item);
  }

  return {
    reportDate: typeof reportDate === 'string' ? reportDate : reportDate.toISOString().slice(0, 10),
    displayDate: typeof displayDate === 'string' ? displayDate : displayDate.toISOString().slice(0, 10),
    timezone,
    interval: { start: startAt, endExclusive: endAt },
    attendance: {
      successfulCheckIns: asCount(attendance.rows[0]?.successful_check_ins),
      uniqueMembers: asCount(attendance.rows[0]?.unique_members),
      deniedAttempts: asCount(attendance.rows[0]?.denied_attempts),
      denialsByReason: denials.rows.map(row => ({ reason: row.reason, attempts: asCount(row.attempts) })),
      peakPeriod: peak.rows[0] ? { hour: peak.rows[0].period, checkIns: asCount(peak.rows[0].visits) } : null,
    },
    revenue: { currencies: [...currencyMap.values()] },
    memberships: {
      newMembers: asCount(registrations.rows[0]?.total),
      paidRenewals: asCount(renewals.rows[0]?.total),
      expiredMemberships: asCount(expirations.rows[0]?.total),
    },
  };
}

export async function getSummaryPresentation(db, userId, reopen = false) {
  const summary = await getDailyOperationsSummary(db);
  const result = await db.query(`
    INSERT INTO daily_operations_summary_views(user_id, display_date, presented_at)
    SELECT $1, $2::date, now()
    ON CONFLICT (user_id, display_date) DO NOTHING
    RETURNING dismissed_at
  `, [userId, summary.displayDate]);
  const state = result.rowCount
    ? { dismissedAt: null }
    : (await db.query(`SELECT dismissed_at FROM daily_operations_summary_views
        WHERE user_id=$1 AND display_date=$2::date`, [userId, summary.displayDate])).rows[0] || { dismissed_at: null };
  const dismissedAt = state.dismissedAt ?? state.dismissed_at ?? null;
  return { summary, shouldDisplay: Boolean(reopen || !dismissedAt), dismissed: Boolean(dismissedAt) };
}

export async function dismissDailyOperationsSummary(db, userId) {
  await db.query(`INSERT INTO daily_operations_summary_views(user_id,display_date,presented_at,dismissed_at)
    SELECT $1,(now() AT TIME ZONE COALESCE((SELECT timezone FROM branches WHERE active ORDER BY created_at,id LIMIT 1),'Africa/Lagos'))::date,now(),now()
    ON CONFLICT (user_id,display_date) DO UPDATE SET dismissed_at=COALESCE(daily_operations_summary_views.dismissed_at,now())`, [userId]);
}
