import { workoutExerciseKeys } from '../shared/workout-keys.js';

const notFound = () => Object.assign(new Error('Workout plan is unavailable'), { status: 404, code: 'WORKOUT_NOT_FOUND' });
export const workoutDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const findPlan = async (db, userId, planId, lock = false) => {
  const result = await db.query(`SELECT w.id,w.routine FROM workout_plans w JOIN members m ON m.id=w.member_id WHERE w.id=$1 AND m.user_id=$2 AND EXISTS (SELECT 1 FROM subscriptions s JOIN membership_plans p ON p.id=s.plan_id WHERE s.member_id=m.id AND s.status='active' AND s.starts_at<=now() AND s.ends_at>now() AND p.workout_plan_access AND NOT EXISTS (SELECT 1 FROM subscription_freezes f WHERE f.subscription_id=s.id AND f.released_at IS NULL AND now()>=f.starts_at AND now()<f.ends_at)) ${lock ? "AND w.status='active' FOR SHARE OF w" : ''}`, [planId, userId]);
  if (!result.rows[0]) throw notFound();
  return result.rows[0];
};

export const listWorkoutCompletions = async (db, userId, planId, today = workoutDate()) => {
  await findPlan(db, userId, planId);
  const result = await db.query('SELECT day_key,exercise_key FROM workout_exercise_completions WHERE workout_plan_id=$1 AND completed_on=$2', [planId, today]);
  return { date: today, completed: result.rows.map(row => ({ dayKey: row.day_key, exerciseKey: row.exercise_key })) };
};

export const setWorkoutCompletion = (db, userId, planId, input, today = workoutDate()) => db.transaction(async client => {
  const plan = await findPlan(client, userId, planId, true);
  const keys = workoutExerciseKeys(plan.routine, input.dayIndex, input.exerciseIndex);
  if (!keys) throw Object.assign(new Error('Exercise is no longer in this plan'), { status: 409, code: 'EXERCISE_CHANGED' });
  const { dayKey, exerciseKey } = keys;
  if (input.completed) await client.query('INSERT INTO workout_exercise_completions(workout_plan_id,completed_on,day_key,exercise_key) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [planId, today, dayKey, exerciseKey]);
  else await client.query('DELETE FROM workout_exercise_completions WHERE workout_plan_id=$1 AND completed_on=$2 AND day_key=$3 AND exercise_key=$4', [planId, today, dayKey, exerciseKey]);
  return { date: today, dayKey, exerciseKey, completed: input.completed };
});
