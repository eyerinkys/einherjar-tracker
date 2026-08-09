import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Favicon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#161A20',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Runic Spine */}
          <path
            d="M10 4V28"
            stroke="#DFD0B8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Upper Runic Loop & Lower Diagonal Leg */}
          <path
            d="M10 4L20 11L10 16L22 26"
            stroke="#DFD0B8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Diagonal Dumbbell Shaft & Weights */}
          <path
            d="M10 16L22 4"
            stroke="#DFD0B8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M18 4L24 10 M14 9L20 15"
            stroke="#DFD0B8"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
