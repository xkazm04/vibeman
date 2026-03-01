/**
 * Brain API Response Schemas
 *
 * Zod schemas for Brain 2.0 behavioral learning API responses.
 */

import { z } from 'zod';
import type { BehavioralContext, DbDirectionOutcome, DbBrainReflection } from '@/app/db/models/brain.types';
import { dbObject } from './common';

export const BrainDecayResponseSchema = z.object({
  success: z.boolean(),
  affected: z.number(),
  decayed: z.number(),
  deleted: z.number(),
  settings: z.object({
    decayFactor: z.number(),
    retentionDays: z.number(),
  }),
});

export const BrainContextResponseSchema = z.object({
  context: dbObject<BehavioralContext>().nullable().optional(),
});

export const BrainOutcomesResponseSchema = z.object({
  outcomes: z.array(dbObject<DbDirectionOutcome>()).default([]),
  stats: z.object({
    total: z.number(),
    successful: z.number(),
    failed: z.number(),
    reverted: z.number(),
    pending: z.number(),
  }).default({ total: 0, successful: 0, failed: 0, reverted: 0, pending: 0 }),
});

export const BrainReflectionStatusSchema = z.object({
  isRunning: z.boolean().default(false),
  lastCompleted: dbObject<DbBrainReflection>().nullable().default(null),
  decisionsSinceLastReflection: z.number().default(0),
  nextThreshold: z.number().default(20),
  shouldTrigger: z.boolean().default(false),
  triggerReason: z.string().nullable().default(null),
  runningReflection: z.object({
    id: z.string(),
  }).nullable().default(null),
});

export const BrainReflectionTriggerSchema = z.object({
  reflectionId: z.string().optional(),
  promptContent: z.string().nullable().optional(),
});

export const BrainSignalsResponseSchema = z.object({
  success: z.boolean(),
  signals: z.array(z.record(z.string(), z.unknown())).default([]),
});
