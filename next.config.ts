import type { NextConfig } from "next";

const b2Endpoint = process.env.B2_ENDPOINT || '';
let b2Host = '';
try {
  if (b2Endpoint) {
    b2Host = new URL(b2Endpoint.startsWith('http') ? b2Endpoint : `https://${b2Endpoint}`).host;
  }
} catch (e) {
  // Ignore invalid URL
}

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: ${b2Host ? `https://${b2Host}` : 'https://*.backblazeb2.com'};
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  experimental: {
    // Next 16.3's CLI path can lose captured `tsc --showConfig` output.
    // TypeScript 5.9 still exposes the stable compiler API Next can use.
    useTypeScriptCli: false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          }
        ],
      },
    ];
  },
};

export default nextConfig;
