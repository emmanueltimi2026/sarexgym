import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMembershipTierMix } from '../src/lib/membershipTierMix.ts';

const plan = (id, name, extra = {}) => ({ id, name, description: '', price: 0, durationDays: 30, features: [], ...extra });
const member = (id, membershipPlanId, extra = {}) => ({ id, memberId: id, firstName: 'Test', lastName: 'Member', email: `${id}@example.com`, phone: '08000000000', gender: 'Other', photo: '', membershipPlanId, membershipPlanName: '', membershipStartDate: '', membershipExpiryDate: '', status: 'active', membershipStatus: 'Active', fitnessGoal: '', ...extra });

test('membership tier mix derives named plan categories, keeps zero-member plans, and accounts for unavailable plans', () => {
  const mix = buildMembershipTierMix([
    plan('basic', 'Basic'),
    plan('coach', 'Coach'),
    plan('inactive', 'Legacy', { isActive: false, status: 'inactive' }),
  ], [
    member('one', 'basic'),
    member('two', 'basic'),
    member('three', 'missing', { membershipPlanName: 'Removed tier' }),
    member('four', 'inactive'),
    member('five', 'coach', { membershipStatus: 'Expired', status: 'expired' }),
  ]);

  assert.deepEqual(mix, [
    { id: 'plan:basic', name: 'Basic', value: 2, kind: 'plan' },
    { id: 'plan:coach', name: 'Coach', value: 0, kind: 'plan' },
    { id: 'plan:unavailable', name: 'Unavailable plan', value: 2, kind: 'unavailable' },
  ]);
});
