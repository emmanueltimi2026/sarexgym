import React from 'react';

interface BadgeProps {
  status?: string;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral' | string;
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  children,
  className = '',
  size = 'md'
}) => {
  const textContent = (children !== undefined ? String(children) : status || '').trim();
  const s = textContent.toLowerCase();

  let colorClasses = 'bg-gray-100 text-[#111111] border-gray-200';

  if (
    variant === 'success' ||
    s === 'active' ||
    s === 'successful' ||
    s === 'granted' ||
    s === 'checked in' ||
    s === 'completed' ||
    s === 'completed visits'
  ) {
    colorClasses = 'text-green-600 bg-green-50 border-green-200';
  } else if (
    variant === 'danger' ||
    s === 'expired' ||
    s === 'failed' ||
    s === 'suspended' ||
    s === 'access denied' ||
    s === 'denied' ||
    s === 'inactive'
  ) {
    colorClasses = 'text-[#EF1B23] bg-red-50 border-red-200';
  } else if (
    variant === 'warning' ||
    s === 'pending' ||
    s === 'expiring' ||
    s === 'frozen' ||
    s === 'check out' ||
    s === 'inside' ||
    s === 'currently inside' ||
    s === 'warning'
  ) {
    colorClasses = 'text-amber-600 bg-amber-50 border-amber-200';
  } else if (
    variant === 'info' ||
    s === 'scheduled'
  ) {
    colorClasses = 'text-sky-700 bg-sky-50 border-sky-200';
  } else if (s === 'qr' || s === 'reception qr') {
    colorClasses = 'bg-[#151515] text-white border-black';
  } else if (s === 'manual') {
    colorClasses = 'bg-gray-100 text-[#6B7280] border-gray-300';
  }

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]';

  return (
    <span
      className={`inline-flex items-center justify-center font-black uppercase tracking-wider rounded-xs border whitespace-nowrap ${sizeClasses} ${colorClasses} ${className}`}
    >
      {children !== undefined ? children : status}
    </span>
  );
};

