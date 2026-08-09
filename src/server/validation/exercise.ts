import { z } from 'zod';

export const createCustomExerciseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Exercise name is required.')
    .max(100, 'Exercise name cannot exceed 100 characters.'),
  muscleGroup: z
    .string()
    .trim()
    .min(1, 'Target muscle group is required.')
    .max(100, 'Muscle group cannot exceed 100 characters.'),
  equipment: z
    .string()
    .trim()
    .min(1, 'Equipment type is required.')
    .max(100, 'Equipment type cannot exceed 100 characters.'),
  category: z.enum(['compound', 'isolation']),
});

export type CreateCustomExerciseInput = z.infer<typeof createCustomExerciseSchema>;
