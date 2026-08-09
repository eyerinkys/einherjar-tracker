import { describe, expect, it } from 'vitest';
import {
  encodeHistoryCursor,
  exerciseHistoryInputSchema,
  historyPageInputSchema,
  historySessionInputSchema,
} from './history';

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;

describe('history read validation', () => {
  it('defaults pages to 20 and caps requested pages at 50', () => {
    expect(historyPageInputSchema.parse({})).toEqual({ pageSize: 20 });
    expect(historyPageInputSchema.parse({ pageSize: 200 })).toEqual({ pageSize: 50 });
  });

  it('round-trips a bounded cursor carrying both stable ordering fields', () => {
    const cursor = encodeHistoryCursor({
      completedAt: '2026-08-09T04:00:00.000Z',
      id: id('1'),
    });

    expect(historyPageInputSchema.parse({ cursor })).toEqual({
      cursor: { completedAt: new Date('2026-08-09T04:00:00.000Z'), id: id('1') },
      pageSize: 20,
    });
  });

  it.each([
    'not-base64!',
    Buffer.from('{}').toString('base64url'),
    Buffer.from(JSON.stringify({ completedAt: 'not-a-date', id: id('1') })).toString('base64url'),
    Buffer.from(JSON.stringify({ completedAt: '2026-08-09T04:00:00.000Z', id: 'not-an-id' })).toString('base64url'),
    'a'.repeat(257),
  ])('rejects malformed or oversized cursors without exposing decoder errors', (cursor) => {
    expect(() => historyPageInputSchema.parse({ cursor })).toThrow();
  });

  it('rejects invalid IDs and client-supplied ownership', () => {
    expect(() => historySessionInputSchema.parse({ sessionId: 'bad' })).toThrow();
    expect(() => exerciseHistoryInputSchema.parse({ exerciseId: id('2'), userId: 'foreign' })).toThrow();
    expect(() => historyPageInputSchema.parse({ pageSize: 0 })).toThrow();
  });
});
