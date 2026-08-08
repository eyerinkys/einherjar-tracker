'use client';

import React from 'react';
import { InsightEye } from '@/components/ui/InsightEye';
import { User } from '@/types';
import { getCurrentUser } from '@/services/dataService';
import { User as UserIcon } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  user?: User;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, user }) => {
  const currentUser = user || getCurrentUser();

  const getTitle = () => {
    switch (activeTab) {
      case 'split': return 'WORKOUT SPLIT';
      case 'train': return 'ACTIVE SESSION';
      case 'history': return 'TRAINING LEDGER';
      case 'progress': return 'PROGRESS & ANALYTICS';
      case 'bodyweight': return 'BODYWEIGHT LOG';
      case 'photos': return 'PROGRESS PHOTOS';
      default: return 'EINHERJAR';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#161A20]/90 backdrop-blur-md border-b border-[#393E46] px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <InsightEye size={32} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-base font-bold tracking-widest text-[#DFD0B8] uppercase">
                EINHERJAR
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#222831] border border-[#4D5460] text-[#948979] rounded-xs">
                LEDGER
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#948979] tracking-wider uppercase">
              {getTitle()}
            </p>
          </div>
        </div>

        {/* Right User Indicator & Training Status */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-[#222831] px-3 py-1 rounded-xs border border-[#393E46] text-xs font-mono text-[#DFD0B8]">
            <span className="w-2 h-2 rounded-full bg-[#677D6A] animate-pulse" />
            <span>{currentUser.name} — {currentUser.cycleName}</span>
          </div>

          <div className="w-8 h-8 rounded-xs bg-[#222831] border border-[#4D5460] flex items-center justify-center text-[#DFD0B8]">
            <UserIcon className="w-4 h-4 text-[#948979]" />
          </div>
        </div>
      </div>
    </header>
  );
};
