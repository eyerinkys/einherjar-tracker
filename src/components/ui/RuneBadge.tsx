import React from 'react';
import { ProgressionStatus } from '@/types';

interface RuneBadgeProps {
  status: ProgressionStatus | 'PR' | 'RECORD';
  className?: string;
  compact?: boolean;
}

export const RuneBadge: React.FC<RuneBadgeProps> = ({ status, className = '', compact = false }) => {
  let badgeText = '';
  let colorStyles = '';
  let runeSymbol = 'ᛏ';

  switch (status) {
    case 'READY_TO_INCREASE_LOAD':
      badgeText = compact ? 'READY LOAD +' : 'READY FOR LOAD +';
      colorStyles = 'bg-[#1A3636] text-[#8DAA91] border-[#677D6A]';
      runeSymbol = 'ᛪ';
      break;
    case 'PROGRESSING':
      badgeText = 'PROGRESSING';
      colorStyles = 'bg-[#22352B] text-[#677D6A] border-[#40534C]';
      runeSymbol = 'ᛋ';
      break;
    case 'ADAPTING_TO_NEW_LOAD':
      badgeText = compact ? 'ADAPTING' : 'ADAPTING TO LOAD';
      colorStyles = 'bg-[#2C323B] text-[#DFD0B8] border-[#4D5460]';
      runeSymbol = 'ᚦ';
      break;
    case 'STALLED':
      badgeText = 'STALLED';
      colorStyles = 'bg-[#2A2420] text-[#948979] border-[#635B50]';
      runeSymbol = 'ᚾ';
      break;
    case 'REGRESSING':
      badgeText = 'REGRESSING';
      colorStyles = 'bg-[#2D1F20] text-[#B88989] border-[#5A383B]';
      runeSymbol = 'ᚢ';
      break;
    case 'INSUFFICIENT_DATA':
      badgeText = compact ? 'NO DATA' : 'INSUFFICIENT DATA';
      colorStyles = 'bg-[#1F242D] text-[#635B50] border-[#393E46]';
      runeSymbol = 'ᚴ';
      break;
    case 'PR':
    case 'RECORD':
      badgeText = compact ? 'RECORD' : 'PERSONAL RECORD';
      colorStyles = 'bg-[#3A3326] text-[#DFD0B8] border-[#C9A96E]';
      runeSymbol = 'ᛏ';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono tracking-wider font-semibold border rounded-xs ${colorStyles} ${className}`}
    >
      <span className="font-serif text-[12px] opacity-90">{runeSymbol}</span>
      <span>{badgeText}</span>
    </span>
  );
};
