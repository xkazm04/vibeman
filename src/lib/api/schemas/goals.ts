/**
 * Goals API Response Schemas
 *
 * Zod schemas for goal management API responses and request body validation.
 */

import { z } from 'zod';

const GoalRecordSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  title: z.string(),
  status: z.string(),
  order_index: z.number(),
}).passthrough(); // allow extra fields (description, dates, etc.)

export const GoalsListResponseSchema = z.object({
  goals: z.array(GoalRecordSchema),
});

export const GoalResponseSchema = z.object({
  goal: GoalRecordSchema,
});

export const GoalMutationResponseSchema = z.object({
  goal: GoalRecordSchema,
});

const GoalStatusSchema = z.enum(['open', 'in_progress', 'done', 'rejected', 'undecided']);

/** Validates the request body for POST /api/goals */
export const GoalCreateBodySchema = z.object({
  projectId: z.string(),
  title: z.string(),
  contextId: z.string().optional(),
  description: z.string().optional(),
  status: GoalStatusSchema.optional().default('open'),
  orderIndex: z.number().optional(),
  createAnalysis: z.boolean().optional().default(true),
  projectPath: z.string().optional(),
});

/** Validates the request body for PUT /api/goals */
export const GoalUpdateBodySchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: GoalStatusSchema.optional(),
  orderIndex: z.number().optional(),
  contextId: z.string().nullable().optional(),
});
