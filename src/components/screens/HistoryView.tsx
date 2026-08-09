'use client';

import { useRef, useState } from 'react';
import { getCompletedWorkoutHistory } from '@/actions/history';
import type { CompletedWorkoutHistoryPage } from '@/types';
import { RunePanel } from '@/components/ui/RunePanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Calendar, ChevronDown, ChevronUp, Clock, FileText, RotateCcw } from 'lucide-react';

interface HistoryViewProps {
  initialHistoryPage: CompletedWorkoutHistoryPage;
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

export function HistoryView({ initialHistoryPage }: HistoryViewProps) {
  const [historyState, setHistoryState] = useState(() => ({
    source: initialHistoryPage,
    value: initialHistoryPage,
  }));
  const historyPage = historyState.source === initialHistoryPage
    ? historyState.value
    : initialHistoryPage;
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    initialHistoryPage.sessions[0]?.id ?? null,
  );
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [loadError, setLoadError] = useState(false);

  const loadMore = async () => {
    const cursor = historyPage.nextCursor;
    if (!cursor || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setLoadError(false);
    try {
      const result = await getCompletedWorkoutHistory({ cursor, pageSize: 20 });
      if (!result.ok) {
        setLoadError(true);
        return;
      }
      setHistoryState((current) => {
        const currentPage = current.source === initialHistoryPage ? current.value : initialHistoryPage;
        const seen = new Set(currentPage.sessions.map(({ id }) => id));
        const appended = result.data.sessions.filter(({ id }) => !seen.has(id));
        return {
          source: initialHistoryPage,
          value: {
            sessions: [...currentPage.sessions, ...appended],
            nextCursor: result.data.nextCursor,
          },
        };
      });
    } catch {
      setLoadError(true);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[#393E46] pb-3">
        <div className="min-w-0">
          <h2 className="break-words font-mono text-base font-bold uppercase tracking-wider text-[#DFD0B8]">
            Training History Ledger
          </h2>
          <p className="font-mono text-xs text-[#948979]">
            {historyPage.sessions.length} completed sessions logged
          </p>
        </div>
        <div className="shrink-0 rounded-xs border border-[#393E46] bg-[#1C2128] px-3 py-1.5 font-mono text-xs text-[#677D6A]">
          Historical record
        </div>
      </div>

      {historyPage.sessions.length === 0 ? (
        <EmptyState
          title="No Workout History Yet"
          description="Complete your first workout session to begin tracking performance and progressive overload trends."
          icon={<Clock className="h-6 w-6 text-[#677D6A]" />}
        />
      ) : (
        <div className="min-w-0 space-y-4">
          {historyPage.sessions.map((session) => {
            const isExpanded = expandedSessionId === session.id;
            const totalVolumeKg = session.exercises.reduce(
              (sessionTotal, exercise) => sessionTotal + exercise.sets.reduce(
                (exerciseTotal, set) => exerciseTotal + (set.weight === null ? 0 : set.weight * set.reps),
                0,
              ),
              0,
            );

            return (
              <RunePanel key={session.id} variant="carved" className="min-w-0 space-y-3 p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => setExpandedSessionId((current) => current === session.id ? null : session.id)}
                  className="group flex min-h-11 w-full min-w-0 flex-wrap items-center justify-between gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8DAA91]"
                  aria-expanded={isExpanded}
                  aria-controls={`session-details-${session.id}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs border border-[#393E46] bg-[#161A20] text-[#677D6A] transition-colors group-hover:border-[#677D6A]" aria-hidden="true">
                      <Calendar className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-mono text-sm font-bold text-[#DFD0B8] transition-colors group-hover:text-[#8DAA91]">
                        {session.splitDayName}
                      </span>
                      <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-[#948979]">
                        <span>{localDateFormatter.format(new Date(session.completedAt))}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" /> {session.durationMinutes} mins</span>
                        <span>{session.exercises.length} exercises</span>
                        <span><span>Total Volume:</span>{' '}<strong className="tabular-nums text-[#DFD0B8]">{numberFormatter.format(totalVolumeKg)} kg</strong></span>
                      </span>
                    </span>
                  </div>

                  <span className="flex min-w-0 items-center gap-3">
                    <span className="p-1 text-[#948979] group-hover:text-[#DFD0B8]" aria-hidden="true">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </span>
                  </span>
                </button>

                {isExpanded ? (
                  <div id={`session-details-${session.id}`} className="min-w-0 space-y-4 border-t border-[#393E46] pt-3">
                    {session.notes ? (
                      <div className="flex min-w-0 items-start gap-2 rounded-xs border border-[#393E46] bg-[#161A20] p-3 font-mono text-xs text-[#948979]">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#677D6A]" aria-hidden="true" />
                        <p className="min-w-0 break-words"><strong className="uppercase text-[#DFD0B8]">Note: </strong>{session.notes}</p>
                      </div>
                    ) : null}

                    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
                      {session.exercises.map((exercise) => (
                        <div key={exercise.id} className="min-w-0 space-y-2 rounded-xs border border-[#393E46] bg-[#1C2128] p-3 font-mono text-xs">
                          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 border-b border-[#2A303A] pb-1.5">
                            <strong className="min-w-0 break-words text-[#DFD0B8]">{exercise.exerciseName}</strong>
                            <span className="shrink-0 text-[10px] text-[#948979]">Target: {exercise.targetSets}×{exercise.targetRepMin}–{exercise.targetRepMax}</span>
                          </div>
                          {exercise.notes ? <p className="break-words text-[#948979]">{exercise.notes}</p> : null}
                          <div className="flex min-w-0 flex-wrap gap-2">
                            {exercise.sets.map((set) => (
                              <span key={set.id} className="rounded-xs border border-[#393E46] bg-[#222831] px-2 py-1 text-[#DFD0B8]">
                                Set {set.setNumber}: <strong className="tabular-nums text-[#8DAA91]">{formatLoad(set.weight, set.reps)}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </RunePanel>
            );
          })}
        </div>
      )}

      {loadError ? (
        <div role="alert" className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xs border border-[#7A4943] bg-[#2B2022] p-3 font-mono text-xs text-[#D99B92]">
          <span className="break-words">Unable to load more history. Try again.</span>
          <button type="button" onClick={loadMore} disabled={pending} className="min-h-11 px-3 font-bold uppercase text-[#DFD0B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8DAA91] disabled:opacity-50">
            <RotateCcw className="mr-1 inline h-4 w-4" aria-hidden="true" /> Retry loading history
          </button>
        </div>
      ) : null}

      {historyPage.nextCursor && !loadError ? (
        <button type="button" onClick={loadMore} disabled={pending} className="min-h-11 w-full rounded-xs border border-[#677D6A] px-4 font-mono text-xs font-bold uppercase text-[#DFD0B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8DAA91] disabled:cursor-wait disabled:opacity-50" aria-label="Load more history">
          {pending ? 'Loading history…' : 'Load more'}
        </button>
      ) : null}
    </div>
  );
}
