import React, { useEffect, useRef, useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PaymentSummaryCard } from '../../components/ui/PaymentSummaryCard';
import { Search, Printer, Plus, Landmark, ArrowLeftRight, Download, BarChart3 } from 'lucide-react';
import { PaymentRecord, PaymentMethod, PaymentStatus } from '../../types';
import { exportPayments } from '../../utils/exportPayments';
import { formatPaymentDateTime } from '../../utils/dateTime';
import { Pagination } from '../../components/ui/Pagination';

export const AdminPayments: React.FC = () => {
  const { payments, members, plans, renewMemberMembership } = useGym();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'All' | PaymentMethod>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentStatus>('All');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);
  const [isRecordOpen, setIsRecordOpen] = useState(() => new URLSearchParams(location.search).get('record') === '1');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [paymentForm, setPaymentForm] = useState({ memberId: '', planId: '', method: 'Cash' as 'Cash' | 'Bank Transfer' });
  const [recording, setRecording] = useState(false);
  const paymentAttempt = useRef<string | null>(null);
  const submissionLocked = useRef(false);
  const openRecordPayment = () => { paymentAttempt.current = crypto.randomUUID(); setIsRecordOpen(true); };
  const recordPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!paymentForm.memberId || !paymentForm.planId || submissionLocked.current) return;
    submissionLocked.current = true;
    setRecording(true);
    setMessage('');
    paymentAttempt.current ||= crypto.randomUUID();
    try {
      const result = await renewMemberMembership(paymentForm.memberId, paymentForm.planId, paymentForm.method, paymentAttempt.current);
      setIsRecordOpen(false);
      paymentAttempt.current = null;
      setMessage('Payment recorded successfully' + (result?.data?.receiptNumber ? ' · Receipt ' + result.data.receiptNumber : '') + '.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to record payment.');
    } finally {
      submissionLocked.current = false;
      setRecording(false);
    }
  };

  const totalGross = payments
    .filter(p => p.status === 'Successful')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const paystackTotal = payments
    .filter(p => p.status === 'Successful' && p.paymentMethod === 'Paystack')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const cashTotal = payments
    .filter(p => p.status === 'Successful' && (p.paymentMethod === 'Cash' || p.paymentMethod === 'Bank Transfer'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const filtered = payments.filter(p => {
    const matchesSearch =
      p.memberName.toLowerCase().includes(search.toLowerCase()) ||
      p.memberId.toLowerCase().includes(search.toLowerCase()) ||
      p.transactionReference.toLowerCase().includes(search.toLowerCase());
    const matchesMethod = methodFilter === 'All' || p.paymentMethod === methodFilter;
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesMethod && matchesStatus;
  });
  useEffect(() => setPage(1), [search, methodFilter, statusFilter]);
  const visiblePayments = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppLayout
      pageTitle="Payment Record"
      pageSubtitle="Review successful payments, pending transactions, refunds, and payment methods."
      breadcrumbs={[{ label: 'Administration' }, { label: 'Payments' }]}
      actions={<button onClick={openRecordPayment} className="flex items-center gap-2 rounded-lg bg-[#EF1B23] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-red-500/20"><Plus className="h-4 w-4"/>Record payment</button>}
    >
      {message && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
        <PaymentSummaryCard
          label="Gross Revenue"
          value={`₦${totalGross.toLocaleString()}`}
          supportingText="All settlement channels"
          icon={BarChart3}
          tone="red"
        />
        <PaymentSummaryCard
          label="Paystack Direct"
          value={`₦${paystackTotal.toLocaleString()}`}
          supportingText={`${Math.round((paystackTotal / (totalGross || 1)) * 100)}% online`}
          icon={Landmark}
          tone="green"
        />
        <PaymentSummaryCard
          label="Cash & Transfers"
          value={`₦${cashTotal.toLocaleString()}`}
          supportingText="Gym/third-party payments"
          icon={ArrowLeftRight}
          tone="blue"
        />
      </div>

      
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-5 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-[620px] md:flex-1">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ref, member name or ID..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs text-[#111111] focus:bg-white focus:border-[#EF1B23] focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded font-semibold text-gray-700"
          >
            <option value="All">All Channels</option>
            <option value="Paystack">Paystack</option>
            <option value="Cash">Physical Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded font-semibold text-gray-700"
          >
            <option value="All">All Statuses</option>
            <option value="Successful">Successful</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div><h3 className="text-sm font-black uppercase tracking-wide">Transactions</h3><p className="mt-1 text-[11px] text-gray-500">A record of all payments received through your registered channels.</p></div>
          <button onClick={() => exportPayments(filtered)} disabled={!filtered.length} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"><Download className="h-4 w-4"/>Export</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-[#E5E7EB] font-athletic uppercase tracking-wider text-gray-600">
              <tr>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-500">No transactions match your search or filters.</td></tr> : visiblePayments.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-gray-700">
                    {item.transactionReference}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-[#111111]">{item.memberName}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{item.memberId}</div>
                  </td>

                  <td className="py-3 px-4 font-semibold text-gray-800">
                    {item.planName}
                  </td>

                  <td className="py-3 px-4 text-gray-700 font-medium">
                    {item.paymentMethod}
                  </td>

                  <td className="py-3 px-4 font-bold font-athletic text-[#111111] text-sm">
                    ₦{item.amount.toLocaleString()}
                  </td>

                  <td className="whitespace-nowrap py-3 px-4 text-gray-600">
                    {formatPaymentDateTime(item.date)}
                  </td>

                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        item.status === 'Successful'
                          ? 'success'
                          : item.status === 'Pending'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedReceipt(item)}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                      title="Inspect Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
      </div>

      
      <Modal isOpen={isRecordOpen} onClose={() => { if (!recording) setIsRecordOpen(false); }} title="RECORD PAYMENT" subtitle="Record a verified in-person payment and renew the membership.">
        <form onSubmit={recordPayment} className="space-y-4 text-xs">
          <label className="block font-bold uppercase text-gray-700">Member<select required value={paymentForm.memberId} onChange={e=>setPaymentForm({...paymentForm,memberId:e.target.value})} className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Select member</option>{members.map(m=><option key={m.id} value={m.id}>{m.firstName} {m.lastName} · {m.memberId}</option>)}</select></label>
          <label className="block font-bold uppercase text-gray-700">Membership plan<select required value={paymentForm.planId} onChange={e=>setPaymentForm({...paymentForm,planId:e.target.value})} className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Select plan</option>{plans.filter(p=>p.isActive).map(p=><option key={p.id} value={p.id}>{p.name} · ₦{p.price.toLocaleString()}</option>)}</select></label>
          <label className="block font-bold uppercase text-gray-700">Payment method<select value={paymentForm.method} onChange={e=>setPaymentForm({...paymentForm,method:e.target.value as typeof paymentForm.method})} className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal"><option>Cash</option><option>Bank Transfer</option></select></label>
          <div className="flex justify-end gap-2 border-t border-gray-200 pt-4"><button type="button" onClick={()=>setIsRecordOpen(false)} className="rounded border border-gray-300 px-4 py-2 font-bold uppercase">Cancel</button><button type="submit" disabled={recording} className="rounded bg-[#EF1B23] px-5 py-2 font-bold uppercase text-white disabled:cursor-not-allowed disabled:opacity-60">{recording ? 'Recording…' : 'Confirm payment'}</button></div>
        </form>
      </Modal>
      {selectedReceipt && (
        <Modal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          title="SETTLEMENT VOUCHER"
          subtitle="SAREX FITNESS CLINIC Central Accounting"
          maxWidth="sm"
        >
          <div className="p-4 bg-gray-50 border border-gray-200 rounded font-mono text-xs space-y-2.5">
            <div className="text-center pb-2 border-b border-gray-200">
              <div className="font-bold text-sm text-[#111111]">SAREX FITNESS CLINIC</div>
              <div className="text-[10px] text-gray-500">Official Settlement Record</div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Txn Ref:</span>
              <span className="font-bold">{selectedReceipt.transactionReference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Member:</span>
              <span>{selectedReceipt.memberName} ({selectedReceipt.memberId})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Plan:</span>
              <span>{selectedReceipt.planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Method:</span>
              <span>{selectedReceipt.paymentMethod}</span>
            </div>
            <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-200">
              <span>Settled Sum:</span>
              <span className="text-[#EF1B23]">₦{selectedReceipt.amount.toLocaleString()}</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedReceipt(null)}
            className="w-full mt-4 py-2.5 bg-[#EF1B23] text-white font-athletic font-bold uppercase text-xs rounded"
          >
            Close Voucher
          </button>
        </Modal>
      )}
    </AppLayout>
  );
};

