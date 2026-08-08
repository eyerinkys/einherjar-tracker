'use client';

import { useState } from 'react';
import { SplitDay, CompletedSession } from '@/types';
import { getSplitDays, getWorkoutHistory } from '@/services/dataService';
import { Header } from '@/components/layout/Header';
import { Navigation, NavTab } from '@/components/layout/Navigation';
import { SplitView } from '@/components/screens/SplitView';
import { TrainView } from '@/components/screens/TrainView';
import { HistoryView } from '@/components/screens/HistoryView';
import { ExerciseDetailView } from '@/components/screens/ExerciseDetailView';
import { AnalyticsView } from '@/components/screens/AnalyticsView';
import { BodyweightView } from '@/components/screens/BodyweightView';
import { PhotosView } from '@/components/screens/PhotosView';

interface ApplicationShellProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function ApplicationShell({ user }: ApplicationShellProps) {
  const [activeTab, setActiveTab] = useState<NavTab>('train');
  const [progressSubTab, setProgressSubTab] = useState<'exercise' | 'analytics'>('exercise');
  const [splitDays, setSplitDays] = useState<SplitDay[]>(() => getSplitDays());
  const [sessions, setSessions] = useState<CompletedSession[]>(() => getWorkoutHistory());

  const handleSaveSession = (newSession: CompletedSession) => {
    setSessions((currentSessions) => [newSession, ...currentSessions]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#161A20] text-[#DFD0B8]">
      <Header activeTab={activeTab} user={user} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-20 md:pb-6">
        <Navigation activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl overflow-y-auto">
          {activeTab === 'split' ? (
            <SplitView splitDays={splitDays} onUpdateSplitDays={setSplitDays} />
          ) : null}

          {activeTab === 'train' ? (
            <TrainView splitDays={splitDays} onSaveSession={handleSaveSession} />
          ) : null}

          {activeTab === 'history' ? <HistoryView sessions={sessions} /> : null}

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

              {progressSubTab === 'exercise' ? <ExerciseDetailView /> : <AnalyticsView />}
            </div>
          ) : null}

          {activeTab === 'bodyweight' ? <BodyweightView /> : null}
          {activeTab === 'photos' ? <PhotosView /> : null}
        </main>
      </div>
    </div>
  );
}
