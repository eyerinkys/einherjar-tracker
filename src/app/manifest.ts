import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EINHERJAR',
    short_name: 'EINHERJAR',
    description:
      'Private mobile-first gym tracker featuring runic shape language, progressive overload analysis, and Odin AI insights.',
    start_url: '/',
    display: 'standalone',
    background_color: '#161A20',
    theme_color: '#161A20',
    icons: [
      {
        src: '/icon?size=192x192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon?size=512x512',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon?size=512x512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
