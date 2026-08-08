import React from 'react';

interface InscribedDividerProps {
  className?: string;
  label?: string;
}

export const InscribedDivider: React.FC<InscribedDividerProps> = ({ className = '', label }) => {
  return (
    <div className={`relative flex items-center my-4 ${className}`}>
      <div className="flex-grow h-[1px] bg-gradient-to-r from-transparent via-[#4D5460] to-transparent" />
      {label ? (
        <span className="px-3 text-xs font-mono tracking-widest text-[#948979] uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rotate-45 bg-[#677D6A] inline-block" />
          {label}
          <span className="w-1.5 h-1.5 rotate-45 bg-[#677D6A] inline-block" />
        </span>
      ) : (
        <div className="px-2">
          <div className="w-2.5 h-2.5 rotate-45 border border-[#948979] bg-[#222831] flex items-center justify-center">
            <div className="w-1 h-1 bg-[#677D6A]" />
          </div>
        </div>
      )}
      <div className="flex-grow h-[1px] bg-gradient-to-r from-transparent via-[#4D5460] to-transparent" />
    </div>
  );
};
