'use client';

import type { ActiveWorkoutSet } from '@/types';
import { Check, Minus, Plus, Trash2 } from 'lucide-react';

interface SetEntryProps {
  set: ActiveWorkoutSet;
  previousSet?: { weight: number | null; reps: number };
  disabled?: boolean;
  canRemove?: boolean;
  onRemove: () => void;
  onUpdateSet: (updated: ActiveWorkoutSet) => void;
}

export function SetEntry({ set, previousSet, disabled = false, canRemove = true, onRemove, onUpdateSet }: SetEntryProps) {
  const updateWeight = (value: string) => onUpdateSet({ ...set, weight: value === '' ? null : Number(value) });
  const updateReps = (value: string) => onUpdateSet({ ...set, reps: value === '' ? null : Number(value) });
  const adjustWeight = (delta: number) => onUpdateSet({ ...set, weight: Math.max(0, Math.round(((set.weight ?? 0) + delta) * 10) / 10) });
  const adjustReps = (delta: number) => onUpdateSet({ ...set, reps: Math.max(1, (set.reps ?? 1) + delta) });

  return (
    <div className={`grid min-w-0 grid-cols-2 gap-2 rounded-xs border p-2 transition-colors sm:grid-cols-12 sm:items-center ${set.isCompleted ? 'border-[#677D6A] bg-[#1A3636]/40' : 'border-[#393E46] bg-[#222831]'}`}>
      <div className="flex min-w-0 items-center gap-1 sm:col-span-2">
        <span className="font-mono text-xs uppercase text-[#948979]">Set</span>
        <span className="font-mono text-sm font-bold text-[#DFD0B8]">{String(set.setNumber).padStart(2, '0')}</span>
        <span className="truncate font-mono text-xs text-[#948979] sm:hidden">· {previousSet ? `${previousSet.weight}kg × ${previousSet.reps}` : 'First set'}</span>
      </div>
      <div className="hidden truncate font-mono text-xs text-[#948979] sm:col-span-2 sm:block">
        {previousSet ? `${previousSet.weight}kg × ${previousSet.reps}` : 'First set'}
      </div>
      <div className="flex min-h-11 min-w-0 items-center rounded-xs border border-[#393E46] bg-[#1C2128] sm:col-span-3">
        <button type="button" disabled={disabled} onClick={() => adjustWeight(-2.5)} aria-label={`Decrease weight for set ${set.setNumber}`} className="h-11 w-9 shrink-0 text-[#948979] hover:text-[#DFD0B8] disabled:opacity-50"><Minus className="mx-auto h-3.5 w-3.5" /></button>
        <input type="number" inputMode="decimal" min="0" max="1500" step="0.1" disabled={disabled} aria-label={`Weight for set ${set.setNumber}`} value={set.weight ?? ''} onChange={(event) => updateWeight(event.target.value)} className="h-11 min-w-0 flex-1 bg-transparent text-center font-mono text-base font-bold text-[#DFD0B8] outline-none" />
        <span className="font-mono text-[10px] text-[#948979]">kg</span>
        <button type="button" disabled={disabled} onClick={() => adjustWeight(2.5)} aria-label={`Increase weight for set ${set.setNumber}`} className="h-11 w-9 shrink-0 text-[#948979] hover:text-[#DFD0B8] disabled:opacity-50"><Plus className="mx-auto h-3.5 w-3.5" /></button>
      </div>
      <div className="flex min-h-11 min-w-0 items-center rounded-xs border border-[#393E46] bg-[#1C2128] sm:col-span-3">
        <button type="button" disabled={disabled} onClick={() => adjustReps(-1)} aria-label={`Decrease reps for set ${set.setNumber}`} className="h-11 w-9 shrink-0 text-[#948979] hover:text-[#DFD0B8] disabled:opacity-50"><Minus className="mx-auto h-3.5 w-3.5" /></button>
        <input type="number" inputMode="numeric" min="1" max="1000" step="1" disabled={disabled} aria-label={`Reps for set ${set.setNumber}`} value={set.reps ?? ''} onChange={(event) => updateReps(event.target.value)} className="h-11 min-w-0 flex-1 bg-transparent text-center font-mono text-base font-bold text-[#DFD0B8] outline-none" />
        <button type="button" disabled={disabled} onClick={() => adjustReps(1)} aria-label={`Increase reps for set ${set.setNumber}`} className="h-11 w-9 shrink-0 text-[#948979] hover:text-[#DFD0B8] disabled:opacity-50"><Plus className="mx-auto h-3.5 w-3.5" /></button>
      </div>
      <div className="col-start-2 row-start-1 flex justify-end gap-1 sm:col-span-2 sm:col-start-auto sm:row-start-auto">
        <button type="button" disabled={disabled || !canRemove} onClick={onRemove} aria-label={`Remove set ${set.setNumber}`} className="flex h-11 w-11 items-center justify-center rounded-xs border border-[#4D5460] text-[#948979] hover:border-[#B56B62] hover:text-[#D99B92] disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
        <button type="button" disabled={disabled} onClick={() => onUpdateSet({ ...set, isCompleted: !set.isCompleted })} aria-label={set.isCompleted ? `Mark set ${set.setNumber} incomplete` : `Mark set ${set.setNumber} complete`} className={`flex h-11 w-11 items-center justify-center rounded-xs border ${set.isCompleted ? 'border-[#8DAA91] bg-[#677D6A] text-[#1A3636]' : 'border-[#4D5460] bg-[#2C323B] text-[#948979]'}`}><Check className="h-5 w-5" /></button>
      </div>
    </div>
  );
}
