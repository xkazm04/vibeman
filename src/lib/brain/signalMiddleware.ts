/**
 * Signal Middleware
 * API route wrapper that automatically records behavioral signals
 * based on the action being performed (direction decisions, task executions, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { signalCollector } from './signalCollector';
import { logger } from '@/lib/logger';

type SignalType = 'direction_decision' | 'task_execution' | 'api_focus';

interface SignalMiddlewareConfig {
  signalType: SignalType;
  /** Extract project ID from request/response */
  getProjectId: (req: NextRequest, body?: Record<string, unknown>) => string | null;
  /** Extract context information for signal recording */
  getContextInfo?: (req: NextRequest, body?: Record<string, unknown>) => {
    contextId?: string;
    contextName?: string;
    directionId?: string;
    action?: string;
  };
}

/**
 * Wraps an API route handler to automatically emit signals after successful responses.
 * Signals are recorded asynchronously and never block/fail the main request.
 */
export function withSignalCapture<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  config: SignalMiddlewareConfig
): T {
  const wrapped = async (...args: unknown[]): Promise<NextResponse> => {
    const request = args[0] as NextRequest;

    // Clone request body for signal extraction (if POST/PUT/PATCH)
    let body: Record<string, unknown> | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        body = await request.clone().json();
      } catch {
        // Body not available or not JSON - that's fine
      }
    }

    // Execute the original handler
    const response = await handler(...args);

    // Only record signals for successful responses
    if (response.status >= 200 && response.status < 300) {
      try {
        const projectId = config.getProjectId(request, body);
        if (projectId) {
          const contextInfo = config.getContextInfo?.(request, body) || {};
          recordSignal(config.signalType, projectId, contextInfo);
        }
      } catch (error) {
        // Signal recording must never break the main flow
        logger.debug('[SignalMiddleware] Failed to record signal:', { error });
      }
    }

    return response;
  };

  return wrapped as T;
}

/**
 * Record a signal based on the action type
 */
function recordSignal(
  signalType: SignalType,
  projectId: string,
  contextInfo: {
    contextId?: string;
    contextName?: string;
    directionId?: string;
    action?: string;
  }
): void {
  switch (signalType) {
    case 'direction_decision':
      signalCollector.recordContextFocus(projectId, {
        contextId: contextInfo.contextId || 'unknown',
        contextName: contextInfo.contextName || 'unknown',
        duration: 0,
        actions: [contextInfo.action || 'direction_decision'],
      });
      break;

    case 'task_execution':
      signalCollector.recordImplementation(projectId, {
        requirementId: contextInfo.directionId || 'unknown',
        requirementName: contextInfo.action || 'task_execution',
        contextId: contextInfo.contextId || null,
        filesCreated: [],
        filesModified: [],
        filesDeleted: [],
        success: true,
        executionTimeMs: 0,
      });
      break;

    case 'api_focus':
      signalCollector.recordApiFocus(
        projectId,
        {
          endpoint: contextInfo.action || '/unknown',
          method: 'POST',
          callCount: 1,
          avgResponseTime: 0,
          errorRate: 0,
        },
        contextInfo.contextId,
        contextInfo.contextName
      );
      break;
  }
}
