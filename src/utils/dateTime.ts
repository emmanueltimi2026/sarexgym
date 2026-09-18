const paymentDateTimeFormatter = new Intl.DateTimeFormat('en-NG', {
  timeZone: 'Africa/Lagos',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const paymentDateFormatter = new Intl.DateTimeFormat('en-NG', {
  timeZone: 'Africa/Lagos',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const paymentTimeFormatter = new Intl.DateTimeFormat('en-NG', {
  timeZone: 'Africa/Lagos',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export const formatPaymentDateTime = (value: string | Date | null | undefined) => {
  if (!value) return 'Not recorded';

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : paymentDateTimeFormatter.format(date);
};

export const formatPaymentDateParts = (value: string | Date | null | undefined) => {
  if (!value) return { date: 'Not recorded', time: '' };
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { date: 'Not recorded', time: '' };
  return {
    date: paymentDateFormatter.format(date),
    time: paymentTimeFormatter.format(date),
  };
};
