import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkoutCycleProgress, calculateProgramWeek, completeMemberWorkoutDay } from './workout-cycles.js';

const makeRoutine = count => Array.from({ length: count }, (_, index) => ({
  id: `day-${index + 1}`, dayName: `Day ${index + 1}`, focus: 'Strength', exercises: [{ id: `exercise-${index + 1}`, name: 'Squat', sets: 3, reps: '8' }]
}));
const plan = (count = 2, overrides = {}) => ({ id: 'plan-1', member_id: 'member-1', trainer_id: 'trainer-1', status: 'active', days_per_week: count, routine: makeRoutine(count), program_started_on: '2026-09-24', ...overrides });
const completion = (day, week = '2026-09-24', completedAt = `${week}T10:00:00.000Z`) => ({ workout_day_id: `day-${day}`, program_week_start: week, completed_at: completedAt });

test('program weeks are anchored to plan start and span seven consecutive days', () => {
  assert.deepEqual(calculateProgramWeek('2026-09-24', '2026-09-24'), { number: 1, startDate: '2026-09-24', endDate: '2026-09-30', nextStartDate: '2026-10-01' });
  assert.equal(calculateProgramWeek('2026-09-24', '2026-09-30').number, 1);
  assert.equal(calculateProgramWeek('2026-09-24', '2026-10-01').number, 2);
  assert.throws(() => calculateProgramWeek('2026-09-24', '2026-09-23'), { code: 'WORKOUT_NOT_STARTED' });
});

test('a completed workout day remains completed on every date of the same program week', () => {
  for (const date of ['2026-09-24', '2026-09-25', '2026-09-30']) {
    const progress = buildWorkoutCycleProgress(plan(), [completion(1)], date);
    assert.equal(progress.currentWeek.days[0].status, 'completed');
    assert.equal(progress.currentWeek.completedWorkouts, 1);
    assert.equal(progress.currentWeek.percentage, 50);
  }
});

test('a 2-day week reaches 2/2 and 100% when both days are complete', () => {
  const progress = buildWorkoutCycleProgress(plan(), [completion(1), completion(2)], '2026-09-28');
  assert.equal(progress.currentWeek.completedWorkouts, 2);
  assert.equal(progress.currentWeek.assignedWorkouts, 2);
  assert.equal(progress.currentWeek.percentage, 100);
  assert.equal(progress.currentWeek.isComplete, true);
});

test('completing every day does not create a new cycle until the anchored next week', () => {
  const complete = [completion(1), completion(2)];
  const stillThisWeek = buildWorkoutCycleProgress(plan(), complete, '2026-09-30');
  assert.equal(stillThisWeek.currentWeek.weekNumber, 1);
  assert.equal(stillThisWeek.currentWeek.isComplete, true);
  assert.equal(stillThisWeek.currentWeek.nextStartDate, '2026-10-01');
  const next = buildWorkoutCycleProgress(plan(), complete, '2026-10-01');
  assert.equal(next.currentWeek.weekNumber, 2);
  assert.equal(next.currentWeek.completedWorkouts, 0);
  assert.deepEqual(next.currentWeek.days.map(day => day.status), ['available', 'available']);
  assert.equal(next.history[1].completedWorkouts, 2);
});

test('incomplete earlier workout days remain visible as missed in history', () => {
  const progress = buildWorkoutCycleProgress(plan(), [completion(1)], '2026-10-01');
  const previous = progress.history.find(week => week.weekNumber === 1);
  assert.deepEqual(previous.days.map(day => day.status), ['completed', 'missed']);
  assert.equal(previous.completedWorkouts, 1);
  assert.equal(previous.percentage, 50);
});

test('4-day plans calculate 1/4, 2/4, 3/4, and 4/4 progress correctly', () => {
  for (let completed = 1; completed <= 4; completed += 1) {
    const records = Array.from({ length: completed }, (_, index) => completion(index + 1));
    const progress = buildWorkoutCycleProgress(plan(4), records, '2026-09-28');
    assert.equal(progress.currentWeek.completedWorkouts, completed);
    assert.equal(progress.currentWeek.assignedWorkouts, 4);
    assert.equal(progress.currentWeek.percentage, completed * 25);
  }
});

test('progress includes exact completion timestamps for the current week', () => {
  const completedAt = '2026-09-25T09:15:00.000Z';
  const progress = buildWorkoutCycleProgress(plan(), [completion(1, '2026-09-24', completedAt)], '2026-09-27');
  assert.equal(progress.currentWeek.days[0].completedAt, completedAt);
});

test('completion persistence inserts a day-level record with plan week and is idempotent', async () => {
  const rows = new Map();
  const queries = [];
  const query = async (sql, params = []) => {
    queries.push(sql);
    if (sql.includes('FROM workout_plans w JOIN members m')) return { rows: [{ ...plan(), program_started_on: '2026-09-24' }] };
    if (sql.startsWith('INSERT INTO workout_day_completions')) {
      const key = `${params[0]}:${params[1]}:${params[2]}:${params[4]}`;
      const inserted = !rows.has(key);
      if (inserted) rows.set(key, { workout_day_id: params[2], program_week_number: params[3], program_week_start: params[4], completed_at: '2026-09-25T10:00:00.000Z' });
      return { rows: inserted ? [{ id: 'completion-1' }] : [], rowCount: inserted ? 1 : 0 };
    }
    if (sql.includes('FROM workout_day_completions')) return { rows: [...rows.values()] };
    return { rows: [], rowCount: 0 };
  };
  const db = { query, transaction: work => work({ query }) };
  const first = await completeMemberWorkoutDay(db, 'user-1', 'plan-1', 0, new Date('2026-09-25T12:00:00.000Z'));
  const repeat = await completeMemberWorkoutDay(db, 'user-1', 'plan-1', 0, new Date('2026-09-25T12:01:00.000Z'));
  assert.equal(first.currentWeek.completedWorkouts, 1);
  assert.equal(first.alreadyCompleted, false);
  assert.equal(repeat.currentWeek.completedWorkouts, 1);
  assert.equal(repeat.alreadyCompleted, true);
  assert.match(queries.find(sql => sql.startsWith('INSERT INTO workout_day_completions')), /ON CONFLICT \(member_id,workout_plan_id,workout_day_id,program_week_start\) DO NOTHING/);
});

test('database uniqueness makes duplicate concurrent completion requests idempotent', async () => {
  const rows = new Map();
  const query = async (sql, params = []) => {
    if (sql.includes('FROM workout_plans w JOIN members m')) return { rows: [{ ...plan(), program_started_on: '2026-09-24' }] };
    if (sql.startsWith('INSERT INTO workout_day_completions')) {
      const key = `${params[0]}:${params[1]}:${params[2]}:${params[4]}`;
      const inserted = !rows.has(key);
      if (inserted) rows.set(key, { workout_day_id: params[2], program_week_number: params[3], program_week_start: params[4], completed_at: '2026-09-25T10:00:00.000Z' });
      return { rows: inserted ? [{ id: key }] : [], rowCount: inserted ? 1 : 0 };
    }
    if (sql.includes('FROM workout_day_completions')) return { rows: [...rows.values()] };
    return { rows: [], rowCount: 0 };
  };
  const db = { query, transaction: work => work({ query }) };
  const results = await Promise.all([
    completeMemberWorkoutDay(db, 'user-1', 'plan-1', 1, new Date('2026-09-25T12:00:00Z')),
    completeMemberWorkoutDay(db, 'user-1', 'plan-1', 1, new Date('2026-09-25T12:00:01Z'))
  ]);
  assert.equal(rows.size, 1);
  assert.equal(results[0].currentWeek.completedWorkouts, 1);
  assert.equal(results[1].currentWeek.completedWorkouts, 1);
});

test('only days belonging to the assigned plan can be completed', async () => {
  const query = async sql => sql.includes('FROM workout_plans w JOIN members m') ? { rows: [] } : { rows: [] };
  const db = { query, transaction: work => work({ query }) };
  await assert.rejects(() => completeMemberWorkoutDay(db, 'other-user', 'plan-1', 0, new Date('2026-09-25T12:00:00Z')), { code: 'WORKOUT_NOT_FOUND' });
});

test('week history has a fresh completion state but retains the prior week records', () => {
  const rows = [completion(1), completion(2)];
  const progress = buildWorkoutCycleProgress(plan(), rows, '2026-10-02');
  assert.equal(progress.currentWeek.completedWorkouts, 0);
  assert.equal(progress.history.find(week => week.weekNumber === 1).completedWorkouts, 2);
  assert.equal(progress.history.length, 2);
});

test('completion status is derived from stored records across user sessions and refreshes', () => {
  const persistedRecords = [completion(1)];
  const afterRefresh = buildWorkoutCycleProgress(plan(), persistedRecords, '2026-09-26');
  const afterNewSession = buildWorkoutCycleProgress(plan(), persistedRecords, '2026-09-27');
  assert.equal(afterRefresh.currentWeek.days[0].status, 'completed');
  assert.equal(afterNewSession.currentWeek.days[0].status, 'completed');
});
