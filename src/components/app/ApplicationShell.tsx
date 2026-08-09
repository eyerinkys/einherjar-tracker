'use client';

import { useState } from 'react';
import type { ActiveWorkout, BodyweightSummaryDTO, CompletedWorkoutHistoryPage, Exercise, ExerciseHistory, SplitDay, ProgressPhoto } from '@/types';
import { Header } from '@/components/layout/Header';
import { Navigation, NavTab } from '@/components/layout/Navigation';
import { SplitView } from '@/components/screens/SplitView';
import { TrainView } from '@/components/screens/TrainView';
import { HistoryView } from '@/components/screens/HistoryView';
import { ExerciseDetailView } from '@/components/screens/ExerciseDetailView';
import { AnalyticsView } from '@/components/screens/AnalyticsView';
import { BodyweightView } from '@/components/screens/BodyweightView';
import { PhotosView } from '@/components/screens/PhotosView';
import { HomeDashboard } from '@/components/screens/HomeDashboard';
import type { HomeDashboardDTO } from '@/types/home';

interface ApplicationShellProps {
  exercises: Exercise[];
  initialSplitDays: SplitDay[];
  initialActiveWorkout: ActiveWorkout | null;
  initialHistoryPage: CompletedWorkoutHistoryPage;
  initialExerciseHistory: ExerciseHistory | null;
  initialBodyweightSummary?: BodyweightSummaryDTO;
  initialPhotos?: ProgressPhoto[];
  initialHomeDashboardData: HomeDashboardDTO;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function ApplicationShell({ exercises, initialSplitDays, initialActiveWorkout, initialHistoryPage, initialExerciseHistory, initialBodyweightSummary, initialPhotos, initialHomeDashboardData, user }: ApplicationShellProps) {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [splitPending, setSplitPending] = useState(false);
  const [workoutPending, setWorkoutPending] = useState(false);
  const [workoutState, setWorkoutState] = useState(() => ({ source: initialActiveWorkout, value: initialActiveWorkout }));
  const activeWorkout = workoutState.source === initialActiveWorkout ? workoutState.value : initialActiveWorkout;
  const [progressSubTab, setProgressSubTab] = useState<'exercise' | 'analytics'>('exercise');
  const [splitState, setSplitState] = useState(() => ({
    source: initialSplitDays,
    value: initialSplitDays,
  }));
  const splitDays =
    splitState.source === initialSplitDays ? splitState.value : initialSplitDays;
  const handleUpdateSplitDays = (days: SplitDay[]) => {
    setSplitState({ source: initialSplitDays, value: days });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#161A20] text-[#DFD0B8]">
      <Header activeTab={activeTab} user={user} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-20 md:pb-6">
        <Navigation activeTab={activeTab} disabled={splitPending || workoutPending} onSelectTab={setActiveTab} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl overflow-y-auto">
          {activeTab === 'home' ? (
            <HomeDashboard data={initialHomeDashboardData} />
          ) : null}

          {activeTab === 'split' ? (
            <SplitView
              availableExercises={exercises}
              onPendingChange={setSplitPending}
              splitDays={splitDays}
              onUpdateSplitDays={handleUpdateSplitDays}
            />
          ) : null}

          {activeTab === 'train' ? (
            <TrainView splitDays={splitDays} activeWorkout={activeWorkout} onWorkoutChange={(value) => setWorkoutState({ source: initialActiveWorkout, value })} onPendingChange={setWorkoutPending} />
          ) : null}

          {activeTab === 'history' ? <HistoryView initialHistoryPage={initialHistoryPage} /> : null}

          {activeTab === 'progress' ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-[#393E46] pb-2 font-mono text-xs">
                <button
                  onClick={() => setProgressSubTab('exercise')}
                  className={`min-h-11 px-4 py-2 rounded-xs uppercase tracking-wider transition-all border ${
                    progressSubTab === 'exercise'
                      ? 'bg-[#222831] border-[#677D6A] text-[#DFD0B8] font-bold'
                      : 'bg-transparent border-transparent text-[#948979] hover:text-[#DFD0B8]'
                  }`}
                >
                  Exercise Detail & AI Insights
                </button>
                <button
                  onClick={() => setProgressSubTab('analytics')}
                  className={`min-h-11 px-4 py-2 rounded-xs uppercase tracking-wider transition-all border ${
                    progressSubTab === 'analytics'
                      ? 'bg-[#222831] border-[#677D6A] text-[#DFD0B8] font-bold'
                      : 'bg-transparent border-transparent text-[#948979] hover:text-[#DFD0B8]'
                  }`}
                >
                  Overall Analytics
                </button>
              </div>

              {progressSubTab === 'exercise' ? (
                <ExerciseDetailView exercises={exercises} initialExerciseHistory={initialExerciseHistory} />
              ) : (
                <AnalyticsView />
              )}
            </div>
          ) : null}

          {activeTab === 'bodyweight' ? <BodyweightView initialSummary={initialBodyweightSummary} /> : null}
          {activeTab === 'photos' ? <PhotosView initialPhotos={initialPhotos} /> : null}
        </main>
      </div>
    </div>
  );
}
