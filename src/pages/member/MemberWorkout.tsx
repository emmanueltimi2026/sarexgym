import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Dumbbell, CheckCircle2, Clock } from 'lucide-react';

export const MemberWorkout: React.FC = () => {
  const { workoutPlans, currentMember } = useGym();
  const currentPlan = workoutPlans.find(plan => plan.memberId === currentMember.id || plan.memberId === currentMember.memberId) || null;
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});

  const routines = currentPlan?.routine || [];
  const activeRoutine = routines[activeDayIndex] || routines[0] || null;

  const toggleExercise = (key: string) => {
    setCompletedExercises(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const totalExercisesInActiveDay = activeRoutine?.exercises?.length || currentPlan?.exercises?.length || 0;
  const completedCountInActiveDay = activeRoutine?.exercises
    ? activeRoutine.exercises.filter((_, idx) => completedExercises[`${activeDayIndex}-${idx}`]).length
    : 0;

  if (!currentMember.workoutPlanEnabled) {
    return <AppLayout pageTitle="Workout Plan" pageSubtitle="Trainer-guided routines are available as an optional membership service.">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <Dumbbell className="mx-auto h-10 w-10 text-gray-300" />
        <h2 className="mt-4 text-lg font-black">Workout plan support is not active</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">Contact the SAREX team if you would like a trainer to create routines and track your progress.</p>
      </div>
    </AppLayout>;
  }

  if (!currentPlan) {
    return (
      <AppLayout
        pageTitle="Assigned Training Program"
        pageSubtitle="Follow the exercises, sets, and schedule assigned by your trainer."
        breadcrumbs={[{ label: 'Member Portal', path: '/member/dashboard' }, { label: 'Workout Program' }]}
      >
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-8 text-center text-gray-500 text-xs">
          No workout plan has been assigned yet. If you want guided training, contact the SAREX team to activate workout plan support for your membership.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      pageTitle="Assigned Training Program"
      pageSubtitle="Follow the exercises, sets, and schedule assigned by your trainer."
      breadcrumbs={[{ label: 'Member Portal', path: '/member/dashboard' }, { label: 'Workout Program' }]}
    >
      {/* Program Summary Banner */}
      <div className="bg-[#151515] text-white rounded-lg p-5 mb-6 border border-neutral-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-athletic uppercase font-bold tracking-wider bg-[#EF1B23] text-white px-2 py-0.5 rounded">
                {currentPlan.difficulty || 'Intermediate'}
              </span>
              <span className="text-xs text-neutral-400">
                Prescribed by {currentPlan.trainerName || 'SAREX Specialist'}
              </span>
            </div>
            <h2 className="text-2xl font-athletic font-bold uppercase tracking-wider text-white">
              {currentPlan.title || currentPlan.workoutName || 'Performance Split'}
            </h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              {currentPlan.description}
            </p>
          </div>

          <div className="bg-[#1F1F1F] p-3 rounded border border-neutral-700 text-center min-w-[120px]">
            <span className="text-[10px] font-athletic uppercase text-neutral-400 block">
              Frequency
            </span>
            <span className="text-xl font-athletic font-bold text-[#EF1B23]">
              {currentPlan.daysPerWeek || (routines.length || 3)} Days / Wk
            </span>
          </div>
        </div>
      </div>

      {/* Routine Days Split Tabs */}
      {routines.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
          {routines.map((day, idx) => {
            const isActive = idx === activeDayIndex;
            return (
              <button
                key={idx}
                onClick={() => setActiveDayIndex(idx)}
                className={`px-4 py-2.5 rounded font-athletic font-bold uppercase text-xs tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#EF1B23] text-white shadow-xs'
                    : 'bg-white border border-[#E5E7EB] text-gray-700 hover:border-gray-400'
                }`}
              >
                <span>{day.dayName}</span>
                <span className="text-[11px] opacity-80 font-normal">
                  ({(day.focus || '').split(' ')[0]})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active Day Exercises Card */}
      {activeRoutine && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-gray-100">
            <div>
              <span className="text-[10px] font-athletic uppercase tracking-wider text-[#EF1B23] font-bold">
                {activeRoutine.dayName} Focus
              </span>
              <h3 className="font-athletic font-bold text-lg uppercase text-[#111111]">
                {activeRoutine.focus}
              </h3>
            </div>

            <div className="text-xs font-semibold text-gray-600 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
              Completed {completedCountInActiveDay} of {totalExercisesInActiveDay} Movements
            </div>
          </div>

          <div className="space-y-3">
            {(activeRoutine.exercises || []).map((exercise, eIdx) => {
              const key = `${activeDayIndex}-${eIdx}`;
              const isDone = !!completedExercises[key];

              return (
                <div
                  key={eIdx}
                  onClick={() => toggleExercise(key)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    isDone
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : 'border border-gray-300 bg-white'
                      }`}
                    >
                      {isDone && <CheckCircle2 className="w-4 h-4" />}
                    </div>

                    <div>
                      <h4
                        className={`font-bold text-sm ${
                          isDone ? 'line-through text-gray-400' : 'text-[#111111]'
                        }`}
                      >
                        {exercise.name}
                      </h4>
                      {exercise.notes && (
                        <span className="text-[11px] text-gray-500 italic block">
                          Form note: {exercise.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <div className="font-athletic font-bold text-sm text-[#111111]">
                      {exercise.sets} Sets × {exercise.reps} Reps
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center justify-end gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-[#EF1B23]" />
                      Rest: {exercise.restSeconds || 60}s
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!activeRoutine && currentPlan.exercises && currentPlan.exercises.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs">
          <h3 className="font-athletic font-bold text-lg uppercase text-[#111111] mb-4">
            Prescribed Movement Volume
          </h3>
          <div className="space-y-3">
            {currentPlan.exercises.map((exercise, eIdx) => (
              <div key={eIdx} className="p-4 rounded-lg border bg-gray-50 border-gray-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#111111]">{exercise.name}</h4>
                  {exercise.instructions && (
                    <span className="text-[11px] text-gray-500 italic block">
                      Instructions: {exercise.instructions}
                    </span>
                  )}
                </div>
                <div className="text-right text-xs">
                  <div className="font-athletic font-bold text-sm text-[#111111]">
                    {exercise.sets} Sets × {exercise.reps} Reps
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
};

