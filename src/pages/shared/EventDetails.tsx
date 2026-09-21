import React,{useCallback,useState}from'react';
import{ArrowLeft,CalendarDays,Download,MapPin,ReceiptText,Users}from'lucide-react';
import{useGym}from'../../context/GymContext';
import{AppLayout}from'../../components/layout/AppLayout';
import{Badge}from'../../components/ui/Badge';
import{PaymentReceipt}from'../../components/ui/PaymentReceipt';
import{useVisibilityPolling}from'../../hooks/useVisibilityPolling';
import{PORTAL_POLL_INTERVALS}from'../../lib/refreshPolicy';
import{apiBase as BASE}from'../../lib/secureFetch';

const formatDate=(value:string)=>value?new Date(value).toLocaleString():'Not set';
const registrationOpen=(event:any)=>event?.registration_starts_at&&event?.registration_ends_at&&new Date(event.registration_starts_at)<=new Date()&&new Date(event.registration_ends_at)>=new Date();

const EventBody:React.FC<{event:any;onBack:()=>void;onRegister?:()=>void;message?:string}>=({event,onBack,onRegister,message})=><div className="mx-auto max-w-5xl">
 <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-xs font-black uppercase text-[#EF1B23]"><ArrowLeft className="h-4 w-4"/>Back to events</button>
 {message&&<div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</div>}
 <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
  {event.image_url&&<img src={event.image_url} alt={event.title} className="h-[260px] w-full object-cover sm:h-[380px]"/>}
  <div className="p-6 sm:p-8">
   <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-black uppercase tracking-widest text-[#EF1B23]"><span>{formatDate(event.starts_at)}</span><span>{Number(event.price_minor)?`₦${(Number(event.price_minor)/100).toLocaleString()}`:'Free event'}</span></div>
   <h1 className="mt-4 text-3xl font-black tracking-tight text-[#111] sm:text-5xl">{event.title}</h1>
   <div className="mt-6 grid gap-3 text-sm text-gray-600 sm:grid-cols-2"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#EF1B23]"/>Event: {formatDate(event.starts_at)} - {formatDate(event.ends_at)}</span><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#EF1B23]"/>Registration: {formatDate(event.registration_starts_at)} - {formatDate(event.registration_ends_at)}</span><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#EF1B23]"/>{event.location}</span><span className="flex items-center gap-2"><Users className="h-4 w-4 text-[#EF1B23]"/>{event.registered}/{event.capacity} booked</span></div>
   <p className="mt-7 whitespace-pre-line text-base leading-8 text-gray-700">{event.description}</p>
   {onRegister&&<button disabled={event.registration_status==='confirmed'||!registrationOpen(event)} onClick={onRegister} className="mt-8 rounded-xl bg-[#EF1B23] px-6 py-3 text-xs font-black uppercase text-white disabled:bg-gray-400">{event.registration_status==='confirmed'?'Booking confirmed':event.registration_status==='pending_payment'?'Complete payment':!registrationOpen(event)?'Registration closed':Number(event.price_minor)?'Register and pay':'Reserve my place'}</button>}
  </div>
 </article>
</div>;

const statusLabel=(value?:string)=>value==='pending_payment'?'Pending payment':value==='confirmed'?'Confirmed':value==='cancelled'?'Cancelled':'Not registered';
const statusVariant=(value?:string)=>value==='confirmed'?'success':value==='pending_payment'?'warning':value==='cancelled'?'danger':'neutral';

const MemberRegistrationPanel:React.FC<{event:any}>=({event})=>{
 const hasRegistration=Boolean(event.registration_status);
 const openReceipt=()=>{if(event.registration_reference)location.assign(`${location.pathname}?reference=${encodeURIComponent(event.registration_reference)}`)};
 return <section className="mx-auto mt-5 max-w-5xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
   <div><p className="text-[10px] font-black uppercase tracking-wider text-[#EF1B23]">My registration</p><h2 className="mt-1 text-xl font-black text-[#111]">{hasRegistration?statusLabel(event.registration_status):'No booking yet'}</h2><p className="mt-1 text-sm text-gray-500">{event.registration_status==='confirmed'?'Your place is confirmed. Show your receipt or event page at reception if requested.':event.registration_status==='pending_payment'?'Your booking is waiting for payment confirmation. This updates automatically after Paystack confirms payment.':'Register from this page to reserve your place.'}</p></div>
   <Badge variant={statusVariant(event.registration_status)}>{statusLabel(event.registration_status)}</Badge>
  </div>
  {hasRegistration&&<div className="mt-5 grid gap-3 border-t border-gray-100 pt-5 text-sm sm:grid-cols-3"><div><span className="block text-[10px] font-bold uppercase text-gray-400">Amount</span><strong>₦{(Number(event.registration_amount_minor||event.price_minor||0)/100).toLocaleString()}</strong></div><div><span className="block text-[10px] font-bold uppercase text-gray-400">Registered</span><strong>{event.registration_date?new Date(event.registration_date).toLocaleString():'Processing'}</strong></div><div><span className="block text-[10px] font-bold uppercase text-gray-400">Receipt</span><strong>{event.registration_receipt_number||'Pending confirmation'}</strong></div></div>}
  {event.registration_status==='confirmed'&&event.registration_reference&&<button onClick={openReceipt} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#151515] px-4 py-3 text-xs font-black uppercase text-white"><Download className="h-4 w-4"/>View receipt</button>}
 </section>;
};

const RegistrationTable:React.FC<{event:any}>=({event})=>{
 const registrations=event.registrations||[];
 return <section className="mx-auto mt-5 max-w-5xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
  <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-[#EF1B23]">Event registrations</p><h2 className="mt-1 text-xl font-black text-[#111]">Attendees and payments</h2><p className="mt-1 text-xs text-gray-500">{event.registered||0} confirmed, {event.pending_registrations||0} pending payment</p></div><ReceiptText className="h-5 w-5 text-[#EF1B23]"/></div>
  <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="border-b border-gray-100 bg-gray-50 font-black uppercase tracking-wider text-gray-500"><tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Receipt</th><th className="px-5 py-3">Registered</th></tr></thead><tbody className="divide-y divide-gray-100">{registrations.length?registrations.map((item:any)=><tr key={item.id} className="transition hover:bg-gray-50"><td className="px-5 py-3"><strong className="block text-[#111]">{item.memberName}</strong><span className="mt-0.5 block font-mono text-[10px] text-gray-500">{item.memberId}</span></td><td className="px-5 py-3 text-gray-600">{item.email}</td><td className="px-5 py-3 text-gray-600">{item.phone}</td><td className="px-5 py-3 font-bold">₦{(Number(item.amountMinor||0)/100).toLocaleString()}</td><td className="px-5 py-3"><Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge></td><td className="px-5 py-3 font-mono text-gray-700">{item.receiptNumber||'Pending'}</td><td className="px-5 py-3 text-gray-600">{item.registeredAt?new Date(item.registeredAt).toLocaleString():'-'}</td></tr>):<tr><td colSpan={7} className="px-5 py-12 text-center text-gray-500">No member has registered for this event yet.</td></tr>}</tbody></table></div>
 </section>;
};

export const EventDetails:React.FC<{mode:'public'|'portal'}>=({mode})=>{
 const{currentPath,navigate}=useGym();
 const id=currentPath.split('/').filter(Boolean).at(-1)||'';
 const[event,setEvent]=useState<any>(null),[message,setMessage]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const portalRoot=currentPath.startsWith('/admin')?'/admin/events':currentPath.startsWith('/staff')?'/staff/events':currentPath.startsWith('/member')?'/member/events':'/';
 const load=useCallback(async(signal?:AbortSignal)=>{try{const r=await fetch(`${BASE}/api/v1/${mode==='public'?'public/events':'events'}/${id}`,{credentials:'include',cache:'no-store',signal});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b?.error?.message||'Event was not found');setEvent(b.data);setError('')}catch(reason){if(!(reason instanceof DOMException&&reason.name==='AbortError'))setError(reason instanceof Error?reason.message:'Unable to load event')}finally{setLoading(false)}},[id,mode]);
 const refreshEvent=useVisibilityPolling(signal=>load(signal),mode==='portal'?PORTAL_POLL_INTERVALS.portal:null,true,true);
 const register=async()=>{setMessage('');const r=await fetch(`${BASE}/api/v1/events/${id}/register`,{method:'POST',credentials:'include'}),b=await r.json().catch(()=>({}));if(!r.ok)return setError(b?.error?.message||'Unable to register');if(b.data.authorizationUrl)return location.assign(b.data.authorizationUrl);setMessage('Your place is confirmed.');await refreshEvent()};
 const isMemberEvent=mode==='portal'&&currentPath.startsWith('/member'),isAdminEvent=mode==='portal'&&(currentPath.startsWith('/admin')||currentPath.startsWith('/staff'));
 const content=loading&&!event?<div className="h-96 animate-pulse rounded-2xl bg-white" role="status" aria-label="Loading event details"/>:!event&&error?<div className="rounded-2xl border border-red-200 bg-white p-10 text-center text-sm font-bold text-red-600">{error}</div>:<>{error&&<div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}<EventBody event={event} message={message} onBack={()=>navigate(portalRoot)} onRegister={isMemberEvent?register:undefined}/>{isMemberEvent&&<MemberRegistrationPanel event={event}/>} {isAdminEvent&&<RegistrationTable event={event}/>}</>;
 if(mode==='public')return <section className="bg-[#f7f7f5] px-4 py-28 text-[#111] sm:px-6 lg:px-8">{content}</section>;
 return <><PaymentReceipt/><AppLayout pageTitle="Event Details" pageSubtitle="Review the complete event description, date, location, capacity, and booking status." breadcrumbs={[{label:'Events',path:portalRoot},{label:'Details'}]}>{content}</AppLayout></>;
};
