import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Route segment config
export const contentType = 'image/png';
export const size = {
  width: 512,
  height: 512,
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
          borderRadius: '20%',
        }}
      >
        <svg
          width="340"
          height="340"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7 3V21"
            stroke="#DFD0B8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M7 3L17 10L7 14L17 21"
            stroke="#DFD0B8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="17" cy="10" r="2.5" fill="#DFD0B8" />
          <circle cx="17" cy="21" r="2.5" fill="#DFD0B8" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
