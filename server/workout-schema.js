import { z } from 'zod';

const id = z.string().uuid();
const workoutExercise = z.object({
  id: id.optional(),
  name: z.string().trim().min(1).max(150),
  sets: z.number().int().min(1).max(100),
  reps: z.string().trim().min(1).max(40),
  restSeconds: z.number().int().min(0).max(3600),
  notes: z.string().trim().max(500).optional()
}).strict();
const workoutDay = z.object({
  id: id.optional(),
  dayName: z.string().trim().min(1).max(80),
  focus: z.string().trim().min(1).max(200),
  exercises: z.array(workoutExercise).min(1).max(30)
}).strict();

export const validateRoutineIds = (routine, context) => {
  const dayIds = new Set();
  routine.forEach((day, dayIndex) => {
    if (day.id && dayIds.has(day.id)) context.addIssue({ code: 'custom', message: 'Workout day IDs must be unique', path: ['routine', dayIndex, 'id'] });
    if (day.id) dayIds.add(day.id);
    const exerciseIds = new Set();
    day.exercises.forEach((exercise, exerciseIndex) => {
      if (exercise.id && exerciseIds.has(exercise.id)) context.addIssue({ code: 'custom', message: 'Exercise IDs must be unique within a day', path: ['routine', dayIndex, 'exercises', exerciseIndex, 'id'] });
      if (exercise.id) exerciseIds.add(exercise.id);
    });
  });
};

export const workoutInput = z.object({
  memberId: id,
  title: z.string().trim().min(2).max(150).optional(),
  workoutName: z.string().trim().min(2).max(150).optional(),
  description: z.string().max(2000).default(''),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate'),
  daysPerWeek: z.number().int().min(1).max(7).default(3),
  routine: z.array(workoutDay).min(1).max(7)
}).strict();

export const workoutBatchInput = workoutInput.omit({ memberId: true }).extend({
  memberId: id.optional(),
  memberIds: z.array(id).min(1).max(500).optional()
}).refine(value => Boolean(value.memberId || value.memberIds?.length), { message: 'Select at least one member' })
  .refine(value => value.routine?.length === value.daysPerWeek, { message: 'Routine day count must match days per week', path: ['routine'] })
  .superRefine((value, context) => validateRoutineIds(value.routine, context));
