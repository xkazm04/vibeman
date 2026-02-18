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

    logger.info('[API] Cleaning up previous context generation data:', {
      projectId,
      relationships: relationshipIds.length,
      contexts: contextIds.length,
      groups: groupIds.length,
    });

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
