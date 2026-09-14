import React from 'react';
import { BarChart3, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useGym } from '../../context/GymContext';

export const AuthShell: React.FC<{ mode: 'login' | 'register'; children: React.ReactNode }> = ({ mode, children }) => {
  const { navigate } = useGym();
  return <main className="relative h-screen overflow-hidden bg-[#0B0B0C] text-[#171719]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(239,27,35,.22),transparent_30%),radial-gradient(circle_at_78%_84%,rgba(239,27,35,.1),transparent_28%)]" />
    <section className="relative mx-auto grid h-screen max-w-[1500px] lg:grid-cols-[minmax(420px,.92fr)_minmax(560px,1.08fr)]">
      <aside className="relative hidden h-screen overflow-hidden border-r border-white/10 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <img src="/assets/fitkit/hero_bg_1_2.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-45 grayscale" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-[#101010]/78 to-black/95" />
        <button onClick={() => navigate('/')} className="relative z-10 w-fit" aria-label="Return to SAREX home"><img src="/assets/brand/sarex-logo.png" alt="SAREX Fitness Clinic" className="h-16 w-auto object-contain" /></button>
        <div className="relative z-10 max-w-lg text-white">
          <span className="mb-7 block h-1 w-16 rounded-full bg-[#EF1B23]" />
          <h2 className="text-4xl font-black leading-[1.05] tracking-[-.04em] xl:text-6xl">Stronger today.<br />Better every day.</h2>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/65">One secure account for your membership, access pass, training progress, events, and payments.</p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[{icon:ShieldCheck,label:'Expert support'},{icon:BarChart3,label:'Progress focused'},{icon:LockKeyhole,label:'Secure access'}].map(item=><div key={item.label} className="rounded-2xl border border-white/10 bg-white/[.045] p-4 backdrop-blur-sm"><item.icon className="h-5 w-5 text-[#EF1B23]"/><span className="mt-3 block text-[11px] font-bold text-white/80">{item.label}</span></div>)}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-white/40"><ShieldCheck className="h-4 w-4" />Private member access</div>
      </aside>

      <div className="relative flex h-screen items-center justify-center sm:px-8 sm:py-3 lg:px-12 lg:py-8">
        <div className={`auth-card relative flex h-full w-full flex-col justify-start overflow-y-auto bg-[#F8F7F4] px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:h-auto sm:max-h-[calc(100vh-24px)] sm:justify-center sm:rounded-[26px] sm:border sm:border-white/10 sm:px-10 sm:py-9 sm:shadow-[0_28px_90px_rgba(0,0,0,.5)] ${mode==='register'?'sm:max-w-2xl':'sm:max-w-[500px]'}`}>
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Return to SAREX Fitness Clinic home"
            className="absolute left-1/2 top-6 -translate-x-1/2 rounded-xl bg-[#111315] px-4 py-2 shadow-[0_10px_28px_rgba(0,0,0,.16)] outline-none ring-[#EF1B23] transition hover:bg-black focus-visible:ring-2 lg:hidden"
          >
            <img src="/assets/brand/sarex-logo.png" alt="SAREX Fitness Clinic" className="h-8 w-auto object-contain" />
          </button>
          <div className="w-full pt-20 sm:pt-0">{children}</div>
        </div>
      </div>
    </section>
  </main>;
};
