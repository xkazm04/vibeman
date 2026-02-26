/**
 * POST /api/directions/pair/[pairId]/accept
 * Accept one variant from a direction pair
 */

import { NextRequest, NextResponse } from 'next/server';
import { directionDb, insightEffectivenessCache } from '@/app/db';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generatePairedAdr } from '@/lib/directions/adrGenerator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pairId: string }> }
) {
  try {
    const { pairId } = await params;
    const body = await request.json();
    const { variant, projectPath } = body;

    if (!variant || !['A', 'B'].includes(variant)) {
      return NextResponse.json(
        { error: 'variant must be "A" or "B"' },
        { status: 400 }
      );
    }

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    // Get both directions in the pair
    const pair = directionDb.getDirectionPair(pairId);

    if (!pair.directionA || !pair.directionB) {
      return NextResponse.json(
        { error: 'Direction pair not found or incomplete' },
        { status: 404 }
      );
    }

    const selectedDirection = variant === 'A' ? pair.directionA : pair.directionB;
    const rejectedDirection = variant === 'A' ? pair.directionB : pair.directionA;

    // Atomically claim the selected direction (prevents double-click duplicates)
    const claimed = directionDb.claimDirectionForProcessing(selectedDirection.id);
    if (!claimed) {
      return NextResponse.json(
        {
          error: 'Direction pair has already been processed',
          accepted: selectedDirection,
          rejected: rejectedDirection,
        },
        { status: 409 }
      );
    }

    // Create requirement file for the selected direction
    const normalizedProjectPath = path.normalize(projectPath);
    const requirementsDir = path.join(normalizedProjectPath, '.claude', 'requirements');

    if (!fs.existsSync(requirementsDir)) {
      fs.mkdirSync(requirementsDir, { recursive: true });
    }

    const requirementId = `direction-${uuidv4().slice(0, 8)}`;
    const requirementPath = path.join(requirementsDir, `${requirementId}.md`);

    // Build requirement content
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

    try {
      fs.writeFileSync(requirementPath, requirementContent, 'utf-8');
    } catch (fileError) {
      // Rollback: reset direction from 'processing' back to 'pending' so user can retry
      directionDb.updateDirection(selectedDirection.id, { status: 'pending' });
      logger.error('[API] Pair requirement file creation failed, rolled back direction to pending:', {
        pairId,
        directionId: selectedDirection.id,
        requirementId,
        error: fileError,
      });
      return NextResponse.json(
        { error: 'Failed to create requirement file. Direction has been reset — you can retry.' },
        { status: 500 }
      );
    }

    // Generate Architecture Decision Record with rejected alternative
    const adr = generatePairedAdr({
      summary: selectedDirection.summary,
      direction: selectedDirection.direction,
      contextMapTitle: selectedDirection.context_map_title,
      problemStatement: selectedDirection.problem_statement,
      rejectedSummary: rejectedDirection.summary,
      rejectedDirection: rejectedDirection.direction,
      selectedVariant: variant as 'A' | 'B',
    });
    const decisionRecordJson = JSON.stringify(adr);

    // Accept the selected direction and reject the other
    const result = directionDb.acceptPairedDirection(selectedDirection.id, requirementId, requirementPath, decisionRecordJson);

    if (!result.accepted) {
      // Rollback: clean up orphan file and reset direction
      try { fs.unlinkSync(requirementPath); } catch { /* best-effort cleanup */ }
      directionDb.updateDirection(selectedDirection.id, { status: 'pending' });
      logger.error('[API] Pair DB update failed after file creation, rolled back:', {
        pairId,
        directionId: selectedDirection.id,
        requirementId,
      });
      return NextResponse.json(
        { error: 'Failed to update direction status. Direction has been reset — you can retry.' },
        { status: 500 }
      );
    }

    logger.info('[API] Direction pair variant accepted:', {
      pairId,
      acceptedVariant: variant,
      acceptedId: selectedDirection.id,
      rejectedId: rejectedDirection.id,
      requirementId,
    });

    // Invalidate effectiveness cache since direction data changed
    try { insightEffectivenessCache.invalidate(selectedDirection.project_id); } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      accepted: result.accepted,
      rejected: result.rejected,
      requirementName: requirementId,
      requirementPath,
    });
  } catch (error) {
    logger.error('[API] Direction pair accept error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
