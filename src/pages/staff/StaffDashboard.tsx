import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PaystackModal } from '../../components/ui/PaystackModal';
import {
  Users,
  CalendarCheck,
  CreditCard,
  QrCode,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Member } from '../../types';

export const StaffDashboard: React.FC = () => {
  const { members, attendance, payments, plans, navigate, renewMemberMembership } = useGym();

  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedMemberForRenew, setSelectedMemberForRenew] = useState<Member | null>(null);
  const [selectedPlanForRenew, setSelectedPlanForRenew] = useState<(typeof plans)[number] | null>(null);
  const [isPaystackOpen, setIsPaystackOpen] = useState(false);
  const [renewalError, setRenewalError] = useState('');
  const activePlans = plans.filter(plan => plan.isActive !== false);

  const lagosDate = (value: string | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
  const todayStr = lagosDate(new Date());
  const todayCheckIns = attendance.filter(a => lagosDate(a.checkInTime || a.date) === todayStr);
  const todayRevenue = payments
    .filter(p => (p.date || '').slice(0, 10) === todayStr && p.status === 'Successful')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const expiringMembers = members.filter(m => m.membershipStatus === 'Expiring');
  const expiredMembers = members.filter(m => m.membershipStatus === 'Expired' || m.status === 'expired');
  const renewalMembers = [...expiringMembers, ...expiredMembers.filter(member => !expiringMembers.some(expiring => expiring.id === member.id))];
  const activeMembersCount = members.filter(m => m.membershipStatus === 'Active').length;

  return (
    <AppLayout
      pageTitle="Dashboard"
      pageSubtitle="Handle member check-ins, registrations, renewals, and payments for today."
      breadcrumbs={[{ label: 'Staff Portal' }, { label: 'Staff' }]}
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/staff/check-in')}
            className="px-6 py-2.5 bg-[#EF1B23] hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            Reception Check-in
          </button>
        </div>
      }
    >
      {renewalError && (
        <div role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
          {renewalError}
        </div>
      )}
      
      <div className="mb-4 grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Today's Check-ins" value={todayCheckIns.length} subtext="Successful entries" icon={CalendarCheck}/>
        <StatCard label="Active Memberships" value={activeMembersCount} subtext="Currently active" icon={Users}/>
        <StatCard label="Expiring This Week" value={expiringMembers.length} subtext="Renewal follow-up" icon={AlertTriangle}/>
        <StatCard label="Today's Collections" value={`₦${todayRevenue.toLocaleString()}`} subtext="Successful payments" icon={TrendingUp}/>
        <StatCard label="Expired Memberships" value={expiredMembers.length} subtext="Access currently inactive" icon={Clock}/>
      </div>

      
      <div className="bg-white border border-[#E5E7EB] rounded-sm mb-6 overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FDFDFD]">
          <span className="text-xs font-black uppercase tracking-widest text-[#111111]">
            Daily Quick Actions
          </span>
          <span className="text-[10px] text-[#6B7280] uppercase font-bold">Staff Workspace</span>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <button
            onClick={() => navigate('/staff/check-in')}
            className="p-3.5 bg-gray-50 hover:bg-gray-100 border border-[#E5E7EB] rounded-xs text-left transition-colors flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-[#EF1B23] text-white flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#111111]">Reception QR</div>
              <div className="text-[10px] text-[#6B7280]">Scan at entrance</div>
            </div>
          </button>

          <button
            onClick={() => navigate('/staff/memberships')}
            className="p-3.5 bg-gray-50 hover:bg-gray-100 border border-[#E5E7EB] rounded-xs text-left transition-colors flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-green-600 text-white flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#111111]">Renew Membership</div>
              <div className="text-[10px] text-[#6B7280]">Record an in-person renewal</div>
            </div>
          </button>

          <button
            onClick={() => navigate('/staff/payments')}
            className="p-3.5 bg-gray-50 hover:bg-gray-100 border border-[#E5E7EB] rounded-xs text-left transition-colors flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-neutral-700 text-white flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#111111]">Payment History</div>
              <div className="text-[10px] text-[#6B7280]">Daily closing logs</div>
            </div>
          </button>
        </div>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white border border-[#E5E7EB] rounded-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FDFDFD]">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#111111]">
              Live Entrance Activity ({todayCheckIns.length})
            </h3>
            <button
              onClick={() => navigate('/staff/attendance')}
              className="text-[10px] font-bold text-[#EF1B23] uppercase hover:underline flex items-center gap-1"
            >
              View Full Log <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-[#E5E7EB] text-xs">
            {todayCheckIns.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-8 text-center">No check-ins logged yet today.</p>
            ) : (
              todayCheckIns.slice(0, 6).map(item => (
                <div
                  key={item.id}
                  className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-xs ${
                        item.status !== 'Denied' ? 'bg-green-600' : 'bg-[#EF1B23]'
                      }`}
                    />
                    <div>
                      <span className="font-bold text-[#111111]">{item.memberName}</span>
                      <span className="text-[10px] text-[#6B7280] font-mono ml-2">({item.memberId})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-black uppercase ${
                        item.status !== 'Denied' ? 'text-green-600' : 'text-[#EF1B23]'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-[11px] text-[#6B7280] font-mono">{item.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        
        <div className="bg-white border border-[#E5E7EB] rounded-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FDFDFD]">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#111111]">
              Expiring & Overdue Memberships ({renewalMembers.length})
            </h3>
            <button
              onClick={() => navigate('/staff/memberships')}
              className="text-[10px] font-bold text-[#EF1B23] uppercase hover:underline flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-[#E5E7EB] text-xs">
            {renewalMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CalendarCheck className="h-5 w-5" /></div>
                <p className="font-bold text-[#111]">No renewals need attention</p>
                <p className="mt-1 text-[11px] text-[#6B7280]">Expiring and overdue memberships will appear here.</p>
              </div>
            ) : renewalMembers.slice(0, 5).map(member => (
              <div
                key={member.id}
                className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-[#111111] text-[10px]">
                    {member.firstName[0]}
                    {member.lastName[0]}
                  </div>
                  <div>
                    <span className="font-bold text-[#111111] block">
                      {member.firstName} {member.lastName}
                    </span>
                    <span className="text-[10px] text-[#6B7280]">
                      Expires: {member.membershipExpiryDate} ({member.membershipPlanName})
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const renewalPlan = activePlans.find(plan => plan.id === member.membershipPlanId) || activePlans[0] || null;
                    if (!renewalPlan) {
                      setRenewalError('No active membership plan is available. Ask an administrator to activate a plan before recording a renewal.');
                      return;
                    }
                    setRenewalError('');
                    setSelectedMemberForRenew(member);
                    setSelectedPlanForRenew(renewalPlan);
                    setIsRenewModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-[#EF1B23] hover:bg-red-700 text-white font-bold uppercase text-[10px] tracking-wider transition-colors"
                >
                  Renew
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      

      
      {selectedMemberForRenew && selectedPlanForRenew && (
        <Modal
          isOpen={isRenewModalOpen}
          onClose={() => setIsRenewModalOpen(false)}
          title="RENEW MEMBERSHIP PLAN"
          subtitle={`Renewal for ${selectedMemberForRenew.firstName} ${selectedMemberForRenew.lastName}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Member ID:</span>
                <span className="font-bold text-[#111111]">{selectedMemberForRenew.memberId}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Current Status:</span>
                <Badge>{selectedMemberForRenew.membershipStatus}</Badge>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                Select Renewal Tier
              </label>
              <select
                value={selectedPlanForRenew.id}
                onChange={e => {
                  const p = plans.find(pl => pl.id === e.target.value);
                  if (p) setSelectedPlanForRenew(p);
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none bg-white"
              >
                {activePlans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} - ₦{p.price.toLocaleString()} ({p.durationDays} Days)
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Payable Amount:</span>
                <span className="text-base font-bold font-athletic text-[#111111]">
                  ₦{selectedPlanForRenew.price.toLocaleString()}
                </span>
              </div>
            </div>

            {selectedMemberForRenew.membershipStatus === 'Active' && selectedPlanForRenew.id !== selectedMemberForRenew.membershipPlanId && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs font-semibold text-sky-800">
                Your new plan will start when your current plan ends.
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  renewMemberMembership(selectedMemberForRenew.id, selectedPlanForRenew.id, 'Cash');
                  setIsRenewModalOpen(false);
                }}
                className="py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white font-athletic font-bold uppercase text-xs rounded transition-colors"
              >
                Record Cash
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRenewModalOpen(false);
                  setIsPaystackOpen(true);
                }}
                className="py-2.5 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors"
              >
                Pay via Paystack
              </button>
            </div>
          </div>
        </Modal>
      )}

      
      {selectedMemberForRenew && selectedPlanForRenew && (
        <PaystackModal
          isOpen={isPaystackOpen}
          onClose={() => setIsPaystackOpen(false)}
          plan={selectedPlanForRenew}
          memberName={`${selectedMemberForRenew.firstName} ${selectedMemberForRenew.lastName}`}
          memberId={selectedMemberForRenew.id}
          onSuccess={() => {
            renewMemberMembership(selectedMemberForRenew.id, selectedPlanForRenew.id, 'Paystack');
          }}
        />
      )}
    </AppLayout>
  );
};
