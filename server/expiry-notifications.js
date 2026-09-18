export async function createExpiryNotifications(db, config = {}) {
  const scanned = await db.query(`
    SELECT count(*) count
    FROM subscriptions s
    WHERE s.status='active' AND (s.ends_at::date-current_date) IN (7,1)
  `);
  const result = await db.query(`
    INSERT INTO notifications(recipient_user_id,type,title,message,metadata)
    SELECT m.user_id,
           'subscription_expiry',
           CASE WHEN (s.ends_at::date-current_date)=1 THEN 'Membership expires tomorrow' ELSE 'Membership expires in 7 days' END,
           'Your '||p.name||' membership expires on '||to_char(s.ends_at,'DD Mon YYYY')||'. Renew now to keep uninterrupted access.',
           jsonb_build_object('subscriptionId',s.id,'daysRemaining',(s.ends_at::date-current_date),'expiresAt',s.ends_at)
    FROM subscriptions s
    JOIN members m ON m.id=s.member_id
    JOIN membership_plans p ON p.id=s.plan_id
    WHERE s.status='active' AND (s.ends_at::date-current_date) IN (7,1)
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.recipient_user_id=m.user_id AND n.type='subscription_expiry'
          AND n.metadata->>'subscriptionId'=s.id::text
          AND n.metadata->>'daysRemaining'=(s.ends_at::date-current_date)::text
      )
    RETURNING id
  `);

  let emailSent=0,emailFailed=0;
  if (config.RESEND_API_KEY && config.EMAIL_FROM) {
    const pending = await db.query(`
      SELECT n.id,n.title,n.message,u.email
      FROM notifications n JOIN users u ON u.id=n.recipient_user_id
      WHERE n.type='subscription_expiry'
        AND (n.metadata->>'daysRemaining')::int IN (7,1)
        AND n.metadata->>'emailSentAt' IS NULL
        AND n.metadata->>'emailAttemptedAt' IS NULL
        AND n.created_at > now()-interval '8 days'
      ORDER BY n.created_at LIMIT 100
    `);
    for (const notice of pending.rows) {
      const claim = await db.query(`
        UPDATE notifications
        SET metadata=metadata||jsonb_build_object('emailAttemptedAt',now())
        WHERE id=$1
          AND metadata->>'emailSentAt' IS NULL
          AND metadata->>'emailAttemptedAt' IS NULL
        RETURNING id
      `, [notice.id]);
      if (!claim.rowCount) continue;
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: config.EMAIL_FROM, to: [notice.email], subject: notice.title, html: `<div style="font-family:Arial,sans-serif"><h2>${notice.title}</h2><p>${notice.message}</p><p><a href="${config.FRONTEND_URL}/member/membership">Review or renew membership</a></p></div>` })
        });
        if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
        await db.query("UPDATE notifications SET metadata=metadata||jsonb_build_object('emailSentAt',now()) WHERE id=$1", [notice.id]);
        emailSent++;
      } catch (error) {
        emailFailed++;
        await db.query("UPDATE notifications SET metadata=metadata||jsonb_build_object('emailFailedAt',now()) WHERE id=$1", [notice.id]);
        console.error(JSON.stringify({ level:'error', event:'expiry_email_failed', notificationId:notice.id, message:error.message }));
      }
    }
  }
  const scannedCount = Number(scanned.rows?.[0]?.count || 0);
  return {scanned:scannedCount,created:result.rowCount,skipped:Math.max(0,scannedCount-result.rowCount),emailSent,emailFailed};
}

