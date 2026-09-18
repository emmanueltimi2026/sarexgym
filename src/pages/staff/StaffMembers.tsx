import React, { useEffect, useState } from 'react';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import {
  Search,
  CheckCircle2,
} from 'lucide-react';
import { Pagination } from '../../components/ui/Pagination';

export const StaffMembers: React.FC = () => {
  const { members, navigate } = useGym();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Scheduled' | 'Expiring' | 'Expired' | 'Frozen' | 'Inactive'>('All');
  const [page, setPage] = useState(1);
  const pageSize = 12;

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
      
      {toastMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-black">✕</button>
        </div>
      )}

      
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

        
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs font-semibold">
          {(['All', 'Active', 'Scheduled', 'Expiring', 'Expired', 'Frozen', 'Inactive'] as const).map(st => (
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

      
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-[#E5E7EB] font-athletic uppercase tracking-wider text-gray-600">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Member ID</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Status</th>
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
                  <tr key={member.id} role="link" tabIndex={0} onClick={() => navigate(`/staff/members/${member.id}`)} onKeyDown={event => { if (event.key === 'Enter') navigate(`/staff/members/${member.id}`); }} className="cursor-pointer hover:bg-gray-50 transition-colors focus-within:bg-gray-50">
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

                    <td className="py-3 px-4 text-gray-600">
                      {member.email}
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
                      <Badge>{member.membershipStatus}</Badge>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={filteredMembers.length} onPageChange={setPage} />
      </div>

    </AppLayout>
  );
};
