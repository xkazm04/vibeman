/**
 * Pattern Extractor — deterministic extraction of connector-agnostic patterns
 * from passing design review results.
 *
 * Patterns are structural observations about what good designs do in specific
 * contexts (e.g., "polling + data tools -> include fetch limits").
 *
 * Safety: extracted patterns go through a 2-source activation gate.
 * Only patterns validated by 2+ independent reviews become active.
 */

import type { DesignAnalysisResult, SuggestedTrigger } from '@/app/features/Personas/lib/designTypes';

export interface ExtractedPattern {
  patternType: 'structural' | 'behavioral' | 'error_handling';
  patternText: string;
  triggerCondition: string;
}

/**
 * Extract connector-agnostic patterns from a passing design result.
 * Returns patterns that describe structural qualities, not connector-specific details.
 */
export function extractPatterns(result: DesignAnalysisResult): ExtractedPattern[] {
  const patterns: ExtractedPattern[] = [];
  const triggers = result.suggested_triggers || [];
  const connectors = result.suggested_connectors || [];
  const sp = result.structured_prompt;

  // ---- Pattern 1: Polling + data tools -> fetch constraints ----
  if (hasPollingTrigger(triggers) && sp.toolGuidance) {
    const guidance = sp.toolGuidance.toLowerCase();
    const hasFetchLimits =
      guidance.includes('limit') || guidance.includes('max') || guidance.includes('maxresults');
    const hasTimeFilter =
      guidance.includes('after:') || guidance.includes('since') || guidance.includes('time') || guidance.includes('date');
    const hasDedup =
      guidance.includes('dedup') || guidance.includes('duplicate') || guidance.includes('already processed');

    if (hasFetchLimits && hasTimeFilter) {
      patterns.push({
        patternType: 'structural',
        patternText: 'When using polling triggers with data-reading tools, include in toolGuidance: ' +
          'maxResults/limit constraint, time-window filter (after:/since), ' +
          (hasDedup ? 'and deduplication strategy' : 'and processed-item tracking'),
        triggerCondition: 'polling+data_tools',
      });
    }
  }

  // ---- Pattern 2: Webhook -> payload validation in error handling ----
  if (hasWebhookTrigger(triggers) && sp.errorHandling) {
    const errorText = sp.errorHandling.toLowerCase();
    const hasPayloadValidation =
      errorText.includes('payload') || errorText.includes('validation') || errorText.includes('schema');
    const hasSignatureCheck =
      errorText.includes('signature') || errorText.includes('hmac') || errorText.includes('verification');

    if (hasPayloadValidation || hasSignatureCheck) {
      const parts: string[] = [];
      if (hasPayloadValidation) parts.push('payload validation/schema checking');
      if (hasSignatureCheck) parts.push('signature/HMAC verification');
      patterns.push({
        patternType: 'error_handling',
        patternText: `When using webhook triggers, include in errorHandling: ${parts.join(', ')}, and retry strategy for transient failures`,
        triggerCondition: 'webhook',
      });
    }
  }

  // ---- Pattern 3: Multi-connector -> per-connector failure isolation ----
  if (connectors.length > 1 && sp.errorHandling) {
    const errorText = sp.errorHandling.toLowerCase();
    const hasIsolation =
      errorText.includes('individual') || errorText.includes('partial') ||
      errorText.includes('fallback') || errorText.includes('each connector') ||
      errorText.includes('independently');

    if (hasIsolation) {
      patterns.push({
        patternType: 'error_handling',
        patternText: 'When using multiple connectors, include per-connector failure isolation in errorHandling: individual retry, partial-success reporting, and fallback behavior for each connector',
        triggerCondition: 'multi_connector',
      });
    }
  }

  // ---- Pattern 4: Schedule trigger -> explicit timing in instructions ----
  if (hasScheduleTrigger(triggers) && sp.instructions) {
    const instText = sp.instructions.toLowerCase();
    const hasTimingContext =
      instText.includes('time') || instText.includes('schedule') ||
      instText.includes('cron') || instText.includes('interval') ||
      instText.includes('daily') || instText.includes('hourly');

    if (hasTimingContext) {
      patterns.push({
        patternType: 'behavioral',
        patternText: 'When using schedule triggers, include explicit timing context in instructions: execution frequency, timezone awareness, and what data window to process per run',
        triggerCondition: 'schedule',
      });
    }
  }

  // ---- Pattern 5: Event subscriptions -> event context handling ----
  if (result.suggested_event_subscriptions && result.suggested_event_subscriptions.length > 0 && sp.instructions) {
    const instText = sp.instructions.toLowerCase();
    const hasEventHandling =
      instText.includes('event') || instText.includes('payload') ||
      instText.includes('subscription') || instText.includes('trigger context');

    if (hasEventHandling) {
      patterns.push({
        patternType: 'behavioral',
        patternText: 'When using event subscriptions, include in instructions: how to access event payload (input._event.payload), event type filtering, and what action to take for each event type',
        triggerCondition: 'event_subscription',
      });
    }
  }

  // ---- Pattern 6: Data-reading tools -> examples include data samples ----
  if (sp.examples && result.suggested_tools.length > 0) {
    const examplesText = sp.examples.toLowerCase();
    const hasDataSamples =
      examplesText.includes('example') && (
        examplesText.includes('input') || examplesText.includes('output') ||
        examplesText.includes('response') || examplesText.includes('payload')
      );

    if (hasDataSamples) {
      patterns.push({
        patternType: 'structural',
        patternText: 'Include concrete data samples in the examples section: sample inputs, expected outputs, and realistic tool response payloads',
        triggerCondition: 'data_tools',
      });
    }
  }

  return patterns;
}

/**
 * Persist extracted patterns to DB, respecting dedup and activation rules.
 * - If pattern with same trigger_condition exists: add validation
 * - If new: create with confidence=1 (inactive, needs 2nd source)
 * - Cap at 10 active patterns (evict least confident if exceeded)
 */
export function persistPatterns(
  patterns: ExtractedPattern[],
  reviewId: string
): void {
  try {
    const { personaDb } = require('@/app/db');
    const MAX_ACTIVE = 10;

    for (const pattern of patterns) {
      const existing = personaDb.designPatterns.getByTriggerCondition(pattern.triggerCondition);

      if (existing) {
        // Add this review as additional validation
        personaDb.designPatterns.addValidation(existing.id as string, reviewId);
      } else {
        // Create new pattern (confidence=1, inactive)
        personaDb.designPatterns.create({
          pattern_type: pattern.patternType,
          pattern_text: pattern.patternText,
          trigger_condition: pattern.triggerCondition,
          confidence: 1,
          source_review_ids: JSON.stringify([reviewId]),
          is_active: 0,
        });
      }
    }

    // Enforce cap: if more than MAX_ACTIVE active, evict least confident
    let activeCount = personaDb.designPatterns.countActive();
    while (activeCount > MAX_ACTIVE) {
      const weakest = personaDb.designPatterns.getLeastConfidentActive();
      if (weakest) {
        personaDb.designPatterns.delete(weakest.id as string);
        activeCount--;
      } else {
        break;
      }
    }
  } catch (err) {
    console.error('[PatternExtractor] Error persisting patterns:', err);
  }
}

// ============================================================================
// Helpers
// ============================================================================

function hasPollingTrigger(triggers: SuggestedTrigger[]): boolean {
  return triggers.some((t) => t.trigger_type === 'polling');
}

function hasWebhookTrigger(triggers: SuggestedTrigger[]): boolean {
  return triggers.some((t) => t.trigger_type === 'webhook');
}

function hasScheduleTrigger(triggers: SuggestedTrigger[]): boolean {
  return triggers.some((t) => t.trigger_type === 'schedule');
}
