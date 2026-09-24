import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock3, Search, XCircle } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { QrCodeDisplay } from '../../components/ui/QrCodeDisplay';
import { formatAppDateTime } from '../../utils/dateTime';
import { useGym } from '../../context/GymContext';
import { apiUrl } from '../../lib/secureFetch';
import type { Member } from '../../types';

let cachedReceptionUrl = '';
let receptionQrRequest: Promise<string> | null = null;

const getReceptionQr = () => {
  if (cachedReceptionUrl) return Promise.resolve(cachedReceptionUrl);
  if (!receptionQrRequest) {
    receptionQrRequest = fetch(apiUrl('/api/v1/attendance/reception-qr'), { credentials: 'include' })
      .then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error?.message || 'Reception QR is unavailable.');
        cachedReceptionUrl = body.data.url;
        return cachedReceptionUrl;
      })
      .finally(() => { receptionQrRequest = null; });
  }
  return receptionQrRequest;
};

export const StaffCheckIn: React.FC = () => {
  const { members, attendance, refresh } = useGym();
  const [manualQuery, setManualQuery] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ member: Member; success: boolean; duplicate?: boolean; message: string } | null>(null);
  const [pendingMember, setPendingMember] = useState<Member | null>(null);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
  const todayLogs = attendance.filter(item => item.date === today).slice(0, 10);
  const normalizedQuery = manualQuery.trim().toLowerCase();
  const manualMatches = members.filter(member => `${member.firstName} ${member.lastName} ${member.memberId}`.toLowerCase().includes(normalizedQuery)).slice(0, 8);
  const [receptionUrl, setReceptionUrl] = useState(cachedReceptionUrl);
  const [qrError, setQrError] = useState('');

  useEffect(() => {
    let active = true;
    const loadQr = async () => {
      try {
        const url = await getReceptionQr();
        if (active) { setReceptionUrl(url); setQrError(''); }
      } catch (error) {
        if (active) { setReceptionUrl(''); setQrError(error instanceof Error ? error.message : 'Reception QR is unavailable.'); }
      }
    };
    void loadQr();
    return () => { active = false; };
  }, []);

  const recordManualCheckIn = async (member: Member) => {
    setBusy(true);
    try {
      const response = await fetch(apiUrl('/api/v1/attendance/manual'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: member.id }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Check-in could not be recorded.');
      const duplicate = body.data?.duplicate === true;
      const previous = body.data?.checked_in_at ? new Date(body.data.checked_in_at) : null;
      const previousTime = previous && !Number.isNaN(previous.getTime())
        ? formatAppDateTime(previous)
        : null;
      setResult({ member, success: true, duplicate, message: duplicate
        ? `Already checked in${previousTime ? ` on ${previousTime}` : ''}. No new visit was recorded.`
        : 'Manual check-in was recorded successfully.' });
      setManualQuery(''); setManualOpen(false); await refresh();
    } catch (error) {
      setResult({ member, success: false, message: error instanceof Error ? error.message : 'Check-in could not be recorded.' });
    } finally { setBusy(false); setPendingMember(null); }
  };

  return <AppLayout pageTitle="Reception Check-in" pageSubtitle="Display the permanent reception QR and handle manual check-ins when needed." breadcrumbs={[{ label: 'Staff Portal', path: '/staff/dashboard' }, { label: 'Check-in' }]}>
    <section className="reception-print-card mb-6 flex flex-col items-center justify-center gap-6 rounded-2xl border border-gray-200 bg-white px-5 py-7 shadow-xs sm:flex-row sm:px-8">
      {receptionUrl ? <QrCodeDisplay value={receptionUrl} showEnlargeButton /> : <div className="grid h-56 w-56 place-items-center rounded-xl border border-gray-200 bg-gray-50"><div className="h-36 w-36 animate-pulse rounded-lg bg-gray-200"/></div>}
      <div className="max-w-sm text-center sm:text-left"><span className="text-[10px] font-black uppercase tracking-[.2em] text-[#EF1B23]">reception QR</span><h2 className="mt-2 text-2xl font-black text-[#111]">Scan. Check in. Train.</h2><p className="mt-2 text-sm text-gray-500">{qrError}</p></div>
    </section>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-black uppercase">Manual member check-in</h2><p className="mt-1 text-xs text-gray-500">Use this only when a member cannot scan the reception code.</p>
        <div className="relative mt-5"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400"/><input value={manualQuery} onFocus={() => setManualOpen(true)} onChange={event => { setManualQuery(event.target.value); setManualOpen(true); }} placeholder="Search member name or ID…" className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#EF1B23]"/></div>
        {manualOpen && <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">{manualMatches.map(member => <button type="button" key={member.id} disabled={busy} onClick={() => setPendingMember(member)} className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-3 text-left text-xs last:border-0 hover:bg-gray-50 disabled:opacity-50"><span><strong className="block text-sm">{member.firstName} {member.lastName}</strong><span className="font-mono text-gray-500">{member.memberId}</span></span><Badge>{member.membershipStatus}</Badge></button>)}{!manualMatches.length && <p className="p-5 text-center text-xs text-gray-500">No member matches that name or ID.</p>}</div>}
        {result && <div className={`mt-5 rounded-xl border p-4 ${result.duplicate ? 'border-amber-200 bg-amber-50 text-amber-900' : result.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}><div className="flex items-start gap-3">{result.duplicate ? <Clock3 className="h-6 w-6 shrink-0"/> : result.success ? <CheckCircle className="h-6 w-6 shrink-0"/> : <XCircle className="h-6 w-6 shrink-0"/>}<div><strong className="block">{result.member.firstName} {result.member.lastName}</strong><p className="mt-1 text-xs">{result.message}</p></div></div></div>}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs"><div className="flex items-center justify-between"><h2 className="text-xs font-black uppercase">Today's check-ins</h2><span className="text-[10px] text-gray-400">{todayLogs.length} recent</span></div><div className="mt-4 space-y-2">{todayLogs.map(log => <div key={log.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs"><div className="min-w-0"><strong className="block truncate">{log.memberName}</strong><span className="font-mono text-[10px] text-gray-500">{log.memberId}</span></div><div className="text-right"><Badge variant={log.status === 'Denied' ? 'danger' : 'success'}>{log.status}</Badge><span className="mt-1 block font-mono text-[10px] text-gray-500">{log.time}</span></div></div>)}{!todayLogs.length && <p className="py-10 text-center text-xs text-gray-500">No check-ins recorded today.</p>}</div></section>
    </div>
    <ConfirmDialog open={Boolean(pendingMember)} title="Confirm manual check-in" message={pendingMember ? `Record an entrance check-in for ${pendingMember.firstName} ${pendingMember.lastName} (${pendingMember.memberId})?` : ''} confirmLabel="Confirm check-in" tone="primary" busy={busy} onClose={() => setPendingMember(null)} onConfirm={() => { if (pendingMember) void recordManualCheckIn(pendingMember); }}/>
  </AppLayout>;
};
