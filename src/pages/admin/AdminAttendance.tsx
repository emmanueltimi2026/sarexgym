import React, { useEffect, useMemo, useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { Search, QrCode, UserCheck, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Pagination } from '../../components/ui/Pagination';

export const AdminAttendance: React.FC = () => {
  const { attendance, refresh } = useGym();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Checked In' | 'Denied'>('All');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const totalScans = attendance.length;
  const grantedScans = attendance.filter(a => a.status !== 'Denied').length;
  const deniedScans = attendance.filter(a => a.status === 'Denied').length;

  useEffect(() => {
    const update = () => void refresh();
    const timer = window.setInterval(update, 30_000);
    const handleVisibility = () => document.visibilityState === 'visible' && update();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh]);

  const hourlyData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 12 }, (_, bucket) => {
      const hour = bucket * 2;
      const checkIns = attendance.filter(item => {
        if (item.status === 'Denied') return false;
        const value = item.checkInTime || item.time || item.date;
        if (!value) return false;
        const checkedInAt = new Date(value);
        return !Number.isNaN(checkedInAt.getTime())
          && checkedInAt.getFullYear() === today.getFullYear()
          && checkedInAt.getMonth() === today.getMonth()
          && checkedInAt.getDate() === today.getDate()
          && Math.floor(checkedInAt.getHours() / 2) === bucket;
      }).length;
      return {
        hour: new Date(2000, 0, 1, hour).toLocaleTimeString('en-NG', { hour: '2-digit' }),
        checkIns
      };
    });
  }, [attendance]);

  const filtered = attendance.filter(item => {
    const matchesSearch =
      item.memberName.toLowerCase().includes(search.toLowerCase()) ||
      item.memberId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  useEffect(() => setPage(1), [search, statusFilter]);
  const visibleAttendance = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppLayout
      pageTitle="Attendance Record"
      pageSubtitle="Review member check-ins, busy training hours, and unsuccessful access attempts."
      breadcrumbs={[{ label: 'Administration' }, { label: 'Attendance' }]}
    >
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Scans Logged"
          value={totalScans}
          subtext="Biometric & optical scans"
          icon={QrCode}
        />
        <StatCard
          label="Successful Check-ins"
          value={grantedScans}
          trend={{ value: `${totalScans ? Math.round((grantedScans / totalScans) * 100) : 0}% clearance rate`, isPositive: true }}
          icon={UserCheck}
        />
        <StatCard
          label="Denied Gate Attempts"
          value={deniedScans}
          trend={{ value: 'Expired / Suspended', isPositive: false }}
          icon={Clock}
        />
      </div>

      
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 mb-6 shadow-xs">
        <h3 className="font-athletic font-bold uppercase tracking-wider text-base text-[#111111] mb-1">
          Today's Member Check-ins by Hour
        </h3>
        <p className="text-xs text-gray-500 mb-4">Updates automatically from recorded QR and manual check-ins.</p>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="hour" stroke="#6B7280" fontSize={11} tickLine={false} />
              <YAxis stroke="#6B7280" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#151515', borderColor: '#333', color: '#fff', borderRadius: '4px', fontSize: '12px' }}
              />
              <Bar dataKey="checkIns" name="Check-ins" fill="#EF1B23" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      
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
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Denial / Audit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleAttendance.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#111111]">{item.memberName}</td>
                  <td className="py-3 px-4 font-mono text-gray-600">{item.memberId}</td>
                  <td className="py-3 px-4 text-gray-600">{item.date}</td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-800">{item.time}</td>
                  <td className="py-3 px-4 text-gray-600">{item.method}</td>
                  <td className="py-3 px-4">
                    <Badge variant={item.status !== 'Denied' ? 'success' : 'danger'}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-[11px]">
                    {item.denialReason ? (
                      <span className="text-[#EF1B23] font-semibold">{item.denialReason}</span>
                    ) : (
                      'Checked in successfully'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
      </div>
    </AppLayout>
  );
};
