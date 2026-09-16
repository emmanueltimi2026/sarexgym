const paymentDateTimeFormatter = new Intl.DateTimeFormat('en-NG', {
  timeZone: 'Africa/Lagos',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export const formatPaymentDateTime = (value: string | Date | null | undefined) => {
  if (!value) return 'Not recorded';

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : paymentDateTimeFormatter.format(date);
};
