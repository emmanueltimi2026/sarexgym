import type { PaymentRecord } from '../types';

export const exportPayments = (payments: PaymentRecord[], filename = 'payment-history.csv') => {
  const cells = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = payments.map(payment => [
    payment.transactionReference,
    payment.memberName,
    payment.memberId,
    payment.planName,
    payment.paymentMethod,
    payment.amount,
    payment.date,
    payment.status,
  ]);
  const csv = [
    ['Transaction reference', 'Member', 'Member ID', 'Membership plan', 'Payment method', 'Amount', 'Date', 'Status'],
    ...rows,
  ].map(row => row.map(cells).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
