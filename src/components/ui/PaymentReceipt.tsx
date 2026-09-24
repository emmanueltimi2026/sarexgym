import React,{useEffect,useRef,useState}from'react';import{Loader2}from'lucide-react';import{useGym}from'../../context/GymContext';import{apiUrl}from'../../lib/secureFetch';import{Modal}from'./Modal';import{OfficialReceipt}from'./OfficialReceipt';
export const PaymentReceipt: React.FC = () => {
  const { refresh, navigate } = useGym();
  const refreshRef = useRef(refresh);
  const navigateRef = useRef(navigate);
  refreshRef.current = refresh;
  navigateRef.current = navigate;
  const [receipt, setReceipt] = useState<any>();
  const [destination, setDestination] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState('');
  const pendingRef = useRef<{ controller: AbortController; timer: number }>({ controller: new AbortController(), timer: 0 });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;
    const controller = new AbortController();
    const pending = { controller, timer: 0 };
    pendingRef.current = pending;
    setOpen(true);
    setChecking(true);
    setTimedOut(false);
    setError('');
    let tries = 0;
    const check = async () => {
      try {
        tries++;
        const response = await fetch(apiUrl(`/api/v1/payments/confirm/${encodeURIComponent(reference)}`), {
          credentials: 'include', signal: controller.signal, cache: 'no-store'
        });
        if (response.ok) {
          const body = await response.json();
          const payment = body.data?.payment || body.data;
          if (!payment) throw new Error('Payment was confirmed, but its receipt is unavailable. Please check payment history.');
          setReceipt(payment);
          setDestination(payment.kind === 'Event' ? '/member/events' : '/member/dashboard');
          setChecking(false);
          setTimedOut(false);
          const url = new URL(location.href);
          url.searchParams.delete('reference');
          url.searchParams.delete('trxref');
          history.replaceState(history.state, '', url.pathname + url.search + url.hash);
          void refreshRef.current({ background: true }).catch(() => {});
        } else if (response.status === 202 && tries < 40) {
          pending.timer = window.setTimeout(check, 2000);
        } else {
          const body = await response.json().catch(() => ({}));
          setChecking(false);
          setTimedOut(response.status === 202);
          setError(response.status === 202 ? '' : body?.error?.message || 'Payment confirmation could not be completed. Please contact reception with your Paystack reference.');
        }
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setChecking(false);
        setError(reason instanceof Error ? reason.message : 'Payment confirmation could not be completed.');
      }
    };
    void check();
    return () => { controller.abort(); window.clearTimeout(pending.timer); };
  }, []);

  const close = () => {
    pendingRef.current.controller.abort();
    window.clearTimeout(pendingRef.current.timer);
    setOpen(false);
    if (destination) navigateRef.current(destination);
  };

  return <Modal isOpen={open} onClose={close} title="PAYMENT RECEIPT" subtitle={checking ? 'Confirming your payment…' : receipt ? 'Verified payment receipt' : 'Processing confirmation'} maxWidth="sm">
    {checking ? <div className="grid place-items-center gap-3 py-10 text-center text-sm"><Loader2 className="h-8 w-8 animate-spin text-[#EF1B23]"/><div><p className="font-bold text-[#111]">Waiting for payment confirmation</p><p className="mt-1 text-xs text-gray-500">This can take a few seconds while Paystack confirms your payment.</p></div></div>
      : receipt ? <OfficialReceipt receipt={receipt} onClose={close}/>
      : error ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><strong className="block">Payment needs review.</strong><p className="mt-2 leading-6">{error}</p></div>
      : timedOut ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong className="block">Payment received, receipt still syncing.</strong><p className="mt-2 leading-6">Paystack confirmation is taking longer than expected. Your receipt will appear automatically in payment history once confirmation finishes.</p></div>
      : null}
  </Modal>;
};
