import React,{useCallback,useState}from'react';
import{ArrowRight,CalendarDays,MapPin,Users}from'lucide-react';
import{AppLayout}from'../../components/layout/AppLayout';
import{PaymentReceipt}from'../../components/ui/PaymentReceipt';
import{useGym}from'../../context/GymContext';
import{useVisibilityPolling}from'../../hooks/useVisibilityPolling';
import{PORTAL_POLL_INTERVALS}from'../../lib/refreshPolicy';

const BASE=(import.meta.env.VITE_API_BASE_URL||'http://localhost:8080').replace(/\/$/,'');

export const MemberEvents:React.FC=()=>{
 const{navigate}=useGym();
 const[events,setEvents]=useState<any[]>([]),[message,setMessage]=useState(''),[loadError,setLoadError]=useState(''),[loading,setLoading]=useState(true);
 const load=useCallback(async(signal?:AbortSignal)=>{try{const r=await fetch(`${BASE}/api/v1/events`,{credentials:'include',cache:'no-store',signal});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b?.error?.message||'Unable to load events');setEvents(b.data||[]);setLoadError('')}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))setLoadError(error instanceof Error?error.message:'Unable to load events')}finally{setLoading(false)}},[]);
 const refreshEvents=useVisibilityPolling(signal=>load(signal),PORTAL_POLL_INTERVALS.portal,true,true);
 const register=async(id:string)=>{setMessage('');const r=await fetch(`${BASE}/api/v1/events/${id}/register`,{method:'POST',credentials:'include'}),b=await r.json().catch(()=>({}));if(!r.ok)return setMessage(b?.error?.message||'Unable to register');if(b.data.authorizationUrl)return location.assign(b.data.authorizationUrl);setMessage('Your place is confirmed.');await refreshEvents()};
 return <><PaymentReceipt/><AppLayout pageTitle="Upcoming Events" pageSubtitle="Discover SAREX outings and activities, then reserve your place." breadcrumbs={[{label:'Member Portal'},{label:'Events'}]}>
  {message&&<div className="mb-4 rounded-lg bg-white p-4 text-sm font-bold">{message}</div>}
  {loadError&&<div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{loadError}</div>}
  <div className="grid gap-5 lg:grid-cols-2">
   {loading&&!events.length&&<div className="col-span-full grid gap-5 lg:grid-cols-2" role="status" aria-label="Loading events"><div className="h-96 animate-pulse rounded-2xl bg-white"/><div className="h-96 animate-pulse rounded-2xl bg-white"/></div>}
   {!loading&&!events.length&&<div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center"><CalendarDays className="mx-auto h-10 w-10 text-gray-300"/><h2 className="mt-4 text-xl font-black">No upcoming events</h2><p className="mt-2 text-sm text-gray-500">Published events will appear here when they become available.</p></div>}
   {events.map(event=><article key={event.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    {event.image_url?<img src={event.image_url} alt={event.title} className="h-56 w-full object-cover"/>:<div className="h-2 bg-[#EF1B23]"/>}
    <div className="p-6">
     <div className="flex items-center justify-between gap-3"><span className="text-xs font-black uppercase text-[#EF1B23]">{Number(event.price_minor)?`₦${(Number(event.price_minor)/100).toLocaleString()}`:'Free event'}</span><span className="text-xs text-gray-500">{event.registered}/{event.capacity} booked</span></div>
     <h2 className="mt-2 text-2xl font-black">{event.title}</h2>
     <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{event.description}</p>
     <div className="mt-5 grid gap-2 text-xs text-gray-600 sm:grid-cols-2"><p className="flex gap-2"><CalendarDays className="h-4 w-4"/>{new Date(event.starts_at).toLocaleString()}</p><p className="flex gap-2"><MapPin className="h-4 w-4"/>{event.location}</p><p className="flex gap-2 sm:col-span-2"><Users className="h-4 w-4"/>{event.registered}/{event.capacity} booked</p></div>
     <div className="mt-5 grid gap-2 sm:grid-cols-2"><button onClick={()=>navigate(`/member/events/${event.id}`)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 p-3 text-xs font-black text-[#111] hover:border-[#EF1B23]">View details <ArrowRight className="h-4 w-4"/></button><button disabled={event.registration_status==='confirmed'} onClick={()=>register(event.id)} className="rounded-lg bg-[#EF1B23] p-3 text-xs font-black text-white disabled:bg-emerald-600">{event.registration_status==='confirmed'?'BOOKING CONFIRMED':Number(event.price_minor)?'REGISTER AND PAY':'RESERVE MY PLACE'}</button></div>
    </div>
   </article>)}
  </div>
 </AppLayout></>;
};
