/**
 * DirectionAcceptanceSaga — single source of truth for accepting a direction
 * (single OR pair variant).
 *
 * Implements a saga pattern: each step declares an optional compensate() function.
 * On failure, all previously executed steps are compensated in reverse order.
 *
 * Steps:
 *   1. resolve       — look up target direction (and pair partner when applicable)
 *   2. claim         — optimistic lock (pending → processing)
 *   3. writeFile     — create requirement file on disk
 *   4. updateDb      — mark direction accepted + reject pair partner if paired
 *   5. createRecords — create scan + idea records
 *   6. emit          — domain event for cross-cutting side effects
 *   7. adr           — generate ADR (non-critical)
 */

import {
  directionDb,
  scanDb,
  ideaDb,
} from '@/app/db';
import { DbDirection } from '@/app/db/models/types';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { generateAdr, generatePairedAdr } from '@/lib/directions/adrGenerator';
import { emitDirectionChanged } from '@/lib/events/domainEmitters';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AcceptDirectionOptions =
  | { directionId: string; projectPath: string }
  | { pairId: string; variant: 'A' | 'B'; projectPath: string };

export interface AcceptDirectionResult {
  success: true;
  requirementName: string;
  requirementPath: string;
  direction: DbDirection;
  ideaId: string;
  rejected?: DbDirection | null;
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

function buildRequirementContent(
  direction: DbDirection,
  rejectedDirection: DbDirection | null,
): string {
  const problemContext = direction.problem_statement
    ? `\n## Problem Statement\n\n${direction.problem_statement}\n`
    : '';

  const pairContext = rejectedDirection
    ? `\n---\n\n**Selected Variant**: ${direction.pair_label} (rejected alternative: ${rejectedDirection.summary})\n`
    : '';

  return `# Implementation: ${direction.summary}

## Context Area
${direction.context_map_title}
${problemContext}
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
${pairContext}
## Notes

This requirement was generated from an accepted Development Direction.
Focus on implementing exactly what is described above.
`;
}

// ---------------------------------------------------------------------------
// Main saga
// ---------------------------------------------------------------------------

export function acceptDirection(opts: AcceptDirectionOptions): AcceptDirectionOutcome {
  const { projectPath } = opts;

  // 1. Resolve the target direction (and optional pair partner)
  let targetDirection: DbDirection;
  let rejectedDirection: DbDirection | null = null;

  if ('pairId' in opts) {
    const pair = directionDb.getDirectionPair(opts.pairId);
    if (!pair.directionA || !pair.directionB) {
      return { success: false, code: 'NOT_FOUND', message: 'Direction pair not found or incomplete' };
    }
    targetDirection = opts.variant === 'A' ? pair.directionA : pair.directionB;
    rejectedDirection = opts.variant === 'A' ? pair.directionB : pair.directionA;
  } else {
    const dir = directionDb.getDirectionById(opts.directionId);
    if (!dir) {
      return { success: false, code: 'NOT_FOUND', message: 'Direction not found' };
    }
    targetDirection = dir;

    // Auto-detect pair partner
    if (dir.pair_id) {
      rejectedDirection = directionDb.getPairedDirection(dir.id);
    }
  }

  // 2. Claim direction (optimistic lock)
  const claimed = directionDb.claimDirectionForProcessing(targetDirection.id);
  if (!claimed) {
    return {
      success: false,
      code: 'ALREADY_PROCESSED',
      message: rejectedDirection
        ? 'Direction pair has already been processed'
        : 'Direction has already been processed',
      details: targetDirection.requirement_id ?? '',
    };
  }

  // 3. Build derived values (pure, no side effects)
  const titleSlug = createTitleSlug(targetDirection.summary);
  const requirementId = `dir-${Date.now()}-${titleSlug}`;
  const requirementContent = buildRequirementContent(targetDirection, rejectedDirection);

  // Mutable saga state shared across steps
  let filePath = '';
  let updatedDirection: DbDirection | null = null;
  let dbRejected: DbDirection | null = null;
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
        directionDb.updateDirection(targetDirection.id, { status: 'pending' });
      },
    },
    {
      name: 'updateDb',
      execute: () => {
        if (rejectedDirection) {
          const pairResult = directionDb.acceptPairedDirection(
            targetDirection.id,
            requirementId,
            filePath,
          );
          if (!pairResult.accepted) throw new Error('Failed to update direction status');
          updatedDirection = pairResult.accepted;
          dbRejected = pairResult.rejected;
        } else {
          const updated = directionDb.acceptDirection(
            targetDirection.id,
            requirementId,
            filePath,
          );
          if (!updated) throw new Error('Failed to update direction status');
          updatedDirection = updated;
        }
      },
      compensate: () => {
        directionDb.updateDirection(targetDirection.id, { status: 'pending' });
      },
    },
    {
      name: 'createRecords',
      execute: () => {
        scanDb.createScan({
          id: scanId,
          project_id: targetDirection.project_id,
          scan_type: 'direction_accepted',
          summary: `Direction accepted: ${targetDirection.summary}`,
        });
        ideaDb.createIdea({
          id: ideaId,
          scan_id: scanId,
          project_id: targetDirection.project_id,
          context_id: targetDirection.context_id || null,
          scan_type: 'direction_accepted',
          category: 'direction',
          title: targetDirection.summary,
          description: targetDirection.direction,
          reasoning: `Auto-generated from accepted direction in context: ${targetDirection.context_map_title}`,
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

  // Emit domain event for cross-cutting side effects
  emitDirectionChanged({
    projectId: targetDirection.project_id,
    directionId: targetDirection.id,
    action: 'accepted',
    contextId: targetDirection.context_id || null,
    contextName: targetDirection.context_map_title,
    requirementId,
    pairedDirectionId: rejectedDirection?.id ?? null,
    pairedAction: rejectedDirection ? 'rejected' : undefined,
  });

  // Post-acceptance: generate ADR (non-critical)
  try {
    const adr = rejectedDirection
      ? generatePairedAdr({
          summary: targetDirection.summary,
          direction: targetDirection.direction,
          contextMapTitle: targetDirection.context_map_title,
          problemStatement: targetDirection.problem_statement,
          rejectedSummary: rejectedDirection.summary,
          rejectedDirection: rejectedDirection.direction,
          selectedVariant: (targetDirection.pair_label as 'A' | 'B') ?? 'A',
        })
      : generateAdr({
          summary: targetDirection.summary,
          direction: targetDirection.direction,
          contextMapTitle: targetDirection.context_map_title,
          problemStatement: targetDirection.problem_statement,
        });
    directionDb.updateDirection(targetDirection.id, { decision_record: JSON.stringify(adr) });
    updatedDirection = directionDb.getDirectionById(targetDirection.id) ?? updatedDirection;
  } catch { /* ADR generation failure is non-critical */ }

  return {
    success: true,
    requirementName: requirementId,
    requirementPath: filePath,
    direction: updatedDirection!,
    ideaId,
    rejected: dbRejected,
  };
}
