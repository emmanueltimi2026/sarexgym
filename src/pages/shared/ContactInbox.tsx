import React, { useCallback, useEffect, useState } from 'react';
import { Check, Inbox, Mail, Phone, RefreshCw, RotateCcw } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { apiUrl } from '../../lib/secureFetch';
import { formatAppDateTime } from '../../utils/dateTime';

type ContactMessage = { id: string; name: string; email: string; phone: string; message: string; status: 'new' | 'resolved'; received_at: string; resolved_at: string | null };

export const ContactInbox: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(apiUrl('/api/v1/contact-messages'), { credentials: 'include', cache: 'no-store', signal });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to load contact messages.');
      setMessages(Array.isArray(body.data) ? body.data : []);
      setError('');
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError(caught instanceof Error ? caught.message : 'Unable to load contact messages.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 45_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [load]);

  const setStatus = async (item: ContactMessage) => {
    setBusyId(item.id); setError('');
    try {
      const response = await fetch(apiUrl(`/api/v1/contact-messages/${item.id}`), { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: item.status === 'new' ? 'resolved' : 'new' }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to update this message.');
      setMessages(current => current.map(message => message.id === item.id ? body.data : message));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update this message.'); }
    finally { setBusyId(''); }
  };

  const newCount = messages.filter(message => message.status === 'new').length;
  return <AppLayout pageTitle="Contact Messages" pageSubtitle="Enquiries submitted through the public SAREX contact form." actions={<button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"><RefreshCw size={15} /> Refresh</button>}>
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5"><Inbox className="text-[#EF1B23]"/><div><strong>{newCount} new {newCount === 1 ? 'message' : 'messages'}</strong><p className="text-sm text-gray-500">{messages.length} total enquiries</p></div></div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading ? <div className="space-y-3" aria-label="Loading messages">{[1, 2, 3].map(item => <div key={item} className="h-36 animate-pulse rounded-xl border bg-white" />)}</div>
        : messages.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">No contact messages have arrived yet.</div>
          : <div className="space-y-4">{messages.map(item => <article key={item.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold">{item.name}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === 'new' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{item.status === 'new' ? 'New' : 'Resolved'}</span></div><p className="mt-1 text-xs text-gray-500">Received {formatAppDateTime(item.received_at)}</p></div>
              <button disabled={busyId === item.id} onClick={() => void setStatus(item)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold disabled:opacity-50">{item.status === 'new' ? <><Check size={15}/> Mark resolved</> : <><RotateCcw size={15}/> Reopen</>}</button></div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm"><a className="inline-flex items-center gap-2 text-blue-700" href={`mailto:${item.email}`}><Mail size={15}/>{item.email}</a><a className="inline-flex items-center gap-2 text-blue-700" href={`tel:${item.phone}`}><Phone size={15}/>{item.phone}</a></div>
            <p className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-800">{item.message}</p>
          </article>)}</div>}
    </div>
  </AppLayout>;
};
