'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeWorkout, discardWorkout, saveWorkoutDraft, startWorkout } from '@/actions/workouts';
import type { ActionResult } from '@/server/action-result';
import type { ActiveWorkout, ActiveWorkoutExercise, ActiveWorkoutSet, SplitDay } from '@/types';
import { CheckCircle2, Play, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { RunePanel } from '@/components/ui/RunePanel';
import { SetEntry } from '@/components/ui/SetEntry';

interface TrainViewProps {
  splitDays: SplitDay[];
  activeWorkout: ActiveWorkout | null;
  onWorkoutChange: (workout: ActiveWorkout | null) => void;
  onPendingChange: (pending: boolean) => void;
}

export function TrainView({ splitDays, activeWorkout, onWorkoutChange, onPendingChange }: TrainViewProps) {
  const router = useRouter();
  const [selectedDayId, setSelectedDayId] = useState(splitDays[0]?.id ?? '');
  const [draftState, setDraftState] = useState({ source: activeWorkout, value: activeWorkout });
  const workout = draftState.source === activeWorkout ? draftState.value : activeWorkout;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [completion, setCompletion] = useState<{ durationMinutes: number } | null>(null);
  const effectiveSelectedDayId = splitDays.some(({ id }) => id === selectedDayId)
    ? selectedDayId
    : (splitDays[0]?.id ?? '');

  const setBusy = (value: boolean) => { setPending(value); onPendingChange(value); };
  const reconcile = (next: ActiveWorkout | null) => {
    setDraftState({ source: next, value: next });
    onWorkoutChange(next);
  };
  const updateWorkout = (update: (current: ActiveWorkout) => ActiveWorkout) => {
    if (!workout) return;
    setDraftState({ source: activeWorkout, value: update(workout) });
  };

  const commitWorkout = async <T,>(
    operation: () => Promise<ActionResult<T>>,
    onSuccess: (data: T) => void,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const result = await operation();
      if (result.ok) onSuccess(result.data);
      else setError(result);
    } catch {
      setError({ code: 'INTERNAL_ERROR', message: 'Unable to update the workout. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (!effectiveSelectedDayId || pending) return;
    await commitWorkout(
      () => startWorkout({ splitDayId: effectiveSelectedDayId }),
      reconcile,
    );
  };

  const draftInput = () => workout ? ({
    workoutSessionId: workout.id,
    version: workout.version,
    notes: workout.notes,
    exercises: workout.exercises.map((exercise) => ({
      sessionExerciseId: exercise.id,
      sets: exercise.sets.map(({ id, weight, reps, isCompleted }) => ({ id, weight, reps, isCompleted })),
    })),
  }) : null;

  const save = async () => {
    const input = draftInput(); if (!input || pending) return;
    await commitWorkout(() => saveWorkoutDraft(input), reconcile);
  };

  const finish = async () => {
    const input = draftInput(); if (!input || pending) return;
    await commitWorkout(() => completeWorkout(input), (result) => {
      setCompletion(result);
      reconcile(null);
    });
  };

  const discard = async () => {
    if (!workout || pending) return;
    await commitWorkout(
      () => discardWorkout({ workoutSessionId: workout.id, version: workout.version }),
      () => {
        setConfirmDiscard(false);
        reconcile(null);
      },
    );
  };

  const updateExercise = (exerciseId: string, update: (exercise: ActiveWorkoutExercise) => ActiveWorkoutExercise) => updateWorkout((current) => ({
    ...current,
    exercises: current.exercises.map((exercise) => exercise.id === exerciseId ? update(exercise) : exercise),
  }));

  if (completion) return (
    <RunePanel variant="carved" className="space-y-4 p-8 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-[#8DAA91]" />
      <h2 className="font-mono text-xl font-bold text-[#DFD0B8]">Workout session saved</h2>
      <p className="font-mono text-sm text-[#948979]">Duration: <span className="text-[#DFD0B8]">{completion.durationMinutes} minutes</span></p>
      <button type="button" onClick={() => setCompletion(null)} className="min-h-11 rounded-xs border border-[#677D6A] bg-[#40534C] px-6 font-mono text-xs font-bold uppercase text-[#DFD0B8]">Start new session</button>
    </RunePanel>
  );

  if (!workout && splitDays.length === 0) return <EmptyState title="No Workout Split Found" description="Configure a workout split before starting a training session." icon={<Play className="h-6 w-6 text-[#677D6A]" />} />;

  if (!workout) return (
    <RunePanel variant="carved" className="space-y-5 p-5">
      <div><h2 className="font-mono text-lg font-bold text-[#DFD0B8]">Start a workout</h2><p className="mt-1 font-mono text-xs text-[#948979]">Choose a split day. Its current targets will be preserved as this session’s snapshot.</p></div>
      <label htmlFor="workout-day" className="block font-mono text-xs uppercase tracking-wider text-[#948979]">Workout day</label>
      <select id="workout-day" value={effectiveSelectedDayId} onChange={(event) => setSelectedDayId(event.target.value)} disabled={pending} className="min-h-11 w-full rounded-xs border border-[#677D6A] bg-[#222831] px-3 font-mono text-base font-bold text-[#DFD0B8] outline-none">
        {splitDays.map((day) => <option key={day.id} value={day.id}>{day.name}</option>)}
      </select>
      {error ? <div role="alert" className="font-mono text-xs text-[#D99B92]">{error.message}</div> : null}
      <button type="button" onClick={start} disabled={pending} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xs border border-[#677D6A] bg-[#40534C] px-6 font-mono text-xs font-bold uppercase text-[#DFD0B8] disabled:opacity-50"><Play className="h-4 w-4" />{pending ? 'Starting…' : 'Start workout'}</button>
    </RunePanel>
  );

  const totalSets = workout.exercises.reduce((count, exercise) => count + exercise.sets.length, 0);
  const completedSets = workout.exercises.reduce((count, exercise) => count + exercise.sets.filter((set) => set.isCompleted).length, 0);
  const percentage = Math.round((completedSets / Math.max(1, totalSets)) * 100);

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 rounded-xs border border-[#393E46] bg-[#1C2128] p-4 sm:flex-row sm:items-center">
      <div><div className="font-mono text-[10px] uppercase tracking-widest text-[#8DAA91]">Session in progress</div><h2 className="mt-1 min-w-0 break-words font-mono text-lg font-bold text-[#DFD0B8]">{workout.splitDayName}</h2></div>
      <div className="flex items-center gap-4"><div className="text-right font-mono text-xs"><div className="font-bold text-[#DFD0B8]">{completedSets} / {totalSets} Sets Logged</div><div className="text-[#948979]">{percentage}% Completed</div></div><div role="progressbar" aria-label="Workout completion" aria-valuemin={0} aria-valuemax={totalSets} aria-valuenow={completedSets} aria-valuetext={`${completedSets} of ${totalSets} sets logged`} className="h-2 w-16 overflow-hidden rounded-full border border-[#393E46] bg-[#222831]"><div className="h-full bg-[#677D6A] transition-[width] duration-300" style={{ width: `${percentage}%` }} /></div></div>
    </div>
    {error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xs border border-[#7A4943] bg-[#2B2022] p-3 font-mono text-xs text-[#D99B92]"><span>{error.message}</span>{error.code === 'CONFLICT' ? <button type="button" onClick={() => router.refresh()} className="min-h-11 px-3 font-bold uppercase text-[#DFD0B8]"><RotateCcw className="mr-1 inline h-4 w-4" />Reload workout</button> : null}</div> : null}
    <div className="space-y-6">{workout.exercises.map((exercise, exerciseIndex) => <RunePanel key={exercise.id} variant="carved" className="min-w-0 space-y-4 p-4 sm:p-5">
      <div className="min-w-0 border-b border-[#393E46] pb-3"><div className="flex min-w-0 items-center gap-2"><span className="font-mono text-xs font-bold text-[#677D6A]">{String(exerciseIndex + 1).padStart(2, '0')}</span><h3 className="min-w-0 break-words font-mono text-base font-bold text-[#DFD0B8]">{exercise.exerciseName}</h3></div><p className="mt-1 font-mono text-xs text-[#948979]">Target: <span className="text-[#DFD0B8]">{exercise.targetSets} × {exercise.targetRepMin}–{exercise.targetRepMax} reps</span></p>{exercise.notes ? <p className="mt-1 break-words font-mono text-xs text-[#948979]">{exercise.notes}</p> : null}</div>
      <div className="space-y-2">{exercise.sets.map((set, setIndex) => <SetEntry key={set.id} set={set} previousSet={exercise.previousPerformance[setIndex]} disabled={pending} canRemove={exercise.sets.length > 1} onUpdateSet={(updated) => updateExercise(exercise.id, (entry) => ({ ...entry, sets: entry.sets.map((candidate) => candidate.id === set.id ? updated : candidate) }))} onRemove={() => updateExercise(exercise.id, (entry) => ({ ...entry, sets: entry.sets.length === 1 ? entry.sets : entry.sets.filter((candidate) => candidate.id !== set.id).map((candidate, index) => ({ ...candidate, setNumber: index + 1 })) }))} />)}</div>
      <button type="button" disabled={pending || exercise.sets.length >= 30} aria-label={`Add set to ${exercise.exerciseName}`} onClick={() => updateExercise(exercise.id, (entry) => { const last = entry.sets.at(-1); const newSet: ActiveWorkoutSet = { id: globalThis.crypto.randomUUID(), setNumber: entry.sets.length + 1, weight: last?.weight ?? null, reps: last?.reps ?? entry.targetRepMin, isCompleted: false }; return { ...entry, sets: [...entry.sets, newSet] }; })} className="flex min-h-11 items-center gap-1.5 rounded-xs border border-[#393E46] bg-[#222831] px-3 font-mono text-xs text-[#948979] hover:text-[#DFD0B8] disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Add set</button>
    </RunePanel>)}</div>
    <RunePanel variant="subtle" className="space-y-4 p-4">
      <label htmlFor="workout-notes" className="block font-mono text-xs uppercase tracking-wider text-[#948979]">Workout notes</label>
      <textarea id="workout-notes" maxLength={1000} disabled={pending} value={workout.notes} onChange={(event) => updateWorkout((current) => ({ ...current, notes: event.target.value }))} placeholder="Record energy, RPE, equipment settings, or grip adjustments…" className="h-24 w-full resize-y rounded-xs border border-[#393E46] bg-[#161A20] p-3 font-mono text-base text-[#DFD0B8] outline-none placeholder:text-[#756C60] focus:border-[#677D6A]" />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {!confirmDiscard ? <button type="button" disabled={pending} onClick={() => setConfirmDiscard(true)} className="min-h-11 rounded-xs border border-[#5B4644] px-4 font-mono text-xs font-bold uppercase text-[#D99B92] disabled:opacity-50"><Trash2 className="mr-1 inline h-4 w-4" />Discard workout</button> : <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-[#D99B92]">Discard this draft?</span><button type="button" disabled={pending} onClick={discard} className="min-h-11 rounded-xs bg-[#7A4943] px-4 font-mono text-xs font-bold uppercase text-white">Confirm discard</button><button type="button" disabled={pending} onClick={() => setConfirmDiscard(false)} className="min-h-11 px-3 font-mono text-xs uppercase text-[#DFD0B8]">Cancel</button></div>}
        <div className="flex flex-col gap-2 sm:flex-row"><button type="button" disabled={pending} onClick={save} className="min-h-11 rounded-xs border border-[#677D6A] px-5 font-mono text-xs font-bold uppercase text-[#DFD0B8] disabled:opacity-50"><Save className="mr-1 inline h-4 w-4" />Save draft</button><button type="button" disabled={pending || completedSets === 0} onClick={finish} className="min-h-11 rounded-xs border border-[#677D6A] bg-[#40534C] px-6 font-mono text-xs font-bold uppercase text-[#DFD0B8] disabled:opacity-50"><CheckCircle2 className="mr-1 inline h-4 w-4" />Finish workout</button></div>
      </div>
    </RunePanel>
  </div>;
}
