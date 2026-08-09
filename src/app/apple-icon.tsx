import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Route segment config
export const contentType = 'image/png';
export const size = {
  width: 180,
  height: 180,
};

export default function Icon() {
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
          width="130"
          height="130"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 4V28 M8 4L24 16 M8 16L24 28 M8 16L18 8 M8 28L20 19"
            stroke="#DFD0B8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 5L26 10 M18 23L24 28"
            stroke="#DFD0B8"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
