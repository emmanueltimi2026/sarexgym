import { decideRenewalPeriod } from './subscriptions.js';

export function formatMembershipPaymentConfirmation(row) {
  if (!row) return null;
  return {
    confirmed: true,
    reference: row.reference,
    payment: {
      receipt_number: row.receipt_number,
      reference: row.reference,
      amount_minor: Number(row.amount_minor),
      membership_amount_minor: Number(row.membership_amount_minor || 0),
      registration_fee_minor: Number(row.registration_fee_minor || 0),
      currency: row.currency,
      issued_at: row.issued_at,
      item: row.item,
      member_name: row.member_name,
      kind: 'Membership'
    },
    subscription: {
      id: row.subscription_id,
      status: row.subscription_status,
      planId: row.plan_id,
      planName: row.item,
      startsAt: row.starts_at,
      endsAt: row.ends_at
    }
  };
}

export async function findSuccessfulMembershipPayment(db, { reference, memberId }) {
  const args = [reference];
  const memberFilter = memberId ? 'AND py.member_id=$2' : '';
  if (memberId) args.push(memberId);
  const row = (await db.query(`
    SELECT py.id payment_id,
           py.receipt_number,
           py.provider_reference reference,
           py.amount_minor,
           py.membership_amount_minor,
           py.registration_fee_minor,
           py.currency,
           py.paid_at issued_at,
           py.member_id,
           py.plan_id,
           py.subscription_id,
           s.status subscription_status,
           s.starts_at,
           s.ends_at,
           p.name item,
           concat(m.first_name,' ',m.last_name) member_name
    FROM payments py
    JOIN subscriptions s ON s.id=py.subscription_id
    JOIN membership_plans p ON p.id=py.plan_id
    JOIN members m ON m.id=py.member_id
    WHERE py.provider='paystack'
      AND py.provider_reference=$1
      AND py.status='successful'
      AND s.status IN ('active','scheduled')
      ${memberFilter}
  `, args)).rows[0];
  return row || null;
}

export async function finalizePaystackMembershipPayment(db, { reference, providerStatus, amount, currency, requestId, ip, memberId }) {
  const existing = await findSuccessfulMembershipPayment(db, { reference, memberId });
  if (existing) return { ...formatMembershipPaymentConfirmation(existing), idempotentReplay: true };

  const orderResult = await db.query(`
    SELECT o.*,p.duration_days,p.trainer_access,p.workout_plan_access
    FROM payment_orders o
    JOIN membership_plans p ON p.id=o.plan_id
    WHERE o.provider='paystack' AND o.provider_reference=$1
    FOR UPDATE
  `, [reference]);
  const order = orderResult.rows[0];
  if (!order || (memberId && order.member_id !== memberId) || providerStatus !== 'success' || Number(amount) !== Number(order.amount_minor) || currency !== order.currency) {
    throw Object.assign(new Error('Payment verification mismatch'), { status: 422, code: 'PAYMENT_MISMATCH' });
  }

  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`paystack:${reference}`]);
  const replay = await findSuccessfulMembershipPayment(db, { reference, memberId });
  if (replay) return { ...formatMembershipPaymentConfirmation(replay), idempotentReplay: true };

  const current = await db.query(`
    SELECT * FROM subscriptions
    WHERE member_id=$1 AND status='active' AND starts_at<=now() AND ends_at>now()
    ORDER BY ends_at DESC LIMIT 1 FOR UPDATE
  `, [order.member_id]);
  const latestSamePlan = await db.query(`
    SELECT * FROM subscriptions
    WHERE member_id=$1 AND plan_id=$2 AND status IN ('active','scheduled') AND ends_at>now()
    ORDER BY ends_at DESC LIMIT 1 FOR UPDATE
  `, [order.member_id, order.plan_id]);
  const renewal = decideRenewalPeriod({
    current: current.rows[0],
    latestSamePlan: latestSamePlan.rows[0],
    planId: order.plan_id,
    durationDays: order.duration_days
  });
  const membershipAmount = Number(order.membership_amount_minor || order.amount_minor);
  const registrationFee = Number(order.registration_fee_minor || 0);
  const overlap = (await db.query(`
    SELECT id
    FROM subscriptions
    WHERE member_id=$1
      AND status IN ('active','scheduled','frozen')
      AND tstzrange(starts_at,ends_at,'[)') && tstzrange($2::timestamptz,$3::timestamptz,'[)')
    LIMIT 1
  `, [order.member_id, renewal.startsAt, renewal.endsAt])).rows[0];
  if (overlap) throw Object.assign(new Error('This member already has a subscription scheduled for that period'), { status: 409, code: 'SUBSCRIPTION_OVERLAP' });

  const subscription = await db.query(`
    INSERT INTO subscriptions(member_id,plan_id,starts_at,ends_at,status,amount_minor,currency)
    VALUES($1,$2,$3,$4,$5,$6,$7)
    RETURNING id,status,starts_at,ends_at
  `, [order.member_id, order.plan_id, renewal.startsAt, renewal.endsAt, renewal.status, membershipAmount, order.currency]);
  const payment = await db.query(`
    INSERT INTO payments(order_id,member_id,subscription_id,plan_id,amount_minor,membership_amount_minor,registration_fee_minor,currency,method,provider,provider_reference,status,paid_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,'paystack','paystack',$9,'successful',now())
    RETURNING id,receipt_number,provider_reference,paid_at
  `, [order.id, order.member_id, subscription.rows[0].id, order.plan_id, order.amount_minor, membershipAmount, registrationFee, order.currency, reference]);
  if (registrationFee > 0) await db.query('UPDATE members SET registration_fee_paid_at=COALESCE(registration_fee_paid_at,now()) WHERE id=$1', [order.member_id]);
  if (order.trainer_access) {
    await db.query(`
      INSERT INTO notifications(recipient_user_id,type,title,message,metadata)
      SELECT u.id,'trainer_assignment_required','Trainer assignment requested',$1,$2
      FROM users u
      JOIN user_roles ur ON ur.user_id=u.id
      JOIN roles r ON r.id=ur.role_id
      WHERE r.code='admin'
    `, ['A paid membership with trainer access needs a trainer assignment.', JSON.stringify({ memberId: order.member_id, subscriptionId: subscription.rows[0].id })]);
  }
  await db.query(`UPDATE payment_orders SET status='successful' WHERE id=$1`, [order.id]);
  await db.query(`
    INSERT INTO audit_logs(action,entity_type,entity_id,new_values,request_id,ip)
    VALUES('payment.verified','payment_order',$1,$2,$3,$4)
  `, [order.id, JSON.stringify({ provider: 'paystack', reference, subscriptionStatus: renewal.status, planChange: renewal.planChange }), requestId, ip]);

  const confirmed = await findSuccessfulMembershipPayment(db, { reference, memberId });
  return {
    ...formatMembershipPaymentConfirmation(confirmed),
    idempotentReplay: false,
    paymentId: payment.rows[0].id,
    subscriptionStatus: subscription.rows[0].status
  };
}

export async function verifyPaystackTransaction(config, reference) {
  if (!config.PAYSTACK_SECRET_KEY) throw Object.assign(new Error('Online payments are not configured'), { status: 503, code: 'PAYMENTS_UNAVAILABLE' });
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}` }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.status) throw Object.assign(new Error('Payment provider could not verify this transaction'), { status: 502, code: 'PAYMENT_PROVIDER_ERROR' });
  return {
    status: body.data?.status,
    amount: body.data?.amount,
    currency: body.data?.currency
  };
}
