import React from 'react';
import type { HeatmapDayDTO } from '../../server/queries/consistency';

interface ConsistencyHeatmapProps {
  data: HeatmapDayDTO[];
}

export function ConsistencyHeatmap({ data }: ConsistencyHeatmapProps) {
  // Sort data by date ascending for the grid (left to right)
  const sortedData = [...data].sort((a, b) => (a.dateIso > b.dateIso ? 1 : -1));

  // Determine grid layout. Assuming data is ~12 weeks (84 days)
  // We want a GitHub style grid: 7 rows (days of week), N columns (weeks)
  // Usually, the grid flows top-to-bottom, left-to-right.
  
  // Since CSS Grid row-auto flow is easier if we specify `grid-flow-col`,
  // let's do that. We also want to align the first item to the correct day of week,
  // but for simplicity, we can just render the days sequentially.
  
  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[max-content]">
        <div className="grid grid-flow-col grid-rows-7 gap-1">
          {sortedData.map((day) => {
            let bgColor = 'bg-neutral-800'; // Rest / Future
            if (day.state === 'missed') bgColor = 'bg-red-950/50 border border-red-900/30';
            if (day.state === 'completed') bgColor = 'bg-emerald-700/80 hover:bg-emerald-600';
            
            // Check if PR exists (we don't strictly have a "completed_with_pr" in DTO right now, 
            // but if we did we could make it brighter moss).
            
            return (
              <div
                key={day.dateIso}
                className={`w-4 h-4 rounded-sm ${bgColor} transition-colors group relative cursor-default`}
              >
                {/* Minimal tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-max bg-neutral-900 text-neutral-200 text-xs py-1 px-2 rounded shadow-lg border border-neutral-800">
                  <div className="font-medium text-neutral-100">{day.dateIso}</div>
                  {day.state === 'completed' && day.sessionSummary && (
                    <div className="text-emerald-400">{day.sessionSummary.workoutName}</div>
                  )}
                  {day.state === 'missed' && <div className="text-red-400">Missed Session</div>}
                  {day.state === 'rest' && <div className="text-neutral-400">Rest Day</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
