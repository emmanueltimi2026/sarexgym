import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, IdCard, Loader2, QrCode, ShieldAlert } from 'lucide-react';
import { useGym } from '../../context/GymContext';

const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

type CheckInResult = {
  checked_in_at: string;
  member: { memberId: string; firstName: string; lastName: string; photo?: string; planName: string; membershipExpiryDate: string; membershipStatus?: string };
  branch?: { name: string };
};

export const ReceptionCheckIn: React.FC = () => {
  const { navigate } = useGym();
  const started = useRef(false);
  const [status, setStatus] = useState<'checking' | 'success' | 'denied'>('checking');
  const [message, setMessage] = useState('Confirming your membership…');
  const [result, setResult] = useState<CheckInResult | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const checkIn = async () => {
      try {
        const token = new URLSearchParams(window.location.search).get('token');
        if (!token) throw new Error('Scan the QR code displayed at reception to check in.');
        const csrfResponse = await fetch(`${BASE}/api/v1/csrf`, { credentials: 'include' });
        const csrfBody = await csrfResponse.json().catch(() => ({}));
        if (!csrfResponse.ok || !csrfBody.csrfToken) throw new Error('Your secure check-in session could not be verified. Please sign in again and rescan the reception code.');
        const response = await fetch(`${BASE}/api/v1/attendance/reception-check-in`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfBody.csrfToken }, body: JSON.stringify({ token }) });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error?.message || 'Check-in could not be completed.');
        if (!body?.data?.member) throw new Error('Check-in was recorded, but the confirmation details could not be displayed. Open your dashboard to confirm today’s visit.');
        setResult(body.data);
        setStatus('success');
        setMessage('Show this screen to reception so they can verify your member details.');
      } catch (error) {
        setStatus('denied');
        setMessage(error instanceof Error ? error.message : 'Check-in could not be completed.');
      }
    };
    void checkIn();
  }, []);

  return <main className="grid h-[100svh] overflow-hidden bg-[#f4f5f7] p-2 sm:place-items-center sm:p-4">
    <section className="m-auto w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl sm:max-w-md sm:rounded-3xl">
      <header className="bg-[#111] px-5 py-3 text-center text-white sm:px-6 sm:py-6">
        <img src="/assets/brand/sarex-logo.png" alt="SAREX Fitness Clinic" className="mx-auto h-8 w-auto object-contain sm:h-12"/>
        <p className="mt-1.5 text-[8px] font-bold uppercase tracking-[.22em] text-gray-400 sm:mt-3 sm:text-[10px]">Reception check-in</p>
      </header>
      <div className="p-4 text-center sm:p-8">
        {status === 'checking' && <><Loader2 className="mx-auto h-9 w-9 animate-spin text-[#EF1B23] sm:h-12 sm:w-12"/><h1 className="mt-3 text-lg font-black sm:mt-5 sm:text-2xl">Checking you in</h1></>}
        {status === 'success' && result && <>
          <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500 sm:h-14 sm:w-14"/>
          <h1 className="mt-2 text-lg font-black text-[#111] sm:mt-4 sm:text-2xl">Check-in successful</h1>
          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-left text-[#111] sm:mt-6 sm:rounded-2xl sm:p-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <img src={result.member.photo || '/assets/brand/sarex-logo.png'} alt={`${result.member.firstName} ${result.member.lastName}`} className="h-12 w-12 rounded-xl border border-white bg-white object-cover sm:h-16 sm:w-16 sm:rounded-2xl"/>
              <div className="min-w-0"><strong className="block truncate text-sm font-black text-[#111] sm:text-lg">{result.member.firstName} {result.member.lastName}</strong><span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 sm:px-2.5 sm:py-1 sm:text-[10px]"><IdCard className="h-3 w-3 sm:h-3.5 sm:w-3.5"/>{result.member.memberId}</span></div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] sm:mt-5 sm:gap-3 sm:text-xs">
              <div><dt className="text-gray-500">Subscription</dt><dd className="font-bold text-emerald-700 sm:mt-1">{result.member.membershipStatus || 'Active'}</dd></div>
              <div><dt className="text-gray-500">Plan</dt><dd className="truncate font-bold text-[#111] sm:mt-1">{result.member.planName}</dd></div>
              <div><dt className="text-gray-500">Check-in time</dt><dd className="font-bold text-[#111] sm:mt-1">{new Date(result.checked_in_at).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'})}</dd></div>
              <div><dt className="text-gray-500">Access</dt><dd className="font-bold text-emerald-700 sm:mt-1">Approved</dd></div>
              <div className="col-span-2"><dt className="text-gray-500">Membership valid until</dt><dd className="font-bold text-[#111] sm:mt-1">{new Date(result.member.membershipExpiryDate).toLocaleDateString()}</dd></div>
            </dl>
          </div>
        </>}
        {status === 'denied' && <><ShieldAlert className="mx-auto h-10 w-10 text-[#EF1B23] sm:h-14 sm:w-14"/><h1 className="mt-2 text-lg font-black sm:mt-4 sm:text-2xl">Check-in not completed</h1></>}
        <p className="mx-auto mt-2 max-w-sm text-[11px] leading-4 text-gray-600 sm:mt-4 sm:text-sm sm:leading-6">{message}</p>
        <div className={`mt-3 grid gap-2 sm:mt-7 ${status === 'denied' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {status === 'denied' && <button onClick={() => navigate('/member/check-in')} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#EF1B23] px-3 text-[10px] font-black uppercase text-white hover:bg-red-700 sm:h-12 sm:text-xs"><QrCode className="h-4 w-4"/>Scan again</button>}
          <button onClick={() => navigate('/member/dashboard')} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#111] px-3 text-[10px] font-black uppercase text-white hover:bg-neutral-800 sm:h-12 sm:text-xs"><Clock3 className="h-4 w-4"/>Member dashboard</button>
        </div>
      </div>
    </section>
  </main>;
};
