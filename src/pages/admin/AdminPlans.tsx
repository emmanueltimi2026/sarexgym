import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Modal } from '../../components/ui/Modal';
import { Check, Edit2, Plus } from 'lucide-react';
import { MembershipPlan } from '../../types';

export const AdminPlans: React.FC = () => {
  const { plans, members, updatePlan, addPlan } = useGym();
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newPlan, setNewPlan] = useState({
    name: '',
    price: 35000,
    durationDays: 30,
    description: '',
    featuresText: 'All gym equipment access\nFree locker usage\nFitness evaluation',
    registrationFee: '' as number | '', trainerAccess: false, workoutPlanAccess: false
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    updatePlan(editingPlan.id, {
      name: editingPlan.name,
      price: editingPlan.price,
      durationDays: editingPlan.durationDays,
      description: editingPlan.description,
      features: editingPlan.features, registrationFee: editingPlan.registrationFee || 0, trainerAccess: Boolean(editingPlan.trainerAccess), workoutPlanAccess: Boolean(editingPlan.workoutPlanAccess)
    });
    setEditingPlan(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const featList = newPlan.featuresText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    addPlan({
      name: newPlan.name,
      price: Number(newPlan.price),
      durationDays: Number(newPlan.durationDays),
      description: newPlan.description,
      features: featList,
      isActive: true, registrationFee: Number(newPlan.registrationFee || 0), trainerAccess: newPlan.trainerAccess, workoutPlanAccess: newPlan.workoutPlanAccess
    });
    setIsAddOpen(false);
    setNewPlan({
      name: '',
      price: 35000,
      durationDays: 30,
      description: '',
      featuresText: 'All gym equipment access\nFree locker usage\nFitness evaluation', registrationFee: '' as number | '', trainerAccess: false, workoutPlanAccess: false
    });
  };

  return (
    <AppLayout
      pageTitle="Membership Plan"
      pageSubtitle="Configure subscription offerings, rates in Nigerian Naira (₦), duration, and perks."
      breadcrumbs={[{ label: 'Administration' }, { label: 'Membership Plans' }]}
      actions={
        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Create New Plan
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map(plan => {
          const subscriberCount = members.filter(m => m.membershipPlanId === plan.id).length;
          return (
            <div
              key={plan.id}
              className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-gray-400 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-athletic font-bold uppercase text-xl text-[#111111]">
                    {plan.name}
                  </h3>
                  <button
                    onClick={() => setEditingPlan({ ...plan })}
                    className="p-1 text-gray-400 hover:text-black rounded"
                    title="Edit Plan"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-athletic text-[#EF1B23]">
                    ₦{plan.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">
                    / {plan.durationDays} {plan.durationDays === 1 ? 'Day' : 'Days'}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mt-2 min-h-[32px] leading-relaxed">
                  {plan.description}
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-700">
                  {plan.workoutPlanAccess && <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600"/><span>Workout plan access</span></div>}
                  {plan.trainerAccess && <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600"/><span>Trainer access</span></div>}
                  {Boolean(plan.registrationFee) && <div className="text-gray-500">One-time registration: ₦{(plan.registrationFee || 0).toLocaleString()}</div>}
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#EF1B23] shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Active Members:</span>
                <span className="font-bold text-[#111111] font-mono">{subscriberCount}</span>
              </div>
            </div>
          );
        })}
      </div>

      
      {editingPlan && (
        <Modal
          isOpen={!!editingPlan}
          onClose={() => setEditingPlan(null)}
          title="EDIT MEMBERSHIP TIER"
          subtitle={`Adjusting price and privileges for ${editingPlan.name}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">Plan Name</label>
              <input
                type="text"
                required
                value={editingPlan.name}
                onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
              />
            </div>

            <label className="block font-bold uppercase text-gray-700">Registration fee (₦)<input type="number" min="0" value={editingPlan.registrationFee ?? ''} onChange={e=>setEditingPlan({...editingPlan,registrationFee:e.target.value===''?undefined:Number(e.target.value)})} placeholder="Enter registration fee" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm font-normal"/></label>
            <div className="flex gap-5"><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={Boolean(editingPlan.workoutPlanAccess)} onChange={e=>setEditingPlan({...editingPlan,workoutPlanAccess:e.target.checked})}/>Workout plan access</label><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={Boolean(editingPlan.trainerAccess)} onChange={e=>setEditingPlan({...editingPlan,trainerAccess:e.target.checked})}/>Trainer access</label></div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Price (₦ NGN)</label>
                <input
                  type="number"
                  required
                  value={editingPlan.price}
                  onChange={e => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Duration (Days)</label>
                <input
                  type="number"
                  required
                  value={editingPlan.durationDays}
                  onChange={e => setEditingPlan({ ...editingPlan, durationDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={editingPlan.description}
                onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">
                Features List (One per line)
              </label>
              <textarea
                rows={4}
                value={editingPlan.features.join('\n')}
                onChange={e => setEditingPlan({ ...editingPlan, features: e.target.value.split('\n') })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none font-mono"
              />
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 border border-gray-300 rounded text-xs font-bold uppercase text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors"
              >
                Update Plan
              </button>
            </div>
          </form>
        </Modal>
      )}

      
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="CREATE NEW MEMBERSHIP TIER"
        subtitle="Establish custom pricing and duration for members"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase text-gray-700 mb-1">Plan Name</label>
            <input
              type="text"
              required
              value={newPlan.name}
              onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
              placeholder="e.g. Quarterly VIP"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
            />
          </div>

          <label className="block font-bold uppercase text-gray-700">Registration fee (₦)<input type="number" min="0" value={newPlan.registrationFee} onChange={e=>setNewPlan({...newPlan,registrationFee:e.target.value===''?'':Number(e.target.value)})} placeholder="Enter registration fee" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm font-normal"/></label>
          <div className="flex gap-5"><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={newPlan.workoutPlanAccess} onChange={e=>setNewPlan({...newPlan,workoutPlanAccess:e.target.checked})}/>Workout plan access</label><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={newPlan.trainerAccess} onChange={e=>setNewPlan({...newPlan,trainerAccess:e.target.checked})}/>Trainer access</label></div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">Price (₦ NGN)</label>
              <input
                type="number"
                required
                value={newPlan.price}
                onChange={e => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">Duration (Days)</label>
              <input
                type="number"
                required
                value={newPlan.durationDays}
                onChange={e => setNewPlan({ ...newPlan, durationDays: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={newPlan.description}
              onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
              placeholder="Short plan summary..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-gray-700 mb-1">
              Features (One per line)
            </label>
            <textarea
              rows={4}
              value={newPlan.featuresText}
              onChange={e => setNewPlan({ ...newPlan, featuresText: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none font-mono"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded text-xs font-bold uppercase text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors"
            >
              Save New Plan
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
};
