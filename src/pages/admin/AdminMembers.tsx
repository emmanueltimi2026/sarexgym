import React, { useEffect, useState } from 'react';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Search,
  Edit2
} from 'lucide-react';
import { Member } from '../../types';
import { Pagination } from '../../components/ui/Pagination';

export const AdminMembers: React.FC = () => {
  const { members, plans, updateMember } = useGym();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [planFilter, setPlanFilter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Modals
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const filteredMembers = members.filter(m => {
    const matchesSearch =
      m.firstName.toLowerCase().includes(search.toLowerCase()) ||
      m.lastName.toLowerCase().includes(search.toLowerCase()) ||
      m.memberId.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search) ||
      m.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || m.membershipStatus === statusFilter;
    const matchesPlan = planFilter === 'All' || m.membershipPlanId === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });
  useEffect(() => setPage(1), [search, statusFilter, planFilter]);
  const visibleMembers = filteredMembers.slice((page - 1) * pageSize, page * pageSize);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    updateMember(editingMember.id, {
      firstName: editingMember.firstName,
      lastName: editingMember.lastName,
      email: editingMember.email,
      phone: editingMember.phone,
      fitnessGoal: editingMember.fitnessGoal,
      membershipStatus: editingMember.membershipStatus
    });
    setEditingMember(null);
  };

  return (
    <AppLayout
      pageTitle="Member Management"
      pageSubtitle="View member accounts, membership status, assigned trainers, and access passes in one place."
      breadcrumbs={[{ label: 'Administration' }, { label: 'Members' }]}
    >
      {/* Search & Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 mb-6 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, name, email, phone..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs text-[#111111] focus:bg-white focus:border-[#EF1B23] focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded font-semibold text-gray-700"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Expiring">Expiring Soon</option>
            <option value="Expired">Expired Only</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded font-semibold text-gray-700"
          >
            <option value="All">All Membership Plans</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Members Master Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-[#E5E7EB] font-athletic uppercase tracking-wider text-gray-600">
              <tr>
                <th className="py-3 px-4">Member / Member</th>
                <th className="py-3 px-4">Member ID</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Pass Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No members found matching your search.
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
                          <span className="text-[10px] text-gray-500">{member.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-gray-700">
                      {member.memberId}
                    </td>

                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {member.membershipPlanName}
                    </td>

                    <td className="py-3 px-4 text-gray-500">
                      {member.membershipStartDate}
                    </td>

                    <td className="py-3 px-4 font-mono text-gray-700">
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
                          onClick={() => setEditingMember(member)}
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
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

      {/* Edit Member Modal */}
      {editingMember && (
        <Modal
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          title="EDIT MEMBER PROFILE"
          subtitle={`Editing records for ${editingMember.memberId}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={editingMember.firstName}
                  onChange={e => setEditingMember({ ...editingMember, firstName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={editingMember.lastName}
                  onChange={e => setEditingMember({ ...editingMember, lastName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editingMember.email}
                  onChange={e => setEditingMember({ ...editingMember, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={editingMember.phone}
                  onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">Membership Status</label>
              <select
                value={editingMember.membershipStatus}
                onChange={e => setEditingMember({ ...editingMember, membershipStatus: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none bg-white"
              >
                <option value="Active">Active</option>
                <option value="Expiring">Expiring</option>
                <option value="Expired">Expired</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">Fitness Goal</label>
              <input
                type="text"
                value={editingMember.fitnessGoal}
                onChange={e => setEditingMember({ ...editingMember, fitnessGoal: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 border border-gray-300 rounded text-xs font-bold uppercase text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

    </AppLayout>
  );
};


