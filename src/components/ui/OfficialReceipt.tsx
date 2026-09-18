import React from 'react';
import { Download, Eye, Printer } from 'lucide-react';
import type { PaymentRecord } from '../../types';
import { formatPaymentDateTime } from '../../utils/dateTime';

type ApiReceipt = {
  receipt_number?: string;
  reference?: string;
  amount_minor?: number | string;
  currency?: string;
  issued_at?: string;
  item?: string;
  kind?: string;
  member_name?: string;
};

type Props = {
  receipt: PaymentRecord | ApiReceipt;
  onClose?: () => void;
  compact?: boolean;
};

const normalize = (receipt: PaymentRecord | ApiReceipt) => {
  const api = receipt as ApiReceipt;
  const payment = receipt as PaymentRecord;
  const amount = api.amount_minor !== undefined ? Number(api.amount_minor) / 100 : Number(payment.amount || 0);
  return {
    receiptNumber: api.receipt_number || payment.receiptNumber || payment.transactionReference || payment.reference || 'Pending',
    reference: api.reference || payment.transactionReference || payment.reference || payment.id || 'Not recorded',
    memberName: api.member_name || payment.memberName || 'Member',
    item: api.item || payment.planName || 'Payment',
    kind: api.kind || 'Membership',
    method: payment.paymentMethod || payment.method || 'Paystack',
    issuedAt: api.issued_at || payment.date,
    amount,
    currency: api.currency || payment.currency || 'NGN',
  };
};

const receiptHtml = (data: ReturnType<typeof normalize>) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${data.receiptNumber}</title>
<style>
body{font-family:Arial,sans-serif;background:#f5f5f5;color:#111;margin:0;padding:40px}
.receipt{max-width:680px;margin:auto;background:#fff;border:1px solid #e5e7eb;padding:36px}
.brand{border-bottom:4px solid #ef1b23;padding-bottom:18px;margin-bottom:24px}
h1{margin:0;font-size:26px;letter-spacing:.08em}.muted{color:#6b7280;font-size:13px}
.row{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #eee;padding:12px 0}
.row span{color:#6b7280}.row b{text-align:right}.total{font-size:24px;color:#ef1b23}
.thanks{text-align:center;margin-top:26px;color:#6b7280;font-size:12px}
</style></head><body><main class="receipt"><div class="brand"><h1>SAREX FITNESS CLINIC</h1><div class="muted">Official payment receipt</div></div>
<div class="row"><span>Receipt No.</span><b>${data.receiptNumber}</b></div>
<div class="row"><span>Reference</span><b>${data.reference}</b></div>
<div class="row"><span>Member</span><b>${data.memberName}</b></div>
<div class="row"><span>Payment for</span><b>${data.kind}: ${data.item}</b></div>
<div class="row"><span>Method</span><b>${data.method}</b></div>
<div class="row"><span>Date</span><b>${formatPaymentDateTime(data.issuedAt)}</b></div>
<div class="row total"><span>Amount paid</span><b>₦${data.amount.toLocaleString()}</b></div>
<p class="thanks">Thank you for training with SAREX Fitness Clinic.</p></main></body></html>`;

export const OfficialReceipt: React.FC<Props> = ({ receipt, onClose, compact = false }) => {
  const data = normalize(receipt);
  const html = receiptHtml(data);
  const view = () => {
    const popup = window.open('', '_blank');
    popup?.document.write(html);
    popup?.document.close();
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.receiptNumber}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-sm shadow-sm">
        <div className="border-b-4 border-[#EF1B23] bg-[#111] px-5 py-4 text-white">
          <div className="font-athletic text-xl font-black uppercase tracking-wider">SAREX Fitness Clinic</div>
          <div className="mt-1 text-xs text-white/60">Official payment receipt</div>
        </div>
        <div className="space-y-3 p-5">
          <ReceiptRow label="Receipt No." value={data.receiptNumber} mono />
          <ReceiptRow label="Reference" value={data.reference} mono />
          <ReceiptRow label="Member" value={data.memberName} />
          <ReceiptRow label="Payment for" value={`${data.kind}: ${data.item}`} />
          <ReceiptRow label="Method" value={data.method} />
          <ReceiptRow label="Date" value={formatPaymentDateTime(data.issuedAt)} />
          <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Amount paid</span>
            <strong className="font-athletic text-2xl text-[#EF1B23]">₦{data.amount.toLocaleString()}</strong>
          </div>
        </div>
      </div>
      {!compact && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button type="button" onClick={view} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-black uppercase text-gray-700 transition hover:border-[#111]"><Eye className="h-4 w-4"/>View</button>
          <button type="button" onClick={download} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-black uppercase text-gray-700 transition hover:border-[#111]"><Download className="h-4 w-4"/>Download</button>
          <button type="button" onClick={onClose || (() => window.print())} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[#EF1B23] px-3 py-2.5 text-xs font-black uppercase text-white transition hover:bg-red-700 sm:col-span-1"><Printer className="h-4 w-4"/>{onClose ? 'Close' : 'Print'}</button>
        </div>
      )}
    </div>
  );
};

const ReceiptRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0">
    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</span>
    <strong className={`text-right text-gray-900 ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</strong>
  </div>
);
