import React from 'react';
import { RunePanel } from './RunePanel';

interface LoadingStateProps {
  label?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label = 'Loading ledger data...' }) => {
  return (
    <RunePanel variant="carved" className="p-8 text-center space-y-3">
      <div className="flex items-center justify-center gap-2 text-[#677D6A]">
        <span className="w-2 h-2 bg-[#677D6A] rounded-full animate-ping" />
        <span className="font-mono text-xs text-[#DFD0B8] uppercase font-bold tracking-wider">
          {label}
        </span>
      </div>
      <div className="w-32 h-1 bg-[#222831] border border-[#393E46] mx-auto rounded-full overflow-hidden">
        <div className="h-full bg-[#677D6A] animate-pulse" style={{ width: '60%' }} />
      </div>
    </RunePanel>
  );
};
