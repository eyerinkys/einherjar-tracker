'use client';

import React, { useRef, useState } from 'react';
import { getExerciseWorkoutHistory } from '@/actions/history';
import {
  getExerciseProgression,
  getAIInsightForExercise,
  getAchievedPRs,
} from '@/services/dataService';
import type { Exercise, ExerciseHistory } from '@/types';
import { RunePanel } from '@/components/ui/RunePanel';
import { RuneBadge } from '@/components/ui/RuneBadge';
import { InsightEye } from '@/components/ui/InsightEye';
import { EmptyState } from '@/components/ui/EmptyState';
import { Trophy, TrendingUp, Sparkles, History, Calculator, Cpu, RotateCcw } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface ExerciseDetailViewProps {
  exercises: Exercise[];
  initialExerciseHistory: ExerciseHistory | null;
}

const localDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const numberFormatter = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 });

function formatLoad(weight: number | null, reps: number): string {
  return `${weight === null ? 'Bodyweight' : `${numberFormatter.format(weight)}kg`} × ${reps}`;
}

const LEGACY_PROGRESS_ID_BY_BUILT_IN_ID: Readonly<Record<string, string>> = {
  '00000000-0000-4000-8000-000000000001': 'ex-1',
  '00000000-0000-4000-8000-000000000002': 'ex-2',
  '00000000-0000-4000-8000-000000000003': 'ex-3',
  '00000000-0000-4000-8000-000000000004': 'ex-4',
  '00000000-0000-4000-8000-000000000005': 'ex-5',
  '00000000-0000-4000-8000-000000000006': 'ex-6',
  '00000000-0000-4000-8000-000000000007': 'ex-7',
  '00000000-0000-4000-8000-000000000008': 'ex-8',
  '00000000-0000-4000-8000-000000000009': 'ex-9',
};

export const ExerciseDetailView: React.FC<ExerciseDetailViewProps> = ({ exercises, initialExerciseHistory }) => {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(exercises[0]?.id || '');
  const [historyState, setHistoryState] = useState(() => ({
    source: initialExerciseHistory,
    value: initialExerciseHistory,
  }));
  const settledHistory = historyState.source === initialExerciseHistory
    ? historyState.value
    : initialExerciseHistory;
  const [historyRequest, setHistoryRequest] = useState<{
    exerciseId: string;
    status: 'idle' | 'loading' | 'error' | 'settled';
  }>({ exerciseId: exercises[0]?.id ?? '', status: 'idle' });
  const requestId = useRef(0);

  const currentExercise = exercises.find((e) => e.id === selectedExerciseId) || exercises[0];
  const progressExerciseId =
    LEGACY_PROGRESS_ID_BY_BUILT_IN_ID[currentExercise?.id ?? ''] ?? currentExercise?.id ?? '';
  const chartData = getExerciseProgression(progressExerciseId);
  const aiInsight = getAIInsightForExercise(progressExerciseId);
  const achievedPRs = getAchievedPRs().filter((pr) => pr.exerciseId === progressExerciseId);

  const achievedPRWeight = chartData.length > 0 ? Math.max(...chartData.map((d) => d.weight), 0) : (achievedPRs[0]?.weight || 0);
  const max1RM = chartData.length > 0 ? Math.max(...chartData.map((d) => d.estimated1RM), 0) : (achievedPRs[0]?.estimated1RM || 0);
  const displayedHistory = settledHistory?.exercise.id === currentExercise?.id
    ? settledHistory
    : null;

  const loadExerciseHistory = async (exerciseId: string) => {
    const currentRequestId = ++requestId.current;
    setHistoryRequest({ exerciseId, status: 'loading' });
    try {
      const result = await getExerciseWorkoutHistory({ exerciseId });
      if (currentRequestId !== requestId.current) return;
      if (!result.ok || result.data.exercise.id !== exerciseId) {
        setHistoryRequest({ exerciseId, status: 'error' });
        return;
      }
      setHistoryState({ source: initialExerciseHistory, value: result.data });
      setHistoryRequest({ exerciseId, status: 'settled' });
    } catch {
      if (currentRequestId === requestId.current) {
        setHistoryRequest({ exerciseId, status: 'error' });
      }
    }
  };

  const selectExercise = (exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
    void loadExerciseHistory(exerciseId);
  };

  return (
    <div className="space-y-6">
      {/* Exercise Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1C2128] p-4 rounded-xs border border-[#393E46]">
        <div className="w-full min-w-0 sm:w-auto">
          <label htmlFor="progress-exercise" className="block text-[10px] font-mono text-[#948979] uppercase tracking-widest mb-1">
            EXERCISE DETAILED PROGRESSION ANALYSIS
          </label>
          <select
            id="progress-exercise"
            value={currentExercise?.id ?? ''}
            onChange={(event) => selectExercise(event.target.value)}
            className="min-h-11 w-full min-w-0 max-w-full rounded-xs border border-[#677D6A] bg-[#222831] px-3 font-mono text-base font-bold text-[#DFD0B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8DAA91] sm:w-auto"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
          {currentExercise && (
            <p className="mt-2 font-mono text-xs text-[#948979]">
              <span className="uppercase tracking-wider">Muscle group: </span>
              <span className="text-[#DFD0B8]">{currentExercise.muscleGroup}</span>
            </p>
          )}
        </div>

        {aiInsight && <RuneBadge status={aiInsight.status} />}
      </div>

      {chartData.length === 0 && !aiInsight ? (
        <EmptyState
          title={`No Progression Data for ${currentExercise?.name || 'Exercise'}`}
          description="Insufficient logged sessions to compute objective progressive overload indicators or generate AI insights."
          icon={<TrendingUp className="w-6 h-6 text-[#677D6A]" />}
        />
      ) : (
        <>
          {/* PR Cards Grid (Achieved PR vs Probable Next PR) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Achieved PR (Historical Fact) */}
            <RunePanel variant="carved" className="p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between border-b border-[#393E46] pb-2">
                <div className="flex items-center gap-2 font-mono text-xs text-[#C9A96E]">
                  <Trophy className="w-4 h-4" />
                  <span className="font-bold uppercase tracking-wider">Achieved Record (Fact)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#3A3326] border border-[#C9A96E] text-[#DFD0B8]">
                  LOGGED RECORD
                </span>
              </div>

              <div className="pt-2 flex items-baseline justify-between font-mono">
                <div>
                  <span className="text-3xl font-bold text-[#DFD0B8]">{achievedPRWeight}</span>
                  <span className="text-sm text-[#948979] ml-1">kg</span>
                </div>
                <div className="text-right text-xs text-[#948979]">
                  <div>Estimated 1RM: <strong className="text-[#DFD0B8]">{max1RM} kg</strong></div>
                  <div className="text-[11px] text-[#635B50]">Inscribed in Ledger</div>
                </div>
              </div>
            </RunePanel>

            {/* Probable Next PR (AI Prediction - Visually Distinct) */}
            <RunePanel variant="subtle" className="p-4 sm:p-5 space-y-2 border-dashed border-[#677D6A]">
              <div className="flex items-center justify-between border-b border-[#393E46] pb-2">
                <div className="flex items-center gap-2 font-mono text-xs text-[#8DAA91]">
                  <Sparkles className="w-4 h-4 text-[#8DAA91]" />
                  <span className="font-bold uppercase tracking-wider">Probable Next PR (Prediction)</span>
                </div>
                {aiInsight && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#1A3636] border border-[#677D6A] text-[#8DAA91] uppercase">
                    {aiInsight.confidence} CONFIDENCE
                  </span>
                )}
              </div>

              <div className="pt-2 flex items-baseline justify-between font-mono">
                <div>
                  <span className="text-3xl font-bold text-[#8DAA91]">
                    {aiInsight?.probableNextPR.weight || achievedPRWeight}
                  </span>
                  <span className="text-sm text-[#677D6A] ml-1">kg</span>
                  <span className="text-xs text-[#948979] ml-2">× {aiInsight?.probableNextPR.reps} reps</span>
                </div>
                <div className="text-right text-xs text-[#948979]">
                  <div>Predicted Step: <strong className="text-[#8DAA91]">+{ (aiInsight?.nextWeight || 0) - achievedPRWeight } kg</strong></div>
                  <div className="text-[11px] text-[#677D6A] font-semibold">NOT YET ACHIEVED</div>
                </div>
              </div>
            </RunePanel>
          </div>

          {/* Odin's Eye AI Insight Box */}
          {aiInsight && (
            <RunePanel variant="carved" className="p-5 space-y-4 border-[#677D6A]/80 shadow-[0_4px_24px_rgba(26,54,54,0.3)]">
              <div className="flex items-center gap-3 border-b border-[#393E46] pb-3">
                <InsightEye size={36} />
                <div>
                  <h3 className="font-mono text-sm font-bold text-[#DFD0B8] tracking-wider uppercase">
                    ODIN INSIGHT & OVERLOAD GUIDANCE
                  </h3>
                  <p className="font-mono text-[11px] text-[#948979]">
                    Structured training context interpretation
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                {/* Section 1: Objective Calculated Progression */}
                <div className="bg-[#161A20] p-3 rounded-xs border border-[#393E46] space-y-2">
                  <div className="flex items-center gap-1.5 text-[#C9A96E] font-bold text-[11px] uppercase border-b border-[#2C323B] pb-1">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>1. Calculated Progression</span>
                  </div>
                  <div className="text-[#DFD0B8] leading-relaxed">
                    {aiInsight.comparisonText}
                  </div>
                  <div className="text-[11px] text-[#948979] pt-1">
                    <div>Last: <span className="text-[#DFD0B8]">{aiInsight.lastSessionReps}</span></div>
                    <div>Prev: <span className="text-[#DFD0B8]">{aiInsight.previousSessionReps}</span></div>
                  </div>
                </div>

                {/* Section 2: AI-Assisted Recommendation */}
                <div className="bg-[#161A20] p-3 rounded-xs border border-[#393E46] space-y-2">
                  <div className="flex items-center gap-1.5 text-[#8DAA91] font-bold text-[11px] uppercase border-b border-[#2C323B] pb-1">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>2. AI Recommendation</span>
                  </div>
                  <div className="text-[#8DAA91] font-semibold leading-relaxed">
                    &quot;{aiInsight.guidance}&quot;
                  </div>
                  <div className="text-[11px] text-[#948979] pt-1">
                    <span className="text-[#DFD0B8] font-semibold">Why: </span>
                    {aiInsight.reasoning}
                  </div>
                </div>

                {/* Section 3: Predicted Future PR */}
                <div className="bg-[#161A20] p-3 rounded-xs border border-dashed border-[#677D6A] space-y-2">
                  <div className="flex items-center gap-1.5 text-[#8DAA91] font-bold text-[11px] uppercase border-b border-[#2C323B] pb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>3. Predicted Future PR</span>
                  </div>
                  <div className="text-xl font-bold text-[#8DAA91]">
                    {aiInsight.probableNextPR.weight} kg × {aiInsight.probableNextPR.reps} reps
                  </div>
                  <p className="text-[10px] text-[#948979] italic leading-tight">
                    *Prediction based on working set rep velocity and calculated estimated 1RM trajectory.
                  </p>
                </div>
              </div>
            </RunePanel>
          )}

          {/* Progression Recharts Chart */}
          {chartData.length > 0 && (
            <RunePanel variant="carved" className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#393E46] pb-3">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#DFD0B8]">
                  <TrendingUp className="w-4 h-4 text-[#677D6A]" />
                  <span className="uppercase">Estimated 1RM & Weight Progression Trend</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-[#8DAA91]">
                    <span className="w-2.5 h-2.5 bg-[#677D6A] inline-block" /> 1RM (kg)
                  </span>
                  <span className="flex items-center gap-1.5 text-[#DFD0B8]">
                    <span className="w-2.5 h-2.5 bg-[#DFD0B8] inline-block" /> Working Load (kg)
                  </span>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="color1RM" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#677D6A" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#677D6A" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#393E46" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#948979" fontSize={11} fontFamily="monospace" />
                    <YAxis stroke="#948979" fontSize={11} fontFamily="monospace" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1C2128',
                        borderColor: '#4D5460',
                        color: '#DFD0B8',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                      }}
                    />
                    <Area type="monotone" dataKey="estimated1RM" stroke="#677D6A" strokeWidth={2} fillOpacity={1} fill="url(#color1RM)" name="Estimated 1RM" />
                    <Area type="monotone" dataKey="weight" stroke="#DFD0B8" strokeWidth={2} fillOpacity={0} name="Working Weight" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </RunePanel>
          )}
        </>
      )}

      {currentExercise ? (
        <section className="min-w-0 space-y-4" aria-labelledby="exercise-history-heading">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-[#393E46] pb-3">
            <h3 id="exercise-history-heading" className="flex min-w-0 items-center gap-2 break-words font-mono text-xs font-bold uppercase text-[#DFD0B8]">
              <History className="h-4 w-4 shrink-0 text-[#677D6A]" aria-hidden="true" />
              Historical Session Ledger
            </h3>
            {displayedHistory ? <span className="font-mono text-[10px] text-[#948979]">{displayedHistory.sessions.length} completed sessions</span> : null}
          </div>

          {historyRequest.exerciseId === currentExercise.id && historyRequest.status === 'loading' ? (
            <div role="status" className="rounded-xs border border-[#393E46] bg-[#1C2128] p-4 font-mono text-xs text-[#948979]">
              Loading completed history for {currentExercise.name}…
            </div>
          ) : historyRequest.exerciseId === currentExercise.id && historyRequest.status === 'error' ? (
            <div role="alert" className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xs border border-[#7A4943] bg-[#2B2022] p-3 font-mono text-xs text-[#D99B92]">
              <span className="break-words">Unable to load history for {currentExercise.name}. Try again.</span>
              <button type="button" onClick={() => void loadExerciseHistory(currentExercise.id)} className="min-h-11 px-3 font-bold uppercase text-[#DFD0B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8DAA91]">
                <RotateCcw className="mr-1 inline h-4 w-4" aria-hidden="true" /> Retry {currentExercise.name} history
              </button>
            </div>
          ) : displayedHistory?.sessions.length === 0 ? (
            <EmptyState
              title={`No Completed History for ${currentExercise.name}`}
              description="Complete a workout with this exercise to add its recorded sets to the historical ledger."
              icon={<History className="h-6 w-6 text-[#677D6A]" />}
            />
          ) : displayedHistory ? (
            <div className="min-w-0 space-y-3">
              {displayedHistory.sessions.map((session) => (
                <RunePanel key={session.sessionExerciseId} variant="carved" className="min-w-0 space-y-3 p-4 sm:p-5">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 border-b border-[#393E46] pb-2 font-mono text-xs">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-[#DFD0B8]">{session.splitDayName}</p>
                      <p className="mt-1 text-[#948979]">{localDateFormatter.format(new Date(session.completedAt))} · {session.durationMinutes} mins</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-[#948979]">Target: {session.targetSets}×{session.targetRepMin}–{session.targetRepMax}</span>
                  </div>
                  <p className="break-words font-mono text-xs font-bold text-[#DFD0B8]">{session.exerciseName}</p>
                  {session.notes ? <p className="break-words font-mono text-xs text-[#948979]">{session.notes}</p> : null}
                  <div className="flex min-w-0 flex-wrap gap-2 font-mono text-xs">
                    {session.sets.map((set) => (
                      <span key={set.id} className="rounded-xs border border-[#393E46] bg-[#222831] px-2 py-1 text-[#DFD0B8]">
                        Set {set.setNumber}: <strong className="tabular-nums text-[#8DAA91]">{formatLoad(set.weight, set.reps)}</strong>
                      </span>
                    ))}
                  </div>
                </RunePanel>
              ))}
            </div>
          ) : (
            <div role="status" className="rounded-xs border border-[#393E46] bg-[#1C2128] p-4 font-mono text-xs text-[#948979]">
              Loading completed history for {currentExercise.name}…
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
};
