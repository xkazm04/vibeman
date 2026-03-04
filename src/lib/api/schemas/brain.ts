/**
 * Brain API Response Schemas
 *
 * Zod schemas for Brain 2.0 behavioral learning API responses.
 * Updated to match unified ApiResponse envelope: { success, data, error?, meta? }
 */

import { z } from 'zod';
import type { BehavioralContext, DbDirectionOutcome, DbBrainReflection } from '@/app/db/models/brain.types';
import { dbObject } from './common';

/**
 * Generic unified response envelope wrapper.
 * All Brain API endpoints now use this structure.
 */
function envelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  });
}

// Legacy schemas - kept for backwards compatibility with non-envelope responses
// New code should use the *Envelope variants below

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

// Unified envelope schemas for new Brain API structure

const BrainContextDataSchema = z.object({
  context: dbObject<BehavioralContext>().nullable().optional(),
});

const BrainSignalsDataSchema = z.object({
  signals: z.array(z.record(z.string(), z.unknown())).default([]),
  stats: z.object({
    counts: z.record(z.string(), z.number()).optional(),
    contextActivity: z.array(z.unknown()).optional(),
    totalSignals: z.number().optional(),
  }).optional(),
});

const BrainInsightsDataSchema = z.object({
  insights: z.array(z.record(z.string(), z.unknown())).default([]),
});

const BrainHeatmapDataSchema = z.object({
  heatmap: z.object({
    days: z.array(z.unknown()),
    contexts: z.array(z.object({ id: z.string(), name: z.string() })),
    signal_types: z.array(z.string()),
    window_days: z.number(),
  }),
});

const BrainEffectivenessDataSchema = z.object({
  insights: z.array(z.unknown()).default([]),
  summary: z.object({
    overallScore: z.number(),
    helpfulCount: z.number(),
    neutralCount: z.number(),
    misleadingCount: z.number(),
    totalScored: z.number(),
    baselineAcceptanceRate: z.number(),
  }),
});

// Exported envelope schemas
export const BrainContextResponseSchema = envelopeSchema(BrainContextDataSchema);
export const BrainSignalsResponseSchema = envelopeSchema(BrainSignalsDataSchema);
export const BrainInsightsResponseSchema = envelopeSchema(BrainInsightsDataSchema);
export const BrainHeatmapResponseSchema = envelopeSchema(BrainHeatmapDataSchema);
export const BrainEffectivenessResponseSchema = envelopeSchema(BrainEffectivenessDataSchema);

// Backwards-compatible export (for OutcomesResponseSchema, not yet migrated)
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
