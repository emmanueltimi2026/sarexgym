import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizePaystackEventPayment } from './paystack-events.js';

test('valid event Paystack payment confirms the registration', async () => {
  const db = fakeEventDb();

  const result = await finalizePaystackEventPayment(db, {
    reference: 'sarex_event_reference',
    providerStatus: 'success',
    amount: 1500000,
    currency: 'NGN',
    metadata: { kind: 'event', eventId: 'event-1' },
    requestId: 'request-1',
    ip: '127.0.0.1',
    memberId: 'member-1'
  });

  assert.equal(result.confirmed, true);
  assert.equal(result.payment.kind, 'Event');
  assert.equal(result.payment.amount_minor, 1500000);
  assert.equal(result.event.status, 'confirmed');
  assert.equal(db.registration.status, 'confirmed');
  assert.equal(db.notifications, 1);
});

test('event Paystack amount is compared in minor units', async () => {
  const db = fakeEventDb({ amountMinor: 250000 });

  await finalizePaystackEventPayment(db, {
    reference: 'sarex_event_reference',
    providerStatus: 'success',
    amount: 250000,
    currency: 'NGN',
    metadata: { kind: 'event', eventId: 'event-1' },
    memberId: 'member-1'
  });

  assert.equal(db.registration.status, 'confirmed');
});

test('wrong event Paystack amount is rejected', async () => {
  const db = fakeEventDb({ amountMinor: 1500000 });

  await assert.rejects(
    () => finalizePaystackEventPayment(db, {
      reference: 'sarex_event_reference',
      providerStatus: 'success',
      amount: 15000,
      currency: 'NGN',
      metadata: { kind: 'event', eventId: 'event-1' },
      memberId: 'member-1'
    }),
    /Payment verification mismatch/
  );
  assert.equal(db.registration.status, 'pending_payment');
});

test('wrong event id is rejected', async () => {
  const db = fakeEventDb();

  await assert.rejects(
    () => finalizePaystackEventPayment(db, {
      reference: 'sarex_event_reference',
      providerStatus: 'success',
      amount: 1500000,
      currency: 'NGN',
      metadata: { kind: 'event', eventId: 'event-2' },
      memberId: 'member-1'
    }),
    /Payment verification mismatch/
  );
});

test('wrong member is rejected', async () => {
  const db = fakeEventDb();

  await assert.rejects(
    () => finalizePaystackEventPayment(db, {
      reference: 'sarex_event_reference',
      providerStatus: 'success',
      amount: 1500000,
      currency: 'NGN',
      metadata: { kind: 'event', eventId: 'event-1' },
      memberId: 'member-2'
    }),
    /Payment verification mismatch/
  );
});

test('duplicate event confirmation is idempotent', async () => {
  const db = fakeEventDb({ status: 'confirmed' });

  const result = await finalizePaystackEventPayment(db, {
    reference: 'sarex_event_reference',
    providerStatus: 'success',
    amount: 1500000,
    currency: 'NGN',
    metadata: { kind: 'event', eventId: 'event-1' },
    memberId: 'member-1'
  });

  assert.equal(result.confirmed, true);
  assert.equal(result.idempotentReplay, true);
  assert.equal(db.updates, 0);
});

function fakeEventDb({ amountMinor = 1500000, status = 'pending_payment' } = {}) {
  const db = {
    updates: 0,
    notifications: 0,
    registration: {
      id: 'registration-1',
      event_id: 'event-1',
      member_id: 'member-1',
      status,
      amount_minor: amountMinor,
      provider_reference: 'sarex_event_reference',
      receipt_number: status === 'confirmed' ? 'SRX-E-TEST' : null,
      title: 'Open Adventure',
      currency: 'NGN',
      registered_at: new Date('2026-09-18T12:00:00.000Z')
    },
    async query(sql, params = []) {
      if (/r\.status='confirmed'/.test(sql)) {
        const memberId = params[1];
        if (this.registration.status !== 'confirmed') return { rows: [] };
        if (memberId && memberId !== this.registration.member_id) return { rows: [] };
        return { rows: [confirmedRow(this.registration)] };
      }
      if (/FROM event_registrations r\s+JOIN events e ON e\.id=r\.event_id\s+WHERE r\.provider_reference=\$1\s+FOR UPDATE/s.test(sql)) {
        return { rows: [this.registration] };
      }
      if (/UPDATE event_registrations SET status='confirmed'/.test(sql)) {
        this.updates += 1;
        this.registration.status = 'confirmed';
        this.registration.receipt_number = this.registration.receipt_number || 'SRX-E-TEST';
        return { rowCount: 1, rows: [] };
      }
      if (/INSERT INTO notifications/.test(sql)) {
        this.notifications += 1;
        return { rowCount: 1, rows: [] };
      }
      if (/INSERT INTO audit_logs/.test(sql)) return { rowCount: 1, rows: [] };
      throw new Error(`Unexpected query in fake event DB: ${sql}`);
    }
  };
  return db;
}

function confirmedRow(registration) {
  return {
    registration_id: registration.id,
    event_id: registration.event_id,
    status: registration.status,
    receipt_number: registration.receipt_number,
    reference: registration.provider_reference,
    amount_minor: registration.amount_minor,
    currency: registration.currency,
    issued_at: registration.registered_at,
    item: registration.title,
    member_name: 'Ada Member'
  };
}
