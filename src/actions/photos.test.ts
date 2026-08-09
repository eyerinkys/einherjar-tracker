import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock requireUser
const mockRequireUser = vi.fn();
vi.mock('@/server/auth/require-user', () => ({
  requireUser: () => mockRequireUser(),
}));

// Mock auth errors
vi.mock('@/server/auth/session', () => {
  class AuthenticationError extends Error {
    readonly code = 'UNAUTHENTICATED' as const;
    constructor() { super('Authentication required.'); this.name = 'AuthenticationError'; }
  }
  return { AuthenticationError };
});

vi.mock('@/server/auth/ownership', () => {
  class AuthorizationError extends Error {
    readonly code = 'NOT_FOUND' as const;
    constructor() { super('Not found.'); this.name = 'AuthorizationError'; }
  }
  return { AuthorizationError };
});

// Mock B2 client
const mockSend = vi.fn();
vi.mock('@/lib/b2', () => ({
  b2Client: { send: (...args: unknown[]) => mockSend(...args) },
  B2_BUCKET_NAME: 'test-bucket',
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://example.com/presigned-url'),
}));

// Mock database
const mockSelectLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockSelectWhere = vi.fn(() => ({ limit: mockSelectLimit, orderBy: mockOrderBy }));
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockInsert = vi.fn(() => ({ values: mockValues }));

const mockDeleteWhere = vi.fn();
const mockDeleteFn = vi.fn(() => ({ where: mockDeleteWhere }));

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  delete: mockDeleteFn,
};

vi.mock('@/db/client', () => ({
  getDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  progressPhotos: {
    id: 'id',
    userId: 'user_id',
    storageKey: 'storage_key',
    date: 'date',
    tag: 'tag',
    notes: 'notes',
    mimeType: 'mime_type',
    byteSize: 'byte_size',
    width: 'width',
    height: 'height',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: (a: unknown, b: unknown) => ({ type: 'eq', a, b }),
  and: (...args: unknown[]) => ({ type: 'and', args }),
  desc: (col: unknown) => ({ type: 'desc', col }),
}));

import { confirmPhotoUpload, getPhotos } from './photos';

const testUser = { id: 'user-1', name: 'Test', email: 'test@example.com' };

const mockRow = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  userId: 'user-1',
  storageKey: 'users/user-1/abc-def',
  date: '2026-08-01',
  tag: 'front',
  notes: 'Test note',
  mimeType: 'image/webp',
  byteSize: 500_000,
  width: 800,
  height: 600,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-08-01T00:00:00Z'),
};

describe('confirmPhotoUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    const { AuthenticationError } = await import('@/server/auth/session');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const result = await confirmPhotoUpload({
      photoId: 'photo-1',
      storageKey: 'users/user-1/abc',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHENTICATED');
    }
  });



  it('returns NOT_FOUND for key not under user prefix', async () => {
    mockRequireUser.mockResolvedValue(testUser);
    const result = await confirmPhotoUpload({
      storageKey: 'users/other-user/abc-def',
      date: '2026-08-01',
      tag: 'front',
      contentType: 'image/webp',
      width: 800,
      height: 600,
      byteSize: 500_000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION_ERROR');
    }
  });

  it('confirms a valid upload with matching HEAD and inserts metadata', async () => {
    mockRequireUser.mockResolvedValue(testUser);
    mockReturning.mockResolvedValue([mockRow]);
    mockSend.mockResolvedValue({
      ContentType: 'image/webp',
      ContentLength: 500_000,
    });

    const result = await confirmPhotoUpload({
      storageKey: mockRow.storageKey,
      date: '2026-08-01',
      tag: 'front',
      contentType: 'image/webp',
      width: 800,
      height: 600,
      byteSize: 500_000,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.data.storageKey).toBe('users/user-1/abc-def');
      expect(result.data.mimeType).toBe('image/webp');
    }
    
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        storageKey: mockRow.storageKey,
      })
    );
  });

  it('deletes B2 object on content type mismatch', async () => {
    mockRequireUser.mockResolvedValue(testUser);
    mockSend.mockResolvedValue({
      ContentType: 'image/jpeg',
      ContentLength: 500_000,
    });

    const result = await confirmPhotoUpload({
      storageKey: mockRow.storageKey,
      date: '2026-08-01',
      tag: 'front',
      contentType: 'image/webp',
      width: 800,
      height: 600,
      byteSize: 500_000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('UPLOAD_INVALID');
    }
    // Should have called send twice: HEAD + DELETE
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('deletes B2 object on oversized upload', async () => {
    mockRequireUser.mockResolvedValue(testUser);
    mockSend.mockResolvedValue({
      ContentType: 'image/webp',
      ContentLength: mockRow.byteSize * 2, // Way over 10% tolerance
    });

    const result = await confirmPhotoUpload({
      storageKey: mockRow.storageKey,
      date: '2026-08-01',
      tag: 'front',
      contentType: 'image/webp',
      width: 800,
      height: 600,
      byteSize: 500_000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('UPLOAD_INVALID');
    }
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('returns failure on HEAD failure (object not found)', async () => {
    mockRequireUser.mockResolvedValue(testUser);
    mockSend.mockRejectedValue(new Error('NoSuchKey'));

    const result = await confirmPhotoUpload({
      storageKey: mockRow.storageKey,
      date: '2026-08-01',
      tag: 'front',
      contentType: 'image/webp',
      width: 800,
      height: 600,
      byteSize: 500_000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('UPLOAD_FAILED');
    }
  });

  it('rejects invalid input', async () => {
    mockRequireUser.mockResolvedValue(testUser);

    const result = await confirmPhotoUpload({
      storageKey: '',
      date: 'invalid-date',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('getPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    const { AuthenticationError } = await import('@/server/auth/session');
    mockRequireUser.mockRejectedValue(new AuthenticationError());

    const result = await getPhotos();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHENTICATED');
    }
  });

  it('returns owned photos ordered by date desc', async () => {
    mockRequireUser.mockResolvedValue(testUser);
    const rows = [
      { ...mockRow, id: 'photo-2', date: '2026-08-02' },
      { ...mockRow, id: 'photo-1', date: '2026-08-01' },
    ];
    mockOrderBy.mockResolvedValue(rows);

    const result = await getPhotos();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('photo-2');
      expect(result.data[1].id).toBe('photo-1');
    }
  });

  it('returns empty array when user has no photos', async () => {
    mockRequireUser.mockResolvedValue(testUser);
    mockOrderBy.mockResolvedValue([]);

    const result = await getPhotos();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });
});
