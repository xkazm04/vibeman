/**
 * Remote Command Handlers
 * Register handlers for all supported command types
 */

import { commandProcessor } from './commandProcessor';
import type {
  RemoteCommand,
  CommandHandlerResult,
  CreateGoalPayload,
  UpdateGoalPayload,
  IdeaActionPayload,
  BatchControlPayload,
  TriggerScanPayload,
} from './types';

/**
 * Register all command handlers
 * Call this during app initialization
 */
export function registerAllCommandHandlers(): void {
  // Goal commands
  commandProcessor.registerHandler('create_goal', handleCreateGoal);
  commandProcessor.registerHandler('update_goal', handleUpdateGoal);
  commandProcessor.registerHandler('delete_goal', handleDeleteGoal);

  // Idea commands
  commandProcessor.registerHandler('accept_idea', handleAcceptIdea);
  commandProcessor.registerHandler('reject_idea', handleRejectIdea);
  commandProcessor.registerHandler('skip_idea', handleSkipIdea);

  // Batch commands
  commandProcessor.registerHandler('start_batch', handleStartBatch);
  commandProcessor.registerHandler('pause_batch', handlePauseBatch);
  commandProcessor.registerHandler('resume_batch', handleResumeBatch);
  commandProcessor.registerHandler('stop_batch', handleStopBatch);

  // Scan commands
  commandProcessor.registerHandler('trigger_scan', handleTriggerScan);

  console.log('[CommandHandlers] All handlers registered');
}

// ============================================================================
// Goal Handlers
// ============================================================================

async function handleCreateGoal(command: RemoteCommand): Promise<CommandHandlerResult> {
  try {
    const payload = command.payload as CreateGoalPayload;

    if (!payload.name || !payload.projectId) {
      return { success: false, error: 'Missing required fields: name, projectId' };
    }

    // Dynamic import to avoid circular dependencies
    const { goalDb } = await import('@/app/db');

    const goal = goalDb.createGoal({
      title: payload.name,
      project_id: payload.projectId,
      description: payload.description || '',
      context_id: payload.contextId || null,
      status: 'active',
      priority: 'medium',
    });

    return {
      success: true,
      result: { goalId: goal.id, name: goal.title },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create goal',
    };
  }
}

async function handleUpdateGoal(command: RemoteCommand): Promise<CommandHandlerResult> {
  try {
    const payload = command.payload as UpdateGoalPayload;

    if (!payload.goalId) {
      return { success: false, error: 'Missing required field: goalId' };
    }

    const { goalDb } = await import('@/app/db');

    const updates: Record<string, unknown> = {};
    if (payload.name) updates.title = payload.name;
    if (payload.description) updates.description = payload.description;
    if (payload.status) updates.status = payload.status;

    goalDb.updateGoal(payload.goalId, updates);

    return {
      success: true,
      result: { goalId: payload.goalId },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update goal',
    };
  }
}

async function handleDeleteGoal(command: RemoteCommand): Promise<CommandHandlerResult> {
  try {
    const payload = command.payload as { goalId: string };

    if (!payload.goalId) {
      return { success: false, error: 'Missing required field: goalId' };
    }

    const { goalDb } = await import('@/app/db');
    goalDb.deleteGoal(payload.goalId);

    return {
      success: true,
      result: { goalId: payload.goalId },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete goal',
    };
  }
}

// ============================================================================
// Idea Handlers
// ============================================================================

async function handleAcceptIdea(command: RemoteCommand): Promise<CommandHandlerResult> {
  try {
    const payload = command.payload as IdeaActionPayload;

    if (!payload.ideaId) {
      return { success: false, error: 'Missing required field: ideaId' };
    }

    const { ideaDb } = await import('@/app/db');
    ideaDb.updateIdea(payload.ideaId, { status: 'accepted' });

    return {
      success: true,
      result: { ideaId: payload.ideaId, status: 'accepted' },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept idea',
    };
  }
}

async function handleRejectIdea(command: RemoteCommand): Promise<CommandHandlerResult> {
  try {
    const payload = command.payload as IdeaActionPayload;

    if (!payload.ideaId) {
      return { success: false, error: 'Missing required field: ideaId' };
    }

    const { ideaDb } = await import('@/app/db');
    ideaDb.updateIdea(payload.ideaId, { status: 'rejected' });

    return {
      success: true,
      result: { ideaId: payload.ideaId, status: 'rejected' },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject idea',
    };
  }
}

async function handleSkipIdea(command: RemoteCommand): Promise<CommandHandlerResult> {
  try {
    const payload = command.payload as IdeaActionPayload;

    if (!payload.ideaId) {
      return { success: false, error: 'Missing required field: ideaId' };
    }

    // Skip doesn't change status, just acknowledges the idea was seen
    return {
      success: true,
      result: { ideaId: payload.ideaId, action: 'skipped' },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to skip idea',
    };
  }
}

// ============================================================================
// Batch Handlers (Placeholders - require TaskRunner integration)
// ============================================================================

async function handleStartBatch(command: RemoteCommand): Promise<CommandHandlerResult> {
  const payload = command.payload as BatchControlPayload;

  if (!payload.batchId) {
    return { success: false, error: 'Missing required field: batchId' };
  }

  // TODO: Integrate with TaskRunner store to start batch
  // For now, return a placeholder response
  return {
    success: true,
    result: {
      batchId: payload.batchId,
      action: 'start',
      message: 'Batch start command received. TaskRunner integration pending.',
    },
  };
}

async function handlePauseBatch(command: RemoteCommand): Promise<CommandHandlerResult> {
  const payload = command.payload as BatchControlPayload;

  if (!payload.batchId) {
    return { success: false, error: 'Missing required field: batchId' };
  }

  return {
    success: true,
    result: {
      batchId: payload.batchId,
      action: 'pause',
      message: 'Batch pause command received. TaskRunner integration pending.',
    },
  };
}

async function handleResumeBatch(command: RemoteCommand): Promise<CommandHandlerResult> {
  const payload = command.payload as BatchControlPayload;

  if (!payload.batchId) {
    return { success: false, error: 'Missing required field: batchId' };
  }

  return {
    success: true,
    result: {
      batchId: payload.batchId,
      action: 'resume',
      message: 'Batch resume command received. TaskRunner integration pending.',
    },
  };
}

async function handleStopBatch(command: RemoteCommand): Promise<CommandHandlerResult> {
  const payload = command.payload as BatchControlPayload;

  if (!payload.batchId) {
    return { success: false, error: 'Missing required field: batchId' };
  }

  return {
    success: true,
    result: {
      batchId: payload.batchId,
      action: 'stop',
      message: 'Batch stop command received. TaskRunner integration pending.',
    },
  };
}

// ============================================================================
// Scan Handlers (Placeholder - requires Scan Queue integration)
// ============================================================================

async function handleTriggerScan(command: RemoteCommand): Promise<CommandHandlerResult> {
  const payload = command.payload as TriggerScanPayload;

  if (!payload.projectId || !payload.scanTypes || payload.scanTypes.length === 0) {
    return { success: false, error: 'Missing required fields: projectId, scanTypes' };
  }

  // TODO: Integrate with scan queue to trigger scan
  return {
    success: true,
    result: {
      projectId: payload.projectId,
      scanTypes: payload.scanTypes,
      contextIds: payload.contextIds,
      message: 'Scan trigger command received. Scan queue integration pending.',
    },
  };
}
