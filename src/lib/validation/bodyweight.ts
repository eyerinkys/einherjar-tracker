import { z } from 'zod';

export const logBodyweightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  weightKg: z.number().min(20, 'Weight must be at least 20 kg').max(500, 'Weight must be at most 500 kg'),
  notes: z.string().max(1000).optional(),
});

export const deleteBodyweightSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
});

export type LogBodyweightInput = z.infer<typeof logBodyweightSchema>;
export type DeleteBodyweightInput = z.infer<typeof deleteBodyweightSchema>;
