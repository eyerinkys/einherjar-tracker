'use client';

import React from 'react';
import type { HomeDashboardDTO } from '../../types/home';
import { ConsistencyHeatmap } from '../ui/ConsistencyHeatmap';
import { RunePanel } from '../ui/RunePanel';
import { Flame, Calendar, Activity, Zap, Info } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';

interface HomeDashboardProps {
  data: HomeDashboardDTO;
  onConfigureSchedule?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ data, onConfigureSchedule }) => {
  const { metrics, heatmap, nextWorkout, recentActivity, progressionSnapshot, aiInsight } = data;

  if (!metrics.hasSchedule) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <EmptyState
          icon={<Calendar className="w-6 h-6 text-[#677D6A]" />}
          title="No Training Schedule"
          description="You haven't set up your training days yet. Set a schedule to track your consistency and build a streak."
          actionLabel="Configure Schedule"
          onAction={onConfigureSchedule}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Metrics Section */}
      <section>
        <h2 className="text-xl font-medium tracking-wide text-neutral-200 mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-emerald-500" />
          Consistency Engine
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <RunePanel className="flex flex-col items-center justify-center p-4">
            <span className="text-3xl font-bold text-neutral-100">{metrics.currentStreak}</span>
            <span className="text-xs text-neutral-400 uppercase tracking-wider mt-1">Current Streak</span>
          </RunePanel>
          <RunePanel className="flex flex-col items-center justify-center p-4">
            <span className="text-3xl font-bold text-neutral-100">{metrics.longestStreak}</span>
            <span className="text-xs text-neutral-400 uppercase tracking-wider mt-1">Longest Streak</span>
          </RunePanel>
          <RunePanel className="flex flex-col items-center justify-center p-4">
            <span className="text-3xl font-bold text-neutral-100">{metrics.weeklyAdherence}%</span>
            <span className="text-xs text-neutral-400 uppercase tracking-wider mt-1">7-Day Adherence</span>
          </RunePanel>
          <RunePanel className="flex flex-col items-center justify-center p-4">
            <span className="text-3xl font-bold text-neutral-100">{metrics.rollingAdherence}%</span>
            <span className="text-xs text-neutral-400 uppercase tracking-wider mt-1">28-Day Adherence</span>
          </RunePanel>
        </div>

        <RunePanel className="p-6 overflow-hidden">
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-widest mb-4">Training History (12 Weeks)</h3>
          <ConsistencyHeatmap data={heatmap} />
        </RunePanel>
      </section>

      {/* Next Workout & Recent Activity */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* Next Workout */}
        <RunePanel className="p-6 border-emerald-900/30">
          <h2 className="text-sm font-medium text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Up Next
          </h2>
          {nextWorkout ? (
            <div>
              <p className="text-2xl font-bold text-neutral-100 mb-2">{nextWorkout.splitDayName}</p>
              <p className="text-neutral-400 text-sm">
                {nextWorkout.isScheduledToday 
                  ? "Scheduled for today. Hit the gym."
                  : "You're not scheduled to train today. Rest and recover."}
              </p>
            </div>
          ) : (
            <p className="text-neutral-400 text-sm">Schedule information unavailable.</p>
          )}
        </RunePanel>

        {/* Recent Activity */}
        <RunePanel className="p-6">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Last Session
          </h2>
          {recentActivity ? (
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <p className="text-lg font-bold text-neutral-100">{recentActivity.workoutName}</p>
                <span className="text-xs text-neutral-500">{recentActivity.dateIso}</span>
              </div>
              {recentActivity.prs.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs text-yellow-500 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Records Broken
                  </p>
                  <ul className="space-y-1">
                    {recentActivity.prs.slice(0, 3).map((pr, i) => (
                      <li key={i} className="text-sm text-neutral-300 truncate">• {pr}</li>
                    ))}
                    {recentActivity.prs.length > 3 && (
                      <li className="text-xs text-neutral-500 mt-1">+{recentActivity.prs.length - 3} more</li>
                    )}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-neutral-400 mt-2">Completed without breaking new records.</p>
              )}
            </div>
          ) : (
            <p className="text-neutral-400 text-sm">No recent activity found.</p>
          )}
        </RunePanel>
      </section>

      {/* Progression & AI Insight */}
      <section>
        <RunePanel className="p-6 bg-neutral-900/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Progression Overview
              </h2>
              <div className="flex gap-6 mt-3">
                <div>
                  <span className="text-2xl font-bold text-emerald-400">{progressionSnapshot.readyCount}</span>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">Ready to Progress</p>
                </div>
                <div>
                  <span className="text-2xl font-bold text-red-400">{progressionSnapshot.stalledCount}</span>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">Stalled / Needs Attention</p>
                </div>
              </div>
            </div>
            
            {aiInsight && (
              <div className="md:max-w-xs p-4 rounded bg-neutral-800/80 border border-neutral-700/50 flex-shrink-0">
                <p className="text-xs text-emerald-500 uppercase tracking-widest mb-2 font-medium flex items-center gap-1">
                  <Info className="w-3 h-3" /> System Guidance
                </p>
                <p className="text-sm text-neutral-300 italic">"{aiInsight}"</p>
              </div>
            )}
          </div>
        </RunePanel>
      </section>
    </div>
  );
};
