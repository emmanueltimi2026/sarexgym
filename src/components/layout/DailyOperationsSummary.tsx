import React from 'react';
import { CalendarCheck, CircleAlert, Clock3, CreditCard, Users, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { formatAppDate } from '../../utils/dateTime';

export interface DailyOperationsSummaryData {
  reportDate: string;
  timezone: string;
  attendance: {
    successfulCheckIns: number;
    uniqueMembers: number;
    deniedAttempts: number;
    denialsByReason: Array<{ reason: string; attempts: number }>;
    peakPeriod: { hour: string; checkIns: number } | null;
  };
  revenue: { currencies: Array<{ currency: string; successfulPaymentCount: number; revenueMinor: string; methods: Array<{ method: string; paymentCount: number; amountMinor: string }> }> };
  memberships: { newMembers: number; paidRenewals: number; expiredMemberships: number };
}

const formatMoney = (minor: string, currency: string) => {
  try {
    const amount = BigInt(minor || '0');
    const whole = amount / 100n;
    const fraction = String(amount % 100n).padStart(2, '0');
    const numberFormat = new Intl.NumberFormat('en-NG');
    const parts = new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).formatToParts(1.23);
    let inserted = false;
    return parts.map(part => {
      if (part.type === 'integer') {
        if (inserted) return '';
        inserted = true;
        return numberFormat.format(whole);
      }
      if (part.type === 'group') return '';
      if (part.type === 'fraction') return fraction;
      return part.value;
    }).join('');
  } catch {
    return `${currency} ${minor}`;
  }
};

const Metric = ({ label, value, note, icon: Icon }: { label: string; value: string | number; note?: string; icon: React.ComponentType<{ className?: string }> }) => (
  <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p><Icon className="h-4 w-4 text-[#EF1B23]" aria-hidden="true"/></div>
    <p className="mt-2 text-2xl font-black tracking-tight text-[#111111]">{value}</p>
    {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
  </article>
);

const SummarySkeleton: React.FC = () => (
  <div className="space-y-5 p-1" role="status" aria-label="Loading operations summary">
    <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />)}
    </div>
    <div className="h-32 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
    <div className="grid gap-3 sm:grid-cols-2"><div className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100" /><div className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100" /></div>
    <span className="sr-only">Loading verified operations data</span>
  </div>
);

export const DailyOperationsSummary: React.FC<{ data: DailyOperationsSummaryData | null; open: boolean; busy?: boolean; loading?: boolean; error?: string; onDismiss: () => void }> = ({ data, open, busy = false, loading = false, error, onDismiss }) => (
  <Modal isOpen={open} onClose={onDismiss} title="Yesterday’s Operations Summary" subtitle={data ? `${formatAppDate(data.reportDate)} · ${data.timezone}` : 'Loading verified operations data…'} maxWidth="2xl">
    {loading || !data ? error ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">{error}<p className="mt-2 text-xs text-red-700">Close this dialog and try again from the dashboard.</p></div> : <SummarySkeleton/> : <div className="max-h-[min(72vh,46rem)] space-y-5 overflow-y-auto pr-1">
      <p className="text-xs leading-relaxed text-gray-500">Activity from {formatAppDate(data.reportDate)} in the gym’s {data.timezone} timezone. Payments are grouped by currency and include successful transactions only.</p>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section aria-label="Attendance summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Successful check-ins" value={data.attendance.successfulCheckIns} note="Visits, including repeat visits" icon={CalendarCheck}/>
        <Metric label="Members attended" value={data.attendance.uniqueMembers} note="Unique members" icon={Users}/>
        <Metric label="Denied attempts" value={data.attendance.deniedAttempts} note="Persisted reception attempts" icon={CircleAlert}/>
      </section>
      <section aria-label="Membership activity" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="New members" value={data.memberships.newMembers} note="Registered yesterday" icon={Users}/>
        <Metric label="Paid renewals" value={data.memberships.paidRenewals} note="Successful payment after a prior paid membership" icon={CreditCard}/>
        <Metric label="Expired memberships" value={data.memberships.expiredMemberships} note="Expired status with an end date yesterday" icon={Clock3}/>
      </section>
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-4" aria-label="Payment summary">
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black">Payments</h3><span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Verified records</span></div>
        {!data.revenue.currencies.length ? <p className="mt-3 rounded-lg bg-white p-4 text-center text-sm text-gray-500">No payment records were recorded yesterday.</p> : <div className="mt-3 space-y-3">{data.revenue.currencies.map(currency => <div key={currency.currency} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Successful revenue · {currency.currency}</p><p className="mt-1 text-xl font-black">{formatMoney(currency.revenueMinor, currency.currency)}</p></div><p className="text-sm font-bold">{currency.successfulPaymentCount} successful payments</p></div>
          {currency.methods.length > 0 && <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100">{currency.methods.map(method => <li key={method.method} className="flex justify-between gap-3 py-2 text-xs"><span className="capitalize text-gray-600">{method.method}</span><span className="font-bold">{method.paymentCount} · {formatMoney(method.amountMinor, currency.currency)}</span></li>)}</ul>}
        </div>)}</div>}
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-4"><h3 className="text-sm font-black">Check-in denials</h3>{data.attendance.denialsByReason.length ? <ul className="mt-3 space-y-2">{data.attendance.denialsByReason.map(item => <li key={item.reason} className="flex justify-between gap-3 text-xs"><span className="text-gray-600">{item.reason}</span><strong>{item.attempts}</strong></li>)}</ul> : <p className="mt-3 text-xs text-gray-500">No denied check-ins yesterday.</p>}</div>
        <div className="rounded-xl border border-gray-200 p-4"><h3 className="text-sm font-black">Attendance pattern</h3>{data.attendance.peakPeriod ? <p className="mt-3 text-xs text-gray-600">Busiest hour: <strong className="text-[#111111]">{data.attendance.peakPeriod.hour}–{String((Number(data.attendance.peakPeriod.hour.slice(0, 2)) + 1) % 24).padStart(2, '0')}:00</strong> ({data.attendance.peakPeriod.checkIns} check-ins)</p> : <p className="mt-3 text-xs text-gray-500">No successful check-ins yesterday.</p>}</div>
      </section>
      <div className="flex justify-end border-t border-gray-100 pt-4"><button onClick={onDismiss} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#151515] px-4 py-2 text-xs font-bold text-white hover:bg-[#303030] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EF1B23] disabled:opacity-50"><X className="h-4 w-4"/> {busy ? 'Saving…' : 'Dismiss summary'}</button></div>
    </div>}
  </Modal>
);
