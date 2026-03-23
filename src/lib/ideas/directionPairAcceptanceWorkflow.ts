/**
 * DirectionPairAcceptanceWorkflow — single source of truth for accepting a direction pair.
 *
 * Encapsulates the full orchestration:
 *   1. Fetch pair and validate both directions exist
 *   2. Claim selected direction for processing (optimistic lock)
 *   3. Build requirement content for selected variant
 *   4. Write requirement file to disk via createRequirement (rollback on failure)
 *   5. Generate paired ADR
 *   6. Update DB status (accept selected, reject other)
 *   7. Invalidate insight + preference caches
 *   8. Record insight influence for both directions
 */

import {
  directionDb,
} from '@/app/db';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { generatePairedAdr } from '@/lib/directions/adrGenerator';
import { emitDirectionChanged } from '@/lib/events/domainEmitters';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AcceptDirectionPairOptions {
  pairId: string;
  variant: 'A' | 'B';
  projectPath: string;
}

export interface AcceptDirectionPairResult {
  success: true;
  requirementName: string;
  requirementPath: string;
  accepted: NonNullable<ReturnType<typeof directionDb.acceptPairedDirection>['accepted']>;
  rejected: ReturnType<typeof directionDb.acceptPairedDirection>['rejected'];
}

export interface AcceptDirectionPairError {
  success: false;
  code: string;
  message: string;
}

export type AcceptDirectionPairOutcome = AcceptDirectionPairResult | AcceptDirectionPairError;

// ---------------------------------------------------------------------------
// Main workflow
// ---------------------------------------------------------------------------

export function acceptDirectionPair(opts: AcceptDirectionPairOptions): AcceptDirectionPairOutcome {
  const { pairId, variant, projectPath } = opts;

  // 1. Fetch pair and validate
  const pair = directionDb.getDirectionPair(pairId);
  if (!pair.directionA || !pair.directionB) {
    return { success: false, code: 'NOT_FOUND', message: 'Direction pair not found or incomplete' };
  }

  const selectedDirection = variant === 'A' ? pair.directionA : pair.directionB;
  const rejectedDirection = variant === 'A' ? pair.directionB : pair.directionA;

  // 2. Claim selected direction (optimistic lock)
  const claimed = directionDb.claimDirectionForProcessing(selectedDirection.id);
  if (!claimed) {
    return { success: false, code: 'ALREADY_PROCESSED', message: 'Direction pair has already been processed' };
  }

  // 3. Build requirement content
  const requirementId = `direction-${uuidv4().slice(0, 8)}`;

  const problemContext = selectedDirection.problem_statement
    ? `## Problem Statement\n\n${selectedDirection.problem_statement}\n\n`
    : '';

  const requirementContent = `# Direction: ${selectedDirection.summary}

${problemContext}## Implementation Details

${selectedDirection.direction}

---

**Context**: ${selectedDirection.context_map_title}
**Generated**: ${new Date().toISOString()}
**Selected Variant**: ${variant} (rejected alternative: ${rejectedDirection.summary})
`;

  // 4. Write requirement file via shared helper (rollback on failure)
  const fileResult = createRequirement(projectPath, requirementId, requirementContent, true);
  if (!fileResult.success) {
    directionDb.updateDirection(selectedDirection.id, { status: 'pending' });
    return { success: false, code: 'FILE_FAILED', message: fileResult.error || 'Failed to create requirement file' };
  }
  const requirementPath = fileResult.filePath!;

  // 5. Update DB status (accept without ADR — ADR is non-critical)
  const dbResult = directionDb.acceptPairedDirection(
    selectedDirection.id,
    requirementId,
    requirementPath,
  );
  if (!dbResult.accepted) {
    directionDb.updateDirection(selectedDirection.id, { status: 'pending' });
    return { success: false, code: 'DB_UPDATE_FAILED', message: 'Failed to update direction status' };
  }

  // 6. Emit domain event for cross-cutting side effects (signal, influence, caches)
  emitDirectionChanged({
    projectId: selectedDirection.project_id,
    directionId: selectedDirection.id,
    action: 'accepted',
    contextId: selectedDirection.context_id || null,
    contextName: selectedDirection.context_map_title,
    requirementId,
    pairedDirectionId: rejectedDirection.id,
    pairedAction: 'rejected',
  });

  // 7. Post-acceptance: generate paired ADR (non-critical).
  // Acceptance has already succeeded — ADR failure must not affect the outcome.
  let finalAccepted = dbResult.accepted;
  try {
    const adr = generatePairedAdr({
      summary: selectedDirection.summary,
      direction: selectedDirection.direction,
      contextMapTitle: selectedDirection.context_map_title,
      problemStatement: selectedDirection.problem_statement,
      rejectedSummary: rejectedDirection.summary,
      rejectedDirection: rejectedDirection.direction,
      selectedVariant: variant,
    });
    directionDb.updateDirection(selectedDirection.id, { decision_record: JSON.stringify(adr) });
    finalAccepted = directionDb.getDirectionById(selectedDirection.id) ?? dbResult.accepted;
  } catch { /* ADR generation failure is non-critical */ }

  return {
    success: true,
    requirementName: requirementId,
    requirementPath,
    accepted: finalAccepted,
    rejected: dbResult.rejected,
  };
}
