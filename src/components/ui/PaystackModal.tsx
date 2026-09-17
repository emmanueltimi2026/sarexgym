import React, { useEffect, useState } from 'react';
import { CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { Modal } from './Modal';
import type { MembershipPlan } from '../../types';
import { apiUrl } from '../../lib/secureFetch';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  plan?: MembershipPlan | null;
  memberName: string;
  memberId: string;
  onSuccess: () => void;
  isNewMember?: boolean;
}

export const PaystackModal: React.FC<Props> = ({ isOpen, onClose, plan, memberName, memberId, isNewMember = false }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setBusy(false);
      setError('');
    }
  }, [isOpen]);

  if (!plan) return null;

  const checkout = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(apiUrl('/api/v1/payments/orders'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, planId: plan.id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to start checkout');
      if (!body?.data?.authorizationUrl) throw new Error('The payment provider did not return a checkout link');
      location.assign(body.data.authorizationUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Unable to start checkout');
      setBusy(false);
    }
  };

  return <Modal isOpen={isOpen} onClose={onClose} title="SECURE CHECKOUT" subtitle="Payment is completed on Paystack" maxWidth="md">
    <div className="space-y-5">
      <div className="rounded bg-[#111] p-4 text-white"><div className="flex items-center justify-between"><div><span className="block text-xs text-gray-400">{memberName}</span><span className="text-xl font-bold font-athletic">₦{(plan.price + (isNewMember ? plan.registrationFee || 0 : 0)).toLocaleString()}</span></div><div className="text-right text-xs"><span className="block font-bold text-[#EF1B23]">{plan.name}</span><span className="text-gray-400">{plan.durationDays} days</span></div></div><div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs text-gray-300"><div className="flex justify-between"><span>Membership</span><span>₦{plan.price.toLocaleString()}</span></div>{isNewMember && Boolean(plan.registrationFee) && <div className="flex justify-between"><span>One-time registration fee</span><span>₦{(plan.registrationFee || 0).toLocaleString()}</span></div>}</div></div>
      {(plan.trainerAccess || plan.workoutPlanAccess) && <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><strong className="block">Included with this membership</strong>{plan.workoutPlanAccess && <span className="mt-1 block">Trainer-guided workout plan access</span>}{plan.trainerAccess && <span className="block">Personal trainer access</span>}</div>}
      <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600"><CreditCard className="mb-2 h-5 w-5 text-[#EF1B23]"/><p>Continue to Paystack to choose card, bank transfer, USSD, or another available method. Sarex never receives or stores your card number.</p></div>
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
      <button onClick={checkout} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded bg-[#EF1B23] py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-60">{busy ? <><Loader2 className="h-4 w-4 animate-spin"/>Starting secure checkout…</> : <>Continue to Paystack <ExternalLink className="h-4 w-4"/></>}</button>
    </div>
  </Modal>;
};
