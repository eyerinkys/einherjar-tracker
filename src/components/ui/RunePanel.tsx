import React from 'react';

interface RunePanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'carved' | 'active' | 'subtle';
  insetNotch?: boolean;
}

export const RunePanel: React.FC<RunePanelProps> = ({
  children,
  className = '',
  variant = 'default',
  insetNotch = true,
}) => {
  let baseStyles = 'rune-panel rounded-sm transition-all duration-200';
  
  if (variant === 'carved') {
    baseStyles = 'rune-panel-carved rounded-sm';
  } else if (variant === 'active') {
    baseStyles = 'bg-[#222831] border border-[#677D6A]/60 shadow-[0_4px_16px_rgba(26,54,54,0.3)]';
  } else if (variant === 'subtle') {
    baseStyles = 'bg-[#1C2128] border border-[#393E46]/60';
  }

  return (
    <div className={`relative ${baseStyles} ${insetNotch ? 'rune-border-notch' : ''} ${className}`}>
      {/* Corner runic accent mark top left */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#DFD0B8]/30 pointer-events-none" />
      {/* Corner runic accent mark bottom right */}
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#DFD0B8]/30 pointer-events-none" />
      {children}
    </div>
  );
};
