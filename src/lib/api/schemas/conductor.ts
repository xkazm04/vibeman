/**
 * Zod schemas for Conductor API request bodies.
 */

import { z } from 'zod';

// PUT /api/conductor/config
export const ConfigPutBodySchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  config: z.record(z.string(), z.unknown()),
});

// POST /api/conductor/run
export const RunPostBodySchema = z.object({
  action: z.enum(['start', 'pause', 'resume', 'stop', 'status'] as const),
  projectId: z.string().optional(),
  runId: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  projectPath: z.string().optional(),
  projectName: z.string().optional(),
  goalId: z.string().optional(),
  refinedIntent: z.string().optional(),
});

// POST /api/conductor/healing
export const HealingPostBodySchema = z.object({
  action: z.enum(['save', 'revert', 'apply', 'update_effectiveness'] as const),
  patchId: z.string().optional(),
  patch: z.record(z.string(), z.unknown()).optional(),
  effectiveness: z.number().optional(),
});

// POST /api/conductor/refine-intent — Submit answers to intent questions
export const RefineIntentPostBodySchema = z.object({
  runId: z.string().min(1),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string().min(1),
  })),
});

export type ConfigPutBody = z.infer<typeof ConfigPutBodySchema>;
export type RunPostBody = z.infer<typeof RunPostBodySchema>;
export type HealingPostBody = z.infer<typeof HealingPostBodySchema>;
export type RefineIntentPostBody = z.infer<typeof RefineIntentPostBodySchema>;
