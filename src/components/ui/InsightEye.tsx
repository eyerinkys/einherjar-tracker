'use client';

import React, { useState, useEffect, useRef } from 'react';

interface InsightEyeProps {
  size?: number;
  className?: string;
  active?: boolean;
}

export const InsightEye: React.FC<InsightEyeProps> = ({ size = 36, className = '', active = true }) => {
  const containerRef = useRef<SVGSVGElement>(null);
  const [pupilOffset, setPupilOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!active) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - eyeCenterX;
      const dy = e.clientY - eyeCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const maxOffset = 3.5; // Restrained movement (max 3.5px)
      if (dist === 0) {
        setPupilOffset({ x: 0, y: 0 });
      } else {
        const factor = Math.min(dist / 300, 1) * maxOffset;
        setPupilOffset({
          x: (dx / dist) * factor,
          y: (dy / dist) * factor,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [active]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        ref={containerRef}
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300"
      >
        {/* Outer Angular Runic Diamond Frame */}
        <polygon
          points="20,4 36,20 20,36 4,20"
          stroke="#4D5460"
          strokeWidth="1.5"
          fill="#1C2128"
        />

        {/* Sacrificed Eye Geometry / Angular Eyelid Cut */}
        <polygon
          points="20,10 32,20 20,30 8,20"
          stroke="#677D6A"
          strokeWidth="1.5"
          fill="#222831"
        />

        {/* Inner Iris Hexagon */}
        <polygon
          points="20,14 26,20 20,26 14,20"
          stroke="#DFD0B8"
          strokeWidth="1"
          fill="#1A3636"
        />

        {/* Pupil - Cursor Tracking Diamond */}
        <g transform={`translate(${pupilOffset.x}, ${pupilOffset.y})`}>
          <polygon
            points="20,17 23,20 20,23 17,20"
            fill="#DFD0B8"
          />
          <circle cx="20" cy="20" r="1" fill="#C9A96E" />
        </g>

        {/* Top/Bottom Carved Runic Markings */}
        <line x1="20" y1="2" x2="20" y2="4" stroke="#DFD0B8" strokeWidth="1.5" />
        <line x1="20" y1="36" x2="20" y2="38" stroke="#DFD0B8" strokeWidth="1.5" />
        <line x1="2" y1="20" x2="4" y2="20" stroke="#DFD0B8" strokeWidth="1.5" />
        <line x1="36" y1="20" x2="38" y2="20" stroke="#DFD0B8" strokeWidth="1.5" />

      </svg>
    </div>
  );
};
