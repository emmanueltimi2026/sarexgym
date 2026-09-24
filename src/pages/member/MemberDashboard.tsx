import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { PaystackModal } from '../../components/ui/PaystackModal';
import {
  CreditCard,
  CalendarCheck,
  Dumbbell,
  Clock,
  ArrowRight,
  ShieldCheck,
  QrCode
} from 'lucide-react';

export const MemberDashboard: React.FC = () => {
  const { currentMember, plans, attendance, workoutPlans, renewMemberMembership, navigate } = useGym();
  const [isPaystackOpen, setIsPaystackOpen] = useState(false);
  const selectedPlanForRenew = plans.find(plan => plan.id === currentMember?.membershipPlanId) || plans.find(plan => plan.isActive !== false) || null;

  if (!currentMember) {
    return (
      <AppLayout pageTitle="Member Portal">
        <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
          No member profile active. Please select a member role or log in.
        </div>
      </AppLayout>
    );
  }

  const memberAttendance = attendance.filter(a => a.memberId === currentMember.memberId);
  const successfulAttendance = memberAttendance.filter(a => a.status !== 'Denied');
  const canViewWorkoutPlan = Boolean(currentMember.workoutPlanEnabled);
  const assignedWorkoutPlans = canViewWorkoutPlan ? workoutPlans.filter(plan => plan.memberId === currentMember.id || plan.memberId === currentMember.memberId) : [];
  const myWorkoutPlan = assignedWorkoutPlans.find(plan => plan.status === 'active') || assignedWorkoutPlans[0] || null;
  const expiry = new Date(currentMember.membershipExpiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const hasActiveSubscription = currentMember.membershipStatus === 'Active' && Number.isFinite(diffDays) && diffDays > 0;
  const hasScheduledSubscription = Boolean(currentMember.nextSubscriptionId && currentMember.nextPlanName && currentMember.nextPlanStartDate);

  return (
    <AppLayout
      pageTitle="Dashboard"
      pageSubtitle="See your membership status, assigned workout plan, and recent gym visits."
      breadcrumbs={[{ label: 'Member Portal' }, { label: 'Dashboard' }]}
      actions={<>
        <button aria-label="Check in" title="Check in" onClick={() => navigate('/member/check-in')} className="flex h-9 w-9 items-center justify-center gap-1.5 rounded bg-[#111111] font-athletic text-xs font-bold uppercase text-white shadow-xs transition-colors hover:bg-[#EF1B23] sm:w-auto sm:px-3.5">
          <QrCode className="h-4 w-4" /> <span className="hidden sm:inline">Check in</span>
        </button>
        {hasActiveSubscription && diffDays <= 7 && selectedPlanForRenew && (
          <button aria-label="Renew membership" title="Renew membership" onClick={() => setIsPaystackOpen(true)} className="flex h-9 w-9 items-center justify-center gap-1.5 rounded bg-[#EF1B23] font-athletic text-xs font-bold uppercase text-white shadow-xs transition-colors hover:bg-red-700 sm:w-auto sm:px-3.5">
            <CreditCard className="h-4 w-4" /> <span className="hidden sm:inline">Renew Membership</span>
          </button>
        )}
      </>}
    >
      <div className={`mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 ${hasScheduledSubscription ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
        <StatCard
          label="Days Remaining"
          value={hasActiveSubscription ? `${diffDays} Days Left` : '—'}
          subtext={hasActiveSubscription ? 'active subscription' : 'no active subscription'}
          icon={CalendarCheck}
        />
        <StatCard
          label="Current Plan"
          value={hasActiveSubscription ? currentMember.membershipPlanName : 'Inactive'}
          subtext={hasActiveSubscription ? 'Full facility clearance' : 'Choose a plan and complete payment'}
          icon={ShieldCheck}
        />
        <StatCard
          label="Subscription Expires"
          value={hasActiveSubscription ? currentMember.membershipExpiryDate : '—'}
          subtext={hasActiveSubscription ? 'current active plan ends' : 'activate a plan to unlock access'}
          icon={CalendarCheck}
        />
        {hasScheduledSubscription && (
          <>
            <StatCard
              label="Next Plan"
              value={currentMember.nextPlanName}
              subtext="Purchased renewal queued"
              icon={CreditCard}
            />
            <StatCard
              label="Scheduled Start"
              value={currentMember.nextPlanStartDate}
              subtext="Starts after current plan ends"
              icon={CalendarCheck}
            />
          </>
        )}
        <StatCard
          label="Facility Visits"
          value={`${successfulAttendance.length} Sessions`}
          subtext="successful check-ins logged"
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 space-y-6">
          {canViewWorkoutPlan && <section className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-xs sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-[#EF1B23]" />
                <h3 className="font-athletic font-bold uppercase tracking-wider text-base text-[#111111]">
                  Prescribed Workout Program
                </h3>
              </div>
              <button
                onClick={() => navigate('/member/workout')}
                className="inline-flex items-center gap-1.5 rounded border border-gray-200 px-3 py-2 text-xs font-bold text-[#111111] transition hover:border-[#EF1B23] hover:text-[#EF1B23]"
              >
                View full plan <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {myWorkoutPlan ? (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                  <h4 className="break-words text-lg font-bold text-[#111111]">
                    {myWorkoutPlan.title || myWorkoutPlan.workoutName || 'Prescribed Regimen'}
                  </h4>
                  <p className="mt-1 text-xs text-gray-500">Prescribed by {myWorkoutPlan.trainerName || 'SAREX Specialist'} · {myWorkoutPlan.daysPerWeek || myWorkoutPlan.routine?.length || 0} days per week</p>
                  </div>
                  <span className="rounded bg-neutral-900 px-2 py-1 text-[10px] font-bold uppercase text-white">
                    {myWorkoutPlan.difficulty || 'Intermediate'}
                  </span>
                </div>
                {myWorkoutPlan.description && <p className="mt-2 max-w-3xl whitespace-pre-wrap break-words text-xs leading-5 text-gray-600">
                  {myWorkoutPlan.description}
                </p>}

                <div className="mt-4 grid grid-cols-1 gap-2 border-t border-gray-100 pt-4 text-xs sm:grid-cols-2 xl:grid-cols-3">
                  {((myWorkoutPlan.routine && Array.isArray(myWorkoutPlan.routine))
                    ? myWorkoutPlan.routine.slice(0, 3)
                    : []
                  ).map((routine, idx) => (
                    <div key={routine.id || idx} className="min-w-0 border-l-2 border-[#EF1B23] bg-gray-50 px-3 py-2.5">
                      <span className="block text-[10px] font-bold uppercase text-[#EF1B23]">{routine.dayName || `Day ${idx + 1}`}</span>
                      <span className="mt-0.5 block break-words font-semibold text-gray-900">{routine.focus || 'Training day'}</span>
                      <span className="mt-1 block text-[11px] text-gray-500">{routine.exercises?.length || 0} exercises</span>
                    </div>
                  ))}
                  {(myWorkoutPlan.routine?.length || 0) > 3 && <div className="flex items-center text-xs font-semibold text-gray-500">+{myWorkoutPlan.routine.length - 3} more days in your full plan</div>}
                  {(!myWorkoutPlan.routine || myWorkoutPlan.routine.length === 0) && myWorkoutPlan.exercises && (
                    <div className="text-gray-600">{myWorkoutPlan.exercises.length} prescribed exercises</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center text-xs text-gray-500">
                No active workout routine currently assigned. Consult with your trainer to establish your training split.
              </div>
            )}
          </section>}

          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs">
            <h3 className="font-athletic font-bold uppercase tracking-wider text-base text-[#111111] mb-3">
              My Recent Facility Check-ins
            </h3>

            <div className="divide-y divide-gray-100 text-xs">
              {(successfulAttendance || []).slice(0, 4).map(att => (
                <div key={att.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-gray-700">{att.date} at {att.time}</span>
                  </div>
                  <Badge variant={att.status !== 'Denied' ? 'success' : 'danger'}>
                    {att.status}
                  </Badge>
                </div>
              ))}
              {(!successfulAttendance || successfulAttendance.length === 0) && (
                <div className="py-4 text-center text-gray-400 text-xs">
                  No check-ins logged yet. Scan the permanent QR code displayed at reception.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PaystackModal
        isOpen={Boolean(selectedPlanForRenew) && hasActiveSubscription && diffDays <= 7 && isPaystackOpen}
        onClose={() => setIsPaystackOpen(false)}
        plan={selectedPlanForRenew}
        memberName={`${currentMember.firstName} ${currentMember.lastName}`}
        memberId={currentMember.id}
        onSuccess={() => {
          if (selectedPlanForRenew) renewMemberMembership(currentMember.id, selectedPlanForRenew.id, 'Paystack');
        }}
      />
    </AppLayout>
  );
};
