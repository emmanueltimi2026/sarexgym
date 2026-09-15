import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, IdCard, Loader2, ShieldAlert } from 'lucide-react';
import { useGym } from '../../context/GymContext';

type CheckInResult = {
  checked_in_at: string;
  member: { memberId: string; firstName: string; lastName: string; photo?: string; planName: string; membershipExpiryDate: string; membershipStatus?: string };
  branch: { name: string };
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
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/attendance/reception-check-in`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error?.message || 'Check-in could not be completed.');
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

  return <main className="grid min-h-screen place-items-center bg-[#f4f5f7] p-4">
    <section className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
      <header className="bg-[#111] px-6 py-7 text-center text-white"><img src="/assets/brand/sarex-logo.png" alt="SAREX Fitness Clinic" className="mx-auto h-12 w-auto object-contain"/><p className="mt-3 text-[10px] font-bold uppercase tracking-[.24em] text-gray-400">Reception check-in</p></header>
      <div className="p-6 text-center sm:p-8">
        {status === 'checking' && <><Loader2 className="mx-auto h-12 w-12 animate-spin text-[#EF1B23]"/><h1 className="mt-5 text-2xl font-black">Checking you in</h1></>}
        {status === 'success' && result && <><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500"/><h1 className="mt-4 text-2xl font-black">Check-in successful</h1><div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-left"><div className="flex items-center gap-4"><img src={result.member.photo || '/assets/brand/sarex-logo.png'} alt={`${result.member.firstName} ${result.member.lastName}`} className="h-16 w-16 rounded-2xl border border-white bg-white object-cover"/><div className="min-w-0"><strong className="block truncate text-lg">{result.member.firstName} {result.member.lastName}</strong><span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700"><IdCard className="h-3.5 w-3.5"/>{result.member.memberId}</span></div></div><dl className="mt-5 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-gray-500">Subscription</dt><dd className="mt-1 font-bold text-emerald-700">{result.member.membershipStatus || 'Active'}</dd></div><div><dt className="text-gray-500">Plan</dt><dd className="mt-1 font-bold">{result.member.planName}</dd></div><div><dt className="text-gray-500">Reception</dt><dd className="mt-1 font-bold">{result.branch.name}</dd></div><div><dt className="text-gray-500">Check-in time</dt><dd className="mt-1 font-bold">{new Date(result.checked_in_at).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'})}</dd></div><div className="col-span-2"><dt className="text-gray-500">Membership valid until</dt><dd className="mt-1 font-bold">{new Date(result.member.membershipExpiryDate).toLocaleDateString()}</dd></div></dl></div></>}
        {status === 'denied' && <><ShieldAlert className="mx-auto h-14 w-14 text-[#EF1B23]"/><h1 className="mt-4 text-2xl font-black">Check-in not completed</h1></>}
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-gray-600">{message}</p>
        <button onClick={() => navigate('/member/dashboard')} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#111] text-xs font-black uppercase text-white"><Clock3 className="h-4 w-4"/>Open member dashboard</button>
      </div>
    </section>
  </main>;
};
