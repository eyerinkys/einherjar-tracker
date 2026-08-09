import { z } from 'zod';

export const DEFAULT_HISTORY_PAGE_SIZE = 20;
export const MAX_HISTORY_PAGE_SIZE = 50;
export const MAX_HISTORY_CURSOR_LENGTH = 256;

const idSchema = z.string().uuid('Invalid ID.');
const cursorPayloadSchema = z.object({
  completedAt: z.iso.datetime({ offset: true }),
  id: idSchema,
}).strict();

export interface HistoryCursor {
  completedAt: Date;
  id: string;
}

export function encodeHistoryCursor(cursor: { completedAt: string; id: string }): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

const historyCursorSchema = z
  .string()
  .min(1)
  .max(MAX_HISTORY_CURSOR_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/)
  .transform((value, context): HistoryCursor => {
    try {
      const payload = cursorPayloadSchema.parse(
        JSON.parse(Buffer.from(value, 'base64url').toString('utf8')),
      );
      return { completedAt: new Date(payload.completedAt), id: payload.id };
    } catch {
      context.addIssue({ code: 'custom', message: 'Invalid history cursor.' });
      return z.NEVER;
    }
  });

export const historyPageInputSchema = z.object({
  cursor: historyCursorSchema.optional(),
  pageSize: z.number().int().positive().transform((value) => Math.min(value, MAX_HISTORY_PAGE_SIZE)).default(DEFAULT_HISTORY_PAGE_SIZE),
}).strict();

export const historySessionInputSchema = z.object({ sessionId: idSchema }).strict();
export const exerciseHistoryInputSchema = z.object({ exerciseId: idSchema }).strict();

export type HistoryPageInput = z.input<typeof historyPageInputSchema>;
export type ParsedHistoryPageInput = z.output<typeof historyPageInputSchema>;
export type HistorySessionInput = z.input<typeof historySessionInputSchema>;
export type ExerciseHistoryInput = z.input<typeof exerciseHistoryInputSchema>;
