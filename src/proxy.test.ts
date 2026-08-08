import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

describe('auth navigation proxy', () => {
  it('redirects a request without a session cookie to sign-in', () => {
    const response = proxy(new NextRequest('https://tracker.example.com/'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://tracker.example.com/sign-in');
  });

  it('only treats cookie presence as an optimistic navigation hint', () => {
    const request = new NextRequest('https://tracker.example.com/', {
      headers: {
        cookie: 'better-auth.session_token=forged-and-not-authoritative',
      },
    });

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});
