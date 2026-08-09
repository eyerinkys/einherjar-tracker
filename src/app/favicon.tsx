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
          {/* Main Runic Spine & Diagonal Arm */}
          <path
            d="M8 4V28 M8 4L24 16 M8 16L24 28 M8 16L18 8 M8 28L20 19"
            stroke="#DFD0B8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dumbbell Head Accents */}
          <path
            d="M20 5L26 10 M18 23L24 28"
            stroke="#DFD0B8"
            strokeWidth="4"
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
