'use client';

import React from 'react';
import { Layers, Play, Clock, TrendingUp, Scale, Camera } from 'lucide-react';

export type NavTab = 'split' | 'train' | 'history' | 'progress' | 'bodyweight' | 'photos';

interface NavigationProps {
  activeTab: NavTab;
  disabled?: boolean;
  onSelectTab: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, disabled = false, onSelectTab }) => {
  const items: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'split', label: 'Split', icon: Layers },
    { id: 'train', label: 'Train', icon: Play },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'bodyweight', label: 'Weight', icon: Scale },
    { id: 'photos', label: 'Photos', icon: Camera },
  ];

  return (
    <>
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#161A20]/95 backdrop-blur-md border-t border-[#393E46] px-2 py-1.5 shadow-2xl">
        <div className="grid grid-cols-6 items-center">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                disabled={disabled}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xs transition-all relative ${
                  isActive
                    ? 'text-[#DFD0B8] font-bold'
                    : 'text-[#948979] hover:text-[#DFD0B8]'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-6 h-[2px] bg-[#677D6A] rounded-full shadow-[0_0_6px_#677D6A]" />
                )}
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-[#8DAA91]' : 'text-[#948979]'}`} />
                <span className="text-[10px] font-mono tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* DESKTOP SIDE RAIL NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 bg-[#161A20] border-r border-[#393E46] p-4 shrink-0 min-h-[calc(100vh-61px)]">
        <div className="text-xs font-mono tracking-widest text-[#948979] uppercase px-3 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rotate-45 bg-[#677D6A]" />
          <span>NAVIGATION</span>
        </div>

        <div className="flex flex-col gap-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                disabled={disabled}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xs font-mono text-xs tracking-wider transition-all text-left border ${
                  isActive
                    ? 'bg-[#222831] border-[#677D6A] text-[#DFD0B8] shadow-[inset_3px_0_0_#677D6A]'
                    : 'bg-transparent border-transparent text-[#948979] hover:bg-[#222831]/50 hover:text-[#DFD0B8]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#8DAA91]' : 'text-[#948979]'}`} />
                <span className="uppercase font-semibold">{item.label}</span>
                {isActive && (
                  <span className="ml-auto text-[10px] text-[#677D6A]">ᛏ</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-6 border-t border-[#393E46]/60">
          <div className="bg-[#1C2128] p-3 rounded-xs border border-[#393E46] text-xs font-mono text-[#948979]">
            <div className="text-[#DFD0B8] font-bold mb-1 flex items-center justify-between">
              <span>EINHERJAR LOG</span>
              <span className="text-[10px] text-[#677D6A]">v1.0-MOCK</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#948979]">
              Norse-industrial workout ledger. Mobile-first design mode.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
