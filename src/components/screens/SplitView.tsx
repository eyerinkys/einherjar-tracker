'use client';

import React, { useState } from 'react';
import { SplitDay, SplitExercise } from '@/types';
import { getExercises } from '@/services/dataService';
import { RunePanel } from '@/components/ui/RunePanel';
import { RuneStave } from '@/components/ui/RuneStave';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Trash2, ChevronUp, ChevronDown, Edit2, Check, X, Layers } from 'lucide-react';

interface SplitViewProps {
  splitDays: SplitDay[];
  onUpdateSplitDays: (days: SplitDay[]) => void;
}

export const SplitView: React.FC<SplitViewProps> = ({ splitDays, onUpdateSplitDays }) => {
  const availableExercises = getExercises();
  const [selectedDayId, setSelectedDayId] = useState<string>(splitDays[0]?.id || '');
  const [editingDayName, setEditingDayName] = useState<boolean>(false);
  const [dayNameInput, setDayNameInput] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedAddExerciseId, setSelectedAddExerciseId] = useState<string>(availableExercises[0]?.id || '');
  const [targetSetsInput, setTargetSetsInput] = useState<number>(3);
  const [targetRepMinInput, setTargetRepMinInput] = useState<number>(8);
  const [targetRepMaxInput, setTargetRepMaxInput] = useState<number>(10);

  const currentDay = splitDays.find((d) => d.id === selectedDayId) || splitDays[0];

  const handleStartRename = () => {
    if (!currentDay) return;
    setDayNameInput(currentDay.name);
    setEditingDayName(true);
  };

  const handleSaveRename = () => {
    if (!currentDay || !dayNameInput.trim()) return;
    const updated = splitDays.map((d) => (d.id === currentDay.id ? { ...d, name: dayNameInput.trim() } : d));
    onUpdateSplitDays(updated);
    setEditingDayName(false);
  };

  const handleMoveExercise = (exerciseId: string, direction: 'up' | 'down') => {
    if (!currentDay) return;
    const list = [...currentDay.exercises];
    const idx = list.findIndex((e) => e.id === exerciseId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    // re-assign order numbers
    const reordered = list.map((item, index) => ({ ...item, order: index + 1 }));
    const updatedDays = splitDays.map((d) => (d.id === currentDay.id ? { ...d, exercises: reordered } : d));
    onUpdateSplitDays(updatedDays);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    if (!currentDay) return;
    const filtered = currentDay.exercises
      .filter((e) => e.id !== exerciseId)
      .map((item, index) => ({ ...item, order: index + 1 }));
    const updatedDays = splitDays.map((d) => (d.id === currentDay.id ? { ...d, exercises: filtered } : d));
    onUpdateSplitDays(updatedDays);
  };

  const handleAddExercise = () => {
    if (!currentDay) return;
    const exObj = availableExercises.find((e) => e.id === selectedAddExerciseId);
    if (!exObj) return;

    const newSplitExercise: SplitExercise = {
      id: `se-${Date.now()}`,
      exerciseId: exObj.id,
      exerciseName: exObj.name,
      muscleGroup: exObj.muscleGroup,
      targetSets: targetSetsInput,
      targetRepMin: targetRepMinInput,
      targetRepMax: targetRepMaxInput,
      order: currentDay.exercises.length + 1,
    };

    const updatedDays = splitDays.map((d) =>
      d.id === currentDay.id ? { ...d, exercises: [...d.exercises, newSplitExercise] } : d
    );
    onUpdateSplitDays(updatedDays);
    setShowAddModal(false);
  };

  const handleUpdateTarget = (exerciseId: string, sets: number, minReps: number, maxReps: number) => {
    if (!currentDay) return;
    const updated = currentDay.exercises.map((e) =>
      e.id === exerciseId
        ? { ...e, targetSets: sets, targetRepMin: minReps, targetRepMax: maxReps }
        : e
    );
    const updatedDays = splitDays.map((d) => (d.id === currentDay.id ? { ...d, exercises: updated } : d));
    onUpdateSplitDays(updatedDays);
  };

  if (!splitDays || splitDays.length === 0) {
    return (
      <EmptyState
        title="No Workout Split Configured"
        description="Create your first workout split day to begin organizing exercises."
        icon={<Layers className="w-6 h-6 text-[#677D6A]" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Split Days Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {splitDays.map((day) => {
          const isActive = day.id === selectedDayId;
          return (
            <button
              key={day.id}
              onClick={() => {
                setSelectedDayId(day.id);
                setEditingDayName(false);
              }}
              className={`px-4 py-2.5 rounded-xs font-mono text-xs tracking-wider whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-[#222831] border-[#677D6A] text-[#DFD0B8] shadow-[0_2px_12px_rgba(103,125,106,0.2)] font-bold'
                  : 'bg-[#1C2128] border-[#393E46] text-[#948979] hover:border-[#4D5460] hover:text-[#DFD0B8]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[#677D6A]">ᚦ</span>
                <span>{day.name}</span>
                <span className="text-[10px] bg-[#161A20] px-1.5 py-0.5 rounded-xs border border-[#393E46] text-[#948979]">
                  {day.exercises.length} Ex
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Selected Day Panel */}
      {currentDay && (
        <RunePanel variant="carved" className="p-4 sm:p-6 space-y-6">
          {/* Day Name Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#393E46]">
            <div>
              <div className="text-[11px] font-mono text-[#948979] uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rotate-45 bg-[#677D6A]" />
                <span>WORKOUT DAY STRUCTURE</span>
              </div>
              {editingDayName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={dayNameInput}
                    onChange={(e) => setDayNameInput(e.target.value)}
                    className="bg-[#161A20] border border-[#677D6A] px-3 py-1.5 font-mono text-sm text-[#DFD0B8] rounded-xs focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveRename}
                    className="p-1.5 bg-[#677D6A] text-[#1A3636] rounded-xs hover:bg-[#8DAA91]"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                  <button
                    onClick={() => setEditingDayName(false)}
                    className="p-1.5 bg-[#393E46] text-[#DFD0B8] rounded-xs hover:bg-[#4D5460]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="font-mono text-lg font-bold text-[#DFD0B8]">{currentDay.name}</h2>
                  <button
                    onClick={handleStartRename}
                    className="text-[#948979] hover:text-[#DFD0B8] transition-colors p-1"
                    title="Rename Day"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#40534C] hover:bg-[#677D6A] text-[#DFD0B8] font-mono text-xs uppercase tracking-wider rounded-xs border border-[#677D6A] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Exercise</span>
            </button>
          </div>

          {/* Exercise Stave List */}
          <div className="space-y-4">
            {currentDay.exercises.length === 0 ? (
              <EmptyState
                title="No Exercises Configured"
                description="This workout day has no exercises assigned yet. Click 'Add Exercise' above to include movements."
                actionLabel="Add First Exercise"
                onAction={() => setShowAddModal(true)}
              />
            ) : (
              currentDay.exercises.map((ex, idx) => (
                <RuneStave key={ex.id} active={true}>
                  <div className="bg-[#1C2128] border border-[#393E46] p-3.5 rounded-xs space-y-3 hover:border-[#4D5460] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[#948979] font-bold">
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          <h3 className="font-mono text-sm font-bold text-[#DFD0B8]">{ex.exerciseName}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#222831] border border-[#393E46] text-[#948979]">
                            {ex.muscleGroup}
                          </span>
                        </div>
                        {ex.notes && (
                          <p className="text-xs font-mono text-[#948979] italic mt-1 pl-6">
                            &quot;{ex.notes}&quot;
                          </p>
                        )}
                      </div>

                      {/* Reorder and Delete Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveExercise(ex.id, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-[#948979] hover:text-[#DFD0B8] disabled:opacity-30 disabled:pointer-events-none"
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveExercise(ex.id, 'down')}
                          disabled={idx === currentDay.exercises.length - 1}
                          className="p-1 text-[#948979] hover:text-[#DFD0B8] disabled:opacity-30 disabled:pointer-events-none"
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveExercise(ex.id)}
                          className="p-1 text-[#948979] hover:text-[#B88989] transition-colors ml-1"
                          title="Remove exercise"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Target Sets & Reps Editable Controls */}
                    <div className="flex items-center gap-4 pt-2 border-t border-[#2A303A] font-mono text-xs text-[#DFD0B8]">
                      <div className="flex items-center gap-2">
                        <span className="text-[#948979]">Target:</span>
                        <div className="flex items-center gap-1 bg-[#222831] px-2 py-1 border border-[#393E46] rounded-xs">
                          <input
                            type="number"
                            value={ex.targetSets}
                            onChange={(e) =>
                              handleUpdateTarget(ex.id, parseInt(e.target.value) || 1, ex.targetRepMin, ex.targetRepMax)
                            }
                            className="w-8 bg-transparent text-center text-[#DFD0B8] focus:outline-none"
                            min={1}
                            max={10}
                          />
                          <span className="text-[#948979]">sets</span>
                          <span className="text-[#677D6A] mx-1">×</span>
                          <input
                            type="number"
                            value={ex.targetRepMin}
                            onChange={(e) =>
                              handleUpdateTarget(ex.id, ex.targetSets, parseInt(e.target.value) || 1, ex.targetRepMax)
                            }
                            className="w-8 bg-transparent text-center text-[#DFD0B8] focus:outline-none"
                            min={1}
                          />
                          <span className="text-[#948979]">–</span>
                          <input
                            type="number"
                            value={ex.targetRepMax}
                            onChange={(e) =>
                              handleUpdateTarget(ex.id, ex.targetSets, ex.targetRepMin, parseInt(e.target.value) || 1)
                            }
                            className="w-8 bg-transparent text-center text-[#DFD0B8] focus:outline-none"
                            min={1}
                          />
                          <span className="text-[#948979]">reps</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </RuneStave>
              ))
            )}
          </div>
        </RunePanel>
      )}

      {/* Add Exercise Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1C2128] border border-[#677D6A] p-5 rounded-xs max-w-md w-full space-y-4 rune-panel">
            <div className="flex items-center justify-between border-b border-[#393E46] pb-3">
              <h3 className="font-mono text-base font-bold text-[#DFD0B8]">ADD EXERCISE TO SPLIT</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#948979] hover:text-[#DFD0B8]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[#948979] mb-1">Select Exercise</label>
                <select
                  value={selectedAddExerciseId}
                  onChange={(e) => setSelectedAddExerciseId(e.target.value)}
                  className="w-full bg-[#222831] border border-[#393E46] p-2 text-[#DFD0B8] rounded-xs focus:outline-none focus:border-[#677D6A]"
                >
                  {availableExercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.muscleGroup})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#948979] mb-1">Target Sets</label>
                  <input
                    type="number"
                    value={targetSetsInput}
                    onChange={(e) => setTargetSetsInput(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#222831] border border-[#393E46] p-2 text-center text-[#DFD0B8] rounded-xs"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-[#948979] mb-1">Min Reps</label>
                  <input
                    type="number"
                    value={targetRepMinInput}
                    onChange={(e) => setTargetRepMinInput(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#222831] border border-[#393E46] p-2 text-center text-[#DFD0B8] rounded-xs"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-[#948979] mb-1">Max Reps</label>
                  <input
                    type="number"
                    value={targetRepMaxInput}
                    onChange={(e) => setTargetRepMaxInput(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#222831] border border-[#393E46] p-2 text-center text-[#DFD0B8] rounded-xs"
                    min={1}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#393E46]">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-[#222831] border border-[#393E46] text-[#948979] font-mono text-xs rounded-xs hover:text-[#DFD0B8]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExercise}
                className="px-4 py-2 bg-[#40534C] border border-[#677D6A] text-[#DFD0B8] font-mono text-xs font-bold rounded-xs hover:bg-[#677D6A]"
              >
                Add to Day
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
