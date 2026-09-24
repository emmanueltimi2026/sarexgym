import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Dumbbell, CheckCircle2, Clock, CalendarDays, UserRound, ChevronDown, ListChecks, Layers3 } from 'lucide-react';
import { apiUrl } from '../../lib/secureFetch';
import { workoutCompletionKey, workoutExerciseKeys } from '../../../shared/workout-keys.js';

const lagosToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const MemberWorkout: React.FC = () => {
  const { workoutPlans, currentMember } = useGym();
  const assignedPlans = workoutPlans.filter(plan => plan.memberId === currentMember.id || plan.memberId === currentMember.memberId);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const currentPlan = assignedPlans.find(plan => plan.id === selectedPlanId) || assignedPlans.find(plan => plan.status === 'active') || assignedPlans[0] || null;
  const planIdRef = useRef(currentPlan?.id || '');
  planIdRef.current = currentPlan?.id || '';
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [completionDate, setCompletionDate] = useState('');
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const [savingExercise, setSavingExercise] = useState<string | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const routines = currentPlan?.routine || [];
  const activeRoutine = routines[activeDayIndex] || routines[0] || null;

  const loadCompletions = useCallback(async (signal?: AbortSignal) => {
    if (!currentPlan?.id || !currentMember.workoutPlanEnabled) return;
    const requestedPlanId = currentPlan.id;
    setCompletionLoading(true);
    setCompletionError('');
    try {
      const response = await fetch(apiUrl(`/api/v1/workouts/${currentPlan.id}/completions/today`), { credentials: 'include', signal });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to load workout progress.');
      if (signal?.aborted || planIdRef.current !== requestedPlanId) return;
      setCompletedExercises(new Set((body.data.completed || []).map((entry: { dayKey: string; exerciseKey: string }) => workoutCompletionKey(entry.dayKey, entry.exerciseKey))));
      setCompletionDate(body.data.date);
    } catch (error) {
      if (!signal?.aborted && planIdRef.current === requestedPlanId) setCompletionError(error instanceof Error ? error.message : 'Unable to load workout progress.');
    } finally {
      if (!signal?.aborted && planIdRef.current === requestedPlanId) setCompletionLoading(false);
    }
  }, [currentPlan?.id, currentMember.workoutPlanEnabled]);

  useEffect(() => {
    setActiveDayIndex(0);
    setExpandedExercise(null);
    setCompletedExercises(new Set());
    setCompletionDate('');
    const controller = new AbortController();
    void loadCompletions(controller.signal);
    return () => controller.abort();
  }, [loadCompletions]);

  useEffect(() => {
    if (!completionDate || !currentPlan) return;
    const timer = window.setInterval(() => {
      if (completionDate !== lagosToday()) {
        setCompletedExercises(new Set());
        void loadCompletions();
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [completionDate, currentPlan?.id, loadCompletions]);

  const toggleExercise = async (dayIndex: number, exerciseIndex: number) => {
    if (!currentPlan || currentPlan.status === 'completed' || savingExercise || completionLoading || completionError) return;
    if (completionDate !== lagosToday()) {
      setCompletedExercises(new Set());
      await loadCompletions();
      return;
    }
    const keys = workoutExerciseKeys(routines, dayIndex, exerciseIndex);
    if (!keys) return;
    const key = workoutCompletionKey(keys.dayKey, keys.exerciseKey);
    const requestedPlanId = currentPlan.id;
    setSavingExercise(key);
    try {
      const response = await fetch(apiUrl(`/api/v1/workouts/${currentPlan.id}/completions/today`), {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayIndex, exerciseIndex, completed: !completedExercises.has(key) })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to save workout progress.');
      if (planIdRef.current !== requestedPlanId) return;
      const saved = body.data;
      setCompletionDate(saved.date);
      setCompletedExercises(previous => {
        const next = new Set(previous);
        const savedKey = workoutCompletionKey(saved.dayKey, saved.exerciseKey);
        if (saved.completed) next.add(savedKey); else next.delete(savedKey);
        return next;
      });
    } catch (error) {
      if (planIdRef.current === requestedPlanId) setCompletionError(error instanceof Error ? error.message : 'Unable to save workout progress.');
    } finally {
      setSavingExercise(null);
    }
  };

  const completedCount = activeRoutine?.exercises?.filter((_, index) => {
    const keys = workoutExerciseKeys(routines, activeDayIndex, index);
    return keys && completedExercises.has(workoutCompletionKey(keys.dayKey, keys.exerciseKey));
  }).length || 0;
  const exerciseCount = activeRoutine?.exercises.length || 0;
  const prescribedSets = activeRoutine?.exercises.reduce((total, exercise) => total + exercise.sets, 0) || 0;
  const completionPercent = exerciseCount ? Math.round(completedCount / exerciseCount * 100) : 0;

  if (!currentMember.workoutPlanEnabled) return <AppLayout pageTitle="Workout Plan" pageSubtitle="Trainer-guided routines are available as an optional membership service.">
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center"><Dumbbell className="mx-auto h-10 w-10 text-gray-300"/><h2 className="mt-4 text-lg font-black">Workout plan support is not active</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">Contact the SAREX team if you would like a trainer to create routines and track your progress.</p></div>
  </AppLayout>;

  if (!currentPlan) return <AppLayout pageTitle="Assigned Training Program" pageSubtitle="Follow the exercises, sets, and schedule assigned by your trainer." breadcrumbs={[{ label: 'Member Portal', path: '/member/dashboard' }, { label: 'Workout Program' }]}>
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No workout plan has been assigned yet.</div>
  </AppLayout>;

  return <AppLayout pageTitle="Workout Plan" pageSubtitle="Your trainer-prescribed routine and daily progress." breadcrumbs={[{ label: 'Member Portal', path: '/member/dashboard' }, { label: 'Workout Plan' }]}>
    <div className="mx-auto max-w-[1280px]">
      {completionError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800"><span>{completionError}</span><button type="button" onClick={() => void loadCompletions()} className="rounded border border-red-300 bg-white px-3 py-1.5 font-bold">Retry</button></div>}
      {currentPlan.status === 'completed' && <p className="mb-4 rounded border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600">This program is completed. Its routine remains available to review.</p>}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 space-y-4">
          <section className="relative isolate min-h-[240px] overflow-hidden rounded-lg bg-[#171717] text-white">
            <img src="/assets/photos/photo-1517838277536-f5f99be501cd.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/95 via-black/75 to-[#240507]/55" />
            <div className="relative z-20 flex min-h-[240px] flex-col justify-between gap-6 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded border border-white/25 bg-black/30 px-2.5 py-1 text-[11px] font-bold uppercase"><Dumbbell className="h-3.5 w-3.5 text-[#FF3038]" />Training program</span>
                <span className="rounded border border-white/35 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase">{currentPlan.difficulty || 'Intermediate'}</span>
              </div>
              <div className="min-w-0">
                <h2 className="break-words text-2xl font-bold leading-tight sm:text-3xl">{currentPlan.title || currentPlan.workoutName || 'Training program'}</h2>
                {currentPlan.description && <p className="mt-2 max-w-lg whitespace-pre-wrap break-words text-sm leading-6 text-white/80">{currentPlan.description}</p>}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/20 pt-3 text-xs text-white/90">
                <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-[#FF3038]" />{currentPlan.trainerName || 'SAREX Specialist'}</span>
                <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#FF3038]" />{currentPlan.daysPerWeek ?? routines.length} days / week</span>
              </div>
            </div>
          </section>
          {assignedPlans.length > 1 && <label className="block rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-700">Training program<select value={currentPlan.id} onChange={event => setSelectedPlanId(event.target.value)} className="mt-2 w-full rounded border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal text-gray-900">{assignedPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.title || plan.workoutName || 'Training program'} · {plan.trainerName || 'Trainer'}</option>)}</select></label>}
          {routines.length > 0 && <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-baseline justify-between gap-3"><h3 className="text-sm font-bold text-[#111111]">Workout days</h3><span className="text-xs text-gray-500">{routines.length} {routines.length === 1 ? 'day' : 'days'}</span></div>
            <nav className={`grid gap-2 ${routines.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`} aria-label="Workout days">
              {routines.map((day, index) => <button key={day.id || index} type="button" aria-current={index === activeDayIndex ? 'step' : undefined} onClick={() => { setActiveDayIndex(index); setExpandedExercise(null); }} className={`flex min-w-0 items-center gap-2 rounded border px-3 py-2.5 text-left transition ${index === activeDayIndex ? 'border-[#EF1B23] bg-[#EF1B23] text-white' : 'border-gray-200 bg-gray-50 text-gray-900 hover:border-[#EF1B23]'}`}>
                <Dumbbell className="h-4 w-4 shrink-0" /><span className="min-w-0"><strong className="block truncate text-xs">{day.dayName || `Day ${index + 1}`}</strong><span className="block truncate text-[11px] opacity-75">{day.focus || 'Training day'}</span></span>
              </button>)}
            </nav>
          </section>}
          {activeRoutine && <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3"><h3 className="text-sm font-bold text-[#111111]">Today's progress</h3><strong className="text-lg text-[#EF1B23]">{completionLoading ? '...' : `${completionPercent}%`}</strong></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-label="Exercises completed today" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={exerciseCount}><div className="h-full bg-[#EF1B23] transition-all" style={{ width: `${completionPercent}%` }} /></div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-xs"><div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-[#EF1B23]" /><span><strong className="block text-sm text-[#111111]">{completedCount} / {exerciseCount}</strong><span className="text-gray-500">exercises done</span></span></div><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-[#EF1B23]" /><span><strong className="block text-sm text-[#111111]">{prescribedSets}</strong><span className="text-gray-500">prescribed sets</span></span></div></div>
          </section>}
        </div>
        {activeRoutine ? <section className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <header className="px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><span className="text-sm font-bold text-[#EF1B23]">{activeRoutine.dayName || `Day ${activeDayIndex + 1}`}</span><h3 className="mt-1 break-words text-xl font-bold leading-tight text-[#111111] sm:text-2xl">{activeRoutine.focus || 'Training day'}</h3></div>
              <div className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-xs font-semibold ${exerciseCount > 0 && completedCount === exerciseCount ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-gray-50 text-gray-700'}`}><CheckCircle2 className="h-4 w-4" />{completionLoading ? 'Loading progress' : `${completedCount} of ${exerciseCount} completed`}</div>
            </div>
            <p className="mt-2 text-xs text-gray-500">{exerciseCount} prescribed exercises</p>
          </header>
          <div className="border-t border-gray-100">
            {exerciseCount === 0 && <p className="px-4 py-6 text-sm text-gray-500 sm:px-6">No exercises have been added to this day yet.</p>}
            {activeRoutine.exercises.map((exercise, index) => {
              const keys = workoutExerciseKeys(routines, activeDayIndex, index);
              const key = keys ? workoutCompletionKey(keys.dayKey, keys.exerciseKey) : '';
              const done = completedExercises.has(key);
              const expanded = expandedExercise === key;
              return <article key={exercise.id || index} className="border-b border-gray-100 last:border-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">{String(index + 1).padStart(2, '0')}</span>
                  <button type="button" aria-label={`${done ? 'Mark incomplete' : 'Mark complete'}: ${exercise.name}`} aria-pressed={done} disabled={currentPlan.status === 'completed' || completionLoading || Boolean(completionError) || Boolean(savingExercise)} onClick={() => void toggleExercise(activeDayIndex, index)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition disabled:cursor-wait disabled:opacity-60 ${done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 bg-white text-gray-400 hover:border-[#EF1B23] hover:text-[#EF1B23]'}`}><CheckCircle2 className="h-4 w-4" /></button>
                  <div className="min-w-0 flex-1"><strong className={`block break-words text-sm ${done ? 'text-gray-500 line-through' : 'text-[#111111]'}`}>{exercise.name}</strong>{savingExercise === key && <span className="text-[11px] text-gray-500">Saving...</span>}</div>
                  <div className="ml-11 flex w-full flex-wrap gap-2 sm:ml-0 sm:w-auto">
                    <span className="min-w-16 rounded bg-gray-50 px-2 py-1.5 text-center text-xs"><strong className="block text-gray-900">{exercise.sets}</strong><span className="text-[10px] text-gray-500">Sets</span></span>
                    <span className="min-w-16 rounded bg-gray-50 px-2 py-1.5 text-center text-xs"><strong className="block text-gray-900">{exercise.reps}</strong><span className="text-[10px] text-gray-500">Reps</span></span>
                    <span className="min-w-16 rounded bg-gray-50 px-2 py-1.5 text-center text-xs"><strong className="inline-flex items-center gap-1 text-gray-900"><Clock className="h-3 w-3 text-[#EF1B23]" />{exercise.restSeconds ?? 60}s</strong><span className="block text-[10px] text-gray-500">Rest</span></span>
                  </div>
                  {exercise.notes && <button type="button" aria-label={`${expanded ? 'Hide' : 'Show'} notes for ${exercise.name}`} aria-expanded={expanded} onClick={() => setExpandedExercise(expanded ? null : key)} className="ml-auto grid h-8 w-8 place-items-center rounded text-gray-600 hover:bg-gray-100 sm:ml-0"><ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button>}
                </div>
                {exercise.notes && expanded && <div className="mx-4 mb-4 border-l-2 border-[#EF1B23] bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-700 sm:mx-6"><span className="mb-1 block font-bold text-gray-900">Trainer instructions</span><p className="whitespace-pre-wrap break-words">{exercise.notes}</p></div>}
              </article>;
            })}
          </div>
        </section> : <section className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">This program has no routine yet. Ask your trainer to add exercises.</section>}
      </div>
    </div>
  </AppLayout>;
};
