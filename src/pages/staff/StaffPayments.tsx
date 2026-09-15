import React, { useEffect, useRef, useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PaymentSummaryCard } from '../../components/ui/PaymentSummaryCard';
import {
  CreditCard,
  Search,
  Plus,
  Printer,
  Clock,
  Building,
  Landmark,
  ArrowLeftRight,
  Download,
  BarChart3
} from 'lucide-react';
import { PaymentRecord, PaymentMethod, PaymentStatus } from '../../types';
import { exportPayments } from '../../utils/exportPayments';
import { Pagination } from '../../components/ui/Pagination';

export const StaffPayments: React.FC = () => {
  const { payments, members, plans, getSubscriptionQuote, renewMemberMembership } = useGym();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'All' | PaymentMethod>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentStatus>('All');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);
  const [quote, setQuote] = useState<{ membershipAmount: number; registrationFee: number; total: number } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const paymentAttempt = useRef<string | null>(null);
  const submissionLocked = useRef(false);

  const [newPayForm, setNewPayForm] = useState({
    memberId: members[0]?.id || '',
    planId: plans[2]?.id || '',
    method: 'Cash' as PaymentMethod,
    notes: 'In-person staff transaction'
  });

  useEffect(() => {
    if (!isNewPaymentModalOpen) return;
    setNewPayForm(current => ({
      ...current,
      memberId: current.memberId || members[0]?.id || '',
      planId: current.planId || plans.find(plan => plan.isActive !== false)?.id || ''
    }));
  }, [isNewPaymentModalOpen, members, plans]);

  const filteredPayments = payments.filter(p => {
    const matchesSearch =
      p.memberName.toLowerCase().includes(search.toLowerCase()) ||
      p.memberId.toLowerCase().includes(search.toLowerCase()) ||
      p.transactionReference.toLowerCase().includes(search.toLowerCase());

    const matchesMethod = methodFilter === 'All' || p.paymentMethod === methodFilter;
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesMethod && matchesStatus;
  });
  useEffect(() => setPage(1), [search, methodFilter, statusFilter]);
  const visiblePayments = filteredPayments.slice((page - 1) * pageSize, page * pageSize);

  const paystackTotal = payments.filter(p => p.status === 'Successful' && p.paymentMethod === 'Paystack').reduce((sum, p) => sum + p.amount, 0);
  const cashTransferTotal = payments.filter(p => p.status === 'Successful' && (p.paymentMethod === 'Cash' || p.paymentMethod === 'Bank Transfer')).reduce((sum, p) => sum + p.amount, 0);
  const grossTotal = payments.filter(p => p.status === 'Successful').reduce((sum, p) => sum + p.amount, 0);

  useEffect(() => {
    if (!isNewPaymentModalOpen || !newPayForm.memberId || !newPayForm.planId) { setQuote(null); return; }
    let active = true;
    setQuoteLoading(true);
    getSubscriptionQuote(newPayForm.memberId, newPayForm.planId)
      .then(value => { if (active) setQuote(value); })
      .catch(() => { if (active) setQuote(null); })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [isNewPaymentModalOpen, newPayForm.memberId, newPayForm.planId, getSubscriptionQuote]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const mem = members.find(m => m.id === newPayForm.memberId) || members[0];
    const pl = plans.find(p => p.id === newPayForm.planId) || plans[2];

    if (!mem || !pl || newPayForm.method === 'Paystack' || submissionLocked.current) return;
    submissionLocked.current = true;
    setRecording(true);
    paymentAttempt.current ||= crypto.randomUUID();
    try {
      await renewMemberMembership(mem.id, pl.id, newPayForm.method, paymentAttempt.current);
      setIsNewPaymentModalOpen(false);
      paymentAttempt.current = null;
    } finally {
      submissionLocked.current = false;
      setRecording(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Payment History"
      pageSubtitle="Review payments and record approved in-person transactions."
      breadcrumbs={[{ label: 'Staff Portal', path: '/staff/dashboard' }, { label: 'Payments' }]}
      actions={
        <button
          onClick={() => { paymentAttempt.current = crypto.randomUUID(); setIsNewPaymentModalOpen(true); }}
          className="px-4 py-2 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      }
    >
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PaymentSummaryCard label="Gross Revenue" value={`₦${grossTotal.toLocaleString()}`} supportingText="All settlement channels" icon={BarChart3} tone="red" />
        <PaymentSummaryCard label="Paystack Direct" value={`₦${paystackTotal.toLocaleString()}`} supportingText={`${Math.round((paystackTotal / (grossTotal || 1)) * 100)}% online`} icon={Landmark} tone="green" />
        <PaymentSummaryCard label="Cash & Transfers" value={`₦${cashTransferTotal.toLocaleString()}`} supportingText="Gym/third-party payments" icon={ArrowLeftRight} tone="blue" />
      </div>

      
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-5 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-[620px] md:flex-1">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search member name, ID, or ref..."
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
            <option value="All">All Methods</option>
            <option value="Paystack">Paystack</option>
            <option value="Cash">Cash</option>
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
          <button onClick={() => exportPayments(filteredPayments)} disabled={!filteredPayments.length} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"><Download className="h-4 w-4"/>Export</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-[#E5E7EB] font-athletic uppercase tracking-wider text-gray-600">
              <tr>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Plan Item</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No transactions match your query.
                  </td>
                </tr>
              ) : (
                visiblePayments.map(item => (
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

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
                        {item.paymentMethod === 'Paystack' && <CreditCard className="w-3.5 h-3.5 text-[#EF1B23]" />}
                        {item.paymentMethod === 'Cash' && <Clock className="w-3.5 h-3.5 text-emerald-600" />}
                        {item.paymentMethod === 'Bank Transfer' && <Building className="w-3.5 h-3.5 text-neutral-600" />}
                        {item.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-bold font-athletic text-[#111111] text-sm">
                      ₦{item.amount.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-gray-600">
                      {item.date}
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
                        title="View Official Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={filteredPayments.length} onPageChange={setPage} />
      </div>

      
      <Modal
        isOpen={isNewPaymentModalOpen}
        onClose={() => setIsNewPaymentModalOpen(false)}
        title="RECORD PAYMENT"
        subtitle="Record an in-person cash or bank transfer payment."
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Select Member</label>
            <select
              value={newPayForm.memberId}
              onChange={e => setNewPayForm({ ...newPayForm, memberId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none bg-white"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} ({m.memberId})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">Membership</span><strong>₦{(quote?.membershipAmount || 0).toLocaleString()}</strong></div>
            {!!quote?.registrationFee && <div className="flex justify-between"><span className="text-gray-500">One-time registration fee</span><strong>₦{quote.registrationFee.toLocaleString()}</strong></div>}
            <div className="flex justify-between border-t border-gray-200 pt-2 text-sm"><strong>Total to collect</strong><strong className="text-[#EF1B23]">{quoteLoading ? 'Calculating…' : `₦${(quote?.total || 0).toLocaleString()}`}</strong></div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Plan / Item</label>
            <select
              value={newPayForm.planId}
              onChange={e => setNewPayForm({ ...newPayForm, planId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none bg-white"
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} - ₦{p.price.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Payment Method</label>
              <select
                value={newPayForm.method}
                onChange={e => setNewPayForm({ ...newPayForm, method: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none bg-white"
              >
                <option value="Cash">Physical Cash</option>
                <option value="Bank Transfer">Direct Wire Transfer</option>
              </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Desk Notes</label>
            <input
              type="text"
              value={newPayForm.notes}
              onChange={e => setNewPayForm({ ...newPayForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewPaymentModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded text-xs font-bold uppercase text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!quote || quoteLoading || recording}
              className="px-5 py-2 bg-[#EF1B23] hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-athletic font-bold uppercase text-xs rounded transition-colors"
            >
              Record
            </button>
          </div>
        </form>
      </Modal>

      
      {selectedReceipt && (
        <Modal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          title="OFFICIAL RECEIPT"
          subtitle="SAREX Fitness Clinic"
          maxWidth="sm"
        >
          <div className="p-4 bg-gray-50 border border-gray-200 rounded font-mono text-xs space-y-3">
            <div className="text-center pb-3 border-b border-gray-200">
              <div className="font-bold text-sm text-[#111111]">SAREX FITNESS CLINIC</div>
              <div className="text-[10px] text-gray-500">Magboro, Ogun State</div>
              <div className="text-[10px] text-gray-500">SAREX FITNESS CLINIC Performance</div>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Receipt Ref:</span>
              <span className="font-bold text-[#111111]">{selectedReceipt.transactionReference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date:</span>
              <span>{selectedReceipt.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Member:</span>
              <span className="font-bold">{selectedReceipt.memberName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Member ID:</span>
              <span>{selectedReceipt.memberId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Item:</span>
              <span>{selectedReceipt.planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Method:</span>
              <span>{selectedReceipt.paymentMethod}</span>
            </div>

            <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-200">
              <span>Amount Paid:</span>
              <span className="text-[#EF1B23]">₦{selectedReceipt.amount.toLocaleString()}</span>
            </div>

            <div className="text-center text-[10px] text-gray-400 pt-3 border-t border-gray-200">
              Thank you for training with SAREX FITNESS CLINIC!
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-2.5 bg-[#EF1B23] text-white font-athletic font-bold uppercase text-xs rounded hover:bg-red-700 transition-colors"
            >
              Close Receipt
            </button>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
};


