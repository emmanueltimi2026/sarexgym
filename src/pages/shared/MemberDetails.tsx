import React, { useCallback, useState } from 'react';
import { ArrowLeft, CalendarCheck, CreditCard, Dumbbell, Mail, MapPin, Phone, ShieldCheck, Snowflake, UserPlus, UserRound } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { Modal } from '../../components/ui/Modal';
import { PaystackModal } from '../../components/ui/PaystackModal';
import { Pagination } from '../../components/ui/Pagination';
import { useGym } from '../../context/GymContext';
import { useVisibilityPolling } from '../../hooks/useVisibilityPolling';
import { PORTAL_POLL_INTERVALS } from '../../lib/refreshPolicy';
import { apiBase as BASE } from '../../lib/secureFetch';
import type { AttendanceRecord, Member } from '../../types';

type DetailsResponse = {
  member: Member;
  attendance: AttendanceRecord[];
  pagination: { page: number; pageSize: number; total: number };
};

export const MemberDetails: React.FC = () => {
  const { currentPath, navigate, plans, trainers, updateMember, renewMemberMembership, refresh } = useGym();
  const portal = currentPath.startsWith('/admin/') ? 'admin' : 'staff';
  const memberId = currentPath.split('/').filter(Boolean).at(-1) || '';
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<DetailsResponse | null>(null);
  const [error, setError] = useState('');
  const [selectedPlanForRenew, setSelectedPlanForRenew] = useState<(typeof plans)[number] | null>(null);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isPaystackOpen, setIsPaystackOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [trainerId, setTrainerId] = useState('');
  const [message, setMessage] = useState('');
  const [freezeConfirm, setFreezeConfirm] = useState<boolean | null>(null);
  const [freezeBusy, setFreezeBusy] = useState(false);
  const [freezeError, setFreezeError] = useState('');
  const pageSize = 10;
  const activePlans = plans.filter(plan => plan.isActive !== false);

  const loadDetails = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetch(`${BASE}/api/v1/members/${encodeURIComponent(memberId)}/details?page=${page}&pageSize=${pageSize}`, { credentials: 'include', signal });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Member details could not be loaded.');
      setDetails(body.data as DetailsResponse);
      setError('');
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : 'Member details could not be loaded.');
    }
  }, [memberId, page]);
  const refreshDetails = useVisibilityPolling(loadDetails, PORTAL_POLL_INTERVALS.portal, true, true);

  const member = details?.member;
  const canAssignTrainer = Boolean(member?.trainerAccess);
  const canFreeze = portal === 'admin' && Boolean(member && (member.status === 'active' || member.freezeActive));
  const changeFreeze = async () => {
    if (!member || freezeConfirm === null) return;
    setFreezeBusy(true);
    setFreezeError('');
    const frozen = freezeConfirm;
    try {
      const response = await fetch(`${BASE}/api/v1/members/${encodeURIComponent(member.id)}/freeze`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ frozen }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Membership access could not be updated.');
      setFreezeConfirm(null);
      setMessage(frozen ? 'Membership access frozen.' : 'Membership access restored.');
      await Promise.allSettled([refreshDetails(), refresh()]);
    } catch (reason) {
      setFreezeConfirm(null);
      setFreezeError(reason instanceof Error ? reason.message : 'Membership access could not be updated.');
    } finally { setFreezeBusy(false); }
  };
  const backPath = `/${portal}/members`;
  const portalLabel = portal === 'admin' ? 'Administration' : 'Staff Portal';
  const contactProfileItems = member ? [
    { label: 'Email', value: member.email, icon: Mail },
    { label: 'Phone', value: member.phone, icon: Phone },
    { label: 'Gender', value: member.gender === 'Other' ? '' : member.gender },
    { label: 'Date of birth', value: member.dateOfBirth },
    { label: 'Address', value: member.address, icon: MapPin },
    { label: 'Fitness goal', value: member.fitnessGoal, icon: Dumbbell }
  ].filter(item => hasDisplayValue(item.value)) : [];

  return (
    <AppLayout
      pageTitle="Member Details"
      pageSubtitle="Review profile, membership access, and check-in history."
      breadcrumbs={[{ label: portalLabel, path: `/${portal}/dashboard` }, { label: 'Members', path: backPath }, { label: member?.memberId || 'Details' }]}
      actions={<div className="flex flex-wrap items-center gap-2">{member && <button type="button" onClick={() => { const plan = activePlans.find(item => item.id === member.membershipPlanId) || activePlans[0] || null; setSelectedPlanForRenew(plan); setIsRenewOpen(true); }} className="flex items-center gap-2 rounded-lg bg-[#EF1B23] px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"><CreditCard className="h-4 w-4"/>Renew</button>}<button type="button" onClick={() => navigate(backPath)} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-500"><ArrowLeft className="h-4 w-4"/>Back to members</button></div>}
    >
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{message}</div>}
      {freezeError && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">{freezeError}</div>}

      {!details && !error && <div className="space-y-5" role="status" aria-label="Loading member details"><div className="h-40 animate-pulse rounded-lg bg-white"/><div className="grid gap-4 md:grid-cols-2"><div className="h-56 animate-pulse rounded-lg bg-white"/><div className="h-56 animate-pulse rounded-lg bg-white"/></div><div className="h-72 animate-pulse rounded-lg bg-white"/></div>}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center"><h2 className="font-bold text-red-800">Unable to open this member</h2><p className="mt-2 text-sm text-red-700">{error}</p><button type="button" onClick={() => navigate(backPath)} className="mt-5 rounded-lg bg-[#151515] px-4 py-2 text-xs font-bold text-white">BACK TO MEMBERS</button></div>}

      {member && details && <div className="space-y-5">
        <section className="flex flex-col gap-5 rounded-lg border border-gray-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4"><InitialsAvatar src={member.photo} firstName={member.firstName} lastName={member.lastName} className="h-16 w-16 shrink-0"/><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-[#EF1B23]">{member.memberId}</p><h1 className="truncate text-2xl font-black text-[#111111]">{member.firstName} {member.lastName}</h1><p className="mt-1 truncate text-sm text-gray-500">Member since {member.memberSince || 'Not recorded'}</p></div></div>
          <Badge>{member.membershipStatus || 'Inactive'}</Badge>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs"><div className="mb-5 flex items-center gap-2"><UserRound className="h-5 w-5 text-[#EF1B23]"/><h2 className="font-black uppercase">Contact and profile</h2></div><dl className="grid gap-4 text-sm sm:grid-cols-2">{contactProfileItems.map(item => <Info key={item.label} label={item.label} value={item.value} icon={item.icon}/>)}</dl></section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
            <div className="mb-5 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#EF1B23]"/><h2 className="font-black uppercase">Membership access</h2></div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Info label="Current plan" value={member.membershipPlanName}/>
              <Info label="Assigned trainer" value={member.assignedTrainerName || 'Not assigned'}/>
              <Info label="Start date" value={member.membershipStartDate || 'Not active'}/>
              <Info label="Expiry date" value={member.membershipExpiryDate || 'Not active'}/>
              {member.nextPlanName && <><Info label="Next plan" value={member.nextPlanName}/><Info label="Scheduled start" value={member.nextPlanStartDate || 'Pending date'}/></>}
              <Info label="Trainer access" value={member.trainerAccess ? 'Included' : 'Not included'}/>
              <Info label="Workout plans" value={member.workoutPlanEnabled ? 'Included' : 'Not included'}/>
            </dl>
            {(canAssignTrainer || canFreeze) && <div className="mt-5 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:flex-wrap">
              {canAssignTrainer && <button type="button" onClick={() => { setTrainerId(member.assignedTrainerId || ''); setIsAssignOpen(true); }} className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 transition hover:border-[#EF1B23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EF1B23]"><UserPlus className="h-4 w-4"/>Assign trainer</button>}
              {canFreeze && <button type="button" onClick={() => setFreezeConfirm(!member.freezeActive)} className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 transition hover:border-[#EF1B23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EF1B23]"><Snowflake className="h-4 w-4"/>{member.freezeActive ? 'Unfreeze access' : 'Freeze access'}</button>}
            </div>}
          </section>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 p-5"><div><h2 className="font-black uppercase">Check-in history</h2><p className="mt-1 text-xs text-gray-500">{details.pagination.total} recorded visit{details.pagination.total === 1 ? '' : 's'}</p></div><CalendarCheck className="h-5 w-5 text-[#EF1B23]"/></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-gray-200 bg-gray-50 uppercase tracking-wider text-gray-600"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Outcome</th></tr></thead><tbody className="divide-y divide-gray-100">{details.attendance.length ? details.attendance.map(record => <tr key={record.id}><td className="px-4 py-3 text-gray-700">{record.date}</td><td className="px-4 py-3 font-mono font-semibold">{record.time}</td><td className="px-4 py-3 text-gray-600">{record.method}</td><td className="px-4 py-3"><Badge variant={record.status === 'Denied' ? 'danger' : 'success'}>{record.status}</Badge></td></tr>) : <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-500">No check-ins recorded for this member.</td></tr>}</tbody></table></div>
          <Pagination page={page} pageSize={pageSize} total={details.pagination.total} onPageChange={setPage}/>
        </section>
      </div>}

      {member && isAssignOpen && canAssignTrainer && (
        <Modal isOpen onClose={() => setIsAssignOpen(false)} title="ASSIGN TRAINER" subtitle={`Choose a trainer for ${member.firstName} ${member.lastName}`} maxWidth="sm">
          <form onSubmit={event => { event.preventDefault(); updateMember(member.id, { assignedTrainerId: (trainerId || null) as any }); setIsAssignOpen(false); setMessage(trainerId ? 'Trainer assigned successfully.' : 'Trainer assignment removed.'); window.setTimeout(() => setMessage(''), 3500); }} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-gray-700">Trainer</label>
              <select value={trainerId} onChange={event => setTrainerId(event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[#EF1B23] focus:outline-none">
                <option value="">No trainer assigned</option>
                {trainers.filter(trainer => trainer.isActive).map(trainer => <option key={trainer.id} value={trainer.id}>{trainer.firstName} {trainer.lastName} - {trainer.specialization}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 pt-3"><button type="button" onClick={() => setIsAssignOpen(false)} className="rounded border border-gray-300 px-4 py-2 text-xs font-bold uppercase">Cancel</button><button type="submit" className="rounded bg-[#EF1B23] px-5 py-2 text-xs font-bold uppercase text-white">Save assignment</button></div>
          </form>
        </Modal>
      )}

      {member && isRenewOpen && selectedPlanForRenew && (
        <Modal isOpen onClose={() => setIsRenewOpen(false)} title="RENEW MEMBERSHIP" subtitle={`Extend membership for ${member.firstName} ${member.lastName}`}>
          <div className="space-y-4 text-xs">
            <div className="rounded border border-gray-200 bg-gray-50 p-3">
              <div className="flex justify-between gap-4"><span className="text-gray-500">Member ID:</span><span className="font-bold text-gray-900">{member.memberId}</span></div>
              <div className="mt-1 flex justify-between gap-4"><span className="text-gray-500">Current expiration:</span><span className="font-mono font-bold text-[#EF1B23]">{member.membershipExpiryDate || 'Not active'}</span></div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-gray-700">Select renewal tier</label>
              <select value={selectedPlanForRenew.id} onChange={event => { const plan = plans.find(item => item.id === event.target.value); if (plan) setSelectedPlanForRenew(plan); }} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#EF1B23] focus:outline-none">
                {activePlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} - ₦{plan.price.toLocaleString()} ({plan.durationDays} Days)</option>)}
              </select>
            </div>
            {member.membershipStatus === 'Active' && selectedPlanForRenew.id !== member.membershipPlanId && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 font-semibold text-sky-800">
                Your new plan will start when your current plan ends.
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" onClick={() => { void renewMemberMembership(member.id, selectedPlanForRenew.id, 'Cash'); setIsRenewOpen(false); setMessage('Cash membership renewal recorded successfully.'); window.setTimeout(() => setMessage(''), 3500); }} className="rounded bg-neutral-800 py-2.5 font-athletic text-xs font-bold uppercase text-white transition hover:bg-neutral-900">Record cash</button>
              <button type="button" onClick={() => setIsPaystackOpen(true)} className="rounded bg-[#EF1B23] py-2.5 font-athletic text-xs font-bold uppercase text-white transition hover:bg-red-700">Online Paystack</button>
            </div>
          </div>
        </Modal>
      )}

      {member && selectedPlanForRenew && (
        <PaystackModal isOpen={isPaystackOpen} onClose={() => { setIsPaystackOpen(false); setIsRenewOpen(false); }} plan={selectedPlanForRenew} memberName={`${member.firstName} ${member.lastName}`} memberId={member.id} onSuccess={() => { void renewMemberMembership(member.id, selectedPlanForRenew.id, 'Paystack'); }}/>
      )}
      <ConfirmDialog open={freezeConfirm !== null} title={freezeConfirm ? 'Freeze membership access?' : 'Restore membership access?'} message={member ? freezeConfirm ? `Freeze gym access for ${member.firstName} ${member.lastName} until an administrator restores it or this subscription expires? The paid end date will stay the same.` : `Restore gym access for ${member.firstName} ${member.lastName} for the remainder of the current subscription?` : ''} confirmLabel={freezeConfirm ? 'Freeze access' : 'Restore access'} tone={freezeConfirm ? 'danger' : 'primary'} busy={freezeBusy} onClose={() => setFreezeConfirm(null)} onConfirm={() => { void changeFreeze(); }}/>
    </AppLayout>
  );
};

const hasDisplayValue = (value: React.ReactNode) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return Boolean(normalized) && normalized !== 'not provided';
  }
  return true;
};

const Info: React.FC<{ label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }> = ({ label, value, icon: Icon }) => <div className="min-w-0"><dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{Icon && <Icon className="h-3.5 w-3.5"/>}{label}</dt><dd className="mt-1 break-words font-semibold text-gray-800">{value}</dd></div>;
