'use client';

import React, { useState } from 'react';
import { CompletedSession } from '@/types';
import { RunePanel } from '@/components/ui/RunePanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Calendar, Clock, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface HistoryViewProps {
  sessions: CompletedSession[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ sessions }) => {
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(sessions[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedSessionId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-[#393E46]">
        <div>
          <h2 className="font-mono text-base font-bold text-[#DFD0B8] uppercase tracking-wider">
            TRAINING HISTORY LEDGER
          </h2>
          <p className="font-mono text-xs text-[#948979]">
            {sessions.length} completed sessions logged
          </p>
        </div>
        <div className="text-xs font-mono text-[#677D6A] bg-[#1C2128] px-3 py-1.5 border border-[#393E46] rounded-xs">
          HISTORICAL RECORD
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="No Workout History Yet"
          description="Complete your first workout session to begin tracking performance and progressive overload trends."
          icon={<Clock className="w-6 h-6 text-[#677D6A]" />}
        />
      ) : (
        /* Sessions Chronological List */
        <div className="space-y-4">
          {sessions.map((sess) => {
            const isExpanded = expandedSessionId === sess.id;
            const totalVolumeKg = sess.exercises.reduce((acc, ex) => {
              return acc + ex.sets.reduce((sAcc, s) => sAcc + ((s.weight ?? 0) * (s.reps ?? 0)), 0);
            }, 0);

            return (
              <RunePanel key={sess.id} variant="carved" className="p-4 sm:p-5 space-y-3">
                {/* Session Summary Row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(sess.id)}
                  className="group flex w-full items-center justify-between text-left"
                  aria-expanded={isExpanded}
                  aria-controls={`session-details-${sess.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#161A20] border border-[#393E46] group-hover:border-[#677D6A] rounded-xs flex items-center justify-center text-[#677D6A] transition-colors">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-bold text-[#DFD0B8] group-hover:text-[#8DAA91] transition-colors">
                        {sess.splitDayName}
                      </h3>
                      <div className="flex items-center gap-3 font-mono text-xs text-[#948979] mt-0.5">
                        <span>{sess.date}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {sess.durationMinutes} mins
                        </span>
                        <span>•</span>
                        <span>{sess.exercises.length} Exercises</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right font-mono text-xs">
                      <span className="text-[#948979]">Total Volume: </span>
                      <span className="text-[#DFD0B8] font-bold">{totalVolumeKg} kg</span>
                    </div>
                    <span className="p-1 text-[#948979] group-hover:text-[#DFD0B8]" aria-hidden="true">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </span>
                  </div>
                </button>

                {/* Session Detail Content */}
                {isExpanded && (
                  <div id={`session-details-${sess.id}`} className="pt-3 border-t border-[#393E46] space-y-4">
                    {sess.notes && (
                      <div className="flex items-start gap-2 bg-[#161A20] p-3 rounded-xs border border-[#393E46] text-xs font-mono text-[#948979]">
                        <FileText className="w-4 h-4 text-[#677D6A] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[#DFD0B8] font-bold uppercase">Note: </span>
                          <span>{sess.notes}</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sess.exercises.map((ex, exIdx) => (
                        <div
                          key={exIdx}
                          className="bg-[#1C2128] p-3 rounded-xs border border-[#393E46] space-y-2 font-mono text-xs"
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-[#2A303A]">
                            <span className="font-bold text-[#DFD0B8]">{ex.exerciseName}</span>
                            <span className="text-[10px] text-[#948979]">Target: {ex.targetSets}×{ex.targetRepMin}-{ex.targetRepMax}</span>
                          </div>

                          {/* Sets Breakdown */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            {ex.sets.map((s, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-1 bg-[#222831] border border-[#393E46] text-[#DFD0B8] rounded-xs"
                              >
                                Set {s.setNumber}: <strong className="text-[#8DAA91]">{s.weight}kg</strong> × {s.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </RunePanel>
            );
          })}
        </div>
      )}
    </div>
  );
};
