import test from 'node:test';
import assert from 'node:assert/strict';
import {
  changeWorkoutTimerMode,
  createWorkoutTimer,
  formatWorkoutTimer,
  getWorkoutTimerSnapshot,
  pauseWorkoutTimer,
  reconcileWorkoutTimer,
  resetWorkoutTimer,
  restoreWorkoutTimer,
  saveWorkoutTimer,
  setWorkoutTimerDuration,
  startWorkoutTimer,
} from '../src/lib/workoutTimer.js';

const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};

test('stopwatch starts, pauses, resumes, and resets using timestamps', () => {
  let timer = startWorkoutTimer(createWorkoutTimer('stopwatch'), 1_000);
  assert.equal(getWorkoutTimerSnapshot(timer, 6_400).elapsedSeconds, 5);
  timer = pauseWorkoutTimer(timer, 6_400);
  assert.equal(timer.status, 'paused');
  assert.equal(getWorkoutTimerSnapshot(timer, 100_000).elapsedSeconds, 5);
  timer = startWorkoutTimer(timer, 20_000);
  assert.equal(getWorkoutTimerSnapshot(timer, 24_700).elapsedSeconds, 10);
  timer = resetWorkoutTimer(timer);
  assert.equal(timer.status, 'idle');
  assert.equal(getWorkoutTimerSnapshot(timer, 200_000).elapsedSeconds, 0);
});

test('duration presets and custom countdown duration validate and reset safely', () => {
  let timer = changeWorkoutTimerMode('countdown');
  assert.equal(timer.durationSeconds, 60);
  for (const seconds of [30, 60, 120, 180, 300]) {
    timer = setWorkoutTimerDuration(timer, seconds);
    assert.equal(timer.durationSeconds, seconds);
    assert.equal(timer.status, 'idle');
  }
  timer = setWorkoutTimerDuration(timer, 75);
  assert.equal(timer.durationSeconds, 75);
  assert.throws(() => setWorkoutTimerDuration(timer, 0), RangeError);
  assert.throws(() => setWorkoutTimerDuration(timer, 7_201), RangeError);
});

test('countdown catches up after background throttling and completes at its timestamp deadline', () => {
  const timer = startWorkoutTimer(setWorkoutTimerDuration(changeWorkoutTimerMode('countdown'), 30), 10_000);
  assert.equal(getWorkoutTimerSnapshot(timer, 28_000).remainingSeconds, 12);
  const completed = reconcileWorkoutTimer(timer, 40_000);
  assert.equal(completed.status, 'completed');
  assert.equal(getWorkoutTimerSnapshot(completed, 99_000).remainingSeconds, 0);
});

test('rest timer accepts practical presets and rejects values outside its limit', () => {
  let timer = changeWorkoutTimerMode('rest');
  for (const seconds of [30, 60, 90, 120]) {
    timer = setWorkoutTimerDuration(timer, seconds);
    assert.equal(timer.durationSeconds, seconds);
  }
  assert.throws(() => setWorkoutTimerDuration(timer, 601), RangeError);
});

test('session storage restores an active timer and accounts for time away', () => {
  const storage = memoryStorage();
  const key = 'sarex.workout-timer.v1:member-1';
  const started = startWorkoutTimer(setWorkoutTimerDuration(changeWorkoutTimerMode('countdown'), 120), 1_000);
  assert.equal(saveWorkoutTimer(storage, key, started), true);
  const restored = restoreWorkoutTimer(storage, key, 31_000);
  assert.equal(getWorkoutTimerSnapshot(restored, 31_000).remainingSeconds, 90);
  assert.equal(restored.status, 'running');
});

test('restored countdown becomes completed after its deadline without deleting the state', () => {
  const storage = memoryStorage();
  const timer = startWorkoutTimer(setWorkoutTimerDuration(changeWorkoutTimerMode('countdown'), 30), 1_000);
  saveWorkoutTimer(storage, 'timer', timer);
  const restored = restoreWorkoutTimer(storage, 'timer', 40_000);
  assert.equal(restored.status, 'completed');
  assert.equal(restored.elapsedMs, 30_000);
});

test('corrupted, unsupported, or implausible session state is ignored safely', () => {
  const storage = memoryStorage();
  storage.setItem('bad-json', '{broken');
  storage.setItem('bad-shape', JSON.stringify({ version: 1, mode: 'unknown' }));
  storage.setItem('future-clock', JSON.stringify({ ...startWorkoutTimer(createWorkoutTimer('stopwatch'), 9_000_000), version: 1 }));
  assert.equal(restoreWorkoutTimer(storage, 'bad-json', 1_000), null);
  assert.equal(restoreWorkoutTimer(storage, 'bad-shape', 1_000), null);
  assert.equal(restoreWorkoutTimer(storage, 'future-clock', 1_000), null);
});

test('mode changes discard the previous running timer without carrying its time', () => {
  const running = startWorkoutTimer(createWorkoutTimer('stopwatch'), 1_000);
  const rest = changeWorkoutTimerMode('rest');
  assert.equal(rest.status, 'idle');
  assert.equal(rest.durationSeconds, 60);
  assert.equal(rest.elapsedMs, 0);
  assert.equal(running.status, 'running');
});

test('storage persistence allows a timer to survive route unmount and remount', () => {
  const storage = memoryStorage();
  const key = 'sarex.workout-timer.v1:member-7';
  const running = startWorkoutTimer(createWorkoutTimer('stopwatch'), 10_000);
  saveWorkoutTimer(storage, key, running);
  // Simulate leaving the workout page and mounting the same utility again later.
  const restored = restoreWorkoutTimer(storage, key, 70_000);
  assert.equal(getWorkoutTimerSnapshot(restored, 70_000).elapsedSeconds, 60);
  assert.equal(restored.status, 'running');
});

test('time display switches to hours only after 59:59', () => {
  assert.equal(formatWorkoutTimer(3_599), '59:59');
  assert.equal(formatWorkoutTimer(3_600), '01:00:00');
});
