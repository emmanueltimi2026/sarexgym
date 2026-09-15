import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Plus, Mail, Phone, Users, UploadCloud, KeyRound, ShieldOff, Trash2, Pencil, Eye, EyeOff } from 'lucide-react';
import { StaffMember, Trainer } from '../../types';

type PersonTarget = { kind: 'staff' | 'trainers'; person: StaffMember | Trainer; action: 'reset' | 'suspend' | 'reactivate' | 'delete' };

export const AdminStaff: React.FC = () => {
  const { trainers, staffList = [], refresh } = useGym();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [resetNotice,setResetNotice]=useState('');
  const [noticeTone,setNoticeTone]=useState<'success'|'error'>('success');
  const notify=(message:string,tone:'success'|'error'='success')=>{setNoticeTone(tone);setResetNotice(message)};
  const [confirmTarget,setConfirmTarget]=useState<PersonTarget|null>(null);
  const [busy,setBusy]=useState(false);
  const [showTemporaryPassword,setShowTemporaryPassword]=useState(false);
  const [editTarget,setEditTarget]=useState<{kind:'staff'|'trainers';person:StaffMember|Trainer}|null>(null);
  const [editForm,setEditForm]=useState({firstName:'',lastName:'',email:'',phone:'',specialization:''});
  const base=import.meta.env.VITE_API_BASE_URL||'http://localhost:8080';
  const createResetLink=async(kind:'staff'|'trainers',person:StaffMember|Trainer)=>{setResetNotice('');try{const response=await fetch(`${base}/api/v1/${kind}/${person.id}/password-reset`,{method:'POST',credentials:'include'});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body?.error?.message||'Unable to create reset link');try{await navigator.clipboard.writeText(body.data.resetUrl)}catch{}notify(body.data.delivered?`Reset link emailed to ${body.data.email}.`:`Reset link created for ${body.data.email} and copied when clipboard access is available.`)}catch(error){notify(error instanceof Error?error.message:'Unable to create reset link','error')}};
  const applyPersonnelAction=async()=>{if(!confirmTarget)return;setBusy(true);setResetNotice('');const {kind,person,action}=confirmTarget;try{if(action==='reset'){await createResetLink(kind,person);setConfirmTarget(null);return}const response=await fetch(`${base}/api/v1/${kind}/${person.id}`,{method:action==='delete'?'DELETE':'PATCH',credentials:'include',headers:action==='delete'?undefined:{'Content-Type':'application/json'},body:action==='delete'?undefined:JSON.stringify({isActive:action==='reactivate'})});if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body?.error?.message||'Unable to update account')}await refresh();notify(`${person.firstName} ${person.lastName} was ${action==='delete'?'removed':action==='suspend'?'suspended':'reactivated'}.`);setConfirmTarget(null)}catch(error){notify(error instanceof Error?error.message:'Unable to update account','error')}finally{setBusy(false)}};
  const openEditor=(kind:'staff'|'trainers',person:StaffMember|Trainer)=>{setEditTarget({kind,person});setEditForm({firstName:person.firstName,lastName:person.lastName,email:person.email,phone:person.phone||'',specialization:kind==='trainers'?(person as Trainer).specialization||'':''})};
  const saveAccount=async(event:React.FormEvent)=>{event.preventDefault();if(!editTarget)return;setBusy(true);setResetNotice('');try{const payload=editTarget.kind==='trainers'?editForm:{firstName:editForm.firstName,lastName:editForm.lastName,email:editForm.email,phone:editForm.phone};const response=await fetch(`${base}/api/v1/${editTarget.kind}/${editTarget.person.id}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body?.error?.message||'Unable to save account')}await refresh();notify(`${editForm.firstName} ${editForm.lastName}'s account was updated.`);setEditTarget(null)}catch(error){notify(error instanceof Error?error.message:'Unable to save account','error')}finally{setBusy(false)}};

  const [newStaff, setNewStaff] = useState({
    staffType: 'trainer' as 'trainer' | 'receptionist',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    password: '',
    photo: ''
  });

  const resetNewStaff = () => setNewStaff({
    staffType: 'trainer',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    password: '',
    photo: ''
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResetNotice('');
    try {
      const isTrainer = newStaff.staffType === 'trainer';
      const response = await fetch(`${base}/api/v1/${isTrainer ? 'trainers' : 'staff'}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isTrainer ? {
          firstName: newStaff.firstName,
          lastName: newStaff.lastName,
          email: newStaff.email,
          phone: newStaff.phone,
          specialization: newStaff.specialization,
          password: newStaff.password,
          photo: newStaff.photo,
          isActive: true
        } : {
          firstName: newStaff.firstName,
          lastName: newStaff.lastName,
          email: newStaff.email,
          phone: newStaff.phone,
          password: newStaff.password,
          isActive: true
        })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error?.message || 'Unable to create staff account');
      }
      await refresh();
      notify(`${newStaff.firstName} ${newStaff.lastName} was added as ${isTrainer ? 'a trainer' : 'a receptionist'} and must change password on first login.`);
      setIsAddModalOpen(false);
      resetNewStaff();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to create staff account','error');
    } finally {
      setBusy(false);
    }
  };
  const loadTrainerPhoto = (file?: File) => {
    if (!file || !file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setNewStaff(current => ({ ...current, photo: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  return (
    <AppLayout
      pageTitle="Staff & Trainers"
      pageSubtitle="Manage the staff account, trainers, access status, and account recovery."
      breadcrumbs={[{ label: 'Administration' }, { label: 'Staff & Trainers' }]}
      actions={
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Add Staff
        </button>
      }
    >
      {resetNotice&&<div role={noticeTone==='error'?'alert':'status'} className={`mb-4 rounded-lg border p-3 text-xs font-semibold ${noticeTone==='error'?'border-red-200 bg-red-50 text-red-700':'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{resetNotice}</div>}
      <div className="mb-4 flex items-end justify-between"><div><h2 className="text-base font-black">Staff account</h2><p className="mt-1 text-xs text-gray-500">Manage the account responsible for member service and entrance operations.</p></div><Badge variant="neutral">{staffList.length} total</Badge></div>
      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {staffList.map(person=><div key={person.id} className="flex flex-col justify-between overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-xs transition-colors hover:border-gray-400"><div><div className="relative h-44 overflow-hidden"><InitialsAvatar src={person.photo} firstName={person.firstName} lastName={person.lastName} className="h-full w-full rounded-none text-4xl"/><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"/><div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white"><div><h3 className="text-lg font-bold uppercase leading-tight">{person.firstName} {person.lastName}</h3><span className="mt-1 block text-[11px] font-bold text-[#EF1B23]">Staff</span></div><Badge variant={person.isActive?'success':'danger'}>{person.isActive?'Active':'Suspended'}</Badge></div></div><div className="space-y-2 p-4 text-xs text-gray-500"><div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-[#EF1B23]"/><span className="truncate">{person.email}</span></div><div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-[#EF1B23]"/><span>{person.phone||'No phone number'}</span></div></div></div><div className="grid grid-cols-4 gap-2 border-t border-gray-100 p-4 text-xs"><button onClick={()=>openEditor('staff',person)} className="rounded-lg border px-2 py-2 font-bold hover:border-[#EF1B23]"><Pencil className="mx-auto mb-1 h-3.5 w-3.5"/>Edit</button><button onClick={()=>setConfirmTarget({kind:'staff',person,action:'reset'})} className="rounded-lg border px-2 py-2 font-bold hover:border-[#EF1B23]"><KeyRound className="mx-auto mb-1 h-3.5 w-3.5"/>Reset</button><button onClick={()=>setConfirmTarget({kind:'staff',person,action:person.isActive?'suspend':'reactivate'})} className="rounded-lg border px-2 py-2 font-bold hover:border-amber-500"><ShieldOff className="mx-auto mb-1 h-3.5 w-3.5"/>{person.isActive?'Suspend':'Activate'}</button><button onClick={()=>setConfirmTarget({kind:'staff',person,action:'delete'})} className="rounded-lg border border-red-200 px-2 py-2 font-bold text-red-700 hover:bg-red-50"><Trash2 className="mx-auto mb-1 h-3.5 w-3.5"/>Delete</button></div></div>)}
        {!staffList.length&&<div className="col-span-full rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">No staff account is available.</div>}
      </section>

      <div className="mb-4 flex items-end justify-between"><div><h2 className="text-base font-black">Trainers</h2><p className="mt-1 text-xs text-gray-500">Manage coaching profiles, access, assignments, and password recovery.</p></div><Badge variant="neutral">{trainers.length} total</Badge></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trainers.map(t => (
          <div
            key={t.id}
            className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-xs flex flex-col justify-between hover:border-gray-400 transition-colors"
          >
            <div>
              <div className="h-44 overflow-hidden relative">
                <InitialsAvatar src={t.photo} firstName={t.firstName} lastName={t.lastName} className="h-full w-full rounded-none text-4xl" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                  <div>
                    <h3 className="font-athletic font-bold text-lg uppercase leading-tight">
                      {t.firstName} {t.lastName}
                    </h3>
                    <span className="text-[11px] text-[#EF1B23] font-bold block">
                      {t.specialization}
                    </span>
                  </div>
                  <Badge variant={t.isActive ? 'success' : 'danger'}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <div className="p-4 space-y-3 text-xs">
                <p className="text-gray-600 line-clamp-2 leading-relaxed">
                  {t.bio}
                </p>

                <div className="pt-2 border-t border-gray-100 space-y-1.5 text-gray-500">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#EF1B23]" />
                    <span>{t.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#EF1B23]" />
                    <span>{t.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 border-t border-gray-100 p-4 pt-3 text-xs">
              <div className="mb-3 flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                Assigned Members:
              </span>
              <span className="font-bold text-[#111111] font-mono text-sm">
                {t.assignedMembersCount}
              </span>
              </div>
              <div className="grid grid-cols-4 gap-2"><button onClick={()=>openEditor('trainers',t)} className="rounded-lg border border-gray-200 px-2 py-2 font-bold text-gray-700 hover:border-[#EF1B23]"><Pencil className="mx-auto mb-1 h-3.5 w-3.5"/>Edit</button><button onClick={()=>setConfirmTarget({kind:'trainers',person:t,action:'reset'})} className="rounded-lg border border-gray-200 px-2 py-2 font-bold text-gray-700 hover:border-[#EF1B23]" title="Create a 30-minute password reset link"><KeyRound className="mx-auto mb-1 h-3.5 w-3.5"/>Reset</button><button onClick={()=>setConfirmTarget({kind:'trainers',person:t,action:t.isActive?'suspend':'reactivate'})} className="rounded-lg border border-gray-200 px-2 py-2 font-bold text-gray-700 hover:border-amber-500"><ShieldOff className="mx-auto mb-1 h-3.5 w-3.5"/>{t.isActive?'Suspend':'Activate'}</button><button onClick={()=>setConfirmTarget({kind:'trainers',person:t,action:'delete'})} className="rounded-lg border border-red-200 px-2 py-2 font-bold text-red-700 hover:bg-red-50"><Trash2 className="mx-auto mb-1 h-3.5 w-3.5"/>Delete</button></div>
            </div>
          </div>
        ))}
        {!trainers.length&&<div className="col-span-full rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">No trainers have been added yet.</div>}
      </div>

      
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { if (!busy) { setIsAddModalOpen(false); setShowTemporaryPassword(false); } }}
        title="ADD STAFF ACCOUNT"
        subtitle="Create a trainer or receptionist account with first-login password change"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          <label className="block font-bold uppercase text-gray-700">Staff type
            <select value={newStaff.staffType} onChange={e=>setNewStaff({...newStaff,staffType:e.target.value as 'trainer'|'receptionist',specialization:e.target.value==='trainer'?newStaff.specialization:''})} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-[#EF1B23]">
              <option value="trainer">Trainer</option>
              <option value="receptionist">Receptionist</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                required
                value={newStaff.firstName}
                onChange={e => setNewStaff({ ...newStaff, firstName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                placeholder="David"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                required
                value={newStaff.lastName}
                onChange={e => setNewStaff({ ...newStaff, lastName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                placeholder="James"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={newStaff.email}
                onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                placeholder="david@sarexfitness.com"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                required
                value={newStaff.phone}
                onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                placeholder="+234 803 111 2222"
              />
            </div>
          </div>

          {newStaff.staffType==='trainer'&&<div>
            <label className="block font-bold uppercase text-gray-700 mb-1">Specialization</label>
            <input
              type="text"
              required
              value={newStaff.specialization}
              onChange={e => setNewStaff({ ...newStaff, specialization: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
              placeholder="e.g. Olympic Weightlifting & Functional Mobility"
            />
          </div>}

          <div>
            <label className="block font-bold uppercase text-gray-700 mb-1">Temporary login password</label>
            <div className="relative">
              <input type={showTemporaryPassword ? 'text' : 'password'} required minLength={10} autoComplete="new-password" value={newStaff.password} onChange={e=>setNewStaff({...newStaff,password:e.target.value})} className="w-full rounded border border-gray-300 py-2 pl-3 pr-11 text-sm focus:border-[#EF1B23] focus:outline-none" placeholder="Minimum 10 characters"/>
              <button type="button" onClick={()=>setShowTemporaryPassword(value=>!value)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-gray-500 hover:text-[#111]" aria-label={showTemporaryPassword ? 'Hide temporary password' : 'Show temporary password'} title={showTemporaryPassword ? 'Hide password' : 'Show password'}>
                {showTemporaryPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">The staff member must replace this password immediately after the first sign-in.</p>
          </div>

          {newStaff.staffType==='trainer'&&<label onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();loadTrainerPhoto(e.dataTransfer.files[0])}} className="flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 transition hover:border-[#EF1B23] hover:bg-red-50/30">
            {newStaff.photo ? <img src={newStaff.photo} alt="Trainer preview" className="h-14 w-14 rounded-lg object-cover"/> : <span className="grid h-14 w-14 place-items-center rounded-lg bg-white text-[#EF1B23]"><UploadCloud className="h-6 w-6"/></span>}
            <span><strong className="block text-xs uppercase text-gray-800">Drop trainer photo here</strong><span className="mt-1 block text-[11px] text-gray-500">or tap to browse · JPG, PNG or WebP · max 20 MB</span></span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>loadTrainerPhoto(e.target.files?.[0])}/>
          </label>}

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              disabled={busy}
              className="px-4 py-2 border border-gray-300 rounded text-xs font-bold uppercase text-gray-700"
            >
              Cancel
            </button>
            <button
              disabled={busy}
              type="submit"
              className="px-5 py-2 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors"
            >
              {busy?'Creating…':'Create Staff Account'}
            </button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={Boolean(editTarget)} onClose={()=>!busy&&setEditTarget(null)} title={editTarget?.kind==='staff'?'EDIT STAFF ACCOUNT':'EDIT TRAINER ACCOUNT'} subtitle="Update the account details used across the portal.">
        <form onSubmit={saveAccount} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="font-bold uppercase text-gray-700">First name<input required value={editForm.firstName} onChange={event=>setEditForm({...editForm,firstName:event.target.value})} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#EF1B23]"/></label><label className="font-bold uppercase text-gray-700">Last name<input required value={editForm.lastName} onChange={event=>setEditForm({...editForm,lastName:event.target.value})} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#EF1B23]"/></label></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="font-bold uppercase text-gray-700">Email<input required type="email" value={editForm.email} onChange={event=>setEditForm({...editForm,email:event.target.value})} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#EF1B23]"/></label><label className="font-bold uppercase text-gray-700">Phone<input required type="tel" value={editForm.phone} onChange={event=>setEditForm({...editForm,phone:event.target.value})} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#EF1B23]"/></label></div>
          {editTarget?.kind==='trainers'&&<label className="block font-bold uppercase text-gray-700">Specialization<input required value={editForm.specialization} onChange={event=>setEditForm({...editForm,specialization:event.target.value})} className="mt-1 w-full rounded border border-gray-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#EF1B23]"/></label>}
          <div className="flex justify-end gap-2 border-t border-gray-200 pt-4"><button type="button" disabled={busy} onClick={()=>setEditTarget(null)} className="rounded-lg border px-4 py-2.5 font-bold">Cancel</button><button disabled={busy} className="rounded-lg bg-[#EF1B23] px-5 py-2.5 font-bold text-white disabled:opacity-50">{busy?'Saving…':'Save changes'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={Boolean(confirmTarget)} title={confirmTarget?.action==='reset'?'Send password reset':confirmTarget?.action==='delete'?'Delete account':confirmTarget?.action==='suspend'?'Suspend account':'Reactivate account'} message={confirmTarget?confirmTarget.action==='reset'?`Create a new 30-minute password reset link for ${confirmTarget.person.firstName} ${confirmTarget.person.lastName}? Any unused older reset link will stop working.`:confirmTarget.action==='delete'?`Remove ${confirmTarget.person.firstName} ${confirmTarget.person.lastName}'s access? Their historical records will be retained.`:confirmTarget.action==='suspend'?`Suspend ${confirmTarget.person.firstName} ${confirmTarget.person.lastName}? Their active sessions will end immediately.`:`Restore access for ${confirmTarget.person.firstName} ${confirmTarget.person.lastName}?`:''} confirmLabel={confirmTarget?.action==='reset'?'Create reset link':confirmTarget?.action==='delete'?'Delete':confirmTarget?.action==='suspend'?'Suspend':'Reactivate'} tone={confirmTarget?.action==='delete'?'danger':'warning'} busy={busy} onConfirm={()=>void applyPersonnelAction()} onClose={()=>!busy&&setConfirmTarget(null)}/>
    </AppLayout>
  );
};

