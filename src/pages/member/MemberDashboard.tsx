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
  const myWorkoutPlan = canViewWorkoutPlan ? workoutPlans.find(plan => plan.memberId === currentMember.id || plan.memberId === currentMember.memberId) || null : null;
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
          {canViewWorkoutPlan && <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-[#EF1B23]" />
                <h3 className="font-athletic font-bold uppercase tracking-wider text-base text-[#111111]">
                  Prescribed Workout Program
                </h3>
              </div>
              <button
                onClick={() => navigate('/member/workout')}
                className="text-xs font-bold text-[#EF1B23] hover:underline flex items-center gap-1"
              >
                Full Routine <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myWorkoutPlan ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-athletic font-bold text-sm uppercase text-[#111111]">
                    {myWorkoutPlan.title || myWorkoutPlan.workoutName || 'Prescribed Regimen'}
                  </h4>
                  <span className="text-[10px] font-bold bg-neutral-800 text-white px-2 py-0.5 rounded">
                    {myWorkoutPlan.difficulty || 'Intermediate'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {myWorkoutPlan.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {((myWorkoutPlan.routine && Array.isArray(myWorkoutPlan.routine))
                    ? myWorkoutPlan.routine.slice(0, 2)
                    : []
                  ).map((routine, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded border border-gray-200">
                      <span className="text-[10px] font-bold text-[#EF1B23] uppercase block">
                        {routine.dayName}
                      </span>
                      <span className="font-bold text-gray-800 block text-[11px]">
                        {routine.focus}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {routine.exercises?.length || 0} compound exercises
                      </span>
                    </div>
                  ))}
                  {(!myWorkoutPlan.routine || myWorkoutPlan.routine.length === 0) && myWorkoutPlan.exercises && (
                    <div className="sm:col-span-2 bg-white p-3 rounded border border-gray-200">
                      <span className="text-[10px] font-bold text-[#EF1B23] uppercase block mb-1">
                        Active Prescribed Movements
                      </span>
                      <p className="text-gray-700 text-xs">
                        {myWorkoutPlan.exercises.length} compound exercises logged in your profile.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center text-xs text-gray-500">
                No active workout routine currently assigned. Consult with your trainer to establish your training split.
              </div>
            )}
          </div>}

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
