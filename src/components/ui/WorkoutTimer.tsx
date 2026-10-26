import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, Clock3, Pause, Play, RotateCcw, Timer as TimerIcon } from 'lucide-react';
import {
  changeWorkoutTimerMode, createWorkoutTimer, formatWorkoutTimer, getWorkoutTimerSnapshot,
  pauseWorkoutTimer, reconcileWorkoutTimer, resetWorkoutTimer, restoreWorkoutTimer,
  saveWorkoutTimer, setWorkoutTimerDuration, startWorkoutTimer,
} from '../../lib/workoutTimer.js';

type TimerMode = 'stopwatch' | 'countdown' | 'rest';
type WorkoutTimerState = ReturnType<typeof createWorkoutTimer>;
const COUNTDOWN_PRESETS = [30, 60, 120, 180, 300];
const REST_PRESETS = [30, 60, 90, 120];
const storageKeyFor = (memberId: string) => `sarex.workout-timer.v1:${memberId}`;
const labelForDuration = (seconds: number) => seconds < 60 ? `${seconds}s` : `${seconds / 60} min`;
const getSessionStorage = () => {
  try { return typeof window === 'undefined' ? null : window.sessionStorage; }
  catch { return null; }
};

export const WorkoutTimer: React.FC<{ memberId: string }> = ({ memberId }) => {
  const storageKey = useMemo(() => storageKeyFor(memberId), [memberId]);
  const [timer, setTimer] = useState<WorkoutTimerState>(() => restoreWorkoutTimer(getSessionStorage(), storageKey) || createWorkoutTimer('stopwatch'));
  const [now, setNow] = useState(() => Date.now());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('1');
  const [customSeconds, setCustomSeconds] = useState('0');
  const [durationError, setDurationError] = useState('');
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const snapshot = getWorkoutTimerSnapshot(timer, now);
  const displaySeconds = timer.mode === 'stopwatch' ? snapshot.elapsedSeconds : snapshot.remainingSeconds;
  const timerText = formatWorkoutTimer(displaySeconds);
  const isFinished = timer.status === 'completed';

  useEffect(() => { saveWorkoutTimer(getSessionStorage(), storageKey, timer); }, [storageKey, timer]);
  useEffect(() => () => { if (audioContext) void audioContext.close().catch(() => undefined); }, [audioContext]);

  const refreshFromClock = useCallback(() => {
    const currentTime = Date.now();
    setNow(currentTime);
    setTimer(previous => reconcileWorkoutTimer(previous, currentTime));
  }, []);

  useEffect(() => {
    if (timer.status !== 'running') return;
    const interval = window.setInterval(refreshFromClock, 250);
    document.addEventListener('visibilitychange', refreshFromClock);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refreshFromClock); };
  }, [timer.status, refreshFromClock]);

  useEffect(() => {
    if (!isFinished || !soundEnabled || !audioContext) return;
    try {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + 0.46);
    } catch { /* Audio can be unavailable or suspended; the on-screen alert remains authoritative. */ }
  }, [audioContext, isFinished, soundEnabled]);

  const update = (next: WorkoutTimerState) => { setNow(Date.now()); setTimer(next); };
  const handleStartPause = () => {
    const currentTime = Date.now();
    if (timer.status === 'running') update(pauseWorkoutTimer(timer, currentTime));
    else {
      if (soundEnabled && typeof window.AudioContext !== 'undefined') setAudioContext(context => context || new window.AudioContext());
      update(startWorkoutTimer(timer, currentTime));
    }
  };
  const selectMode = (mode: TimerMode) => { setDurationError(''); update(changeWorkoutTimerMode(mode)); };
  const choosePreset = (seconds: number) => {
    setDurationError(''); update(setWorkoutTimerDuration(timer, seconds));
    setCustomMinutes(String(Math.floor(seconds / 60))); setCustomSeconds(String(seconds % 60));
  };
  const setCustomDuration = (event: React.FormEvent) => {
    event.preventDefault();
    const seconds = Number(customMinutes) * 60 + Number(customSeconds);
    try { update(setWorkoutTimerDuration(timer, seconds)); setDurationError(''); }
    catch { setDurationError('Choose a duration from 5 seconds to 2 hours.'); }
  };
  const toggleSound = () => {
    if (typeof window.AudioContext === 'undefined') return;
    if (!soundEnabled) {
      try { const context = audioContext || new window.AudioContext(); void context.resume(); setAudioContext(context); }
      catch { setSoundEnabled(false); return; }
    }
    setSoundEnabled(value => !value);
  };
  const presets = timer.mode === 'countdown' ? COUNTDOWN_PRESETS : timer.mode === 'rest' ? REST_PRESETS : [];

  return <section aria-labelledby="workout-timer-title" className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-[#EF1B23]"><TimerIcon aria-hidden="true" className="h-5 w-5" /></span><div><h2 id="workout-timer-title" className="text-sm font-bold text-gray-950">Workout timer</h2><p className="mt-0.5 text-xs text-gray-500">A training aid. It never changes your workout progress.</p></div></div>
      {timer.mode === 'rest' && <button type="button" aria-pressed={soundEnabled} aria-label={typeof window !== 'undefined' && typeof window.AudioContext === 'undefined' ? 'Completion sound unavailable in this browser' : `Completion sound ${soundEnabled ? 'on' : 'off'}`} disabled={typeof window !== 'undefined' && typeof window.AudioContext === 'undefined'} onClick={toggleSound} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF1B23] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{soundEnabled ? <Bell aria-hidden="true" className="h-4 w-4" /> : <BellOff aria-hidden="true" className="h-4 w-4" />}{typeof window !== 'undefined' && typeof window.AudioContext === 'undefined' ? 'Sound unavailable' : soundEnabled ? 'Sound on' : 'Sound off'}</button>}
    </div>
    <div className="p-4 sm:p-5">
      <div role="group" aria-label="Timer mode" className="grid grid-cols-3 gap-2 rounded-lg bg-gray-100 p-1">
        {(['stopwatch', 'countdown', 'rest'] as const).map(mode => <button key={mode} type="button" aria-pressed={timer.mode === mode} onClick={() => selectMode(mode)} className={`min-h-10 rounded-md px-2 text-xs font-semibold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF1B23] focus-visible:ring-offset-2 ${timer.mode === mode ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-600 hover:text-gray-950'}`}>{mode}</button>)}
      </div>
      <div className={`mt-4 rounded-lg border px-4 py-5 text-center sm:px-6 sm:py-6 ${timer.status === 'running' ? 'border-red-100 bg-red-50/50' : isFinished ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">{timer.status === 'running' ? 'Timer running' : timer.status === 'paused' ? 'Paused' : isFinished ? (timer.mode === 'stopwatch' ? 'Session time' : 'Time complete') : timer.mode === 'rest' ? 'Rest remaining' : timer.mode === 'countdown' ? 'Time remaining' : 'Elapsed time'}</p>
        <output aria-label={`${timer.mode} ${timer.status}`} aria-live="off" className="mt-2 block font-mono text-5xl font-bold tabular-nums tracking-tight text-gray-950 sm:text-6xl">{timerText}</output>
        {isFinished && <p role="status" className="mt-3 text-sm font-bold text-emerald-800">{timer.mode === 'rest' ? 'Rest period complete' : 'Countdown complete'}</p>}
        {timer.status === 'paused' && <p className="mt-2 text-xs text-gray-600">Paused. Resume when you’re ready.</p>}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={handleStartPause} aria-label={timer.status === 'running' ? 'Pause timer' : timer.status === 'paused' ? 'Resume timer' : 'Start timer'} className="inline-flex min-h-12 min-w-36 items-center justify-center gap-2 rounded-md bg-[#EF1B23] px-5 text-sm font-bold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF1B23] focus-visible:ring-offset-2">{timer.status === 'running' ? <><Pause aria-hidden="true" className="h-4 w-4" />Pause</> : <><Play aria-hidden="true" className="h-4 w-4" />{timer.status === 'paused' ? 'Resume' : 'Start'}</>}</button>
        <button type="button" onClick={() => update(resetWorkoutTimer(timer))} aria-label="Reset timer" className="inline-flex min-h-12 min-w-28 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF1B23] focus-visible:ring-offset-2"><RotateCcw aria-hidden="true" className="h-4 w-4" />Reset</button>
      </div>
      {presets.length > 0 && <div className="mt-5"><p className="mb-2 text-center text-xs font-semibold text-gray-600">{timer.mode === 'rest' ? 'Rest preset' : 'Countdown preset'}</p><div className="flex flex-wrap justify-center gap-2" role="group" aria-label={`${timer.mode} presets`}>{presets.map(seconds => <button key={seconds} type="button" aria-pressed={timer.durationSeconds === seconds} onClick={() => choosePreset(seconds)} className={`min-h-10 rounded-full border px-3.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF1B23] focus-visible:ring-offset-2 ${timer.durationSeconds === seconds ? 'border-[#EF1B23] bg-red-50 text-red-800' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'}`}>{labelForDuration(seconds)}</button>)}</div></div>}
      {timer.mode === 'countdown' && <form onSubmit={setCustomDuration} className="mx-auto mt-5 max-w-md border-t border-gray-100 pt-4"><label className="mb-2 block text-center text-xs font-semibold text-gray-600">Custom duration</label><div className="flex flex-wrap items-end justify-center gap-2"><label className="text-xs text-gray-600">Minutes<input aria-label="Custom countdown minutes" type="number" min="0" max="120" inputMode="numeric" value={customMinutes} onChange={event => setCustomMinutes(event.target.value)} className="mt-1 block h-10 w-24 rounded-md border border-gray-300 px-3 text-sm text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF1B23]" /></label><label className="text-xs text-gray-600">Seconds<input aria-label="Custom countdown seconds" type="number" min="0" max="59" inputMode="numeric" value={customSeconds} onChange={event => setCustomSeconds(event.target.value)} className="mt-1 block h-10 w-24 rounded-md border border-gray-300 px-3 text-sm text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF1B23]" /></label><button type="submit" className="min-h-10 rounded-md border border-gray-300 px-4 text-xs font-bold text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF1B23] focus-visible:ring-offset-2">Set time</button></div>{durationError && <p role="alert" className="mt-2 text-center text-xs font-medium text-red-700">{durationError}</p>}<p className="mt-2 text-center text-[11px] text-gray-500">Choose 5 seconds to 2 hours. Changing time resets this timer.</p></form>}
      {timer.mode === 'rest' && <p className="mt-4 text-center text-xs text-gray-500"><Clock3 aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />Choose a rest period between sets. Prescribed workout settings stay unchanged.</p>}
      <span className="sr-only" aria-live="polite">{timer.status === 'running' ? `${timer.mode} running` : timer.status === 'paused' ? `${timer.mode} paused` : isFinished ? 'Timer complete' : 'Timer ready'}</span>
    </div>
  </section>;
};
