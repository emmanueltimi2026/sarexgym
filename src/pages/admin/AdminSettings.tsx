import React, { useEffect, useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { settings, updateSettings } = useGym();
  const [formState, setFormState] = useState({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => setFormState({ ...settings }), [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formState);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
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
      </div>
    </AppLayout>
  );
};

