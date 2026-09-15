import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Modal } from '../../components/ui/Modal';
import { Dumbbell, Plus, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { WorkoutDayRoutine } from '../../types';

export const TrainerPlans: React.FC = () => {
  const { workoutPlans, addWorkoutPlan, user, members } = useGym();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(workoutPlans[0]?.id || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const eligibleMembers = members.filter(member => member.workoutPlanEnabled && member.trainerAccess);
  const visibleEligibleMembers = eligibleMembers.filter(member => `${member.firstName} ${member.lastName} ${member.memberId}`.toLowerCase().includes(memberSearch.toLowerCase()));

  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    difficulty: 'Intermediate' as 'Beginner' | 'Intermediate' | 'Advanced',
    daysPerWeek: 4,
    memberIds: [] as string[]
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const defaultRoutines: WorkoutDayRoutine[] = [
      {
        dayName: 'Day 1',
        focus: 'Chest & Triceps Hypertrophy',
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, reps: '8-10', restSeconds: 90, notes: 'Explosive concentric' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'Cable Tricep Pushdowns', sets: 4, reps: '12-15', restSeconds: 45 }
        ]
      },
      {
        dayName: 'Day 2',
        focus: 'Back & Biceps Thickness',
        exercises: [
          { name: 'Conventional Deadlift', sets: 4, reps: '5', restSeconds: 150, notes: 'Chalk required' },
          { name: 'Barbell Pendlay Row', sets: 4, reps: '8', restSeconds: 90 },
          { name: 'Incline Dumbbell Curl', sets: 3, reps: '12', restSeconds: 60 }
        ]
      }
    ];

    setIsSaving(true);
    setSaveError('');
    try {
      const result = await addWorkoutPlan({
        title: newPlan.title,
        description: newPlan.description,
        difficulty: newPlan.difficulty,
        daysPerWeek: Number(newPlan.daysPerWeek),
        trainerId: user?.id || '',
        trainerName: user ? `${user.firstName} ${user.lastName}` : 'Assigned trainer',
        routine: defaultRoutines,
        memberIds: newPlan.memberIds
      });
      setExpandedPlanId(result?.data?.id || null);
      setIsCreateOpen(false);
      setNewPlan({ title: '', description: '', difficulty: 'Intermediate', daysPerWeek: 4, memberIds: [] });
      setMemberSearch('');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The workout program could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Program Library"
      pageSubtitle="Create clear workout plans with exercises, sets, repetitions, and weekly schedules."
      breadcrumbs={[{ label: 'Trainer Portal', path: '/trainer/dashboard' }, { label: 'Workout Plans' }]}
      actions={
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-[#EF1B23] hover:bg-red-700 text-white font-athletic font-bold uppercase text-xs rounded transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Create Program
        </button>
      }
    >
      <div className="space-y-6">
        {!workoutPlans.length && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Dumbbell className="mx-auto h-10 w-10 text-gray-300" />
            <h2 className="mt-4 text-xl font-black">No workout plans yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">Create a member-specific program when a member is ready for guided training.</p>
            <button onClick={() => setIsCreateOpen(true)} className="mt-5 rounded-lg bg-[#EF1B23] px-5 py-3 text-xs font-black text-white">CREATE FIRST PROGRAM</button>
          </div>
        )}
        {workoutPlans.map(plan => {
          const isExpanded = expandedPlanId === plan.id;
          return (
            <div
              key={plan.id}
              className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-xs"
            >
              
              <div
                onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors select-none"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-red-50 text-[#EF1B23] flex items-center justify-center font-athletic font-bold text-lg shrink-0">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-athletic font-bold uppercase text-base text-[#111111]">
                        {plan.title || plan.workoutName || 'Strength Protocol'}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-white px-2 py-0.5 rounded">
                        {plan.difficulty || 'Intermediate'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {plan.description} • By {plan.trainerName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-gray-600 font-mono">
                    {plan.daysPerWeek || (plan.routine?.length || 3)} Days / Wk
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              
              {isExpanded && (
                <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(plan.routine || []).map((day, dIdx) => (
                      <div
                        key={dIdx}
                        className="bg-white border border-gray-200 rounded p-4 shadow-2xs space-y-3"
                      >
                        <div className="border-b border-gray-100 pb-2">
                          <span className="text-[10px] font-athletic uppercase font-bold text-[#EF1B23] tracking-wider block">
                            {day.dayName}
                          </span>
                          <h4 className="font-bold text-xs text-[#111111]">
                            {day.focus}
                          </h4>
                        </div>

                        <div className="space-y-2 text-xs">
                          {(day.exercises || []).map((ex, eIdx) => (
                            <div
                              key={eIdx}
                              className="p-2 bg-gray-50 rounded border border-gray-100 text-[11px]"
                            >
                              <div className="font-bold text-[#111111] flex justify-between">
                                <span>{ex.name}</span>
                                <span className="font-mono text-[#EF1B23]">
                                  {ex.sets} × {ex.reps}
                                </span>
                              </div>
                              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                <span>Rest: {ex.restSeconds || 60}s</span>
                                {ex.notes && <span className="italic">{ex.notes}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {(!plan.routine || plan.routine.length === 0) && plan.exercises && (
                      <div className="col-span-full bg-white border border-gray-200 rounded p-4 shadow-2xs space-y-3">
                        <h4 className="font-bold text-xs text-[#111111]">Prescribed Exercise Volume</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {plan.exercises.map((ex, eIdx) => (
                            <div key={eIdx} className="p-2 bg-gray-50 rounded border border-gray-100 text-[11px]">
                              <div className="font-bold text-[#111111] flex justify-between">
                                <span>{ex.name}</span>
                                <span className="font-mono text-[#EF1B23]">{ex.sets} × {ex.reps}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      
      <Modal
        isOpen={isCreateOpen}
        onClose={() => { if (!isSaving) { setIsCreateOpen(false); setSaveError(''); } }}
        title="ARCHITECT NEW TRAINING PROGRAM"
        subtitle="Establish periodized split guidelines"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3"><label className="font-bold uppercase text-gray-700">Assign members</label><span className="text-[11px] font-semibold text-gray-500">{newPlan.memberIds.length} selected</span></div>
            <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2"><Search className="h-4 w-4 text-gray-400"/><input type="search" value={memberSearch} onChange={event => setMemberSearch(event.target.value)} placeholder="Search eligible members" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></div>
              <label className="flex cursor-pointer items-center gap-3 border-b border-gray-200 px-3 py-2.5 font-bold"><input type="checkbox" checked={eligibleMembers.length > 0 && newPlan.memberIds.length === eligibleMembers.length} onChange={event => setNewPlan({ ...newPlan, memberIds: event.target.checked ? eligibleMembers.map(member => member.id) : [] })} className="h-4 w-4 accent-[#EF1B23]"/>Select all eligible members</label>
              <div className="max-h-48 overflow-y-auto">{visibleEligibleMembers.map(member => <label key={member.id} className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2.5 last:border-0 hover:bg-gray-50"><input type="checkbox" checked={newPlan.memberIds.includes(member.id)} onChange={event => setNewPlan({ ...newPlan, memberIds: event.target.checked ? [...newPlan.memberIds, member.id] : newPlan.memberIds.filter(id => id !== member.id) })} className="h-4 w-4 accent-[#EF1B23]"/><span className="min-w-0"><strong className="block truncate text-sm">{member.firstName} {member.lastName}</strong><span className="text-[10px] text-gray-500">{member.memberId} · {member.membershipPlanName}</span></span></label>)}</div>
            </div>
            {!eligibleMembers.length && <p className="mt-2 text-[11px] text-amber-700">No assigned member currently has an active subscription with trainer and workout-plan access.</p>}
            {eligibleMembers.length > 0 && !visibleEligibleMembers.length && <p className="mt-2 text-[11px] text-gray-500">No eligible members match this search.</p>}
          </div>
          <div>
            <label className="block font-bold uppercase text-gray-700 mb-1">Program Title</label>
            <input
              type="text"
              required
              value={newPlan.title}
              onChange={e => setNewPlan({ ...newPlan, title: e.target.value })}
              placeholder="e.g. 8-Week Powerbuilding Protocol"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              required
              value={newPlan.description}
              onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
              placeholder="High frequency compound movements paired with hypertrophy accessories..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">Difficulty</label>
              <select
                value={newPlan.difficulty}
                onChange={e => setNewPlan({ ...newPlan, difficulty: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none bg-white"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced (High Intensity)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold uppercase text-gray-700 mb-1">Days Per Week</label>
              <select
                value={newPlan.daysPerWeek}
                onChange={e => setNewPlan({ ...newPlan, daysPerWeek: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none bg-white"
              >
                <option value={3}>3 Days / Week</option>
                <option value={4}>4 Days / Week</option>
                <option value={5}>5 Days / Week</option>
                <option value={6}>6 Days / Week</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            {saveError && <p role="alert" className="mr-auto max-w-xs text-[11px] text-red-600">{saveError}</p>}
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded text-xs font-bold uppercase text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !newPlan.memberIds.length}
              className="px-5 py-2 bg-[#EF1B23] hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-athletic font-bold uppercase text-xs rounded transition-colors"
            >
              {isSaving ? 'Saving…' : `Save Program${newPlan.memberIds.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
};
