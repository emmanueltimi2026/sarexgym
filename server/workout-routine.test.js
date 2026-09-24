import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addExerciseToDay, clearRoutineDay, duplicateRoutineDay, moveExerciseInDay,
  removeExerciseFromDay, removeRoutineDay, removedDaysHaveContent, resizeRoutine, routineDayHasContent, routinePayload, validateRoutine
} from '../src/lib/workoutRoutine.ts';
import { workoutBatchInput } from './workout-schema.js';
import { workoutCreatePayload } from '../shared/workout-create.js';

const complete = days => days.map((day, index) => ({ ...day, focus: `Focus ${index + 1}`, exercises: [{ id: crypto.randomUUID(), name: `Exercise ${index + 1}`, sets: '3', reps: '8-10', restSeconds: '60', notes: '' }] }));
const request = days => workoutCreatePayload({ title: 'Strength plan', description: 'Trainer-designed', difficulty: 'Intermediate', daysPerWeek: days.length, memberIds: [crypto.randomUUID()] }, routinePayload(days));

test('trainer can build valid two-day and four-day programs without any default exercises', () => {
  for (const count of [2, 4]) {
    const empty = resizeRoutine([], count);
    assert.equal(empty.length, count);
    assert.ok(empty.every(day => day.exercises.length === 0));
    const days = complete(empty);
    assert.deepEqual(validateRoutine(days, count), []);
    assert.equal(workoutBatchInput.parse(request(days)).routine.length, count);
  }
});

test('changing days preserves populated days and warns before discarding them', () => {
  const two = complete(resizeRoutine([], 2));
  const four = resizeRoutine(two, 4);
  assert.equal(four[0].id, two[0].id);
  assert.equal(four[1].exercises[0].name, 'Exercise 2');
  assert.equal(removedDaysHaveContent(four, 2), false);
  const populated = complete(four);
  assert.equal(removedDaysHaveContent(populated, 2), true);
  assert.equal(resizeRoutine(populated, 2).length, 2);
});

test('exercise add, remove, reorder, duplicate day, and clear day preserve trainer edits', () => {
  const days = resizeRoutine([], 2);
  const first = addExerciseToDay(days, days[0].id);
  assert.equal(first[0].exercises.length, 1);
  assert.equal(first[0].exercises[0].name, '');
  const second = addExerciseToDay(first, days[0].id);
  second[0].exercises[0].name = 'Squat';
  second[0].exercises[1].name = 'Lunge';
  const moved = moveExerciseInDay(second, days[0].id, 1, -1);
  assert.deepEqual(moved[0].exercises.map(exercise => exercise.name), ['Lunge', 'Squat']);
  const removed = removeExerciseFromDay(moved, days[0].id, moved[0].exercises[0].id);
  assert.deepEqual(removed[0].exercises.map(exercise => exercise.name), ['Squat']);
  const duplicate = duplicateRoutineDay(removed, 0);
  assert.equal(duplicate.length, 3);
  assert.equal(duplicate[1].exercises[0].name, 'Squat');
  assert.notEqual(duplicate[1].exercises[0].id, duplicate[0].exercises[0].id);
  assert.equal(clearRoutineDay(duplicate, 1)[1].exercises.length, 0);
});

test('deleting a training day removes that section and renumbers ordinary day names', () => {
  const days = resizeRoutine([], 4);
  days[2].focus = 'Custom work';
  days[3].dayName = 'Recovery';
  assert.equal(routineDayHasContent(days[1], 1), false);
  assert.equal(routineDayHasContent(days[2], 2), true);
  const remaining = removeRoutineDay(days, 1);
  assert.equal(remaining.length, 3);
  assert.deepEqual(remaining.map(day => day.dayName), ['Day 1', 'Day 2', 'Recovery']);
  assert.equal(remaining[1].focus, 'Custom work');
  assert.deepEqual(validateRoutine(complete(remaining), 3), []);
});

test('saved routine contains only trainer-entered exercises and values', () => {
  const days = complete(resizeRoutine([], 2));
  days[0].exercises[0] = { ...days[0].exercises[0], name: 'Romanian Deadlift', sets: '4', reps: '6-8', restSeconds: '120', notes: 'Controlled descent' };
  const payload = request(days);
  assert.equal(payload.routine[0].exercises[0].name, 'Romanian Deadlift');
  assert.equal(payload.routine[0].exercises[0].sets, 4);
  assert.equal(payload.routine[0].exercises[0].restSeconds, 120);
  assert.equal(payload.routine[0].exercises[0].notes, 'Controlled descent');
  assert.equal(payload.routine.flatMap(day => day.exercises).length, 2);
  assert.equal(workoutBatchInput.safeParse(payload).success, true);
});

test('validation messages identify missing and invalid routine fields', () => {
  const days = resizeRoutine([], 2);
  assert.ok(validateRoutine(days, 2).includes('Day 1: add at least one exercise.'));
  const invalid = complete(days);
  invalid[0].exercises[0].sets = '0';
  invalid[0].exercises[0].reps = '';
  invalid[0].exercises[0].restSeconds = '-1';
  const errors = validateRoutine(invalid, 2);
  assert.ok(errors.some(error => error.includes('sets must be a positive')));
  assert.ok(errors.some(error => error.includes('enter reps')));
  assert.ok(errors.some(error => error.includes('rest must be 0')));
  assert.equal(workoutBatchInput.safeParse({ ...request(complete(days)), daysPerWeek: 4 }).success, false);
  assert.equal(workoutBatchInput.safeParse({ ...request(complete(days)), routine: undefined }).success, false);
  const duplicateIds = request(complete(days));
  duplicateIds.routine[1].id = duplicateIds.routine[0].id;
  assert.equal(workoutBatchInput.safeParse(duplicateIds).success, false);
  assert.equal(workoutBatchInput.safeParse({ ...request(complete(days)), routine: [{ dayName: 'Day 1', focus: 'Upper', exercises: [{ name: 'Squat', sets: 0, reps: '8', restSeconds: 60 }] }, complete(days)[1]] }).success, false);
});
