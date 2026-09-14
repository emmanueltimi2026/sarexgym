import React from 'react';

type Props = { page: number; pageSize: number; total: number; onPageChange: (page: number) => void };

export const Pagination: React.FC<Props> = ({ page, pageSize, total, onPageChange }) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  if (total <= pageSize) return null;
  const first = (current - 1) * pageSize + 1;
  const last = Math.min(current * pageSize, total);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    value => value === 1 || value === pageCount || Math.abs(value - current) <= 1
  );
  return <nav aria-label="Table pages" className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
    <span>Showing {first}–{last} of {total}</span>
    <div className="flex items-center gap-1">
      <button type="button" disabled={current === 1} onClick={() => onPageChange(current - 1)} className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-700 disabled:opacity-40">Previous</button>
      {pages.map((value, index) => <React.Fragment key={value}>
        {index > 0 && value - pages[index - 1] > 1 && <span className="px-1">…</span>}
        <button type="button" aria-current={value === current ? 'page' : undefined} onClick={() => onPageChange(value)} className={`h-8 min-w-8 rounded-lg px-2 font-bold ${value === current ? 'bg-[#EF1B23] text-white' : 'border border-gray-200 text-gray-700'}`}>{value}</button>
      </React.Fragment>)}
      <button type="button" disabled={current === pageCount} onClick={() => onPageChange(current + 1)} className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-700 disabled:opacity-40">Next</button>
    </div>
  </nav>;
};

