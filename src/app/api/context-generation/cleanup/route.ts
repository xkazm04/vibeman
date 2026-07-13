/**
 * API Route: Cleanup Previous Context Generation Data
 *
 * POST /api/context-generation/cleanup
 * Deletes old context groups, contexts, and relationships by specific IDs.
 * Called by the frontend ONLY after a successful context generation scan.
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { contextGroupRepository } from '@/app/db/repositories/context-group.repository';
import { contextGroupRelationshipRepository } from '@/app/db/repositories/context-group-relationship.repository';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { cancelContextMapExport, scheduleContextMapExport } from '@/lib/contexts/exportContextMap';

interface PreviousDataIds {
  contextIds: string[];
  groupIds: string[];
  relationshipIds: string[];
}

interface CleanupRequestBody {
  projectId: string;
  previousDataIds: PreviousDataIds;
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json() as CleanupRequestBody;
    const { projectId, previousDataIds } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!previousDataIds) {
      return NextResponse.json(
        { error: 'previousDataIds is required' },
        { status: 400 }
      );
    }

    const { contextIds = [], groupIds = [], relationshipIds = [] } = previousDataIds;

    // Verify new data actually landed in the DB before deleting the old map. The
    // caller gates this call on counts parsed from CLI stdout, which can be
    // hallucinated or refer to INSERTs that partially failed / rolled back / wrote
    // to a different project. Deleting previousDataIds without a real replacement
    // would wipe the project's entire context map with no undo. Require at least one
    // context for the project whose id is NOT in previousDataIds (i.e. newly created).
    if (contextIds.length > 0) {
      const currentContexts = contextRepository.getContextsByProject(projectId);
      const prevContextIds = new Set(contextIds);
      const hasNewContexts = currentContexts.some((c) => !prevContextIds.has(c.id));
      if (!hasNewContexts) {
        logger.warn('[API] Cleanup refused — no newly-generated contexts replaced the previous map', {
          projectId,
          currentCount: currentContexts.length,
          previousCount: contextIds.length,
        });
        return NextResponse.json(
          {
            success: false,
            skipped: true,
            reason: 'No newly-generated contexts found for this project; refusing to delete the existing context map.',
          },
          { status: 409 }
        );
      }
    }

    logger.info('[API] Cleaning up previous context generation data:', {
      projectId,
      relationships: relationshipIds.length,
      contexts: contextIds.length,
      groups: groupIds.length,
    });

    // Drop any pending post-generation debounced export BEFORE deleting the old
    // rows. Generation creates the new contexts (each schedules a 1500ms export);
    // if that timer fires mid-cleanup it writes a mixed old+new map to disk. We
    // cancel it here and re-schedule a single clean export once deletes complete.
    cancelContextMapExport(projectId);

    let deletedRelationships = 0;
    let deletedContexts = 0;
    let deletedGroups = 0;

    // Delete in dependency order: relationships first, then contexts, then groups
    for (const relId of relationshipIds) {
      try {
        if (contextGroupRelationshipRepository.delete(relId)) {
          deletedRelationships++;
        }
      } catch (err) {
        logger.warn('[API] Failed to delete relationship:', { relId, err });
      }
    }

    for (const ctxId of contextIds) {
      try {
        if (contextRepository.deleteContext(ctxId)) {
          deletedContexts++;
        }
      } catch (err) {
        logger.warn('[API] Failed to delete context:', { ctxId, err });
      }
    }

    for (const grpId of groupIds) {
      try {
        if (contextGroupRepository.deleteGroup(grpId)) {
          deletedGroups++;
        }
      } catch (err) {
        logger.warn('[API] Failed to delete group:', { grpId, err });
      }
    }

    logger.info('[API] Cleanup completed:', {
      projectId,
      deletedRelationships,
      deletedContexts,
      deletedGroups,
    });

    // Now that the old map is gone and only the freshly-generated rows remain,
    // schedule a single export reflecting the final clean state.
    scheduleContextMapExport(projectId);

    return NextResponse.json({
      success: true,
      deleted: {
        relationships: deletedRelationships,
        contexts: deletedContexts,
        groups: deletedGroups,
      },
    });
  } catch (error) {
    logger.error('[API] Context generation cleanup error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/context-generation/cleanup');
