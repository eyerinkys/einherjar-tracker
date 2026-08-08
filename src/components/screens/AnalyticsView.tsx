'use client';

import React from 'react';
import { getAIInsights, getAchievedPRs } from '@/services/dataService';
import { RunePanel } from '@/components/ui/RunePanel';
import { RuneBadge } from '@/components/ui/RuneBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TrendingUp, AlertOctagon, ArrowUpRight, Trophy, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const insightsRecord = getAIInsights();
  const insightsList = Object.values(insightsRecord);
  
  const readyList = insightsList.filter((i) => i.status === 'READY_TO_INCREASE_LOAD');
  const progressingList = insightsList.filter((i) => i.status === 'PROGRESSING' || i.status === 'ADAPTING_TO_NEW_LOAD');
  const stalledList = insightsList.filter((i) => i.status === 'STALLED' || i.status === 'REGRESSING');

  const achievedPRs = getAchievedPRs();

  if (insightsList.length === 0 && achievedPRs.length === 0) {
    return (
      <EmptyState
        title="No Progressive Overload Analytics"
        description="Log workout sessions to accumulate historical training data and unlock overload analytics."
        icon={<TrendingUp className="w-6 h-6 text-[#677D6A]" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="pb-3 border-b border-[#393E46]">
        <h2 className="font-mono text-base font-bold text-[#DFD0B8] uppercase tracking-wider">
          PROGRESSIVE OVERLOAD & ATHLETE LEDGER
        </h2>
        <p className="font-mono text-xs text-[#948979]">
          Objective performance status derived from historical training logs
        </p>
      </div>

      {/* Summary Grid — Useful overload indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RunePanel variant="carved" className="p-4 space-y-1">
          <div className="flex items-center justify-between text-[#8DAA91]">
            <span className="font-mono text-xs uppercase font-bold">Progressing</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#DFD0B8]">{progressingList.length}</div>
          <p className="font-mono text-[10px] text-[#948979]">Exercises with rep/load gain</p>
        </RunePanel>

        <RunePanel variant="carved" className="p-4 space-y-1">
          <div className="flex items-center justify-between text-[#8DAA91]">
            <span className="font-mono text-xs uppercase font-bold">Ready for Load +</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#8DAA91]">{readyList.length}</div>
          <p className="font-mono text-[10px] text-[#948979]">Met top rep range target</p>
        </RunePanel>

        <RunePanel variant="carved" className="p-4 space-y-1">
          <div className="flex items-center justify-between text-[#948979]">
            <span className="font-mono text-xs uppercase font-bold">Stalled / Regressing</span>
            <AlertOctagon className="w-4 h-4 text-[#B88989]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#DFD0B8]">{stalledList.length}</div>
          <p className="font-mono text-[10px] text-[#948979]">Flat or reduced reps over 2+ sessions</p>
        </RunePanel>

        <RunePanel variant="carved" className="p-4 space-y-1">
          <div className="flex items-center justify-between text-[#C9A96E]">
            <span className="font-mono text-xs uppercase font-bold">Recent PRs</span>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#C9A96E]">{achievedPRs.length}</div>
          <p className="font-mono text-[10px] text-[#948979]">Logged in training history</p>
        </RunePanel>
      </div>

      {/* Exercises Ready for Load Increase */}
      {readyList.length > 0 && (
        <RunePanel variant="carved" className="p-5 space-y-4 border-[#677D6A]">
          <div className="flex items-center gap-2 border-b border-[#393E46] pb-2 text-[#8DAA91]">
            <Zap className="w-4 h-4" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#DFD0B8]">
              Ready for Load Increase ({readyList.length})
            </h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {readyList.map((item) => (
              <div
                key={item.exerciseId}
                className="bg-[#1C2128] p-3.5 rounded-xs border border-[#393E46] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#DFD0B8] text-sm">{item.exerciseName}</span>
                    <RuneBadge status={item.status} compact />
                  </div>
                  <p className="text-[#8DAA91] text-xs mt-1 font-semibold">&quot;{item.guidance}&quot;</p>
                  <p className="text-[#948979] text-[11px] mt-0.5">{item.comparisonText}</p>
                </div>

                <div className="shrink-0 text-right bg-[#1A3636] px-3 py-2 rounded-xs border border-[#677D6A]">
                  <div className="text-[10px] text-[#948979] uppercase">Recommended Load</div>
                  <div className="font-bold text-[#8DAA91] text-sm">
                    {item.nextWeight} kg ({item.targetRepMin}–{item.targetRepMax} reps)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </RunePanel>
      )}

      {/* Exercises Needing Attention (Stalled / Regressing) */}
      {stalledList.length > 0 && (
        <RunePanel variant="carved" className="p-5 space-y-4 border-[#5A383B]/80">
          <div className="flex items-center gap-2 border-b border-[#393E46] pb-2 text-[#B88989]">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#DFD0B8]">
              Stalled or Regressing Exercises ({stalledList.length})
            </h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {stalledList.map((item) => (
              <div
                key={item.exerciseId}
                className="bg-[#1C2128] p-3.5 rounded-xs border border-[#393E46] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#DFD0B8] text-sm">{item.exerciseName}</span>
                    <RuneBadge status={item.status} compact />
                  </div>
                  <p className="text-[#B88989] text-xs mt-1 font-semibold">&quot;{item.guidance}&quot;</p>
                  <p className="text-[#948979] text-[11px] mt-0.5">Fact: {item.reasoning}</p>
                </div>

                <div className="shrink-0 text-right bg-[#2D1F20] px-3 py-2 rounded-xs border border-[#5A383B]">
                  <div className="text-[10px] text-[#948979] uppercase">Action Target</div>
                  <div className="font-bold text-[#DFD0B8] text-sm">
                    {item.nextWeight} kg ({item.targetRepMin}–{item.targetRepMax} reps)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </RunePanel>
      )}

      {/* Active Progression & Adapting Exercises */}
      {progressingList.length > 0 && (
        <RunePanel variant="carved" className="p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#393E46] pb-2 text-[#8DAA91]">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#DFD0B8]">
              Active Progression & Adapting ({progressingList.length})
            </h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {progressingList.map((item) => (
              <div
                key={item.exerciseId}
                className="bg-[#1C2128] p-3.5 rounded-xs border border-[#393E46] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#DFD0B8] text-sm">{item.exerciseName}</span>
                    <RuneBadge status={item.status} compact />
                  </div>
                  <p className="text-[#DFD0B8] text-xs mt-1 leading-relaxed">&quot;{item.guidance}&quot;</p>
                </div>

                <div className="shrink-0 text-right bg-[#222831] px-3 py-1.5 rounded-xs border border-[#393E46]">
                  <div className="text-[10px] text-[#948979] uppercase">Next Step</div>
                  <div className="font-bold text-[#8DAA91]">
                    {item.nextWeight} kg ({item.targetRepMin}–{item.targetRepMax} reps)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </RunePanel>
      )}

      {/* Recent Personal Records Ledger */}
      {achievedPRs.length > 0 && (
        <RunePanel variant="carved" className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#393E46] pb-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#DFD0B8]">
              <Trophy className="w-4 h-4 text-[#C9A96E]" />
              <span className="uppercase">Recent Achieved Personal Records</span>
            </div>
            <span className="text-[10px] font-mono text-[#948979]">Historical Facts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            {achievedPRs.map((pr, idx) => (
              <div
                key={idx}
                className="bg-[#1C2128] p-3.5 rounded-xs border border-[#393E46] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#DFD0B8]">{pr.exerciseName}</span>
                  {pr.isNewRecord ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#3A3326] border border-[#C9A96E] text-[#C9A96E] rounded-xs">
                      NEW RECORD
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#222831] border border-[#393E46] text-[#948979] rounded-xs">
                      RECORD
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-xl font-bold text-[#DFD0B8]">{pr.weight}</span>
                    <span className="text-xs text-[#948979] ml-1">kg × {pr.reps} reps</span>
                  </div>
                  <div className="text-right text-[11px] text-[#948979]">
                    Est 1RM: <span className="text-[#8DAA91] font-bold">{pr.estimated1RM} kg</span>
                    <div className="text-[10px] text-[#635B50]">{pr.achievedDate}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </RunePanel>
      )}
    </div>
  );
};
