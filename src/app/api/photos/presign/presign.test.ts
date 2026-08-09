import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock auth
const mockGetSession = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}));

// Mock B2 client and presigner
const mockGetSignedUrl = vi.fn();
vi.mock('@/lib/b2', () => ({
  b2Client: {},
  B2_BUCKET_NAME: 'test-bucket',
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

// Mock database
const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
vi.mock('@/db/client', () => ({
  getDb: () => ({ insert: mockInsert }),
}));

vi.mock('@/db/schema', () => ({
  progressPhotos: { id: 'id' },
}));

// Mock randomUUID
vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto');
  return {
    ...actual,
    randomUUID: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  };
});

import { POST } from './route';
import { NextRequest } from 'next/server';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/photos/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  date: '2026-08-01',
  tag: 'front',
  contentType: 'image/webp',
  width: 800,
  height: 600,
  byteSize: 500_000,
};

describe('POST /api/photos/presign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without a session', async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Authentication required.');
  });

  it('returns 400 for invalid JSON', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });

    const request = new NextRequest('http://localhost:3000/api/photos/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid JSON body.');
  });

  it('returns 400 for validation errors', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });

    const response = await POST(makeRequest({ ...validBody, contentType: 'image/jpeg' }));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Validation failed.');
    expect(json.issues).toBeInstanceOf(Array);
  });

  it('returns storageKey and uploadUrl on success', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockGetSignedUrl.mockResolvedValue('https://b2.example.com/presigned-put');

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.storageKey).toBe('users/user-1/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(json.uploadUrl).toBe('https://b2.example.com/presigned-put');
  });

  it('generates storage key under users/{userId}/', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-42' } });
    mockGetSignedUrl.mockResolvedValue('https://b2.example.com/presigned');

    const response = await POST(makeRequest(validBody));
    const json = await response.json();

    expect(json.storageKey).toMatch(/^users\/user-42\//);
  });
});
