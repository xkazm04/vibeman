/**
 * API Route: Brain Signals
 *
 * POST /api/brain/signals - Record a behavioral signal
 * GET /api/brain/signals - Get signals for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { behavioralSignalDb } from '@/app/db';
import type { BehavioralSignalType } from '@/app/db/models/brain.types';
import { signalCollector } from '@/lib/brain/signalCollector';
import { withObservability } from '@/lib/observability/middleware';
import { invalidateContextCache } from '@/app/api/brain/context/route';

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
      return NextResponse.json(
        { success: false, error: 'projectId, signalType, and data are required' },
        { status: 400 }
      );
    }

    // Validate signal type
    const validTypes: BehavioralSignalType[] = [
      'git_activity',
      'api_focus',
      'context_focus',
      'implementation',
      'cli_memory',
    ];

    if (!validTypes.includes(signalType)) {
      return NextResponse.json(
        { success: false, error: `Invalid signalType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate signal data shape before passing to collector
    const validationError = validateSignalData(signalType, data);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: `Invalid signal data: ${validationError}` },
        { status: 400 }
      );
    }

    // Route to appropriate collector method
    switch (signalType) {
      case 'git_activity':
        signalCollector.recordGitActivity(projectId, data, contextId, contextName);
        break;
      case 'api_focus':
        signalCollector.recordApiFocus(projectId, data, contextId, contextName);
        break;
      case 'context_focus':
        signalCollector.recordContextFocus(projectId, data);
        break;
      case 'implementation':
        signalCollector.recordImplementation(projectId, data);
        break;
      case 'cli_memory':
        signalCollector.recordCliMemory(projectId, data, contextId, contextName);
        break;
    }

    // Invalidate cached behavioral context so next read reflects new signal
    invalidateContextCache(projectId);

    return NextResponse.json({
      success: true,
      message: `Signal recorded: ${signalType}`,
    });
  } catch (error) {
    console.error('[API] Brain signals POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/brain/signals
 * Get behavioral signals for a project
 *
 * Query params:
 * - projectId: string (required)
 * - signalType: BehavioralSignalType (optional)
 * - contextId: string (optional)
 * - limit: number (optional, default 50)
 * - since: ISO date string (optional)
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const signalType = searchParams.get('signalType') as BehavioralSignalType | null;
    const contextId = searchParams.get('contextId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const since = searchParams.get('since');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const signals = behavioralSignalDb.getByProject(projectId, {
      signalType: signalType || undefined,
      contextId: contextId || undefined,
      limit,
      since: since || undefined,
    });

    // Also get aggregated stats
    const counts = behavioralSignalDb.getCountByType(projectId);
    const contextActivity = behavioralSignalDb.getContextActivity(projectId);

    return NextResponse.json({
      success: true,
      signals,
      stats: {
        counts,
        contextActivity: contextActivity.slice(0, 10), // Top 10 contexts
        totalSignals: signals.length,
      },
    });
  } catch (error) {
    console.error('[API] Brain signals GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/brain/signals
 * Delete a behavioral signal by ID
 *
 * Query params:
 * - id: string (required) - signal ID to delete
 */
async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    // Look up project_id before deleting so we can invalidate cache
    const projectId = searchParams.get('projectId');

    const deleted = behavioralSignalDb.deleteById(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Signal not found' },
        { status: 404 }
      );
    }

    // Invalidate cached behavioral context if we know the project
    if (projectId) {
      invalidateContextCache(projectId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Brain signals DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/brain/signals');
export const GET = withObservability(handleGet, '/api/brain/signals');
export const DELETE = withObservability(handleDelete, '/api/brain/signals');
