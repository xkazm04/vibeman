import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { getDatabase } from '@/app/db/connection';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  withIdeasErrorHandler,
} from '@/app/features/Ideas/lib/ideasHandlers';

const VALID_ACTIONS = ['accept', 'reject', 'archive'] as const;
type BulkAction = (typeof VALID_ACTIONS)[number];

/**
 * POST /api/ideas/bulk
 * Bulk accept, reject, or archive ideas
 * Body: { ideaIds: string[], action: 'accept' | 'reject' | 'archive' }
 */
async function handlePost(request: NextRequest) {
  const body = await request.json();
  const { ideaIds, action } = body as { ideaIds: string[]; action: BulkAction };

  if (!Array.isArray(ideaIds) || ideaIds.length === 0) {
    return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
      field: 'ideaIds',
      message: 'ideaIds must be a non-empty array',
    });
  }

  if (!action || !VALID_ACTIONS.includes(action)) {
    return createIdeasErrorResponse(IdeasErrorCode.INVALID_ACTION, {
      message: `action must be one of: ${VALID_ACTIONS.join(', ')}`,
    });
  }

  const db = getDatabase();
  let successCount = 0;
  let failCount = 0;

  const transaction = db.transaction(() => {
    for (const ideaId of ideaIds) {
      let result;
      switch (action) {
        case 'accept':
          result = ideaDb.updateIdea(ideaId, { status: 'accepted' });
          break;
        case 'reject':
          result = ideaDb.updateIdea(ideaId, {
            status: 'rejected',
            user_feedback: 'Bulk rejected',
          });
          break;
        case 'archive':
          result = ideaDb.updateIdea(ideaId, {
            status: 'rejected',
            user_feedback: 'Bulk archived',
          });
          break;
      }
      if (result) {
        successCount++;
      } else {
        failCount++;
      }
    }
  });

  transaction();

  return NextResponse.json({
    success: true,
    successCount,
    failCount,
    total: ideaIds.length,
  });
}

export const POST = withIdeasErrorHandler(handlePost, IdeasErrorCode.UPDATE_FAILED);
