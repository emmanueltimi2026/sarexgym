import test from 'node:test';
import assert from 'node:assert/strict';
import { getTrainerWorkoutHistory } from './workout-cycles.js';

const memberId = 'member-1';
const planRow = { id: 'plan-1', member_id: memberId, trainer_id: 'trainer-1', title: 'Strength', status: 'active', routine: [{ id: 'day-1', dayName: 'Day 1', focus: 'Strength', exercises: [{ id: 'squat', name: 'Squat' }] }, { id: 'day-2', dayName: 'Day 2', focus: 'Cardio', exercises: [{ id: 'run', name: 'Run' }] }], days_per_week: 2, program_started_on: '2026-09-24' };

test('assigned trainer sees weekly adherence, missed days, history, and recent activity', async () => {
  const calls = [];
  const db = { query: async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('FROM trainer_assignments')) return { rowCount: 1, rows: [{ '?column?': 1 }] };
    if (sql.includes('FROM workout_plans w WHERE w.member_id=$1')) return { rows: [planRow] };
    if (sql.includes('FROM workout_day_completions WHERE member_id=$1')) return { rows: [{ workout_plan_id: 'plan-1', workout_day_id: 'day-1', program_week_number: 1, program_week_start: '2026-09-24', completed_at: new Date('2026-09-25T14:35:00.000Z') }] };
    throw new Error(`Unexpected SQL: ${sql}`);
  } };
  const result = await getTrainerWorkoutHistory(db, 'trainer-user', memberId, '2026-10-01');
  assert.deepEqual(calls[0].params, ['trainer-user', memberId]);
  assert.equal(result.plans[0].currentWeek.weekNumber, 2);
  assert.equal(result.plans[0].currentWeek.completedWorkouts, 0);
  const previous = result.plans[0].history.find(week => week.weekNumber === 1);
  assert.deepEqual(previous.days.map(day => day.status), ['completed', 'missed']);
  assert.equal(previous.percentage, 50);
  assert.equal(result.plans[0].recentActivity.length, 1);
  assert.match(calls[1].sql, /w\.trainer_id=\(SELECT id FROM trainers WHERE user_id=\$2\)/);
  assert.match(calls[2].sql, /ORDER BY completed_at DESC/);
});

test('unassigned trainer cannot read a member completion history', async () => {
  let queries = 0;
  const db = { query: async () => { queries++; return { rowCount: 0, rows: [] }; } };
  await assert.rejects(getTrainerWorkoutHistory(db, 'other-trainer', memberId), error => error.status === 404);
  assert.equal(queries, 1);
});
