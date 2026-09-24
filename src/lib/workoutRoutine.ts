import type { WorkoutDayRoutine } from '../types';

export interface ExerciseDraft {
  id: string;
  name: string;
  sets: string;
  reps: string;
  restSeconds: string;
  notes: string;
}

export interface DayDraft {
  id: string;
  dayName: string;
  focus: string;
  exercises: ExerciseDraft[];
}

export const newDay = (number: number): DayDraft => ({ id: crypto.randomUUID(), dayName: `Day ${number}`, focus: '', exercises: [] });
export const newExercise = (): ExerciseDraft => ({ id: crypto.randomUUID(), name: '', sets: '', reps: '', restSeconds: '', notes: '' });

export const resizeRoutine = (days: DayDraft[], count: number): DayDraft[] =>
  count <= days.length ? days.slice(0, count) : [...days, ...Array.from({ length: count - days.length }, (_, index) => newDay(days.length + index + 1))];

export const removedDaysHaveContent = (days: DayDraft[], count: number): boolean =>
  days.slice(count).some(day => Boolean(day.focus.trim() || day.exercises.length || day.dayName.trim() !== `Day ${days.indexOf(day) + 1}`));

export const routineDayHasContent = (day: DayDraft, index: number): boolean =>
  Boolean(day.focus.trim() || day.exercises.length || day.dayName.trim() !== `Day ${index + 1}`);

export const removeRoutineDay = (days: DayDraft[], index: number): DayDraft[] =>
  days.filter((_, position) => position !== index).map((day, position) => ({
    ...day,
    dayName: /^Day \d+$/.test(day.dayName) ? `Day ${position + 1}` : day.dayName
  }));

export const addExerciseToDay = (days: DayDraft[], dayId: string): DayDraft[] =>
  days.map(day => day.id === dayId ? { ...day, exercises: [...day.exercises, newExercise()] } : day);

export const removeExerciseFromDay = (days: DayDraft[], dayId: string, exerciseId: string): DayDraft[] =>
  days.map(day => day.id === dayId ? { ...day, exercises: day.exercises.filter(exercise => exercise.id !== exerciseId) } : day);

export const moveExerciseInDay = (days: DayDraft[], dayId: string, index: number, direction: -1 | 1): DayDraft[] =>
  days.map(day => {
    if (day.id !== dayId || index + direction < 0 || index + direction >= day.exercises.length) return day;
    const exercises = [...day.exercises];
    [exercises[index], exercises[index + direction]] = [exercises[index + direction], exercises[index]];
    return { ...day, exercises };
  });

export const duplicateRoutineDay = (days: DayDraft[], index: number): DayDraft[] => {
  const source = days[index];
  const copy = { ...source, id: crypto.randomUUID(), dayName: `${source.dayName} copy`, exercises: source.exercises.map(exercise => ({ ...exercise, id: crypto.randomUUID() })) };
  return [...days.slice(0, index + 1), copy, ...days.slice(index + 1)];
};

export const clearRoutineDay = (days: DayDraft[], index: number): DayDraft[] =>
  days.map((day, position) => position === index ? { ...day, focus: '', exercises: [] } : day);

export const validateRoutine = (days: DayDraft[], count: number): string[] => {
  const errors: string[] = [];
  if (days.length !== count) errors.push(`Add exactly ${count} training days.`);
  days.forEach((day, dayIndex) => {
    const label = `Day ${dayIndex + 1}`;
    if (!day.dayName.trim()) errors.push(`${label}: enter a day name.`);
    if (!day.focus.trim()) errors.push(`${label}: enter a focus.`);
    if (!day.exercises.length) errors.push(`${label}: add at least one exercise.`);
    day.exercises.forEach((exercise, exerciseIndex) => {
      const entry = `${label}, exercise ${exerciseIndex + 1}`;
      if (!exercise.name.trim()) errors.push(`${entry}: enter an exercise name.`);
      if (!/^[1-9]\d*$/.test(exercise.sets) || Number(exercise.sets) > 100) errors.push(`${entry}: sets must be a positive whole number up to 100.`);
      if (!exercise.reps.trim()) errors.push(`${entry}: enter reps.`);
      if (!/^\d+$/.test(exercise.restSeconds) || Number(exercise.restSeconds) > 3600) errors.push(`${entry}: rest must be 0 to 3600 seconds.`);
    });
  });
  return errors;
};

export const routinePayload = (days: DayDraft[]): WorkoutDayRoutine[] => days.map(day => ({
  id: day.id,
  dayName: day.dayName.trim(),
  focus: day.focus.trim(),
  exercises: day.exercises.map(exercise => ({
    id: exercise.id,
    name: exercise.name.trim(),
    sets: Number(exercise.sets),
    reps: exercise.reps.trim(),
    restSeconds: Number(exercise.restSeconds),
    ...(exercise.notes.trim() ? { notes: exercise.notes.trim() } : {})
  }))
}));
