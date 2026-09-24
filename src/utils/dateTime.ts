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

const appTimeFormatter = new Intl.DateTimeFormat('en-NG', {
  timeZone: 'Africa/Lagos',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const appDateTimeFormatter = new Intl.DateTimeFormat('en-NG', {
  timeZone: 'Africa/Lagos',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const appDateFormatter = new Intl.DateTimeFormat('en-NG', {
  timeZone: 'Africa/Lagos',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const uppercaseMeridiem = (value: string) => value.replace(/\b(am|pm)\b/i, match => match.toUpperCase());

export const formatAppTime = (value: string | Date | null | undefined) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{1,2}:\d{2}\s*(am|pm)$/i.test(value)) {
    return uppercaseMeridiem(value);
  }
  // API attendance records also contain a Lagos wall-clock time without a date.
  if (typeof value === 'string' && /^\d{1,2}:\d{2}(?::\d{2})?$/.test(value)) {
    const [hour, minute] = value.split(':').map(Number);
    if (hour > 23 || minute > 59) return value;
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : uppercaseMeridiem(appTimeFormatter.format(date));
};

export const formatAppDateTime = (value: string | Date | null | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : uppercaseMeridiem(appDateTimeFormatter.format(date));
};

export const formatAppDate = (value: string | Date | null | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? String(value) : appDateFormatter.format(date);
};

export const formatPaymentDateTime = (value: string | Date | null | undefined) => {
  if (!value) return 'Not recorded';

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : uppercaseMeridiem(paymentDateTimeFormatter.format(date));
};

export const formatPaymentDateParts = (value: string | Date | null | undefined) => {
  if (!value) return { date: 'Not recorded', time: '' };
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { date: 'Not recorded', time: '' };
  return {
    date: paymentDateFormatter.format(date),
    time: uppercaseMeridiem(paymentTimeFormatter.format(date)),
  };
};
