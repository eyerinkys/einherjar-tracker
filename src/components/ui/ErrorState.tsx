import React from 'react';
import { RunePanel } from './RunePanel';
import { AlertOctagon } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to Load Data',
  message = 'An unexpected issue occurred while loading records. Please try again.',
  onRetry,
}) => {
  return (
    <RunePanel variant="carved" className="p-8 text-center space-y-4 border-[#5A383B]">
      <div className="w-12 h-12 bg-[#2D1F20] border border-[#5A383B] rounded-xs mx-auto flex items-center justify-center text-[#B88989]">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-mono text-sm font-bold text-[#B88989] uppercase tracking-wider mb-1">
          {title}
        </h3>
        <p className="font-mono text-xs text-[#948979] max-w-md mx-auto leading-relaxed">
          {message}
        </p>
      </div>
      {onRetry && (
        <div className="pt-2">
          <button
            onClick={onRetry}
            className="px-5 py-2 bg-[#5A383B] hover:bg-[#7A484C] text-[#DFD0B8] font-mono text-xs font-bold uppercase rounded-xs border border-[#B88989] transition-all"
          >
            Retry Connection
          </button>
        </div>
      )}
    </RunePanel>
  );
};
