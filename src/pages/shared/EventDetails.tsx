import React,{useCallback,useState}from'react';
import{ArrowLeft,CalendarDays,MapPin,Users}from'lucide-react';
import{useGym}from'../../context/GymContext';
import{AppLayout}from'../../components/layout/AppLayout';
import{PaymentReceipt}from'../../components/ui/PaymentReceipt';
import{useVisibilityPolling}from'../../hooks/useVisibilityPolling';
import{PORTAL_POLL_INTERVALS}from'../../lib/refreshPolicy';
import{apiBase as BASE}from'../../lib/secureFetch';

const EventBody:React.FC<{event:any;onBack:()=>void;onRegister?:()=>void;message?:string}>=({event,onBack,onRegister,message})=><div className="mx-auto max-w-5xl">
 <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-xs font-black uppercase text-[#EF1B23]"><ArrowLeft className="h-4 w-4"/>Back to events</button>
 {message&&<div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</div>}
 <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
  {event.image_url&&<img src={event.image_url} alt={event.title} className="h-[260px] w-full object-cover sm:h-[380px]"/>}
  <div className="p-6 sm:p-8">
   <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-black uppercase tracking-widest text-[#EF1B23]"><span>{new Date(event.starts_at).toLocaleString()}</span><span>{Number(event.price_minor)?`₦${(Number(event.price_minor)/100).toLocaleString()}`:'Free event'}</span></div>
   <h1 className="mt-4 text-3xl font-black tracking-tight text-[#111] sm:text-5xl">{event.title}</h1>
   <div className="mt-6 grid gap-3 text-sm text-gray-600 sm:grid-cols-3"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#EF1B23]"/>{new Date(event.ends_at).toLocaleString()}</span><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#EF1B23]"/>{event.location}</span><span className="flex items-center gap-2"><Users className="h-4 w-4 text-[#EF1B23]"/>{event.registered}/{event.capacity} booked</span></div>
   <p className="mt-7 whitespace-pre-line text-base leading-8 text-gray-700">{event.description}</p>
   {onRegister&&<button disabled={event.registration_status==='confirmed'} onClick={onRegister} className="mt-8 rounded-xl bg-[#EF1B23] px-6 py-3 text-xs font-black uppercase text-white disabled:bg-emerald-600">{event.registration_status==='confirmed'?'Booking confirmed':Number(event.price_minor)?'Register and pay':'Reserve my place'}</button>}
  </div>
 </article>
</div>;

export const EventDetails:React.FC<{mode:'public'|'portal'}>=({mode})=>{
 const{currentPath,navigate}=useGym();
 const id=currentPath.split('/').filter(Boolean).at(-1)||'';
 const[event,setEvent]=useState<any>(null),[message,setMessage]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const portalRoot=currentPath.startsWith('/admin')?'/admin/events':currentPath.startsWith('/staff')?'/staff/events':currentPath.startsWith('/member')?'/member/events':'/';
 const load=useCallback(async(signal?:AbortSignal)=>{try{const r=await fetch(`${BASE}/api/v1/${mode==='public'?'public/events':'events'}/${id}`,{credentials:'include',cache:'no-store',signal});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b?.error?.message||'Event was not found');setEvent(b.data);setError('')}catch(reason){if(!(reason instanceof DOMException&&reason.name==='AbortError'))setError(reason instanceof Error?reason.message:'Unable to load event')}finally{setLoading(false)}},[id,mode]);
 const refreshEvent=useVisibilityPolling(signal=>load(signal),mode==='portal'?PORTAL_POLL_INTERVALS.portal:null,true,true);
 const register=async()=>{setMessage('');const r=await fetch(`${BASE}/api/v1/events/${id}/register`,{method:'POST',credentials:'include'}),b=await r.json().catch(()=>({}));if(!r.ok)return setError(b?.error?.message||'Unable to register');if(b.data.authorizationUrl)return location.assign(b.data.authorizationUrl);setMessage('Your place is confirmed.');await refreshEvent()};
 const content=loading&&!event?<div className="h-96 animate-pulse rounded-2xl bg-white" role="status" aria-label="Loading event details"/>:!event&&error?<div className="rounded-2xl border border-red-200 bg-white p-10 text-center text-sm font-bold text-red-600">{error}</div>:<>{error&&<div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}<EventBody event={event} message={message} onBack={()=>navigate(portalRoot)} onRegister={mode==='portal'&&currentPath.startsWith('/member')?register:undefined}/></>;
 if(mode==='public')return <section className="bg-[#f7f7f5] px-4 py-28 text-[#111] sm:px-6 lg:px-8">{content}</section>;
 return <><PaymentReceipt/><AppLayout pageTitle="Event Details" pageSubtitle="Review the complete event description, date, location, capacity, and booking status." breadcrumbs={[{label:'Events',path:portalRoot},{label:'Details'}]}>{content}</AppLayout></>;
};
