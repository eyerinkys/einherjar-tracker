import React from 'react';
import { RunePanel } from './RunePanel';
import { ShieldAlert } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  disabled?: boolean;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  disabled = false,
  onAction,
  icon,
}) => {
  return (
    <RunePanel variant="carved" className="p-8 text-center space-y-4">
      <div className="w-12 h-12 bg-[#1C2128] border border-[#393E46] rounded-xs mx-auto flex items-center justify-center text-[#948979]">
        {icon || <ShieldAlert className="w-6 h-6 text-[#677D6A]" />}
      </div>
      <div>
        <h3 className="font-mono text-sm font-bold text-[#DFD0B8] uppercase tracking-wider mb-1">
          {title}
        </h3>
        <p className="font-mono text-xs text-[#948979] max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            disabled={disabled}
            onClick={onAction}
            className="min-h-11 px-5 py-2 bg-[#40534C] hover:bg-[#677D6A] text-[#DFD0B8] font-mono text-xs font-bold uppercase rounded-xs border border-[#677D6A] transition-all"
            type="button"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </RunePanel>
  );
};
