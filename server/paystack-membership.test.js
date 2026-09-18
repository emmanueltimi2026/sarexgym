import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizePaystackMembershipPayment } from './paystack-membership.js';

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

function fakePaystackDb({ orderPlanId, currentPlanId }) {
  const planNames = { 'standard-plan': 'Standard Plan', 'premium-plan': 'Premium' };
  const db = {
    activeSubscription: {
      id: 'active-subscription',
      member_id: 'member-1',
      plan_id: currentPlanId,
      status: 'active',
      starts_at: new Date('2026-09-18T00:00:00.000Z'),
      ends_at: new Date('2026-10-18T00:00:00.000Z')
    },
    createdSubscription: null,
    createdPayment: null,
    async query(sql, params = []) {
      if (/FROM payments py/.test(sql)) {
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
            trainer_access: false,
            workout_plan_access: false
          }]
        };
      }
      if (/pg_advisory_xact_lock/.test(sql)) return { rows: [] };
      if (/status='active' AND starts_at<=now\(\)/.test(sql)) return { rows: [this.activeSubscription] };
      if (/status IN \('active','scheduled'\)/.test(sql)) {
        return { rows: orderPlanId === currentPlanId ? [this.activeSubscription] : [] };
      }
      if (/tstzrange/.test(sql)) return { rows: [] };
      if (/INSERT INTO subscriptions/.test(sql)) {
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
      if (/INSERT INTO notifications/.test(sql)) return { rows: [], rowCount: 0 };
      if (/UPDATE payment_orders SET status='successful'/.test(sql)) return { rows: [], rowCount: 1 };
      if (/INSERT INTO audit_logs/.test(sql)) return { rows: [], rowCount: 1 };
      throw new Error(`Unexpected query in fake Paystack DB: ${sql}`);
    }
  };
  return db;
}
