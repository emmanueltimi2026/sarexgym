import test from 'node:test';
import assert from 'node:assert/strict';
import { getTrainerMemberProgress } from './workout-progress.js';

test('assigned trainer sees only their member workout history', async () => {
  const calls = [];
  const db = { query: async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('FROM trainer_assignments')) return { rowCount: 1, rows: [{ '?column?': 1 }] };
    if (sql.includes('GROUP BY c.workout_plan_id')) return { rows: [{ workout_plan_id: 'plan-1', completed_on: '2026-09-24', completed_exercises: '4' }] };
    return { rows: [{ id: 'plan-1', title: 'Strength', status: 'active', routine: [{ dayName: 'Day 1' }], completed_exercises: '6', active_days: '2', last_completed_on: '2026-09-24', last_completed_at: new Date('2026-09-24T14:35:00.000Z') }] };
  } };
  const result = await getTrainerMemberProgress(db, 'trainer-user', 'member-1');
  assert.deepEqual(result.plans[0], { id: 'plan-1', title: 'Strength', status: 'active', completedExercises: 6, activeDays: 2, lastCompletedOn: '2026-09-24', lastCompletedAt: new Date('2026-09-24T14:35:00.000Z'), routineDays: 1, recentDays: [{ date: '2026-09-24', completedExercises: 4 }] });
  assert.deepEqual(calls[0].params, ['trainer-user', 'member-1']);
  assert.deepEqual(calls[1].params, ['member-1', 'trainer-user']);
  assert.deepEqual(calls[2].params, ['member-1', 'trainer-user']);
  assert.match(calls[1].sql, /c\.workout_plan_id=w\.id/);
  assert.match(calls[1].sql, /max\(c\.completed_at\) AS last_completed_at/);
  assert.match(calls[1].sql, /to_char\(max\(c\.completed_on\), 'YYYY-MM-DD'\)/);
  assert.match(calls[2].sql, /to_char\(c\.completed_on, 'YYYY-MM-DD'\)/);
});

test('unassigned trainer cannot read a member progress history', async () => {
  let queries = 0;
  const db = { query: async () => { queries++; return { rowCount: 0, rows: [] }; } };
  await assert.rejects(getTrainerMemberProgress(db, 'other-trainer', 'member-1'), error => error.status === 404);
  assert.equal(queries, 1);
});
