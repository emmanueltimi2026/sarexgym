import React, { useEffect, useState } from 'react';
import { Camera, Save } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useGym } from '../../context/GymContext';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { apiBase as BASE } from '../../lib/secureFetch';

export const MemberSettings: React.FC = () => {
  const { currentMember, refresh } = useGym();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', address: '', photo: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm({
      firstName: currentMember.firstName || '',
      lastName: currentMember.lastName || '',
      email: currentMember.email || '',
      phone: currentMember.phone || '',
      address: currentMember.address || '',
      photo: currentMember.photo || ''
    });
  }, [currentMember.id]);

  const upload = (file?: File) => {
    if (!file) return;
    if (file.size > 20_000_000) {
      setMessage('Image must be smaller than 20 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm(value => ({ ...value, photo: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('Saving...');
    const response = await fetch(`${BASE}/api/v1/profile`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body?.error?.message || 'Unable to save profile.');
      return;
    }
    await refresh();
    setMessage('Profile settings saved.');
  };

  return (
    <AppLayout pageTitle="Member Settings" pageSubtitle="Update your contact information and profile photo." breadcrumbs={[{ label: 'Member Portal', path: '/member/dashboard' }, { label: 'Settings' }]}>
      <form onSubmit={submit} className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-gray-100 p-6 sm:flex-row sm:items-center">
          <InitialsAvatar src={form.photo} firstName={form.firstName} lastName={form.lastName} className="h-24 w-24 text-2xl" />
          <div>
            <h2 className="text-xl font-black">Profile photo</h2>
            <p className="mt-1 text-xs text-gray-500">JPG or PNG, up to 20 MB. Your initials are used when no image is uploaded.</p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#151515] px-4 py-2 text-xs font-bold text-white">
              <Camera className="h-4 w-4" />
              Choose image
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={event => upload(event.target.files?.[0])} />
            </label>
          </div>
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <label className="text-xs font-bold uppercase">First name<input required value={form.firstName} onChange={event => setForm({ ...form, firstName: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-200 p-3 text-sm font-normal outline-none focus:border-[#EF1B23]" /></label>
          <label className="text-xs font-bold uppercase">Last name<input required value={form.lastName} onChange={event => setForm({ ...form, lastName: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-200 p-3 text-sm font-normal outline-none focus:border-[#EF1B23]" /></label>
          <label className="text-xs font-bold uppercase">Email<input type="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-200 p-3 text-sm font-normal outline-none focus:border-[#EF1B23]" /></label>
          <label className="text-xs font-bold uppercase">Phone<input required value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-200 p-3 text-sm font-normal outline-none focus:border-[#EF1B23]" /></label>
          <label className="text-xs font-bold uppercase sm:col-span-2">Address<textarea rows={3} value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-200 p-3 text-sm font-normal outline-none focus:border-[#EF1B23]" /></label>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 p-6">
          <span className="text-xs text-gray-500">{message}</span>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[#EF1B23] px-5 py-3 text-xs font-black uppercase text-white"><Save className="h-4 w-4" />Save settings</button>
        </div>
      </form>
    </AppLayout>
  );
};


