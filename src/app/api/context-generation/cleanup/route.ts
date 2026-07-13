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

    // Fetch the project's current contexts once: used BOTH to verify new data
    // landed AND to protect canonical-pinned contexts (migration 233) from
    // deletion. Pinning is the promise stamped into CLAUDE.md — "a context can be
    // pinned to survive a full rebuild" — and cleanup is the authoritative guard:
    // even if a stale previousDataIds (captured before a pin) lists a now-pinned
    // context, it is preserved here.
    const currentContexts = contextRepository.getContextsByProject(projectId);
    const pinnedContextIds = new Set(currentContexts.filter((c) => c.pinned).map((c) => c.id));
    // Groups that still hold a pinned context survive too, so the pinned context
    // keeps its group membership instead of being silently ungrouped (group_id →
    // NULL) by deleteGroup. Prevents a pinned context's group reference dangling.
    const pinnedGroupIds = new Set(
      currentContexts.filter((c) => c.pinned && c.group_id).map((c) => c.group_id as string)
    );

    // Verify new data actually landed in the DB before deleting the old map. The
    // caller gates this call on counts parsed from CLI stdout, which can be
    // hallucinated or refer to INSERTs that partially failed / rolled back / wrote
    // to a different project. Deleting previousDataIds without a real replacement
    // would wipe the project's entire context map with no undo. Require at least one
    // context for the project whose id is NOT in previousDataIds (i.e. newly
    // created) AND not pinned — a pinned context is pre-existing, not a sign that
    // regeneration produced anything.
    if (contextIds.length > 0) {
      const prevContextIds = new Set(contextIds);
      const hasNewContexts = currentContexts.some((c) => !prevContextIds.has(c.id) && !c.pinned);
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
    let preservedPinnedContexts = 0;
    let preservedPinnedGroups = 0;

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
      // Canonical pin survives a full rebuild.
      if (pinnedContextIds.has(ctxId)) {
        preservedPinnedContexts++;
        continue;
      }
      try {
        if (contextRepository.deleteContext(ctxId)) {
          deletedContexts++;
        }
      } catch (err) {
        logger.warn('[API] Failed to delete context:', { ctxId, err });
      }
    }

    for (const grpId of groupIds) {
      // Preserve any group that still holds a pinned context so the pin keeps its
      // group membership (deleteGroup would ungroup it to NULL otherwise).
      if (pinnedGroupIds.has(grpId)) {
        preservedPinnedGroups++;
        continue;
      }
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
      preservedPinnedContexts,
      preservedPinnedGroups,
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
