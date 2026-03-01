/**
 * Directions API Response Schemas
 *
 * Zod schemas for direction management API responses.
 */

import { z } from 'zod';

export const DirectionsResponseSchema = z.object({
  success: z.boolean(),
  directions: z.array(z.record(z.string(), z.unknown())).default([]),
  grouped: z.array(z.object({
    contextMapId: z.string(),
    contextMapTitle: z.string(),
    directions: z.array(z.record(z.string(), z.unknown())),
  })).default([]),
  counts: z.object({
    pending: z.number(),
    accepted: z.number(),
    rejected: z.number(),
    total: z.number(),
  }).default({ pending: 0, accepted: 0, rejected: 0, total: 0 }),
});

export const DirectionMutationSchema = z.object({
  success: z.boolean(),
  direction: z.record(z.string(), z.unknown()),
});

export const AcceptDirectionResponseSchema = z.object({
  success: z.boolean(),
  direction: z.record(z.string(), z.unknown()),
  requirementName: z.string(),
  requirementPath: z.string(),
});
