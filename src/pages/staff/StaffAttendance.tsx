import React, { useEffect, useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { Search, QrCode, UserCheck } from 'lucide-react';
import { Pagination } from '../../components/ui/Pagination';

export const StaffAttendance: React.FC = () => {
  const { attendance, navigate } = useGym();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Checked In' | 'Denied'>('All');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filteredLogs = attendance.filter(log => {
    const matchesSearch =
      log.memberName.toLowerCase().includes(search.toLowerCase()) ||
      log.memberId.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  useEffect(() => setPage(1), [search, statusFilter]);
  const visibleLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppLayout
      pageTitle="Entrance Attendance Records"
      pageSubtitle="Review every successful member check-in and unsuccessful access attempt."
      breadcrumbs={[{ label: 'Staff Portal', path: '/staff/dashboard' }, { label: 'Attendance' }]}
      actions={
        <button
          onClick={() => navigate('/staff/check-in')}
          className="px-4 py-2 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <QrCode className="w-4 h-4" />
          Open Scanner
        </button>
      }
    >
      
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 mb-6 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search member name or ID..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs text-[#111111] focus:bg-white focus:border-[#EF1B23] focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          {(['All', 'Checked In', 'Denied'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded text-[11px] font-athletic uppercase tracking-wider transition-colors ${
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
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Member ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Verification Method</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Notes / Gate Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No attendance logs match your filter criteria.
                  </td>
                </tr>
              ) : (
                visibleLogs.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#111111]">
                      {item.memberName}
                    </td>

                    <td className="py-3 px-4 font-mono text-gray-600">
                      {item.memberId}
                    </td>

                    <td className="py-3 px-4 text-gray-600">
                      {item.date}
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-gray-800">
                      {item.time}
                    </td>

                    <td className="py-3 px-4 text-gray-600 flex items-center gap-1.5">
                      {item.method === 'Reception QR' ? (
                        <QrCode className="w-3.5 h-3.5 text-[#EF1B23]" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      <span>{item.method}</span>
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={item.status !== 'Denied' ? 'success' : 'danger'}>
                        {item.status}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-gray-500 text-[11px]">
                      {item.denialReason ? (
                        <span className="text-[#EF1B23] font-medium">{item.denialReason}</span>
                      ) : (
                        <span>Checked in successfully</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={filteredLogs.length} onPageChange={setPage} />
      </div>
    </AppLayout>
  );
};

