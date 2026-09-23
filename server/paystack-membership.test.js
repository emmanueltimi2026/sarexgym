import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { finalizePaystackMembershipPayment } from './paystack-membership.js';
import { createPaidSubscriptionPeriod } from './subscriptions.js';

test('different-plan Paystack renewal confirms after creating a scheduled subscription', async () => {
  const db = fakePaystackDb({ orderPlanId: 'premium-plan', currentPlanId: 'standard-plan' });

  const result = await finalizePaystackMembershipPayment(db, {
    reference: 'sarex_test_reference',
    providerStatus: 'success',
    amount: 3000000,
    currency: 'NGN',
    requestId: 'request-1',
    ip: '127.0.0.1',
    memberId: 'member-1'
  });

  assert.equal(result.confirmed, true);
  assert.equal(result.subscription.status, 'scheduled');
  assert.equal(result.subscription.planName, 'Premium');
  assert.equal(db.activeSubscription.status, 'active');
  assert.equal(db.activeSubscription.plan_id, 'standard-plan');
  assert.equal(db.createdPayment.status, 'successful');
  assert.equal(db.createdPayment.subscription_id, db.createdSubscription.id);
  assert.equal(db.createdSubscription.starts_at.toISOString(), '2026-10-18T00:00:00.000Z');
});

test('same-plan Paystack renewal still confirms successfully', async () => {
  const db = fakePaystackDb({ orderPlanId: 'standard-plan', currentPlanId: 'standard-plan' });

  const result = await finalizePaystackMembershipPayment(db, {
    reference: 'sarex_same_plan_reference',
    providerStatus: 'success',
    amount: 2500000,
    currency: 'NGN',
    requestId: 'request-2',
    ip: '127.0.0.1',
    memberId: 'member-1'
  });

  assert.equal(result.confirmed, true);
  assert.equal(result.subscription.status, 'scheduled');
  assert.equal(result.subscription.planId, 'standard-plan');
  assert.equal(db.activeSubscription.status, 'active');
  assert.equal(db.createdPayment.status, 'successful');
});

test('Paystack membership purchase queues after existing scheduled subscriptions', async () => {
  const db = fakePaystackDb({
    orderPlanId: 'premium-plan',
    currentPlanId: 'standard-plan',
    latestQueued: {
      id: 'queued-subscription',
      member_id: 'member-1',
      plan_id: 'foundation-plan',
      status: 'scheduled',
      starts_at: new Date('2026-10-18T00:00:00.000Z'),
      ends_at: new Date('2026-11-17T00:00:00.000Z')
    }
  });

  await finalizePaystackMembershipPayment(db, {
    reference: 'sarex_test_reference',
    providerStatus: 'success',
    amount: 3000000,
    currency: 'NGN',
    requestId: 'request-3',
    ip: '127.0.0.1',
    memberId: 'member-1'
  });

  assert.equal(db.createdSubscription.starts_at.toISOString(), '2026-11-17T00:00:00.000Z');
  assert.equal(db.createdSubscription.ends_at.toISOString(), '2026-12-17T00:00:00.000Z');
});

test('trainer assignment requests are sent to active staff after payment', async () => {
  const db = fakePaystackDb({ orderPlanId: 'premium-plan', currentPlanId: 'standard-plan', trainerAccess: true });
  await finalizePaystackMembershipPayment(db, {
    reference: 'sarex_trainer_reference', providerStatus: 'success', amount: 3000000,
    currency: 'NGN', requestId: 'request-trainer', ip: '127.0.0.1', memberId: 'member-1'
  });
  assert.match(db.trainerNoticeSql, /JOIN staff st ON st\.user_id=u\.id/);
  assert.match(db.trainerNoticeSql, /r\.code='staff' AND st\.active AND u\.status='active'/);
  assert.match(db.trainerNoticeSql, /NOT EXISTS\(SELECT 1 FROM trainer_assignments/);
  assert.doesNotMatch(db.trainerNoticeSql, /r\.code='admin'/);
});

test('first payment turns the signup pending row into the one paid period', async () => {
  const db = fakePaystackDb({ orderPlanId: 'premium-plan', currentPlanId: null, pendingPlanId: 'standard-plan' });
  const result = await finalizePaystackMembershipPayment(db, {
    reference: 'sarex_first_payment', providerStatus: 'success', amount: 3000000,
    currency: 'NGN', requestId: 'request-first', ip: '127.0.0.1', memberId: 'member-1'
  });
  assert.equal(result.confirmed, true);
  assert.equal(result.subscription.status, 'active');
  assert.equal(db.subscriptionInserts, 0);
  assert.equal(db.subscriptionUpdates, 1);
  assert.equal(db.createdSubscription.id, db.pendingSubscription.id);
  assert.equal(db.createdSubscription.plan_id, 'premium-plan');
  assert.equal(db.createdPayment.subscription_id, db.pendingSubscription.id);
});

test('manual first payment uses the same pending-to-paid transition', async () => {
  const db = fakePaystackDb({ orderPlanId: 'premium-plan', currentPlanId: null, pendingPlanId: 'standard-plan' });
  const subscription = await createPaidSubscriptionPeriod(db, {
    memberId: 'member-1', planId: 'premium-plan',
    startsAt: new Date('2026-09-23T12:00:00.000Z'),
    endsAt: new Date('2026-10-23T12:00:00.000Z'),
    status: 'active', amountMinor: 3000000, currency: 'NGN', isFirstPurchase: true
  });
  assert.equal(subscription.id, 'signup-pending');
  assert.equal(subscription.plan_id, 'premium-plan');
  assert.equal(db.subscriptionUpdates, 1);
  assert.equal(db.subscriptionInserts, 0);
});

test('first purchase without a signup selection creates exactly one paid period', async () => {
  const db = fakePaystackDb({ orderPlanId: 'premium-plan', currentPlanId: null });
  await finalizePaystackMembershipPayment(db, {
    reference: 'sarex_no_selection', providerStatus: 'success', amount: 3000000,
    currency: 'NGN', requestId: 'request-no-selection', ip: '127.0.0.1', memberId: 'member-1'
  });
  assert.equal(db.subscriptionInserts, 1);
  assert.equal(db.subscriptionUpdates, 0);
  assert.equal(db.createdPayment.subscription_id, db.createdSubscription.id);
});

test('callback followed by webhook replay creates no second subscription or payment', async () => {
  const db = fakePaystackDb({ orderPlanId: 'premium-plan', currentPlanId: null, pendingPlanId: 'premium-plan' });
  const args = { reference: 'sarex_callback_webhook', providerStatus: 'success', amount: 3000000, currency: 'NGN', requestId: 'request-callback', ip: '127.0.0.1', memberId: 'member-1' };
  const callback = await finalizePaystackMembershipPayment(db, args);
  const webhook = await finalizePaystackMembershipPayment(db, { ...args, requestId: 'request-webhook' });
  const repeatedWebhook = await finalizePaystackMembershipPayment(db, { ...args, requestId: 'request-webhook-retry' });
  assert.equal(callback.subscription.id, webhook.subscription.id);
  assert.equal(webhook.idempotentReplay, true);
  assert.equal(repeatedWebhook.idempotentReplay, true);
  assert.equal(db.subscriptionUpdates, 1);
  assert.equal(db.subscriptionInserts, 0);
  assert.equal(db.paymentInserts, 1);
});

test('failed and abandoned checkouts leave the signup period pending', async () => {
  const db = fakePaystackDb({ orderPlanId: 'premium-plan', currentPlanId: null, pendingPlanId: 'premium-plan' });
  assert.equal(db.pendingSubscription.status, 'pending');
  await assert.rejects(finalizePaystackMembershipPayment(db, {
    reference: 'sarex_failed_payment', providerStatus: 'failed', amount: 3000000,
    currency: 'NGN', requestId: 'request-failed', ip: '127.0.0.1', memberId: 'member-1'
  }), error => error.code === 'PAYMENT_MISMATCH');
  assert.equal(db.pendingSubscription.status, 'pending');
  assert.equal(db.subscriptionInserts, 0);
  assert.equal(db.subscriptionUpdates, 0);
  assert.equal(db.paymentInserts, 0);
});

test('expired paid subscriptions remain idempotent and old orphan cleanup preserves linked rows', async () => {
  const db = fakePaystackDb({ orderPlanId: 'premium-plan', currentPlanId: null, pendingPlanId: 'premium-plan' });
  const args = { reference: 'sarex_expired_payment', providerStatus: 'success', amount: 3000000, currency: 'NGN', requestId: 'request-expired', ip: '127.0.0.1', memberId: 'member-1' };
  await finalizePaystackMembershipPayment(db, args);
  db.createdSubscription.status = 'expired';
  const replay = await finalizePaystackMembershipPayment(db, args);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(db.subscriptionUpdates, 1);
  assert.doesNotMatch(db.paymentLookupSql, /s\.status IN/);
  const migration = await readFile(new URL('./migrations/019_remove_orphaned_signup_subscriptions.sql', import.meta.url), 'utf8');
  assert.match(migration, /s.status='pending'/);
  assert.match(migration, /NOT EXISTS \([\s\S]*linked.subscription_id=s.id/);
  assert.match(migration, /paid.status='successful'/);
});

function fakePaystackDb({ orderPlanId, currentPlanId, latestQueued = null, trainerAccess = false, pendingPlanId = null }) {
  const planNames = { 'standard-plan': 'Standard Plan', 'premium-plan': 'Premium' };
  const db = {
    activeSubscription: currentPlanId ? {
      id: 'active-subscription',
      member_id: 'member-1',
      plan_id: currentPlanId,
      status: 'active',
      starts_at: new Date('2026-09-18T00:00:00.000Z'),
      ends_at: new Date('2026-10-18T00:00:00.000Z')
    } : null,
    pendingSubscription: pendingPlanId ? { id: 'signup-pending', member_id: 'member-1', plan_id: pendingPlanId, status: 'pending', starts_at: new Date('2026-09-18T00:00:00.000Z'), ends_at: new Date('2026-10-18T00:00:00.000Z') } : null,
    createdSubscription: null,
    createdPayment: null,
    subscriptionInserts: 0,
    subscriptionUpdates: 0,
    paymentInserts: 0,
    paymentLookupSql: '',
    trainerNoticeSql: '',
    async query(sql, params = []) {
      if (/SELECT py\.id payment_id/.test(sql)) {
        this.paymentLookupSql = sql;
        if (!this.createdPayment) return { rows: [] };
        return {
          rows: [{
            payment_id: this.createdPayment.id,
            receipt_number: 'SRX-M-TEST',
            reference: this.createdPayment.provider_reference,
            amount_minor: this.createdPayment.amount_minor,
            membership_amount_minor: this.createdPayment.membership_amount_minor,
            registration_fee_minor: this.createdPayment.registration_fee_minor,
            currency: this.createdPayment.currency,
            issued_at: this.createdPayment.paid_at,
            member_id: 'member-1',
            plan_id: this.createdPayment.plan_id,
            subscription_id: this.createdSubscription.id,
            subscription_status: this.createdSubscription.status,
            starts_at: this.createdSubscription.starts_at,
            ends_at: this.createdSubscription.ends_at,
            item: planNames[this.createdPayment.plan_id],
            member_name: 'Ada Member'
          }]
        };
      }
      if (/FROM payment_orders/.test(sql)) {
        return {
          rows: [{
            id: 'order-1',
            member_id: 'member-1',
            plan_id: orderPlanId,
            amount_minor: params[0] === 'sarex_same_plan_reference' ? 2500000 : 3000000,
            membership_amount_minor: params[0] === 'sarex_same_plan_reference' ? 2500000 : 3000000,
            registration_fee_minor: 0,
            currency: 'NGN',
            duration_days: 30,
            trainer_access: trainerAccess,
            workout_plan_access: false
          }]
        };
      }
      if (/pg_advisory_xact_lock/.test(sql)) return { rows: [] };
      if (/status='active' AND starts_at<=now\(\)/.test(sql)) return { rows: this.activeSubscription ? [this.activeSubscription] : [] };
      if (/tstzrange/.test(sql)) return { rows: [] };
      if (/status IN \('active','scheduled','frozen'\)/.test(sql)) {
        return { rows: latestQueued || this.activeSubscription ? [latestQueued || this.activeSubscription] : [] };
      }
      if (/status IN \('active','scheduled'\)/.test(sql)) {
        return { rows: orderPlanId === currentPlanId && this.activeSubscription ? [this.activeSubscription] : [] };
      }
      if (/SELECT 1 FROM payments WHERE member_id/.test(sql)) return { rows: this.activeSubscription ? [{ ok: 1 }] : [], rowCount: this.activeSubscription ? 1 : 0 };
      if (/SELECT s.id FROM subscriptions s/.test(sql)) return { rows: this.pendingSubscription ? [this.pendingSubscription] : [] };
      if (/UPDATE subscriptions SET plan_id=/.test(sql)) {
        this.subscriptionUpdates++;
        this.pendingSubscription = { ...this.pendingSubscription, plan_id: params[1], starts_at: params[2], ends_at: params[3], status: params[4] };
        this.createdSubscription = this.pendingSubscription;
        return { rows: [this.createdSubscription], rowCount: 1 };
      }
      if (/INSERT INTO subscriptions/.test(sql)) {
        this.subscriptionInserts++;
        this.createdSubscription = {
          id: 'scheduled-subscription',
          member_id: 'member-1',
          plan_id: orderPlanId,
          starts_at: params[2],
          ends_at: params[3],
          status: params[4]
        };
        return { rows: [this.createdSubscription], rowCount: 1 };
      }
      if (/INSERT INTO payments/.test(sql)) {
        this.paymentInserts++;
        this.createdPayment = {
          id: 'payment-1',
          order_id: params[0],
          member_id: params[1],
          subscription_id: params[2],
          plan_id: params[3],
          amount_minor: params[4],
          membership_amount_minor: params[5],
          registration_fee_minor: params[6],
          currency: params[7],
          provider_reference: params[8],
          status: 'successful',
          paid_at: new Date('2026-09-18T12:00:00.000Z')
        };
        return { rows: [{ id: this.createdPayment.id, receipt_number: 'SRX-M-TEST', provider_reference: params[8], paid_at: this.createdPayment.paid_at }], rowCount: 1 };
      }
      if (/UPDATE members SET registration_fee_paid_at/.test(sql)) return { rows: [], rowCount: 1 };
      if (/INSERT INTO notifications/.test(sql)) { this.trainerNoticeSql = sql; return { rows: [], rowCount: 0 }; }
      if (/UPDATE payment_orders SET status='successful'/.test(sql)) return { rows: [], rowCount: 1 };
      if (/INSERT INTO audit_logs/.test(sql)) return { rows: [], rowCount: 1 };
      throw new Error(`Unexpected query in fake Paystack DB: ${sql}`);
    }
  };
  return db;
}
