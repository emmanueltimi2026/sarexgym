import React from 'react';
import type { LucideIcon } from 'lucide-react';

type Tone = 'red' | 'green' | 'blue';

interface PaymentSummaryCardProps {
  label: string;
  value: string;
  supportingText: string;
  icon: LucideIcon;
  tone?: Tone;
}

const toneStyles: Record<Tone, { orb: string; line: string; fill: string }> = {
  red: { orb: 'bg-red-50 text-[#EF1B23]', line: '#EF1B23', fill: '#EF1B2314' },
  green: { orb: 'bg-emerald-50 text-emerald-700', line: '#22C55E', fill: '#22C55E14' },
  blue: { orb: 'bg-sky-50 text-sky-600', line: '#4AA3DF', fill: '#4AA3DF12' },
};

export const PaymentSummaryCard: React.FC<PaymentSummaryCardProps> = ({ label, value, supportingText, icon: Icon, tone = 'red' }) => {
  const styles = toneStyles[tone];
  const amountSize = value.length > 11 ? 'text-[23px]' : value.length > 8 ? 'text-[27px]' : 'text-[31px]';
  return (
    <article className="payment-summary-card relative h-[138px] overflow-hidden rounded-xl border border-[#E4E8EE] bg-white px-[18px] py-[17px] shadow-[0_7px_22px_rgba(15,23,42,.035)]">
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.025em] text-[#526077]">{label}</p>
          <p className={`mt-[14px] whitespace-nowrap font-black leading-none tracking-[-.045em] text-[#0A0D12] ${amountSize}`}>{value}</p>
          <p title={supportingText} className={`mt-[17px] flex items-center gap-1.5 whitespace-nowrap text-[clamp(7px,.62vw,9px)] font-extrabold uppercase tracking-[.015em] ${tone === 'green' ? 'text-emerald-600' : 'text-[#637087]'}`}>{tone === 'green' && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"/>}{supportingText}</p>
        </div>
        <div className={`grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full ${styles.orb}`}>
          <Icon className="h-[21px] w-[21px]" strokeWidth={2.35} />
        </div>
      </div>
      <svg aria-hidden="true" className="absolute bottom-0 right-0 h-[55px] w-[55%]" viewBox="0 0 240 64" preserveAspectRatio="none">
        <path d="M0 64 C34 47 58 55 82 41 C112 24 135 44 165 25 C195 7 215 20 240 11 L240 64 Z" fill={styles.fill} />
        <path d="M0 64 C34 47 58 55 82 41 C112 24 135 44 165 25 C195 7 215 20 240 11" fill="none" stroke={styles.line} strokeOpacity=".23" strokeWidth="1.2" />
      </svg>
    </article>
  );
};
