import React, { useEffect, useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { apiUrl } from '../../lib/secureFetch';
import { Settings, Save, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { settings, updateSettings } = useGym();
  const [formState, setFormState] = useState({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => setFormState({ ...settings }), [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formState);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const submitPasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordForm.newPassword.length < 10) return setPasswordMessage('New password must be at least 10 characters.');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return setPasswordMessage('New passwords do not match.');
    setPasswordBusy(true);
    setPasswordMessage('');
    try {
      const response = await fetch(apiUrl('/api/v1/auth/change-password'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error?.message || 'Unable to change password');
      }
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage('Password changed. Other active sessions were signed out.');
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : 'Unable to change password');
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Clinic & Platform Settings"
      pageSubtitle="Manage the clinic details shown throughout the website and member portals."
      breadcrumbs={[{ label: 'Administration' }, { label: 'Settings' }]}
    >
      <div className="max-w-4xl">
        {savedSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold">System settings successfully updated!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-gray-100">
              <Settings className="w-4 h-4 text-[#EF1B23]" />
              <h3 className="font-athletic font-bold uppercase tracking-wider text-[#111111] text-base">
                Manage Informations
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Gym Name</label>
                <input
                  type="text"
                  value={formState.gymName}
                  onChange={e => setFormState({ ...formState, gymName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Official Address</label>
                <input
                  type="text"
                  value={formState.address}
                  onChange={e => setFormState({ ...formState, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Reception Phone</label>
                <input
                  type="text"
                  value={formState.phone}
                  onChange={e => setFormState({ ...formState, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Support Email</label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={e => setFormState({ ...formState, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors flex items-center gap-1.5 shadow-md shadow-red-600/20"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </form>

        <form onSubmit={submitPasswordChange} className="mt-8 rounded-lg border border-[#E5E7EB] bg-white p-6 text-xs shadow-xs">
          <div className="mb-5 flex items-center gap-2 border-b border-gray-100 pb-4">
            <KeyRound className="h-4 w-4 text-[#EF1B23]" />
            <div>
              <h3 className="font-athletic text-base font-bold uppercase tracking-wider text-[#111111]">Admin Password</h3>
              <p className="mt-1 text-[11px] text-gray-500">Update the signed-in administrator password. Other active sessions will be signed out.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block font-bold uppercase text-gray-700">Current Password
              <input type="password" required autoComplete="current-password" value={passwordForm.currentPassword} onChange={event => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-[#EF1B23]" />
            </label>
            <label className="block font-bold uppercase text-gray-700">New Password
              <input type="password" required minLength={10} autoComplete="new-password" value={passwordForm.newPassword} onChange={event => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-[#EF1B23]" />
            </label>
            <label className="block font-bold uppercase text-gray-700">Confirm Password
              <input type="password" required minLength={10} autoComplete="new-password" value={passwordForm.confirmPassword} onChange={event => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-[#EF1B23]" />
            </label>
          </div>

          {passwordMessage && <div className={`mt-4 rounded-lg border p-3 font-semibold ${passwordMessage.startsWith('Password changed') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{passwordMessage}</div>}

          <div className="mt-5 flex justify-end">
            <button disabled={passwordBusy} className="flex items-center gap-2 rounded bg-[#111111] px-5 py-2.5 font-athletic text-xs font-bold uppercase text-white transition-colors hover:bg-[#EF1B23] disabled:opacity-50">
              {passwordBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {passwordBusy ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};
