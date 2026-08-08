'use client';

import React from 'react';
import { WorkoutSet } from '@/types';
import { Check, Plus, Minus } from 'lucide-react';

interface SetEntryProps {
  set: WorkoutSet;
  previousSet?: { weight: number; reps: number };
  onUpdateSet: (updated: WorkoutSet) => void;
  onRemoveSet?: () => void;
  canRemove?: boolean;
}

export const SetEntry: React.FC<SetEntryProps> = ({
  set,
  previousSet,
  onUpdateSet,
  onRemoveSet,
  canRemove = false,
}) => {
  const isCompleted = !!set.isCompleted;

  const handleWeightChange = (delta: number) => {
    const nextWeight = Math.max(0, Math.round((set.weight + delta) * 10) / 10);
    onUpdateSet({ ...set, weight: nextWeight });
  };

  const handleRepsChange = (delta: number) => {
    const nextReps = Math.max(0, set.reps + delta);
    onUpdateSet({ ...set, reps: nextReps });
  };

  const toggleCompleted = () => {
    onUpdateSet({ ...set, isCompleted: !isCompleted });
  };

  return (
    <div
      className={`grid grid-cols-2 gap-2 p-2 rounded-xs border transition-all duration-150 sm:grid-cols-12 sm:items-center sm:gap-1.5 ${
        isCompleted
          ? 'bg-[#1A3636]/40 border-[#677D6A] text-[#DFD0B8]'
          : 'bg-[#222831] border-[#393E46] text-[#DFD0B8]'
      }`}
    >
      {/* Set Number */}
      <div className="flex items-center gap-1 sm:col-span-2">
        <span className="font-mono text-xs text-[#948979] uppercase">Set</span>
        <span className="font-mono text-sm font-bold text-[#DFD0B8]">
          {set.setNumber.toString().padStart(2, '0')}
        </span>
        <span className="text-xs font-mono text-[#948979] sm:hidden">
          · {previousSet ? `${previousSet.weight}kg × ${previousSet.reps}` : 'First set'}
        </span>
      </div>

      {/* Previous Performance Reference */}
      <div className="hidden text-xs font-mono text-[#948979] truncate sm:col-span-3 sm:block">
        {previousSet ? (
          <span>
            {previousSet.weight}kg × {previousSet.reps}
          </span>
        ) : (
          <span className="text-[#635B50]">First set</span>
        )}
      </div>

      {/* Weight Controls */}
      <div className="flex min-h-11 items-center justify-center gap-1 bg-[#1C2128] px-1 py-1 rounded-xs border border-[#393E46] sm:col-span-3 sm:min-h-0">
        <button
          type="button"
          onClick={() => handleWeightChange(-2.5)}
          className="w-10 h-10 flex items-center justify-center text-[#948979] hover:text-[#DFD0B8] hover:bg-[#2C323B] rounded-xs transition-colors active:scale-95 sm:w-7 sm:h-8"
          aria-label={`Decrease weight for set ${set.setNumber}`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-xs font-bold w-12 text-center text-[#DFD0B8] sm:w-10">
          {set.weight}
          <span className="text-[10px] text-[#948979] font-normal">kg</span>
        </span>
        <button
          type="button"
          onClick={() => handleWeightChange(2.5)}
          className="w-10 h-10 flex items-center justify-center text-[#948979] hover:text-[#DFD0B8] hover:bg-[#2C323B] rounded-xs transition-colors active:scale-95 sm:w-7 sm:h-8"
          aria-label={`Increase weight for set ${set.setNumber}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Reps Controls */}
      <div className="flex min-h-11 items-center justify-center gap-1 bg-[#1C2128] px-1 py-1 rounded-xs border border-[#393E46] sm:col-span-3 sm:min-h-0">
        <button
          type="button"
          onClick={() => handleRepsChange(-1)}
          className="w-10 h-10 flex items-center justify-center text-[#948979] hover:text-[#DFD0B8] hover:bg-[#2C323B] rounded-xs transition-colors active:scale-95 sm:w-7 sm:h-8"
          aria-label={`Decrease reps for set ${set.setNumber}`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-xs font-bold w-10 text-center text-[#DFD0B8] sm:w-7">
          {set.reps}
        </span>
        <button
          type="button"
          onClick={() => handleRepsChange(1)}
          className="w-10 h-10 flex items-center justify-center text-[#948979] hover:text-[#DFD0B8] hover:bg-[#2C323B] rounded-xs transition-colors active:scale-95 sm:w-7 sm:h-8"
          aria-label={`Increase reps for set ${set.setNumber}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Complete Checkbox Button (44px min tap target) */}
      <div className="col-start-2 row-start-1 flex justify-end sm:col-span-1 sm:col-start-auto sm:row-start-auto">
        <button
          type="button"
          onClick={toggleCompleted}
          className={`w-11 h-11 rounded-xs border flex items-center justify-center transition-all sm:w-9 sm:h-9 ${
            isCompleted
              ? 'bg-[#677D6A] border-[#8DAA91] text-[#1A3636] shadow-[0_0_8px_rgba(103,125,106,0.5)]'
              : 'bg-[#2C323B] border-[#4D5460] text-[#948979] hover:border-[#DFD0B8]'
          }`}
          aria-label={isCompleted ? 'Mark set incomplete' : 'Mark set complete'}
        >
          <Check className={`w-5 h-5 stroke-[2.5] ${isCompleted ? 'scale-100' : 'scale-75 opacity-40'}`} />
        </button>
      </div>
    </div>
  );
};
