import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { formatAppTime } from '../../utils/dateTime';
import {
  ArrowRight, CalendarCheck, Clock3, TrendingUp, UserCheck, Users
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { members, attendance, payments, plans, navigate } = useGym();
  const [revenuePeriod, setRevenuePeriod] = useState<'6' | '12' | 'year'>('6');

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.membershipStatus === 'Active').length;
  const expiredMembers = members.filter(m => m.membershipStatus === 'Expired').length;
  const expiringMembers = members.filter(m => m.membershipStatus === 'Expiring').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckIns = attendance.filter(a => a.date === todayStr);

  const totalRevenue = payments
    .filter(p => p.status === 'Successful')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const checkInDisplayTime = (record: typeof attendance[number]) => record.checkInTime
    ? formatAppTime(record.checkInTime)
    : 'Time unavailable';

  const now = new Date();
  const revenueMonths = revenuePeriod === '6' ? 6 : revenuePeriod === '12' ? 12 : now.getMonth() + 1;
  const revenueChartData = Array.from({ length: revenueMonths }, (_, index) => {
    const date = revenuePeriod === 'year'
      ? new Date(now.getFullYear(), index, 1)
      : new Date(now.getFullYear(), now.getMonth() - revenueMonths + 1 + index, 1);
    const revenue = payments.filter(payment => {
      const paidAt = new Date(payment.date);
      return payment.status === 'Successful' && paidAt.getFullYear() === date.getFullYear() && paidAt.getMonth() === date.getMonth();
    }).reduce((sum, payment) => sum + payment.amount, 0);
    return { month: date.toLocaleDateString('en-NG', { month: 'short', ...(revenuePeriod === '12' ? { year: '2-digit' } : {}) }), fullMonth: date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }), revenue };
  });
  const formatRevenueAxis = (value: number) => value >= 1_000_000 ? `₦${Number((value / 1_000_000).toFixed(1))}m` : value >= 1_000 ? `₦${Math.round(value / 1_000)}k` : `₦${value}`;

  const planData = plans.map(p => ({
    name: p.name,
    value: members.filter(m => m.membershipPlanId === p.id && m.membershipStatus === 'Active').length
  })).filter(item => item.value > 0);

  const PIE_COLORS = ['#EF1B23', '#151515', '#6B7280', '#D97706'];

  const expiringList = members
    .map(member => ({ member, daysRemaining: member.membershipExpiryDate ? Math.ceil((new Date(member.membershipExpiryDate).getTime() - now.getTime()) / 86_400_000) : null }))
    .filter(item => item.daysRemaining !== null && item.daysRemaining >= 0 && item.daysRemaining <= 7)
    .sort((a, b) => Number(a.daysRemaining) - Number(b.daysRemaining))
    .slice(0, 5);

  return (
    <AppLayout
      pageTitle="Dashboard"
      pageSubtitle="Monitor memberships, attendance, payments, and daily gym activity."
      breadcrumbs={[{ label: 'Administration' }, { label: 'Dashboard' }]}
    >
      
      <div className="admin-dashboard-stats grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <StatCard label="Total Members" value={totalMembers} subtext="All registered members" icon={Users}/>
        <StatCard label="Active Members" value={activeMembers} subtext="Currently active" icon={UserCheck}/>
        <StatCard label="Checked In Today" value={todayCheckIns.length} subtext="Member check-ins" icon={CalendarCheck}/>
        <StatCard label="Expiring Soon" value={expiringMembers+expiredMembers} subtext="Memberships to review" icon={Clock3}/>
        <div className="col-span-2 sm:col-span-1"><StatCard label="Total Revenue" value={`₦${totalRevenue.toLocaleString()}`} subtext="Successful payments" icon={TrendingUp}/></div>
      </div>

      
      <div className="admin-dashboard-operations flex flex-col lg:flex-row gap-6 mb-6">
        
        <div className="flex-1 lg:flex-[3] bg-white border border-[#E5E7EB] rounded-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB] flex justify-between items-center bg-[#FDFDFD]">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#111111]">
              Recent Entrance Activity
            </h3>
            <button
              onClick={() => navigate('/admin/attendance')}
              className="text-[10px] font-bold text-[#EF1B23] uppercase hover:underline"
            >
              View All
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-[#6B7280] border-b border-[#E5E7EB] sticky top-0">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Member ID</th>
                  <th className="px-4 py-3">Membership</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[#E5E7EB]">
                {attendance.slice(0, 5).map(att => {
                  const initials = att.memberName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();
                  return (
                    <tr key={att.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-[#111111]">
                          {initials}
                        </div>
                        <span className="font-bold text-[#111111]">{att.memberName}</span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">
                        {att.memberId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 rounded-xs text-[10px] font-bold uppercase text-[#111111]">
                          {att.membershipPlan || 'No membership plan'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-[#6B7280]">{att.method || 'Unknown'}</td>
                      <td className="px-4 py-3 text-xs text-[#111111]">{checkInDisplayTime(att)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-black uppercase ${
                            att.status !== 'Denied' ? 'text-green-600' : 'text-[#EF1B23]'
                          }`}
                        >
                          {att.status !== 'Denied' ? 'Checked in' : 'Denied'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        
        <div className="flex-1 lg:flex-[1.5] bg-white border border-[#E5E7EB] rounded-sm flex flex-col">
          <div className="p-4 border-b border-[#E5E7EB] bg-[#FDFDFD] flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#111111]">
              Expiring Soon
            </h3>
            <button
              onClick={() => navigate('/admin/members')}
              className="text-[10px] font-bold text-[#EF1B23] uppercase hover:underline"
            >
              Manage
            </button>
          </div>

          <div className="p-4 space-y-3 flex-1">
            {expiringList.map(({ member, daysRemaining }) => (
              <div key={member.id} className="p-3 border border-[#E5E7EB] rounded-sm">
                <div className="flex justify-between items-start gap-3">
                  <span className="text-xs font-bold text-[#111111]">{member.firstName} {member.lastName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 font-black uppercase rounded-xs ${Number(daysRemaining) <= 1 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {daysRemaining === 0 ? 'Expires today' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`}
                  </span>
                </div>
                <p className="text-[10px] text-[#6B7280] mt-1 uppercase font-medium">{member.membershipPlanName}</p>
              </div>
            ))}
            {!expiringList.length && <p className="py-8 text-center text-xs text-[#6B7280]">No memberships expire in the next seven days.</p>}
          </div>
        </div>
      </div>

      
      <div className="admin-dashboard-analytics grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        
        <div className="lg:col-span-8 bg-white border border-[#E5E7EB] rounded-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FDFDFD]">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[#111111]">
                Membership Revenue
              </h3>
              <p className="text-[10px] text-[#6B7280]">Successful membership payments received over time</p>
            </div>
            <select aria-label="Revenue period" value={revenuePeriod} onChange={event=>setRevenuePeriod(event.target.value as '6'|'12'|'year')} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700"><option value="6">Last 6 months</option><option value="12">Last 12 months</option><option value="year">This year</option></select>
          </div>

          <div className="p-5 flex-1">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="#6B7280" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    width={62}
                    tickFormatter={formatRevenueAxis}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₦${Number(val).toLocaleString()}`, 'Revenue received']}
                    labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullMonth || _label}
                    contentStyle={{ backgroundColor: '#151515', borderColor: '#333', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                    labelStyle={{ color: '#fff', fontWeight: 700 }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="revenue" fill="#EF1B23" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {!revenueChartData.some(item => item.revenue > 0) && <p className="mt-3 text-center text-xs text-[#6B7280]">No successful payments recorded in the last six months.</p>}
          </div>
        </div>

        
        <div className="lg:col-span-4 bg-white border border-[#E5E7EB] rounded-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-[#E5E7EB] bg-[#FDFDFD]">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#111111]">
              Membership Tier Mix
            </h3>
            <p className="text-[10px] text-[#6B7280]">Distribution across active tiers</p>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between">
            <div className="h-36 w-full my-1">
              {planData.length ? <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {planData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#151515', borderColor: '#333', color: '#fff', borderRadius: '2px', fontSize: '11px' }}
                    labelStyle={{ color: '#fff', fontWeight: 700 }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} active member${Number(value) === 1 ? '' : 's'}`, name]}
                  />
                </PieChart>
              </ResponsiveContainer> : <div className="grid h-full place-items-center text-center text-xs text-[#6B7280]">No active member plan mix yet.</div>}
            </div>

            
            <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-[#E5E7EB]">
              {planData.map((p, idx) => (
                <div key={p.name} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-[#6B7280] text-[11px] font-medium truncate">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      
      <div className="admin-dashboard-recent">
        
        <div className="bg-white border border-[#E5E7EB] rounded-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FDFDFD]">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#111111]">
              Recent Payment History
            </h3>
            <button
              onClick={() => navigate('/admin/payments')}
              className="text-[10px] font-bold text-[#EF1B23] uppercase hover:underline flex items-center gap-1"
            >
              Full Ledger <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-[#E5E7EB] bg-gray-50 text-[10px] font-black uppercase tracking-wider text-[#6B7280]"><tr><th className="px-4 py-3">Transaction reference</th><th className="px-4 py-3">Member</th><th className="px-4 py-3">Membership plan</th><th className="px-4 py-3">Payment method</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {payments.slice(0, 5).map(pay => <tr key={pay.id} className="hover:bg-gray-50"><td className="max-w-[220px] break-all px-4 py-3 font-mono text-[10px] text-[#6B7280]">{pay.transactionReference || pay.reference || '—'}</td><td className="px-4 py-3"><strong className="block text-[#111111]">{pay.memberName}</strong><span className="font-mono text-[10px] text-[#6B7280]">{pay.memberId}</span></td><td className="px-4 py-3 font-semibold text-[#111111]">{pay.planName}</td><td className="px-4 py-3 text-[#6B7280]">{pay.paymentMethod || pay.method || '—'}</td><td className="whitespace-nowrap px-4 py-3 text-sm font-black text-[#111111]">₦{pay.amount.toLocaleString()}</td><td className="whitespace-nowrap px-4 py-3 text-[#6B7280]">{new Date(pay.date).toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'})}</td><td className="px-4 py-3"><Badge variant={pay.status === 'Successful' ? 'success' : pay.status === 'Failed' ? 'danger' : 'warning'}>{pay.status}</Badge></td></tr>)}
                {!payments.length && <tr><td colSpan={7} className="p-8 text-center text-xs text-[#6B7280]">No payment records yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppLayout>
  );
};
