import test from 'node:test';
import assert from 'node:assert/strict';
import { listWorkoutCompletions, setWorkoutCompletion, workoutDate } from './workout-completions.js';
import { workoutCompletionKey, workoutExerciseKeys } from '../shared/workout-keys.js';

const userId = 'member-user-1';
const planId = 'plan-1';
const routine = [{ id: 'day-1', dayName: 'Lower', focus: 'Strength', exercises: [{ id: 'squat-1', name: 'Squat', sets: 3, reps: '8', restSeconds: 0 }] }];
const fakeDatabase = (allowed = true, savedRoutine = routine) => {
  const rows = new Set();
  const queries = [];
  const query = async (sql, params) => {
    queries.push(sql);
    if (sql.includes('FROM workout_plans w')) return { rows: allowed && params[0] === planId && params[1] === userId ? [{ id: planId, routine: savedRoutine }] : [] };
    if (sql.startsWith('SELECT day_key')) return { rows: [...rows].filter(row => row.startsWith(`${params[1]}|`)).map(row => { const [, day_key, exercise_key] = row.split('|'); return { day_key, exercise_key }; }) };
    if (sql.startsWith('INSERT INTO workout_exercise_completions')) { rows.add(`${params[1]}|${params[2]}|${params[3]}`); return { rows: [] }; }
    if (sql.startsWith('DELETE FROM workout_exercise_completions')) { rows.delete(`${params[1]}|${params[2]}|${params[3]}`); return { rows: [] }; }
    throw new Error(`Unexpected SQL: ${sql}`);
  };
  return { query, transaction: work => work({ query }), rows, queries };
};

test('member completion persists for today and duplicate writes are idempotent', async () => {
  const db = fakeDatabase();
  const input = { dayIndex: 0, exerciseIndex: 0, completed: true };
  const first = await setWorkoutCompletion(db, userId, planId, input, '2026-09-24');
  await setWorkoutCompletion(db, userId, planId, input, '2026-09-24');
  assert.equal(db.rows.size, 1);
  assert.ok(db.queries.some(sql => sql.includes('FROM subscription_freezes f') && sql.includes("AND w.status='active' FOR SHARE OF w")));
  assert.deepEqual(first, { date: '2026-09-24', dayKey: 'day-1', exerciseKey: 'squat-1', completed: true });
  assert.deepEqual((await listWorkoutCompletions(db, userId, planId, '2026-09-24')).completed, [{ dayKey: 'day-1', exerciseKey: 'squat-1' }]);
  await setWorkoutCompletion(db, userId, planId, { ...input, completed: false }, '2026-09-24');
  assert.equal(db.rows.size, 0);
});

test('completion is scoped to a plan, member, and Lagos calendar day', async () => {
  const db = fakeDatabase();
  await assert.rejects(() => setWorkoutCompletion(db, 'different-user', planId, { dayIndex: 0, exerciseIndex: 0, completed: true }, '2026-09-24'), error => error.status === 404);
  assert.equal(db.rows.size, 0);
  await setWorkoutCompletion(db, userId, planId, { dayIndex: 0, exerciseIndex: 0, completed: true }, '2026-09-24');
  assert.deepEqual((await listWorkoutCompletions(db, userId, planId, '2026-09-25')).completed, []);
  assert.equal(workoutDate(new Date('2026-09-24T22:30:00.000Z')), '2026-09-24');
  assert.equal(workoutDate(new Date('2026-09-24T23:30:00.000Z')), '2026-09-25');
});

test('invalid or removed exercises cannot be marked complete', async () => {
  const db = fakeDatabase();
  await assert.rejects(() => setWorkoutCompletion(db, userId, planId, { dayIndex: 0, exerciseIndex: 7, completed: true }, '2026-09-24'), error => error.code === 'EXERCISE_CHANGED');
  assert.equal(db.rows.size, 0);
});

test('legacy routines use deterministic keys and new routines keep stable IDs', () => {
  const legacy = [{ dayName: 'Day 1', focus: 'Strength', exercises: [{ name: 'Squat' }] }];
  assert.deepEqual(workoutExerciseKeys(legacy, 0, 0), { dayKey: 'legacy-day-0', exerciseKey: 'legacy-exercise-0' });
  assert.equal(workoutCompletionKey('day-1', 'squat-1'), 'day-1/squat-1');
  assert.deepEqual(workoutExerciseKeys(routine, 0, 0), { dayKey: 'day-1', exerciseKey: 'squat-1' });
});
