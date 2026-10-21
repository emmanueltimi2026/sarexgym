import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Dumbbell, CheckCircle2, Clock, CalendarDays, UserRound, ChevronDown, ChevronLeft, ChevronRight, ListChecks, Layers3, History } from 'lucide-react';
import { apiUrl } from '../../lib/secureFetch';
import { formatAppDate, formatAppDateTime } from '../../utils/dateTime';

type WorkoutDayProgress = { dayIndex:number; dayId:string; dayName:string; focus:string; status:'completed'|'available'|'missed'; completedAt:string|null };
type WorkoutWeek = { weekNumber:number; startDate:string; endDate:string; nextStartDate?:string; completedWorkouts:number; assignedWorkouts:number; percentage:number; isComplete:boolean; days:WorkoutDayProgress[] };
type WorkoutCycle = { planId:string; programStartedOn:string; currentWeek:WorkoutWeek; history:WorkoutWeek[] };

export const MemberWorkout: React.FC = () => {
  const { workoutPlans, currentMember } = useGym();
  const assignedPlans = workoutPlans.filter(plan => plan.memberId === currentMember.id || plan.memberId === currentMember.memberId);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const currentPlan = assignedPlans.find(plan => plan.id === selectedPlanId) || assignedPlans.find(plan => plan.status === 'active') || assignedPlans[0] || null;
  const planIdRef = useRef(currentPlan?.id || '');
  planIdRef.current = currentPlan?.id || '';
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [cycle, setCycle] = useState<WorkoutCycle | null>(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const routines = currentPlan?.routine || [];
  const activeRoutine = routines[activeDayIndex] || routines[0] || null;
  const activeDayProgress = cycle?.currentWeek.days.find(day => day.dayIndex === activeDayIndex);

  const loadProgress = useCallback(async (signal?: AbortSignal) => {
    if (!currentPlan?.id || !currentMember.workoutPlanEnabled) return;
    const requestedPlanId = currentPlan.id;
    setCompletionLoading(true);
    setCompletionError('');
    try {
      const response = await fetch(apiUrl(`/api/v1/workouts/${requestedPlanId}/progress`), { credentials: 'include', signal });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to load workout progress.');
      if (signal?.aborted || planIdRef.current !== requestedPlanId) return;
      setCycle(body.data);
    } catch (error) {
      if (!signal?.aborted && planIdRef.current === requestedPlanId) setCompletionError(error instanceof Error ? error.message : 'Unable to load workout progress.');
    } finally {
      if (!signal?.aborted && planIdRef.current === requestedPlanId) setCompletionLoading(false);
    }
  }, [currentPlan?.id, currentMember.workoutPlanEnabled]);

  useEffect(() => {
    setActiveDayIndex(0);
    setExpandedExercise(null);
    setHistoryPage(1);
    setCycle(null);
    const controller = new AbortController();
    void loadProgress(controller.signal);
    return () => controller.abort();
  }, [loadProgress]);

  useEffect(() => {
    if (!currentPlan?.id || currentPlan.status === 'completed') return;
    const timer = window.setInterval(() => void loadProgress(), 60_000);
    return () => window.clearInterval(timer);
  }, [currentPlan?.id, currentPlan?.status, loadProgress]);

  const completeWorkoutDay = async (dayIndex:number) => {
    if (!currentPlan || currentPlan.status === 'completed' || savingDay !== null || activeDayProgress?.status === 'completed') return;
    const requestedPlanId = currentPlan.id;
    setSavingDay(dayIndex);
    setCompletionError('');
    try {
      const response = await fetch(apiUrl(`/api/v1/workouts/${requestedPlanId}/days/${dayIndex}/complete`), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}'
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Unable to save workout completion.');
      if (planIdRef.current === requestedPlanId) setCycle(body.data);
    } catch (error) {
      if (planIdRef.current === requestedPlanId) setCompletionError(error instanceof Error ? error.message : 'Unable to save workout completion.');
    } finally {
      setSavingDay(null);
    }
  };

  const exerciseCount = activeRoutine?.exercises.length || 0;
  const prescribedSets = activeRoutine?.exercises.reduce((total, exercise) => total + exercise.sets, 0) || 0;
  const week = cycle?.currentWeek;
  const historyPageSize = 5;
  const historyPages = Math.max(1, Math.ceil((cycle?.history.length || 0) / historyPageSize));
  const currentHistoryPage = Math.min(historyPage, historyPages);
  const visibleHistory = cycle?.history.slice((currentHistoryPage - 1) * historyPageSize, currentHistoryPage * historyPageSize) || [];

  if (!currentMember.workoutPlanEnabled) return <AppLayout pageTitle="Workout Plan" pageSubtitle="Trainer-guided routines are available as an optional membership service.">
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center"><Dumbbell className="mx-auto h-10 w-10 text-gray-300"/><h2 className="mt-4 text-lg font-black">Workout plan support is not active</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">Contact the SAREX team if you would like a trainer to create routines and track your progress.</p></div>
  </AppLayout>;

  if (!currentPlan) return <AppLayout pageTitle="Assigned Training Program" pageSubtitle="Follow the exercises, sets, and schedule assigned by your trainer." breadcrumbs={[{ label: 'Member Portal', path: '/member/dashboard' }, { label: 'Workout Program' }]}>
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No workout plan has been assigned yet.</div>
  </AppLayout>;

  return <AppLayout pageTitle="Workout Plan" pageSubtitle="Your weekly training schedule and completion history." breadcrumbs={[{ label: 'Member Portal', path: '/member/dashboard' }, { label: 'Workout Plan' }]}>
    <div className="mx-auto max-w-[1280px]">
      {completionError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800"><span>{completionError}</span><button type="button" onClick={() => void loadProgress()} className="rounded border border-red-300 bg-white px-3 py-1.5 font-bold">Retry</button></div>}
      {currentPlan.status === 'completed' && <p className="mb-4 rounded border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600">This program is completed. Its routine and completion history remain available to review.</p>}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 space-y-4">
          <section className="relative isolate min-h-[240px] overflow-hidden rounded-lg bg-[#171717] text-white">
            <img src="/assets/photos/photo-1517838277536-f5f99be501cd.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/95 via-black/75 to-[#240507]/55" />
            <div className="relative z-20 flex min-h-[240px] flex-col justify-between gap-6 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-2 rounded border border-white/25 bg-black/30 px-2.5 py-1 text-[11px] font-bold uppercase"><Dumbbell className="h-3.5 w-3.5 text-[#FF3038]" />Training program</span><span className="rounded border border-white/35 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase">{currentPlan.difficulty || 'Intermediate'}</span></div>
              <div className="min-w-0"><h2 className="break-words text-2xl font-bold leading-tight sm:text-3xl">{currentPlan.title || currentPlan.workoutName || 'Training program'}</h2>{currentPlan.description && <p className="mt-2 max-w-lg whitespace-pre-wrap break-words text-sm leading-6 text-white/80">{currentPlan.description}</p>}</div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/20 pt-3 text-xs text-white/90"><span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-[#FF3038]" />{currentPlan.trainerName || 'SAREX Specialist'}</span><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#FF3038]" />{currentPlan.daysPerWeek ?? routines.length} days / week</span></div>
            </div>
          </section>
          {assignedPlans.length > 1 && <label className="block rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-700">Training program<select value={currentPlan.id} onChange={event => setSelectedPlanId(event.target.value)} className="mt-2 w-full rounded border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal text-gray-900">{assignedPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.title || plan.workoutName || 'Training program'} · {plan.trainerName || 'Trainer'}</option>)}</select></label>}
          {week && <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4"><div><span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">This week · Week {week.weekNumber}</span><h3 className="mt-1 text-lg font-bold text-[#111111]">{week.isComplete ? 'Weekly training completed' : `${week.completedWorkouts} of ${week.assignedWorkouts} workouts completed`}</h3><p className="mt-1 text-xs text-gray-500">{formatAppDate(week.startDate)} – {formatAppDate(week.endDate)}</p></div><strong className="text-2xl text-[#EF1B23]">{week.percentage}%</strong></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-label="Weekly workout progress" aria-valuenow={week.completedWorkouts} aria-valuemin={0} aria-valuemax={week.assignedWorkouts}><div className="h-full rounded-full bg-[#EF1B23] transition-all" style={{ width:`${week.percentage}%` }} /></div>
            {week.isComplete && <p className="mt-3 text-xs text-emerald-700">Your next workout cycle begins {formatAppDate(week.nextStartDate || '')}.</p>}
          </section>}
          {routines.length > 0 && <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-baseline justify-between gap-3"><h3 className="text-sm font-bold text-[#111111]">Workout days</h3><span className="text-xs text-gray-500">{routines.length} {routines.length === 1 ? 'day' : 'days'}</span></div>
            <nav className={`grid gap-2 ${routines.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`} aria-label="Workout days">
              {routines.map((day, index) => { const status=week?.days.find(item=>item.dayIndex===index)?.status; return <button key={day.id || index} type="button" aria-current={index === activeDayIndex ? 'step' : undefined} onClick={() => { setActiveDayIndex(index); setExpandedExercise(null); }} className={`flex min-w-0 items-center gap-2 rounded border px-3 py-2.5 text-left transition ${index === activeDayIndex ? 'border-[#EF1B23] bg-[#EF1B23] text-white' : 'border-gray-200 bg-gray-50 text-gray-900 hover:border-[#EF1B23]'}`}>
                {status === 'completed' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Dumbbell className="h-4 w-4 shrink-0" />}<span className="min-w-0"><strong className="block truncate text-xs">{day.dayName || `Day ${index + 1}`}</strong><span className="block truncate text-[11px] opacity-75">{status === 'completed' ? 'Completed this week' : day.focus || 'Training day'}</span></span>
              </button>; })}
            </nav>
          </section>}
          {activeRoutine && <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3"><h3 className="text-sm font-bold text-[#111111]">Workout details</h3><span className="text-xs text-gray-500">{exerciseCount} exercises</span></div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-xs"><div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-[#EF1B23]" /><span><strong className="block text-sm text-[#111111]">{exerciseCount}</strong><span className="text-gray-500">prescribed exercises</span></span></div><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-[#EF1B23]" /><span><strong className="block text-sm text-[#111111]">{prescribedSets}</strong><span className="text-gray-500">prescribed sets</span></span></div></div>
          </section>}
        </div>
        {activeRoutine ? <section className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <header className="px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><span className="text-sm font-bold text-[#EF1B23]">{activeRoutine.dayName || `Day ${activeDayIndex + 1}`}</span><h3 className="mt-1 break-words text-xl font-bold leading-tight text-[#111111] sm:text-2xl">{activeRoutine.focus || 'Training day'}</h3></div>
              <div className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-xs font-semibold ${activeDayProgress?.status === 'completed' ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-gray-50 text-gray-700'}`}><CheckCircle2 className="h-4 w-4" />{completionLoading ? 'Loading progress' : activeDayProgress?.status === 'completed' ? `Completed on ${formatAppDate(activeDayProgress.completedAt || '')}` : 'Not completed this week'}</div>
            </div>
            <p className="mt-2 text-xs text-gray-500">{exerciseCount} prescribed exercises</p>
            <button type="button" disabled={currentPlan.status === 'completed' || !week || activeDayProgress?.status === 'completed' || completionLoading || savingDay !== null || exerciseCount === 0} onClick={() => void completeWorkoutDay(activeDayIndex)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-[#EF1B23] px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto">
              <CheckCircle2 className="h-4 w-4" />{savingDay === activeDayIndex ? 'Saving completion…' : activeDayProgress?.status === 'completed' ? 'Completed this week' : 'Mark workout day complete'}
            </button>
            {activeDayProgress?.status === 'completed' && activeDayProgress.completedAt && <p className="mt-2 text-[11px] text-gray-500">Recorded {formatAppDateTime(activeDayProgress.completedAt)}</p>}
          </header>
          <div className="border-t border-gray-100">
            {exerciseCount === 0 && <p className="px-4 py-6 text-sm text-gray-500 sm:px-6">No exercises have been added to this day yet.</p>}
            {activeRoutine.exercises.map((exercise, index) => {
              const key = exercise.id || `${activeDayIndex}-${index}`;
              const expanded = expandedExercise === key;
              return <article key={key} className="border-b border-gray-100 last:border-0"><div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1"><strong className="block break-words text-sm text-[#111111]">{exercise.name}</strong></div>
                <div className="ml-11 flex w-full flex-wrap gap-2 sm:ml-0 sm:w-auto"><span className="min-w-16 rounded bg-gray-50 px-2 py-1.5 text-center text-xs"><strong className="block text-gray-900">{exercise.sets}</strong><span className="text-[10px] text-gray-500">Sets</span></span><span className="min-w-16 rounded bg-gray-50 px-2 py-1.5 text-center text-xs"><strong className="block text-gray-900">{exercise.reps}</strong><span className="text-[10px] text-gray-500">Reps</span></span><span className="min-w-16 rounded bg-gray-50 px-2 py-1.5 text-center text-xs"><strong className="inline-flex items-center gap-1 text-gray-900"><Clock className="h-3 w-3 text-[#EF1B23]" />{exercise.restSeconds ?? 60}s</strong><span className="block text-[10px] text-gray-500">Rest</span></span></div>
                {exercise.notes && <button type="button" aria-label={`${expanded ? 'Hide' : 'Show'} notes for ${exercise.name}`} aria-expanded={expanded} onClick={() => setExpandedExercise(expanded ? null : key)} className="ml-auto grid h-8 w-8 place-items-center rounded text-gray-600 hover:bg-gray-100 sm:ml-0"><ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button>}
              </div>{exercise.notes && expanded && <div className="mx-4 mb-4 border-l-2 border-[#EF1B23] bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-700 sm:mx-6"><span className="mb-1 block font-bold text-gray-900">Trainer instructions</span><p className="whitespace-pre-wrap break-words">{exercise.notes}</p></div>}</article>;
            })}
          </div>
        </section> : <section className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">This program has no routine yet. Ask your trainer to add exercises.</section>}
      </div>
      {cycle && cycle.history.length > 0 && <section className="mt-5 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2"><History className="h-4 w-4 text-[#EF1B23]"/><h3 className="text-sm font-bold text-[#111111]">Workout history</h3></div>
        <div className="space-y-3">{visibleHistory.map(item => <article key={item.weekNumber} className="rounded border border-gray-100 bg-gray-50 p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="text-sm">Week {item.weekNumber}</strong><p className="mt-0.5 text-xs text-gray-500">{formatAppDate(item.startDate)} – {formatAppDate(item.endDate)}</p></div><div className="text-right"><strong className="text-sm">{item.completedWorkouts} / {item.assignedWorkouts}</strong><span className="ml-2 text-xs font-bold text-[#EF1B23]">{item.percentage}%</span></div></div><div className="mt-3 flex flex-wrap gap-2">{item.days.map(day => <span key={day.dayId} className={`rounded border px-2.5 py-1.5 text-[11px] ${day.status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : day.status === 'missed' ? 'border-gray-200 bg-white text-gray-500' : 'border-blue-100 bg-blue-50 text-blue-800'}`}><strong>{day.dayName}</strong> · {day.status === 'completed' ? `Completed${day.completedAt ? ` ${formatAppDate(day.completedAt)}` : ''}` : day.status === 'missed' ? 'Not completed' : 'Available'}</span>)}</div></article>)}</div>
        {historyPages > 1 && <nav aria-label="Workout history pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <span className="text-xs text-gray-500">Showing {(currentHistoryPage - 1) * historyPageSize + 1}–{Math.min(currentHistoryPage * historyPageSize, cycle.history.length)} of {cycle.history.length} weeks</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setHistoryPage(page => Math.max(1, page - 1))} disabled={currentHistoryPage === 1} className="inline-flex min-h-9 items-center gap-1 rounded border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4"/>Previous</button>
            <span aria-live="polite" className="min-w-14 text-center text-xs font-semibold text-gray-600">{currentHistoryPage} / {historyPages}</span>
            <button type="button" onClick={() => setHistoryPage(page => Math.min(historyPages, page + 1))} disabled={currentHistoryPage === historyPages} className="inline-flex min-h-9 items-center gap-1 rounded border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-40">Next<ChevronRight className="h-4 w-4"/></button>
          </div>
        </nav>}
      </section>}
    </div>
  </AppLayout>;
};
