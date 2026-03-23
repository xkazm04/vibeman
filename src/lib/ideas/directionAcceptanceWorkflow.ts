/**
 * DirectionAcceptanceSaga — single source of truth for accepting a direction.
 *
 * Implements a saga pattern: each step declares an optional compensate() function.
 * On failure, all previously executed steps are compensated in reverse order.
 *
 * Steps:
 *   1. claim        — optimistic lock (pending → processing)
 *   2. writeFile    — create requirement file on disk
 *   3. updateDb     — mark direction accepted + store ADR
 *   4. createRecords — create scan + idea records
 *   5. brainSignal  — record implementation signal (non-critical)
 *   6. cacheInvalidate — invalidate insight caches (non-critical)
 *   7. insightInfluence — record influence batch (non-critical)
 */

import {
  directionDb,
  scanDb,
  ideaDb,
} from '@/app/db';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { generateAdr } from '@/lib/directions/adrGenerator';
import { emitDirectionChanged } from '@/lib/events/domainEmitters';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AcceptDirectionOptions {
  directionId: string;
  projectPath: string;
}

export interface AcceptDirectionResult {
  success: true;
  requirementName: string;
  requirementPath: string;
  direction: NonNullable<ReturnType<typeof directionDb.acceptDirection>>;
  ideaId: string;
}

export interface AcceptDirectionError {
  success: false;
  code: string;
  message: string;
  details?: string;
}

export type AcceptDirectionOutcome = AcceptDirectionResult | AcceptDirectionError;

// ---------------------------------------------------------------------------
// Saga runner
// ---------------------------------------------------------------------------

interface SagaStep {
  name: string;
  execute: () => void;
  compensate?: () => void;
}

function runSaga(steps: SagaStep[]): void {
  const executed: SagaStep[] = [];
  for (const step of steps) {
    try {
      step.execute();
      executed.push(step);
    } catch (error) {
      for (const completed of [...executed].reverse()) {
        try { completed.compensate?.(); } catch { /* best-effort */ }
      }
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTitleSlug(title: string): string {
  return title
    .split(/\s+/)
    .slice(0, 5)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildImplementationRequirement(direction: {
  direction: string;
  summary: string;
  context_map_title: string;
}): string {
  return `# Implementation: ${direction.summary}

## Context Area
${direction.context_map_title}

## Description
${direction.summary}

## Implementation Details

${direction.direction}

## Instructions

1. Read and understand the implementation details above
2. Identify all files that need to be modified
3. Implement the changes following the guidance provided
4. Ensure code quality and type safety
5. Test the changes work as expected

## Notes

This requirement was generated from an accepted Development Direction.
Focus on implementing exactly what is described above.
`;
}

// ---------------------------------------------------------------------------
// Main saga
// ---------------------------------------------------------------------------

export function acceptDirection(opts: AcceptDirectionOptions): AcceptDirectionOutcome {
  const { directionId, projectPath } = opts;

  // Pre-flight: claim direction (optimistic lock)
  const claimed = directionDb.claimDirectionForProcessing(directionId);
  if (!claimed) {
    const direction = directionDb.getDirectionById(directionId);
    if (!direction) {
      return { success: false, code: 'NOT_FOUND', message: 'Direction not found' };
    }
    return {
      success: false,
      code: 'ALREADY_PROCESSED',
      message: 'Direction has already been processed',
      details: direction.requirement_id ?? '',
    };
  }

  const direction = directionDb.getDirectionById(directionId);
  if (!direction) {
    return { success: false, code: 'INTERNAL_ERROR', message: 'Direction not found after claim' };
  }

  // Build derived values before saga steps (pure, no side effects)
  const titleSlug = createTitleSlug(direction.summary);
  const requirementId = `dir-${Date.now()}-${titleSlug}`;
  const requirementContent = buildImplementationRequirement({
    direction: direction.direction,
    summary: direction.summary,
    context_map_title: direction.context_map_title,
  });

  // Mutable saga state shared across steps
  let filePath = '';
  let updatedDirection: NonNullable<ReturnType<typeof directionDb.acceptDirection>> | null = null;
  const scanId = uuidv4();
  const ideaId = uuidv4();

  const steps: SagaStep[] = [
    {
      name: 'writeFile',
      execute: () => {
        const result = createRequirement(projectPath, requirementId, requirementContent, true);
        if (!result.success) throw new Error(result.error || 'Failed to create requirement file');
        filePath = result.filePath || '';
      },
      compensate: () => {
        directionDb.updateDirection(directionId, { status: 'pending' });
      },
    },
    {
      name: 'updateDb',
      execute: () => {
        const updated = directionDb.acceptDirection(
          directionId,
          requirementId,
          filePath,
        );
        if (!updated) throw new Error('Failed to update direction status');
        updatedDirection = updated;
      },
      compensate: () => {
        directionDb.updateDirection(directionId, { status: 'pending' });
      },
    },
    {
      name: 'createRecords',
      execute: () => {
        scanDb.createScan({
          id: scanId,
          project_id: direction.project_id,
          scan_type: 'direction_accepted',
          summary: `Direction accepted: ${direction.summary}`,
        });
        ideaDb.createIdea({
          id: ideaId,
          scan_id: scanId,
          project_id: direction.project_id,
          context_id: direction.context_id || null,
          scan_type: 'direction_accepted',
          category: 'direction',
          title: direction.summary,
          description: direction.direction,
          reasoning: `Auto-generated from accepted direction in context: ${direction.context_map_title}`,
          status: 'accepted',
          requirement_id: requirementId,
        });
      },
    },
  ];

  try {
    runSaga(steps);
  } catch (error) {
    return {
      success: false,
      code: 'SAGA_FAILED',
      message: error instanceof Error ? error.message : 'Acceptance saga failed',
    };
  }

  // Emit domain event for cross-cutting side effects (signal, influence, cache)
  emitDirectionChanged({
    projectId: direction.project_id,
    directionId,
    action: 'accepted',
    contextId: direction.context_id || null,
    contextName: direction.context_map_title,
    requirementId,
  });

  // Post-acceptance: generate ADR asynchronously (non-critical).
  // Acceptance has already succeeded — ADR failure must not affect the outcome.
  try {
    const adr = generateAdr({
      summary: direction.summary,
      direction: direction.direction,
      contextMapTitle: direction.context_map_title,
      problemStatement: direction.problem_statement,
    });
    directionDb.updateDirection(directionId, { decision_record: JSON.stringify(adr) });
    // Refresh the direction object so the response includes the ADR
    updatedDirection = directionDb.getDirectionById(directionId) as NonNullable<typeof updatedDirection>;
  } catch { /* ADR generation failure is non-critical — direction is already accepted */ }

  return {
    success: true,
    requirementName: requirementId,
    requirementPath: filePath,
    direction: updatedDirection!,
    ideaId,
  };
}
