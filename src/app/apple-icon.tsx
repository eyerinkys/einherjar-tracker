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
          fontSize: 110,
          background: '#161A20',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#DFD0B8',
          fontWeight: 'bold',
        }}
      >
        E
      </div>
    ),
    { ...size }
  );
}
