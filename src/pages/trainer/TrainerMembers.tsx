import React, { useState } from 'react';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Search, Dumbbell, Target, CheckCircle2 } from 'lucide-react';
import { Member } from '../../types';

export const TrainerMembers: React.FC = () => {
  const { members, workoutPlans, attendance } = useGym();
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isAssignPlanOpen, setIsAssignPlanOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(workoutPlans[0]?.id || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filtered = members.filter(
    m =>
      m.firstName.toLowerCase().includes(search.toLowerCase()) ||
      m.lastName.toLowerCase().includes(search.toLowerCase()) ||
      m.memberId.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssignPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    const plan = workoutPlans.find(p => p.id === selectedPlanId);
    setToastMessage(`Assigned program "${plan?.title}" to ${selectedMember.firstName}!`);
    setIsAssignPlanOpen(false);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getMemberAttendanceCount = (memId: string) => {
    return attendance.filter(a => a.memberId === memId && a.status !== 'Denied').length;
  };

  return (
    <AppLayout
      pageTitle="Member Roster & Progress Tracking"
      pageSubtitle="Review assigned members, visit history, fitness goals, and workout plans."
      breadcrumbs={[{ label: 'Trainer Portal', path: '/trainer/dashboard' }, { label: 'Members' }]}
    >
      {toastMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-black">✕</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 mb-6 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search member by name or ID..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs text-[#111111] focus:bg-white focus:border-[#EF1B23] focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(member => {
          const checkInCount = getMemberAttendanceCount(member.memberId);
          return (
            <div
              key={member.id}
              className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-gray-400 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <InitialsAvatar src={member.photo} firstName={member.firstName} lastName={member.lastName} className="h-12 w-12"/>
                    <div>
                      <h4 className="font-bold text-[#111111] text-sm">
                        {member.firstName} {member.lastName}
                      </h4>
                      <span className="text-[11px] font-mono text-gray-400 block">
                        {member.memberId}
                      </span>
                    </div>
                  </div>
                  <Badge variant={member.membershipStatus === 'Active' ? 'success' : 'danger'}>
                    {member.membershipStatus}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="text-gray-500 text-[10px] uppercase font-bold block mb-0.5">
                      Target Goal
                    </span>
                    <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-[#EF1B23]" />
                      {member.fitnessGoal || 'Hypertrophy & Conditioning'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-gray-50 rounded border border-gray-100">
                      <span className="text-gray-400 block text-[10px]">Tier</span>
                      <span className="font-bold text-gray-800 truncate block">
                        {member.membershipPlanName}
                      </span>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border border-gray-100">
                      <span className="text-gray-400 block text-[10px]">Gate Scans</span>
                      <span className="font-bold text-gray-800 block">
                        {checkInCount} sessions
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedMember(member);
                    setIsAssignPlanOpen(true);
                  }}
                  className="w-full py-2 bg-[#151515] hover:bg-black text-white font-athletic font-bold uppercase text-[11px] rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  <Dumbbell className="w-3.5 h-3.5 text-[#EF1B23]" />
                  Assign Workout Program
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assign Plan Modal */}
      {selectedMember && (
        <Modal
          isOpen={isAssignPlanOpen}
          onClose={() => setIsAssignPlanOpen(false)}
          title="ASSIGN TRAINING PROGRAM"
          subtitle={`Assign routine to ${selectedMember.firstName} ${selectedMember.lastName}`}
        >
          <form onSubmit={handleAssignPlan} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">
                Select Program From Library
              </label>
              <select
                value={selectedPlanId}
                onChange={e => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none bg-white"
              >
                {workoutPlans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.difficulty} - {p.daysPerWeek} Days/wk)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">
                Training Directive & Focus Notes
              </label>
              <textarea
                rows={3}
                placeholder="Specific RPE targets, warm-up instructions, or injury modifications..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
                defaultValue="Focus on progressive overload with 2.5kg micro-loading on barbell movements. Maintain strict tempo."
              />
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAssignPlanOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded text-xs font-bold uppercase text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors"
              >
                Confirm Program Assignment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AppLayout>
  );
};

