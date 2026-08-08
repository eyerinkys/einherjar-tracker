import React from 'react';

interface RuneStaveProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

export const RuneStave: React.FC<RuneStaveProps> = ({ children, active = false, className = '' }) => {
  return (
    <div className={`relative pl-6 stave-line transition-colors duration-200 ${className}`}>
      {/* Decorative top stave node */}
      <div 
        className={`absolute -left-[5px] top-2 w-[10px] h-[10px] transform rotate-45 border transition-all duration-200 ${
          active 
            ? 'bg-[#677D6A] border-[#8DAA91] shadow-[0_0_8px_rgba(141,170,145,0.4)]' 
            : 'bg-[#222831] border-[#4D5460]'
        }`}
      />
      {/* Stave connector notch */}
      <div 
        className={`absolute -left-[3px] bottom-3 w-[6px] h-[6px] transform rotate-45 border ${
          active ? 'bg-[#40534C] border-[#677D6A]' : 'bg-[#393E46] border-[#4D5460]'
        }`}
      />
      {children}
    </div>
  );
};
