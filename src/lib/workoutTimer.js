const TIMER_MODES = new Set(['stopwatch', 'countdown', 'rest']);
const TIMER_STATUSES = new Set(['idle', 'running', 'paused', 'completed']);
export const MIN_COUNTDOWN_SECONDS = 5;
export const MAX_COUNTDOWN_SECONDS = 2 * 60 * 60;
export const MAX_REST_SECONDS = 10 * 60;
const MAX_STOPWATCH_ELAPSED_MS = 31 * 24 * 60 * 60 * 1000;
const DEFAULT_DURATION_SECONDS = { stopwatch: 0, countdown: 60, rest: 60 };

export const createWorkoutTimer = (mode = 'stopwatch', durationSeconds = DEFAULT_DURATION_SECONDS[mode] ?? 0) => ({
  version: 1, mode, status: 'idle', durationSeconds, elapsedMs: 0, startedAt: null,
});

export const formatWorkoutTimer = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

export const getWorkoutTimerSnapshot = (timer, now = Date.now()) => {
  const delta = timer.status === 'running' && Number.isFinite(timer.startedAt) ? Math.max(0, now - timer.startedAt) : 0;
  const elapsedMs = timer.elapsedMs + delta;
  const durationMs = timer.durationSeconds * 1000;
  const remainingMs = timer.mode === 'stopwatch' ? 0 : Math.max(0, durationMs - elapsedMs);
  return {
    elapsedMs,
    remainingMs,
    elapsedSeconds: timer.mode === 'stopwatch' ? Math.floor(elapsedMs / 1000) : Math.ceil(Math.max(0, Math.min(elapsedMs, durationMs)) / 1000),
    remainingSeconds: timer.mode === 'stopwatch' ? 0 : Math.ceil(remainingMs / 1000),
  };
};

export const reconcileWorkoutTimer = (timer, now = Date.now()) => {
  if (timer.status !== 'running' || timer.mode === 'stopwatch') return timer;
  if (getWorkoutTimerSnapshot(timer, now).remainingMs > 0) return timer;
  return { ...timer, status: 'completed', elapsedMs: timer.durationSeconds * 1000, startedAt: null };
};

export const startWorkoutTimer = (timer, now = Date.now()) => {
  const base = timer.status === 'completed' ? { ...timer, elapsedMs: 0 } : timer;
  if (base.status === 'running') return base;
  return { ...base, status: 'running', startedAt: now };
};

export const pauseWorkoutTimer = (timer, now = Date.now()) => {
  if (timer.status !== 'running') return timer;
  const snapshot = getWorkoutTimerSnapshot(timer, now);
  if (timer.mode !== 'stopwatch' && snapshot.remainingMs <= 0) return reconcileWorkoutTimer(timer, now);
  return { ...timer, status: 'paused', elapsedMs: snapshot.elapsedMs, startedAt: null };
};

export const resetWorkoutTimer = (timer) => ({ ...timer, status: 'idle', elapsedMs: 0, startedAt: null });

export const changeWorkoutTimerMode = (mode) => {
  if (!TIMER_MODES.has(mode)) throw new RangeError('Unsupported workout timer mode.');
  return createWorkoutTimer(mode, DEFAULT_DURATION_SECONDS[mode]);
};

export const setWorkoutTimerDuration = (timer, durationSeconds) => {
  const max = timer.mode === 'rest' ? MAX_REST_SECONDS : MAX_COUNTDOWN_SECONDS;
  if (!['countdown', 'rest'].includes(timer.mode)) throw new RangeError('Duration is only available for countdown and rest timers.');
  if (!Number.isInteger(durationSeconds) || durationSeconds < MIN_COUNTDOWN_SECONDS || durationSeconds > max) throw new RangeError('Timer duration is outside the allowed range.');
  return { ...timer, status: 'idle', durationSeconds, elapsedMs: 0, startedAt: null };
};

export const saveWorkoutTimer = (storage, key, timer) => {
  try { storage?.setItem(key, JSON.stringify(timer)); return true; } catch { return false; }
};

export const restoreWorkoutTimer = (storage, key, now = Date.now()) => {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || !TIMER_MODES.has(value.mode) || !TIMER_STATUSES.has(value.status)) return null;
    if (!Number.isInteger(value.durationSeconds) || !Number.isFinite(value.elapsedMs) || value.elapsedMs < 0) return null;
    if (value.mode === 'stopwatch') {
      if (value.durationSeconds !== 0 || value.elapsedMs > MAX_STOPWATCH_ELAPSED_MS) return null;
    } else {
      const max = value.mode === 'rest' ? MAX_REST_SECONDS : MAX_COUNTDOWN_SECONDS;
      if (value.durationSeconds < MIN_COUNTDOWN_SECONDS || value.durationSeconds > max || value.elapsedMs > value.durationSeconds * 1000) return null;
    }
    if (value.status === 'running') {
      if (!Number.isFinite(value.startedAt) || value.startedAt > now + 60_000) return null;
      if (value.mode === 'stopwatch' && now - value.startedAt + value.elapsedMs > MAX_STOPWATCH_ELAPSED_MS) return null;
    } else if (value.startedAt !== null) return null;
    return reconcileWorkoutTimer(value, now);
  } catch { return null; }
};
