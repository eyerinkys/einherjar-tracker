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
          fontSize: 20,
          background: '#161A20',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#DFD0B8',
          fontWeight: 'bold',
          borderRadius: '4px',
        }}
      >
        E
      </div>
    ),
    {
      ...size,
    }
  );
}
