import React, { useEffect, useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Search, Check } from 'lucide-react';
import { Member, MembershipPlan } from '../../types';

export const StaffMemberships: React.FC = () => {
  const { plans, members, getSubscriptionQuote, renewMemberMembership } = useGym();
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(plans.find(plan => plan.isActive !== false) || plans[0] || null);
  const [searchMember, setSearchMember] = useState('');
  const [memberOptionsOpen, setMemberOptionsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [quote, setQuote] = useState<{ membershipAmount: number; registrationFee: number; total: number } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const isDifferentPlanRenewal = Boolean(selectedMember?.membershipStatus === 'Active' && selectedPlan && selectedPlan.id !== selectedMember.membershipPlanId);

  const normalizeSearch = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const searchTerms = normalizeSearch(searchMember).split(/\s+/).filter(Boolean);
  const matchedMembers = searchTerms.length
    ? members.filter(m => {
        const searchableMember = normalizeSearch(`${m.firstName} ${m.lastName} ${m.memberId}`);
        return searchTerms.every(term => searchableMember.includes(term));
      })
    : members;

  useEffect(() => {
    if (!selectedPlan && plans.length) setSelectedPlan(plans.find(plan => plan.isActive !== false) || plans[0]);
  }, [plans, selectedPlan]);

  useEffect(() => {
    if (!selectedMember || !selectedPlan) { setQuote(null); return; }
    let active = true;
    setQuoteLoading(true);
    getSubscriptionQuote(selectedMember.id, selectedPlan.id)
      .then(value => { if (active) setQuote(value); })
      .catch(() => { if (active) setQuote(null); })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [selectedMember, selectedPlan, getSubscriptionQuote]);

  const handleCashRenewal = async () => {
    if (!selectedMember || !selectedPlan) return;
    try {
      await renewMemberMembership(selectedMember.id, selectedPlan.id, 'Cash');
      setIsSuccessModalOpen(true);
    } catch {}
  };

  return (
    <AppLayout
      pageTitle="Membership Plans & Renewal Desk"
      pageSubtitle="Activate and renew member plans using verified in-person payments."
      breadcrumbs={[{ label: 'Staff Portal', path: '/staff/dashboard' }, { label: 'Memberships' }]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs">
            <h3 className="text-base font-bold font-athletic uppercase tracking-wider text-[#111111] mb-4">
              Current Membership Offerings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map(plan => {
                const isSelected = selectedPlan?.id === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#EF1B23] bg-red-50/20 shadow-sm'
                        : 'border-[#E5E7EB] hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-athletic font-bold uppercase text-[#111111] text-base">
                        {plan.name}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {plan.durationDays} Days
                      </span>
                    </div>

                    <div className="mt-2 text-2xl font-bold font-athletic text-[#EF1B23]">
                      ₦{plan.price.toLocaleString()}
                    </div>

                    <p className="text-[11px] text-gray-500 mt-1 min-h-[32px]">
                      {plan.description}
                    </p>

                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-[11px] text-gray-600">
                      {plan.features.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 truncate">
                          <Check className="w-3 h-3 text-[#EF1B23] shrink-0" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs">
            <h3 className="text-base font-bold font-athletic uppercase tracking-wider text-[#111111] mb-1">
              Select Member for Renewal
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Search by member name or ID, choose the renewal tier, and record the payment.
            </p>

            <div className="relative mb-3">
              <input
                type="text"
                value={searchMember}
                role="combobox"
                aria-expanded={memberOptionsOpen}
                aria-controls="renewal-member-options"
                onFocus={() => setMemberOptionsOpen(true)}
                onChange={e => {
                  setSearchMember(e.target.value);
                  setSelectedMember(null);
                  setMemberOptionsOpen(true);
                }}
                placeholder="Choose member or search by name or ID…"
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>

            
            {memberOptionsOpen && <div id="renewal-member-options" role="listbox" className="border border-gray-200 rounded max-h-48 overflow-y-auto divide-y divide-gray-100 text-xs mb-4 shadow-sm">
              {matchedMembers.map(m => {
                const isChosen = selectedMember?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => { setSelectedMember(m); setSearchMember(`${m.firstName} ${m.lastName} · ${m.memberId}`); setMemberOptionsOpen(false); }}
                    className={`p-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                      isChosen ? 'bg-red-50 text-[#EF1B23]' : 'hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{m.firstName} {m.lastName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{m.memberId}</div>
                    </div>
                    <Badge>{m.membershipStatus}</Badge>
                  </div>
                );
              })}
              {!matchedMembers.length && <div className="p-4 text-center text-gray-500">No member matches that name or ID.</div>}
            </div>}

            
            {selectedMember ? (
              <div className="bg-gray-50 border border-gray-200 rounded p-4 text-xs space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Selected Member:</span>
                  <span className="font-bold text-gray-900">
                    {selectedMember.firstName} {selectedMember.lastName} ({selectedMember.memberId})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target Plan:</span>
                  <span className="font-bold text-[#EF1B23] uppercase">{selectedPlan?.name || 'Selected plan'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration:</span>
                  <span className="font-bold text-gray-900">{selectedPlan?.durationDays || 0} Days</span>
                </div>
                {isDifferentPlanRenewal && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 font-semibold text-sky-800">
                    Your new plan will start when your current plan ends.
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2"><span className="text-gray-500">Membership:</span><span className="font-bold">₦{(quote?.membershipAmount ?? selectedPlan?.price ?? 0).toLocaleString()}</span></div>
                {!!quote?.registrationFee && <div className="flex justify-between"><span className="text-gray-500">One-time registration fee:</span><span className="font-bold">₦{quote.registrationFee.toLocaleString()}</span></div>}
                <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-bold">
                  <span>Total to Collect:</span>
                  <span className="text-[#EF1B23] font-athletic text-lg">
                    {quoteLoading ? 'Calculating…' : `₦${(quote?.total ?? selectedPlan?.price ?? 0).toLocaleString()}`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded text-center text-xs text-gray-500 mb-4">
                Click a member above to configure renewal
              </div>
            )}

            
            <div className="space-y-2">
              <div>
                <button
                  disabled={!selectedMember || !quote || quoteLoading}
                  onClick={handleCashRenewal}
                  className="w-full py-2.5 bg-gray-100 disabled:opacity-50 hover:bg-gray-200 text-gray-800 font-athletic font-bold uppercase text-xs rounded transition-colors border border-gray-300"
                >
                  Collect Cash
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="MEMBERSHIP EXTENDED"
        subtitle="Receipt generated and digital access pass updated"
        maxWidth="sm"
      >
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8" />
          </div>
          <h4 className="font-athletic font-bold text-xl uppercase text-[#111111]">
            Renewal Confirmed!
          </h4>
          <p className="text-xs text-gray-600">
            {isDifferentPlanRenewal
              ? `${selectedMember?.firstName} ${selectedMember?.lastName}'s new plan is scheduled to start when the current plan ends.`
              : `${selectedMember?.firstName} ${selectedMember?.lastName}'s pass is now valid for another ${selectedPlan?.durationDays || 0} days.`}
          </p>
          <button
            onClick={() => {
              setIsSuccessModalOpen(false);
              setSelectedMember(null);
            }}
            className="w-full py-2.5 bg-[#EF1B23] text-white font-athletic font-bold uppercase text-xs rounded"
          >
            Done
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
};
