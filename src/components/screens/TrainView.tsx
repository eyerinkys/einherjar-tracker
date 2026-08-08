'use client';

import React, { useState } from 'react';
import { SplitDay, SessionExerciseLog, WorkoutSet, CompletedSession } from '@/types';
import { getWorkoutHistory, getAIInsights } from '@/services/dataService';
import { RunePanel } from '@/components/ui/RunePanel';
import { SetEntry } from '@/components/ui/SetEntry';
import { RuneBadge } from '@/components/ui/RuneBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { CheckCircle2, Plus, Sparkles, Save, Play } from 'lucide-react';

interface TrainViewProps {
  splitDays: SplitDay[];
  onSaveSession: (session: CompletedSession) => void;
}

export const TrainView: React.FC<TrainViewProps> = ({ splitDays, onSaveSession }) => {
  const workoutHistory = getWorkoutHistory();
  const aiInsights = getAIInsights();

  const [selectedDayId, setSelectedDayId] = useState<string>(splitDays[0]?.id || '');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const currentSplitDay = splitDays.find((d) => d.id === selectedDayId) || splitDays[0];

  // Helper to build active exercise logs from split day definition
  const buildActiveLogs = (dayObj?: SplitDay): SessionExerciseLog[] => {
    if (!dayObj) return [];
    return dayObj.exercises.map((ex) => {
      // Find past performance from historical sessions
      const pastLog = workoutHistory
        .flatMap((s) => s.exercises)
        .find((pe) => pe.exerciseId === ex.exerciseId);
      const prevPerf = pastLog ? pastLog.sets.map((s) => ({ weight: s.weight, reps: s.reps })) : [];

      const initialWeight = prevPerf[0]?.weight || 50;
      const initialReps = ex.targetRepMin || 8;

      const initialSets: WorkoutSet[] = Array.from({ length: ex.targetSets }).map((_, i) => ({
        setNumber: i + 1,
        weight: prevPerf[i]?.weight || initialWeight,
        reps: prevPerf[i]?.reps || initialReps,
        isCompleted: false,
      }));

      return {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        targetSets: ex.targetSets,
        targetRepMin: ex.targetRepMin,
        targetRepMax: ex.targetRepMax,
        previousPerformance: prevPerf,
        sets: initialSets,
      };
    });
  };

  const [activeExercises, setActiveExercises] = useState<SessionExerciseLog[]>(() =>
    buildActiveLogs(currentSplitDay)
  );

  const handleSelectDay = (dayId: string) => {
    setSelectedDayId(dayId);
    const dayObj = splitDays.find((d) => d.id === dayId);
    setActiveExercises(buildActiveLogs(dayObj));
    setIsFinished(false);
  };

  const handleUpdateSet = (exerciseId: string, setIndex: number, updatedSet: WorkoutSet) => {
    setActiveExercises((prev) =>
      prev.map((exLog) => {
        if (exLog.exerciseId !== exerciseId) return exLog;
        const newSets = [...exLog.sets];
        newSets[setIndex] = updatedSet;
        return { ...exLog, sets: newSets };
      })
    );
  };

  const handleAddSet = (exerciseId: string) => {
    setActiveExercises((prev) =>
      prev.map((exLog) => {
        if (exLog.exerciseId !== exerciseId) return exLog;
        const lastSet = exLog.sets[exLog.sets.length - 1];
        const newSet: WorkoutSet = {
          setNumber: exLog.sets.length + 1,
          weight: lastSet ? lastSet.weight : 50,
          reps: lastSet ? lastSet.reps : 8,
          isCompleted: false,
        };
        return { ...exLog, sets: [...exLog.sets, newSet] };
      })
    );
  };

  const handleFinishWorkout = () => {
    if (!currentSplitDay) return;
    const completed: CompletedSession = {
      id: `sess-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      splitDayId: currentSplitDay.id,
      splitDayName: currentSplitDay.name,
      durationMinutes: 45,
      notes: sessionNotes.trim() || undefined,
      exercises: activeExercises,
    };
    onSaveSession(completed);
    setIsFinished(true);
  };

  if (!splitDays || splitDays.length === 0) {
    return (
      <EmptyState
        title="No Workout Split Found"
        description="Please configure a workout split first before starting an active training session."
        icon={<Play className="w-6 h-6 text-[#677D6A]" />}
      />
    );
  }

  const totalSetsCount = activeExercises.reduce((acc, e) => acc + e.sets.length, 0);
  const completedSetsCount = activeExercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.isCompleted).length,
    0
  );
  const completionPercentage = Math.round((completedSetsCount / (totalSetsCount || 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Day Selector & Progress Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1C2128] p-4 rounded-xs border border-[#393E46]">
        <div>
          <div className="text-[10px] font-mono text-[#948979] uppercase tracking-widest flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rotate-45 bg-[#677D6A]" />
            <span>SESSION IN PROGRESS</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              id="workout-day"
              value={selectedDayId}
              onChange={(e) => handleSelectDay(e.target.value)}
              aria-label="Select workout day"
              className="bg-[#222831] border border-[#677D6A] text-[#DFD0B8] font-mono text-sm font-bold px-3 py-1.5 rounded-xs focus:outline-none"
            >
              {splitDays.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Completion Status Bar */}
        <div className="flex items-center gap-4">
          <div className="text-right font-mono text-xs">
            <div className="text-[#DFD0B8] font-bold">
              {completedSetsCount} / {totalSetsCount} Sets Logged
            </div>
            <div className="text-[#948979] text-[11px]">{completionPercentage}% Completed</div>
          </div>
          <div
            className="w-16 h-2 bg-[#222831] rounded-full border border-[#393E46] overflow-hidden"
            role="progressbar"
            aria-label="Workout completion"
            aria-valuemin={0}
            aria-valuemax={totalSetsCount}
            aria-valuenow={completedSetsCount}
            aria-valuetext={`${completedSetsCount} of ${totalSetsCount} sets logged`}
          >
            <div
              className="h-full bg-[#677D6A] transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {isFinished ? (
        <RunePanel variant="carved" className="p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-[#1A3636] border border-[#677D6A] rounded-xs mx-auto flex items-center justify-center text-[#8DAA91]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="font-mono text-xl font-bold text-[#DFD0B8]">WORKOUT SESSION SAVED</h2>
          <p className="font-mono text-xs text-[#948979] max-w-md mx-auto">
            Session data inscribed to training ledger. Exercise histories, progression metrics, and PR tracking updated.
          </p>
          <button
            onClick={() => setIsFinished(false)}
            className="px-6 py-2.5 bg-[#40534C] hover:bg-[#677D6A] text-[#DFD0B8] font-mono text-xs font-bold uppercase rounded-xs border border-[#677D6A] transition-all"
          >
            Start New Session
          </button>
        </RunePanel>
      ) : activeExercises.length === 0 ? (
        <EmptyState
          title="No Exercises In Selected Workout Day"
          description="Add exercises to this workout day in the Split view to log your sets."
        />
      ) : (
        <>
          {/* Active Exercises List */}
          <div className="space-y-6">
            {activeExercises.map((exLog, exIdx) => {
              const insight = aiInsights[exLog.exerciseId];
              return (
                <RunePanel key={exLog.exerciseId} variant="carved" className="p-4 sm:p-5 space-y-4">
                  {/* Exercise Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#393E46]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#677D6A] font-bold">
                          {(exIdx + 1).toString().padStart(2, '0')}
                        </span>
                        <h3 className="font-mono text-base font-bold text-[#DFD0B8]">{exLog.exerciseName}</h3>
                        {insight && <RuneBadge status={insight.status} compact />}
                      </div>
                      <div className="text-xs font-mono text-[#948979] mt-0.5">
                        Target:{' '}
                        <span className="text-[#DFD0B8]">
                          {exLog.targetSets} × {exLog.targetRepMin}–{exLog.targetRepMax} reps
                        </span>
                      </div>
                    </div>

                    {/* Previous Session Performance Callout */}
                    <div className="bg-[#161A20] px-3 py-1.5 rounded-xs border border-[#393E46] text-xs font-mono">
                      <span className="text-[#948979] mr-2">LAST SESSION:</span>
                      {exLog.previousPerformance.length > 0 ? (
                        <span className="text-[#DFD0B8] font-semibold">
                          {exLog.previousPerformance.map((p) => `${p.weight}k×${p.reps}`).join(' | ')}
                        </span>
                      ) : (
                        <span className="text-[#635B50] italic">No previous logs</span>
                      )}
                    </div>
                  </div>

                  {/* Compact Progression & Guidance Bar */}
                  {insight && (
                    <div className="bg-[#181D24] p-3 rounded-xs border border-[#393E46] space-y-2 font-mono text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2 border-b border-[#2C323B]">
                        <div>
                          <span className="text-[10px] text-[#948979] uppercase block">PREVIOUS COMPARISON</span>
                          <span className="text-[#DFD0B8] font-semibold">{insight.comparisonText}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#948979] uppercase block">RECOMMENDED NEXT STEP</span>
                          <span className="text-[#8DAA91] font-semibold">{insight.guidance}</span>
                        </div>
                        <div className="flex flex-col justify-center items-start sm:items-end">
                          <span className="text-[10px] text-[#948979] uppercase block">LIKELY NEXT PR (PREDICTION)</span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#1A3636]/60 border border-dashed border-[#677D6A] text-[#8DAA91] font-bold text-[11px] rounded-xs mt-0.5">
                            <Sparkles className="w-3 h-3 text-[#8DAA91]" />
                            {insight.probableNextPR.weight} kg × {insight.probableNextPR.reps}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ledger Set Entry Rows */}
                  <div className="space-y-2">
                    {exLog.sets.map((setObj, setIdx) => (
                      <SetEntry
                        key={setIdx}
                        set={setObj}
                        previousSet={exLog.previousPerformance[setIdx]}
                        onUpdateSet={(updated) => handleUpdateSet(exLog.exerciseId, setIdx, updated)}
                      />
                    ))}
                  </div>

                  {/* Add Extra Set Button */}
                  <div className="pt-2 flex justify-start">
                    <button
                      type="button"
                      onClick={() => handleAddSet(exLog.exerciseId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#222831] hover:bg-[#2C323B] text-[#948979] hover:text-[#DFD0B8] font-mono text-xs rounded-xs border border-[#393E46] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Set</span>
                    </button>
                  </div>
                </RunePanel>
              );
            })}
          </div>

          {/* Session Notes & Save Footer */}
          <RunePanel variant="subtle" className="p-4 space-y-3">
            <label htmlFor="workout-notes" className="block text-xs font-mono text-[#948979] uppercase tracking-wider">
              Workout Notes (Optional)
            </label>
            <textarea
              id="workout-notes"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Record energy levels, RPE, equipment settings, or grip adjustments..."
              className="w-full bg-[#161A20] border border-[#393E46] p-3 text-xs font-mono text-[#DFD0B8] placeholder-[#635B50] rounded-xs focus:outline-none focus:border-[#677D6A] h-20 resize-none"
            />

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleFinishWorkout}
                className="w-full sm:w-auto px-8 py-3 bg-[#40534C] hover:bg-[#677D6A] text-[#DFD0B8] font-mono text-xs font-bold uppercase tracking-widest rounded-xs border border-[#677D6A] shadow-[0_4px_16px_rgba(26,54,54,0.4)] flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <Save className="w-4 h-4" />
                <span>Save Completed Workout</span>
              </button>
            </div>
          </RunePanel>
        </>
      )}
    </div>
  );
};
