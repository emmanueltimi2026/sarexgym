export function formatEventPaymentConfirmation(row) {
  if (!row) return null;
  return {
    confirmed: true,
    reference: row.reference,
    payment: {
      receipt_number: row.receipt_number,
      reference: row.reference,
      amount_minor: Number(row.amount_minor || 0),
      currency: row.currency,
      issued_at: row.issued_at,
      item: row.item,
      member_name: row.member_name,
      kind: 'Event'
    },
    event: {
      id: row.event_id,
      title: row.item,
      registrationId: row.registration_id,
      status: row.status
    }
  };
}

export async function findConfirmedEventPayment(db, { reference, memberId }) {
  const args = [reference];
  const memberFilter = memberId ? 'AND r.member_id=$2' : '';
  if (memberId) args.push(memberId);
  const row = (await db.query(`
    SELECT r.id registration_id,
           r.event_id,
           r.status,
           r.receipt_number,
           r.provider_reference reference,
           r.amount_minor,
           e.currency,
           r.registered_at issued_at,
           e.title item,
           concat(m.first_name,' ',m.last_name) member_name
    FROM event_registrations r
    JOIN events e ON e.id=r.event_id
    JOIN members m ON m.id=r.member_id
    WHERE r.provider_reference=$1
      AND r.status='confirmed'
      ${memberFilter}
  `, args)).rows[0];
  return row || null;
}

export async function finalizePaystackEventPayment(db, { reference, providerStatus, amount, currency, metadata = {}, requestId, ip, memberId }) {
  const existing = await findConfirmedEventPayment(db, { reference, memberId });
  if (existing) return { ...formatEventPaymentConfirmation(existing), idempotentReplay: true };

  const registration = (await db.query(`
    SELECT r.*,e.title,e.currency
    FROM event_registrations r
    JOIN events e ON e.id=r.event_id
    WHERE r.provider_reference=$1
    FOR UPDATE
  `, [reference])).rows[0];
  if (!registration) throw Object.assign(new Error('Payment verification mismatch'), { status: 422, code: 'PAYMENT_MISMATCH' });
  const expectedEventId = metadata?.eventId || metadata?.event_id;
  if (
    providerStatus !== 'success' ||
    Number(amount) !== Number(registration.amount_minor) ||
    currency !== registration.currency ||
    (memberId && registration.member_id !== memberId) ||
    (metadata?.kind && metadata.kind !== 'event') ||
    (expectedEventId && expectedEventId !== registration.event_id)
  ) {
    console.error(JSON.stringify({
      level: 'warn',
      event: 'event_payment_mismatch',
      reference,
      expectedAmount: Number(registration.amount_minor),
      providerAmount: Number(amount),
      expectedCurrency: registration.currency,
      providerCurrency: currency,
      expectedMemberId: registration.member_id,
      providerMemberId: memberId || null,
      expectedEventId: registration.event_id,
      providerEventId: expectedEventId || null,
      metadataKind: metadata?.kind || null
    }));
    throw Object.assign(new Error('Payment verification mismatch'), { status: 422, code: 'PAYMENT_MISMATCH' });
  }

  await db.query("UPDATE event_registrations SET status='confirmed',receipt_number=COALESCE(receipt_number,'SRX-E-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))) WHERE id=$1", [registration.id]);
  await db.query("INSERT INTO notifications(recipient_user_id,type,title,message,metadata) SELECT user_id,'event_booking','Event booking confirmed',$1,$2 FROM members WHERE id=$3", [`Your payment and place for ${registration.title} are confirmed.`, JSON.stringify({ eventId: registration.event_id }), registration.member_id]);
  await db.query(`INSERT INTO audit_logs(action,entity_type,entity_id,new_values,request_id,ip) VALUES('event.payment_verified','event_registration',$1,$2,$3,$4)`, [registration.id, JSON.stringify({ provider: 'paystack', reference }), requestId, ip]);

  const confirmed = await findConfirmedEventPayment(db, { reference, memberId });
  return { ...formatEventPaymentConfirmation(confirmed), idempotentReplay: false };
}
