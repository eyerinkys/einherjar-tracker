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
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vertical Runic Spine */}
          <path
            d="M7 3V21"
            stroke="#DFD0B8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Diagonal Runic Branches */}
          <path
            d="M7 3L17 10L7 14L17 21"
            stroke="#DFD0B8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dumbbell Weight Weight Nodes */}
          <circle cx="17" cy="10" r="2.5" fill="#DFD0B8" />
          <circle cx="17" cy="21" r="2.5" fill="#DFD0B8" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
