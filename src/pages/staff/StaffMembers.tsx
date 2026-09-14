import React, { useEffect, useState } from 'react';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PaystackModal } from '../../components/ui/PaystackModal';
import {
  Search,
  CheckCircle2
} from 'lucide-react';
import { Member } from '../../types';
import { Pagination } from '../../components/ui/Pagination';

export const StaffMembers: React.FC = () => {
  const { members, plans, trainers, updateMember, renewMemberMembership } = useGym();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expiring' | 'Expired' | 'Inactive'>('All');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Modals
  const [selectedMemberForRenew, setSelectedMemberForRenew] = useState<Member | null>(null);
  const [selectedPlanForRenew, setSelectedPlanForRenew] = useState(plans[2]);
  const [isPaystackOpen, setIsPaystackOpen] = useState(false);
  const [selectedMemberForTrainer, setSelectedMemberForTrainer] = useState<Member | null>(null);
  const [trainerId, setTrainerId] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredMembers = members.filter(m => {
    const matchesSearch =
      m.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery);

    const matchesStatus = statusFilter === 'All' || m.membershipStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });


  useEffect(() => setPage(1), [searchQuery, statusFilter]);
  const visibleMembers = filteredMembers.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppLayout
      pageTitle="Member Directory"
      pageSubtitle="Find members, review access status, update details, and renew memberships."
      breadcrumbs={[{ label: 'Staff Portal', path: '/staff/dashboard' }, { label: 'Members' }]}
    >
      {/* Toast alert banner */}
      {toastMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-black">✕</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 mb-6 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by ID, name, phone..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs text-[#111111] focus:bg-white focus:border-[#EF1B23] focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs font-semibold">
          {(['All', 'Active', 'Expiring', 'Expired', 'Inactive'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded transition-colors uppercase text-[11px] font-athletic tracking-wider ${
                statusFilter === st
                  ? 'bg-[#151515] text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Member Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-[#E5E7EB] font-athletic uppercase tracking-wider text-gray-600">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Member ID</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No members match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                visibleMembers.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <InitialsAvatar src={member.photo} firstName={member.firstName} lastName={member.lastName} className="h-8 w-8"/>
                        <div>
                          <span className="font-bold text-[#111111] block">
                            {member.firstName} {member.lastName}
                          </span>
                          <span className="text-[10px] text-gray-500">{member.phone}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-gray-700">
                      {member.memberId}
                    </td>

                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {member.membershipPlanName}
                    </td>

                    <td className="py-3 px-4 text-gray-600 font-mono">
                      {member.membershipExpiryDate}
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          member.membershipStatus === 'Active'
                            ? 'success'
                            : member.membershipStatus === 'Expiring'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {member.membershipStatus}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">

                        <button
                          onClick={() => { setSelectedMemberForTrainer(member); setTrainerId(member.assignedTrainerId || ''); }}
                          className="px-2.5 py-1 border border-gray-300 hover:border-[#EF1B23] text-gray-700 font-bold uppercase text-[10px] rounded transition-colors"
                        >
                          Assign Trainer
                        </button>

                        <button
                          onClick={() => {
                            setSelectedMemberForRenew(member);
                            const pl = plans.find(p => p.id === member.membershipPlanId) || plans[2];
                            setSelectedPlanForRenew(pl);
                          }}
                          className="px-2.5 py-1 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-[11px] rounded transition-colors tracking-wide"
                        >
                          Renew
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={filteredMembers.length} onPageChange={setPage} />
      </div>

      {selectedMemberForTrainer && (
        <Modal isOpen onClose={() => setSelectedMemberForTrainer(null)} title="ASSIGN TRAINER" subtitle={`Choose a trainer for ${selectedMemberForTrainer.firstName} ${selectedMemberForTrainer.lastName}`} maxWidth="sm">
          <form onSubmit={e => { e.preventDefault(); updateMember(selectedMemberForTrainer.id, { assignedTrainerId: (trainerId || null) as any }); setSelectedMemberForTrainer(null); setToastMessage(trainerId ? 'Trainer assigned successfully.' : 'Trainer assignment removed.'); setTimeout(() => setToastMessage(null), 3500); }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Trainer</label>
              <select value={trainerId} onChange={e => setTrainerId(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded bg-white focus:border-[#EF1B23] focus:outline-none">
                <option value="">No trainer assigned</option>
                {trainers.filter(t => t.isActive).map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName} - {t.specialization}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200"><button type="button" onClick={() => setSelectedMemberForTrainer(null)} className="px-4 py-2 border border-gray-300 rounded text-xs font-bold uppercase">Cancel</button><button type="submit" className="px-5 py-2 bg-[#EF1B23] text-white rounded text-xs font-bold uppercase">Save assignment</button></div>
          </form>
        </Modal>
      )}

      {/* Renew Modal */}
      {selectedMemberForRenew && (
        <Modal
          isOpen={!!selectedMemberForRenew}
          onClose={() => setSelectedMemberForRenew(null)}
          title="RENEW MEMBERSHIP"
          subtitle={`Extend membership for ${selectedMemberForRenew.firstName} ${selectedMemberForRenew.lastName}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <div className="flex justify-between">
                <span className="text-gray-500">Member ID:</span>
                <span className="font-bold text-gray-900">{selectedMemberForRenew.memberId}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Current Expiration:</span>
                <span className="font-bold text-red-600 font-mono">
                  {selectedMemberForRenew.membershipExpiryDate}
                </span>
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
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} - ₦{p.price.toLocaleString()} ({p.durationDays} Days)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  renewMemberMembership(selectedMemberForRenew.id, selectedPlanForRenew.id, 'Cash');
                  setSelectedMemberForRenew(null);
                  setToastMessage('Cash membership renewal recorded successfully.');
                }}
                className="py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white font-athletic font-bold uppercase text-xs rounded transition-colors"
              >
                Record Cash
              </button>

              <button
                onClick={() => {
                  setIsPaystackOpen(true);
                }}
                className="py-2.5 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors"
              >
                Online Paystack
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Paystack Modal */}
      {selectedMemberForRenew && (
        <PaystackModal
          isOpen={isPaystackOpen}
          onClose={() => {
            setIsPaystackOpen(false);
            setSelectedMemberForRenew(null);
          }}
          plan={selectedPlanForRenew}
          memberName={`${selectedMemberForRenew.firstName} ${selectedMemberForRenew.lastName}`}
          memberId={selectedMemberForRenew.id}
          onSuccess={() => {
            renewMemberMembership(selectedMemberForRenew.id, selectedPlanForRenew.id, 'Paystack');
            setToastMessage(`Paystack renewal confirmed for ${selectedMemberForRenew.firstName}!`);
          }}
        />
      )}

      {/* Add New Member Modal */}
    </AppLayout>
  );
};




