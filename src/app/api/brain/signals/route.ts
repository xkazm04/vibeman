/**
 * API Route: Brain Signals
 *
 * POST /api/brain/signals - Record a behavioral signal
 * GET /api/brain/signals - Get signals for a project
 * DELETE /api/brain/signals - Delete a signal by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { behavioralSignalDb } from '@/app/db';
import type { BehavioralSignalType } from '@/types/signals';
import { getAllSignalTypes, isValidSignalType } from '@/types/signals';
import { withObservability } from '@/lib/observability/middleware';
import { recordSignal, deleteSignal } from '@/lib/brain/brainService';
import { parseQueryInt } from '@/lib/api-helpers/parseQueryInt';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';

/**
 * Validate signal data shape matches the expected type.
 * Returns an error message if invalid, or null if valid.
 */
function validateSignalData(signalType: BehavioralSignalType, data: Record<string, unknown>): string | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'data must be a JSON object';
  }

  switch (signalType) {
    case 'git_activity': {
      if (!Array.isArray(data.filesChanged)) return 'git_activity.data requires filesChanged (string[])';
      if (typeof data.commitMessage !== 'string') return 'git_activity.data requires commitMessage (string)';
      if (typeof data.linesAdded !== 'number') return 'git_activity.data requires linesAdded (number)';
      if (typeof data.linesRemoved !== 'number') return 'git_activity.data requires linesRemoved (number)';
      if (typeof data.branch !== 'string') return 'git_activity.data requires branch (string)';
      return null;
    }
    case 'api_focus': {
      if (typeof data.endpoint !== 'string') return 'api_focus.data requires endpoint (string)';
      if (typeof data.method !== 'string') return 'api_focus.data requires method (string)';
      if (typeof data.callCount !== 'number') return 'api_focus.data requires callCount (number)';
      if (typeof data.avgResponseTime !== 'number') return 'api_focus.data requires avgResponseTime (number)';
      if (typeof data.errorRate !== 'number') return 'api_focus.data requires errorRate (number)';
      return null;
    }
    case 'context_focus': {
      if (typeof data.contextId !== 'string') return 'context_focus.data requires contextId (string)';
      if (typeof data.contextName !== 'string') return 'context_focus.data requires contextName (string)';
      if (typeof data.duration !== 'number') return 'context_focus.data requires duration (number)';
      if (!Array.isArray(data.actions)) return 'context_focus.data requires actions (string[])';
      return null;
    }
    case 'implementation': {
      if (typeof data.requirementId !== 'string') return 'implementation.data requires requirementId (string)';
      if (typeof data.requirementName !== 'string') return 'implementation.data requires requirementName (string)';
      if (!Array.isArray(data.filesCreated)) return 'implementation.data requires filesCreated (string[])';
      if (!Array.isArray(data.filesModified)) return 'implementation.data requires filesModified (string[])';
      if (!Array.isArray(data.filesDeleted)) return 'implementation.data requires filesDeleted (string[])';
      if (typeof data.success !== 'boolean') return 'implementation.data requires success (boolean)';
      if (typeof data.executionTimeMs !== 'number') return 'implementation.data requires executionTimeMs (number)';
      return null;
    }
    case 'cli_memory': {
      const validCategories = ['decision', 'insight', 'pattern', 'context', 'lesson'];
      if (typeof data.category !== 'string' || !validCategories.includes(data.category)) {
        return `cli_memory.data requires category (one of: ${validCategories.join(', ')})`;
      }
      if (typeof data.message !== 'string') return 'cli_memory.data requires message (string)';
      if (typeof data.source !== 'string') return 'cli_memory.data requires source (string)';
      return null;
    }
    default:
      return `Unknown signal type: ${signalType}`;
  }
}

/**
 * POST /api/brain/signals
 * Record a new behavioral signal
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    const { projectId, signalType, data, contextId, contextName } = body;

    if (!projectId || !signalType || !data) {
      return buildErrorResponse('projectId, signalType, and data are required', { status: 400 });
    }

    // Validate signal type using canonical enum
    if (!isValidSignalType(signalType)) {
      const validTypes = getAllSignalTypes();
      return buildErrorResponse(
        `Invalid signalType. Must be one of: ${validTypes.join(', ')}`,
        { status: 400 }
      );
    }

    // Validate signal data shape before passing to service
    const validationError = validateSignalData(signalType, data);
    if (validationError) {
      return buildErrorResponse(`Invalid signal data: ${validationError}`, { status: 400 });
    }

    recordSignal({ projectId, signalType, data, contextId, contextName });

    return buildSuccessResponse({ message: `Signal recorded: ${signalType}` });
  } catch (error) {
    console.error('[API] Brain signals POST error:', error);
    return buildErrorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * GET /api/brain/signals
 * Get behavioral signals for a project
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const signalType = searchParams.get('signalType') as BehavioralSignalType | null;
    const contextId = searchParams.get('contextId');
    const since = searchParams.get('since');

    if (!projectId) {
      return buildErrorResponse('projectId is required', { status: 400 });
    }

    const limit = parseQueryInt(searchParams.get('limit'), {
      default: 50,
      min: 1,
      max: 1000,
      paramName: 'limit',
    });

    const signals = behavioralSignalDb.getByProject(projectId, {
      signalType: signalType || undefined,
      contextId: contextId || undefined,
      limit,
      since: since || undefined,
    });

    const counts = behavioralSignalDb.getCountByType(projectId);
    const contextActivity = behavioralSignalDb.getContextActivity(projectId);

    return buildSuccessResponse({
      signals,
      stats: {
        counts,
        contextActivity: contextActivity.slice(0, 10),
        totalSignals: signals.length,
      },
    });
  } catch (error) {
    console.error('[API] Brain signals GET error:', error);
    return buildErrorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * DELETE /api/brain/signals
 * Delete a behavioral signal by ID
 */
async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return buildErrorResponse('id is required', { status: 400 });
    }

    const deleted = deleteSignal(id);

    if (!deleted) {
      return buildErrorResponse('Signal not found', { status: 404 });
    }

    return buildSuccessResponse({});
  } catch (error) {
    console.error('[API] Brain signals DELETE error:', error);
    return buildErrorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/brain/signals');
export const GET = withObservability(handleGet, '/api/brain/signals');
export const DELETE = withObservability(handleDelete, '/api/brain/signals');
