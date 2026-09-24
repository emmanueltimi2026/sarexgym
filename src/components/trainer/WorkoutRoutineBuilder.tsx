import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Eraser, Plus, Trash2 } from 'lucide-react';
import {
  addExerciseToDay, clearRoutineDay, duplicateRoutineDay, moveExerciseInDay,
  removeExerciseFromDay, removeRoutineDay, removedDaysHaveContent, resizeRoutine, routineDayHasContent,
  type DayDraft, type ExerciseDraft
} from '../../lib/workoutRoutine';

interface Props {
  days: DayDraft[];
  daysPerWeek: number;
  errors: string[];
  onDaysChange: (days: DayDraft[]) => void;
  onCountChange: (count: number) => void;
}

const inputClass = 'mt-1 w-full min-w-0 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-normal normal-case outline-none focus:border-[#EF1B23]';

export const WorkoutRoutineBuilder: React.FC<Props> = ({ days, daysPerWeek, errors, onDaysChange, onCountChange }) => {
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const updateDay = (dayId: string, patch: Partial<DayDraft>) => onDaysChange(days.map(day => day.id === dayId ? { ...day, ...patch } : day));
  const updateExercise = (dayId: string, exerciseId: string, patch: Partial<ExerciseDraft>) =>
    onDaysChange(days.map(day => day.id === dayId ? { ...day, exercises: day.exercises.map(exercise => exercise.id === exerciseId ? { ...exercise, ...patch } : exercise) } : day));
  const setCount = (count: number) => {
    setPendingDeleteIndex(null);
    if (count < days.length && removedDaysHaveContent(days, count)) { setPendingCount(count); return; }
    onDaysChange(resizeRoutine(days, count));
    onCountChange(count);
  };
  const deleteDay = (index: number) => {
    if (days.length <= 1) return;
    if (routineDayHasContent(days[index], index)) { setPendingDeleteIndex(index); return; }
    setPendingDeleteIndex(null);
    setPendingCount(null);
    onDaysChange(removeRoutineDay(days, index));
    onCountChange(daysPerWeek - 1);
  };
  const confirmDeleteDay = () => {
    if (pendingDeleteIndex === null) return;
    setPendingCount(null);
    onDaysChange(removeRoutineDay(days, pendingDeleteIndex));
    onCountChange(daysPerWeek - 1);
    setPendingDeleteIndex(null);
  };

  return <section className="space-y-4 border-t border-gray-200 pt-4" aria-labelledby="routine-heading">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h4 id="routine-heading" className="text-sm font-black uppercase">Weekly routine</h4><p className="mt-1 text-[11px] text-gray-500">Build each day before saving the program.</p></div>
      <label className="text-[11px] font-bold uppercase">Days per week<select value={daysPerWeek} onChange={event => setCount(Number(event.target.value))} className={inputClass}>{Array.from({ length: 7 }, (_, index) => index + 1).map(count => <option key={count} value={count}>{count} {count === 1 ? 'day' : 'days'}</option>)}</select></label>
    </div>
    {pendingCount !== null && <div role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
      <p>Reducing to {pendingCount} days will delete the populated days after Day {pendingCount}.</p>
      <div className="mt-3 flex gap-2"><button type="button" onClick={() => setPendingCount(null)} className="rounded border border-amber-400 bg-white px-3 py-2 font-bold">Keep days</button><button type="button" onClick={() => { onDaysChange(resizeRoutine(days, pendingCount)); onCountChange(pendingCount); setPendingCount(null); }} className="rounded bg-[#151515] px-3 py-2 font-bold text-white">Delete days</button></div>
    </div>}
    {errors.length > 0 && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800"><p className="font-bold">Complete the routine before saving:</p><ul className="mt-2 list-disc space-y-1 pl-4">{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
    {days.map((day, dayIndex) => <div key={day.id} className="rounded border border-gray-200 bg-gray-50 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><strong className="text-xs uppercase">Training day {dayIndex + 1}</strong><div className="flex gap-1"><button type="button" onClick={() => { setPendingDeleteIndex(null); onDaysChange(duplicateRoutineDay(days, dayIndex)); onCountChange(daysPerWeek + 1); }} disabled={daysPerWeek >= 7} title="Duplicate day" aria-label={`Duplicate ${day.dayName}`} className="rounded border border-gray-200 bg-white p-2 disabled:opacity-40"><Copy className="h-4 w-4"/></button><button type="button" onClick={() => onDaysChange(clearRoutineDay(days, dayIndex))} title="Clear exercises and focus" aria-label={`Clear ${day.dayName}`} className="rounded border border-gray-200 bg-white p-2"><Eraser className="h-4 w-4"/></button><button type="button" onClick={() => deleteDay(dayIndex)} disabled={days.length <= 1} title="Delete training day" aria-label={`Delete training day ${dayIndex + 1}`} className="rounded border border-gray-200 bg-white p-2 text-red-600 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4"/></button></div></div>
      {pendingDeleteIndex === dayIndex && <div role="alert" className="mb-3 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950"><p>Delete training day {dayIndex + 1} and its exercises? The remaining days will move up.</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => setPendingDeleteIndex(null)} className="rounded border border-amber-400 bg-white px-3 py-2 font-bold">Keep day</button><button type="button" onClick={confirmDeleteDay} className="rounded bg-[#151515] px-3 py-2 font-bold text-white">Delete day</button></div></div>}
      <div className="grid gap-3 sm:grid-cols-2"><label className="font-bold uppercase">Day name<input value={day.dayName} maxLength={80} onChange={event => updateDay(day.id, { dayName: event.target.value })} className={inputClass}/></label><label className="font-bold uppercase">Focus<input value={day.focus} maxLength={200} onChange={event => updateDay(day.id, { focus: event.target.value })} placeholder="e.g. Lower body strength" className={inputClass}/></label></div>
      <div className="mt-4 space-y-2">{day.exercises.map((exercise, exerciseIndex) => <div key={exercise.id} className="rounded border border-gray-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2"><strong className="text-[11px] uppercase">Exercise {exerciseIndex + 1}</strong><div className="flex gap-1"><button type="button" onClick={() => onDaysChange(moveExerciseInDay(days, day.id, exerciseIndex, -1))} disabled={exerciseIndex === 0} aria-label={`Move exercise ${exerciseIndex + 1} up`} title="Move up" className="rounded border p-1.5 disabled:opacity-40"><ArrowUp className="h-4 w-4"/></button><button type="button" onClick={() => onDaysChange(moveExerciseInDay(days, day.id, exerciseIndex, 1))} disabled={exerciseIndex === day.exercises.length - 1} aria-label={`Move exercise ${exerciseIndex + 1} down`} title="Move down" className="rounded border p-1.5 disabled:opacity-40"><ArrowDown className="h-4 w-4"/></button><button type="button" onClick={() => onDaysChange(removeExerciseFromDay(days, day.id, exercise.id))} aria-label={`Remove exercise ${exerciseIndex + 1}`} title="Remove exercise" className="rounded border p-1.5 text-red-600"><Trash2 className="h-4 w-4"/></button></div></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><label className="col-span-2 font-bold uppercase sm:col-span-4">Exercise<input value={exercise.name} maxLength={150} onChange={event => updateExercise(day.id, exercise.id, { name: event.target.value })} placeholder="Enter exercise name" className={inputClass}/></label><label className="font-bold uppercase">Sets<input value={exercise.sets} inputMode="numeric" onChange={event => updateExercise(day.id, exercise.id, { sets: event.target.value })} className={inputClass}/></label><label className="font-bold uppercase">Reps<input value={exercise.reps} maxLength={40} onChange={event => updateExercise(day.id, exercise.id, { reps: event.target.value })} placeholder="8-10" className={inputClass}/></label><label className="col-span-2 font-bold uppercase sm:col-span-4">Rest (seconds)<input value={exercise.restSeconds} inputMode="numeric" onChange={event => updateExercise(day.id, exercise.id, { restSeconds: event.target.value })} className={inputClass}/></label><label className="col-span-2 font-bold uppercase sm:col-span-4">Notes <span className="font-normal normal-case">(optional)</span><input value={exercise.notes} maxLength={500} onChange={event => updateExercise(day.id, exercise.id, { notes: event.target.value })} className={inputClass}/></label></div>
      </div>)}</div>
      <button type="button" onClick={() => onDaysChange(addExerciseToDay(days, day.id))} disabled={day.exercises.length >= 30} className="mt-3 inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-2 text-[11px] font-bold disabled:opacity-40"><Plus className="h-3.5 w-3.5"/>Add exercise</button>
    </div>)}
  </section>;
};
