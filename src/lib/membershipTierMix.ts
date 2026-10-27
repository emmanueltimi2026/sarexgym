import type { Member, MembershipPlan } from '../types';

export interface MembershipTierMixItem {
  id: string;
  name: string;
  value: number;
  kind: 'plan' | 'unavailable';
}

const isActivePlan = (plan: MembershipPlan) => plan.isActive !== false && plan.status !== 'inactive';

/**
 * Build chart categories from the configured plan records, not from status
 * labels. Active plans remain visible when they have no members so the chart
 * reflects the configured tier mix. Active members whose plan is unavailable
 * are grouped into an explicit catch-all instead of silently disappearing.
 */
export function buildMembershipTierMix(plans: MembershipPlan[], members: Member[]): MembershipTierMixItem[] {
  const activeMembers = members.filter(member => member.membershipStatus === 'Active' || member.status === 'active');
  const activePlans = plans.filter(isActivePlan);
  const activePlanIds = new Set(activePlans.map(plan => plan.id));
  const items: MembershipTierMixItem[] = activePlans.map((plan, index) => ({
    id: `plan:${plan.id || index}`,
    name: plan.name?.trim() || 'Unnamed plan',
    value: activeMembers.filter(member => member.membershipPlanId === plan.id).length,
    kind: 'plan' as const,
  }));

  const unavailableMembers = activeMembers.filter(member => !activePlanIds.has(member.membershipPlanId));
  if (unavailableMembers.length) {
    items.push({
      id: 'plan:unavailable',
      name: 'Unavailable plan',
      value: unavailableMembers.length,
      kind: 'unavailable',
    });
  }

  return items;
}
