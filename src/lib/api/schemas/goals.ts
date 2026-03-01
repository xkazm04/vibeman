/**
 * Goals API Response Schemas
 *
 * Zod schemas for goal management API responses.
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
