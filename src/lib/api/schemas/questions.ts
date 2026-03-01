/**
 * Questions API Response Schemas
 *
 * Zod schemas for question management API responses.
 */

import { z } from 'zod';

export const QuestionsResponseSchema = z.object({
  success: z.boolean(),
  questions: z.array(z.record(z.string(), z.unknown())).default([]),
  grouped: z.array(z.object({
    contextMapId: z.string(),
    contextMapTitle: z.string(),
    questions: z.array(z.record(z.string(), z.unknown())),
  })).default([]),
  counts: z.object({
    pending: z.number(),
    answered: z.number(),
    total: z.number(),
  }).default({ pending: 0, answered: 0, total: 0 }),
});

export const QuestionMutationSchema = z.object({
  success: z.boolean(),
  question: z.record(z.string(), z.unknown()),
});
