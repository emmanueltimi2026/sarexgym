export const workoutExerciseKeys = (routine, dayIndex, exerciseIndex) => {
  const day = Array.isArray(routine) ? routine[dayIndex] : null;
  const exercise = day?.exercises?.[exerciseIndex];
  if (!exercise) return null;
  return { dayKey: day.id || `legacy-day-${dayIndex}`, exerciseKey: exercise.id || `legacy-exercise-${exerciseIndex}` };
};

export const workoutCompletionKey = (dayKey, exerciseKey) => `${dayKey}/${exerciseKey}`;
