import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Modal } from '../../components/ui/Modal';
import { Dumbbell, Plus, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { WorkoutRoutineBuilder } from '../../components/trainer/WorkoutRoutineBuilder';
import { resizeRoutine, routinePayload, validateRoutine, type DayDraft } from '../../lib/workoutRoutine';
import { workoutCreatePayload } from '../../../shared/workout-create.js';
import type { WorkoutPlan } from '../../types';
import { apiUrl } from '../../lib/secureFetch';

export const TrainerPlans: React.FC = () => {
  const { workoutPlans, addWorkoutPlan, updateWorkoutPlan, members, refresh } = useGym();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [completionPlan, setCompletionPlan] = useState<WorkoutPlan | null>(null);
  const [completing, setCompleting] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(workoutPlans[0]?.id || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [selectedAllEligible, setSelectedAllEligible] = useState(false);
  const [routineDays, setRoutineDays] = useState(() => resizeRoutine([], 4));
  const [attemptedSave, setAttemptedSave] = useState(false);
  const eligibleMembers = members.filter(member => member.workoutPlanEnabled && member.trainerAccess);
  const visibleEligibleMembers = eligibleMembers.filter(member => `${member.firstName} ${member.lastName} ${member.memberId}`.toLowerCase().includes(memberSearch.toLowerCase()));

  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    difficulty: 'Intermediate' as 'Beginner' | 'Intermediate' | 'Advanced',
    daysPerWeek: 4,
    memberIds: [] as string[]
  });

  const editPlan = (plan: WorkoutPlan) => {
    setEditingPlanId(plan.id);
    setNewPlan({ title: plan.title || plan.workoutName || '', description: plan.description || '', difficulty: plan.difficulty || 'Intermediate', daysPerWeek: plan.daysPerWeek || plan.routine?.length || 1, memberIds: plan.memberId ? [plan.memberId] : [] });
    setRoutineDays((plan.routine || []).map((day): DayDraft => ({ id: day.id || crypto.randomUUID(), dayName: day.dayName, focus: day.focus, exercises: day.exercises.map(exercise => ({ id: exercise.id || crypto.randomUUID(), name: exercise.name, sets: String(exercise.sets), reps: exercise.reps, restSeconds: String(exercise.restSeconds ?? 60), notes: exercise.notes || '' })) })));
    setAttemptedSave(false); setSaveError(''); setIsCreateOpen(true);
  };

  const openCreate = () => {
    setEditingPlanId(null);
    setNewPlan({ title: '', description: '', difficulty: 'Intermediate', daysPerWeek: 4, memberIds: [] });
    setRoutineDays(resizeRoutine([], 4));
    setAttemptedSave(false); setSaveError(''); setIsCreateOpen(true);
  };

  const completeProgram = async () => {
    if (!completionPlan || completing) return;
    setCompleting(true); setSaveError('');
    try {
      const response = await fetch(apiUrl(`/api/v1/workouts/${completionPlan.id}/complete`), { method:'POST', credentials:'include' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to complete this program.');
      await refresh({background:true});
      setCompletionPlan(null);
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Unable to complete this program.'); }
    finally { setCompleting(false); }
  };

  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('memberId');
    if (id && eligibleMembers.some(member => member.id === id)) {
      setNewPlan(current => ({ ...current, memberIds: [id] }));
      setIsCreateOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [members]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSave(true);
    if (validateRoutine(routineDays, newPlan.daysPerWeek).length) return;

    setIsSaving(true);
    setSaveError('');
    try {
      if (editingPlanId) {
        await updateWorkoutPlan(editingPlanId, { title: newPlan.title, description: newPlan.description, difficulty: newPlan.difficulty, daysPerWeek: newPlan.daysPerWeek, routine: routinePayload(routineDays) });
        setExpandedPlanId(editingPlanId);
      } else {
        const result = await addWorkoutPlan(workoutCreatePayload(newPlan, routinePayload(routineDays)));
        setExpandedPlanId(result?.data?.id || null);
      }
      setIsCreateOpen(false);
      setEditingPlanId(null);
      setNewPlan({ title: '', description: '', difficulty: 'Intermediate', daysPerWeek: 4, memberIds: [] });
      setRoutineDays(resizeRoutine([], 4));
      setAttemptedSave(false);
      setMemberSearch('');
      setMemberPickerOpen(false);
      setSelectedAllEligible(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The workout program could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Workout Programs"
      pageSubtitle="Create clear workout plans with exercises, sets, repetitions, and weekly schedules."
      breadcrumbs={[{ label: 'Trainer Portal', path: '/trainer/dashboard' }, { label: 'Workout Plans' }]}
      actions={
        <button
          onClick={openCreate}
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
            <button onClick={openCreate} className="mt-5 rounded-lg bg-[#EF1B23] px-5 py-3 text-xs font-black text-white">CREATE FIRST PROGRAM</button>
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
                      {plan.memberName || 'Assigned member'} · {plan.description}
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
                  {plan.status !== 'completed' ? <div className="flex flex-wrap gap-2"><button type="button" onClick={() => editPlan(plan)} className="rounded border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:border-[#EF1B23]">Edit program</button><button type="button" onClick={() => { setSaveError(''); setCompletionPlan(plan); }} className="rounded border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:border-[#EF1B23]">Mark completed</button></div> : <p className="text-xs font-bold text-gray-500">Completed · read-only for the member</p>}
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
                                <span>Rest: {ex.restSeconds ?? 60}s</span>
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
        title={editingPlanId ? 'EDIT TRAINING PROGRAM' : 'NEW TRAINING PROGRAM'}
        subtitle={editingPlanId ? 'Update this member’s routine before activity is recorded' : 'Build and assign a weekly routine'}
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {!editingPlanId && <div>
            <div className="mb-2 flex items-center justify-between gap-3"><label className="font-bold uppercase text-gray-700">Assign members</label><span className="text-[11px] font-semibold text-gray-500">{newPlan.memberIds.length} selected</span></div>
            <div className="relative">
              <button type="button" onClick={() => setMemberPickerOpen(open => !open)} disabled={!eligibleMembers.length} aria-expanded={memberPickerOpen} aria-controls="eligible-member-options" className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-3 text-left text-sm disabled:cursor-not-allowed disabled:bg-gray-50">
                <span className="truncate">{newPlan.memberIds.length ? `${newPlan.memberIds.length} member${newPlan.memberIds.length === 1 ? '' : 's'} selected` : 'Select eligible members'}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${memberPickerOpen ? 'rotate-180' : ''}`} />
              </button>
              {memberPickerOpen && <div id="eligible-member-options" className="mt-2 overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2"><Search className="h-4 w-4 text-gray-400"/><input type="search" value={memberSearch} onChange={event => setMemberSearch(event.target.value)} placeholder="Search eligible members" aria-label="Search eligible members" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></div>
                <label className="flex cursor-pointer items-center gap-3 border-b border-gray-200 px-3 py-2.5 font-bold"><input type="checkbox" checked={selectedAllEligible && eligibleMembers.every(member => newPlan.memberIds.includes(member.id))} onChange={event => { setSelectedAllEligible(event.target.checked); setNewPlan(current => ({ ...current, memberIds: event.target.checked ? eligibleMembers.map(member => member.id) : [] })); }} className="h-4 w-4 accent-[#EF1B23]"/>Select all eligible members</label>
                <div className="max-h-48 overflow-y-auto">{visibleEligibleMembers.map(member => <label key={member.id} className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2.5 last:border-0 hover:bg-gray-50"><input type="checkbox" checked={newPlan.memberIds.includes(member.id)} onChange={event => { setSelectedAllEligible(false); setNewPlan(current => ({ ...current, memberIds: event.target.checked ? [...current.memberIds, member.id] : current.memberIds.filter(id => id !== member.id) })); }} className="h-4 w-4 accent-[#EF1B23]"/><span className="min-w-0"><strong className="block truncate text-sm">{member.firstName} {member.lastName}</strong><span className="text-[10px] text-gray-500">{member.memberId} · {member.membershipPlanName}</span></span></label>)}</div>
                {!visibleEligibleMembers.length && <p className="px-3 py-3 text-[11px] text-gray-500">No eligible members match this search.</p>}
              </div>}
            </div>
            {!eligibleMembers.length && <p className="mt-2 text-[11px] text-amber-700">No assigned member currently has an active subscription with trainer and workout-plan access.</p>}
          </div>}
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

          <div>
            <label className="block font-bold uppercase text-gray-700 mb-1">Difficulty</label>
            <select value={newPlan.difficulty} onChange={event => setNewPlan({ ...newPlan, difficulty: event.target.value as 'Beginner' | 'Intermediate' | 'Advanced' })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#EF1B23] focus:outline-none bg-white">
              <option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Advanced">Advanced (High Intensity)</option>
            </select>
          </div>
          <WorkoutRoutineBuilder days={routineDays} daysPerWeek={newPlan.daysPerWeek} errors={attemptedSave ? validateRoutine(routineDays, newPlan.daysPerWeek) : []} onDaysChange={setRoutineDays} onCountChange={count => setNewPlan(current => ({ ...current, daysPerWeek: count }))}/>

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
              disabled={isSaving || (!editingPlanId && !newPlan.memberIds.length)}
              className="px-5 py-2 bg-[#EF1B23] hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-athletic font-bold uppercase text-xs rounded transition-colors"
            >
              {isSaving ? 'Saving…' : editingPlanId ? 'Save Changes' : `Save Program${newPlan.memberIds.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={Boolean(completionPlan)} onClose={() => { if (!completing) setCompletionPlan(null); }} title="COMPLETE PROGRAM" subtitle={completionPlan?.title || 'Training program'}>
        <div className="space-y-4 text-sm"><p>Mark this program complete? The member can still review the routine, but can no longer mark exercises done.</p>{saveError && <p role="alert" className="text-red-700">{saveError}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setCompletionPlan(null)} disabled={completing} className="rounded border border-gray-300 px-4 py-2 font-bold">Cancel</button><button type="button" onClick={() => void completeProgram()} disabled={completing} className="rounded bg-[#EF1B23] px-4 py-2 font-bold text-white disabled:opacity-50">{completing ? 'Completing…' : 'Complete program'}</button></div></div>
      </Modal>
    </AppLayout>
  );
};
