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
  StartBatchPayload,
} from './types';
import { remoteEvents } from './eventPublisher';

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
// Batch Handlers
// ============================================================================

async function handleStartBatch(command: RemoteCommand): Promise<CommandHandlerResult> {
  const payload = command.payload as StartBatchPayload;

  // Validate payload
  if (!payload.requirement_names || payload.requirement_names.length === 0) {
    return { success: false, error: 'No requirements specified in start_batch command' };
  }

  if (!payload.project_id) {
    return { success: false, error: 'project_id is required' };
  }

  try {
    // Dynamic imports to avoid circular dependencies and server-side issues
    const { useZenStore } = await import('@/app/zen/lib/zenStore');
    const { useCLISessionStore } = await import('@/components/cli/store');
    const { executeNextTask } = await import('@/components/cli/store/cliExecutionManager');
    const { projectDb } = await import('@/app/db');
    const path = await import('path');
    const fs = await import('fs');

    // Type for session IDs
    type CLISessionId = 'cliSession1' | 'cliSession2' | 'cliSession3' | 'cliSession4';

    // Check zen mode - must be 'online' to accept commands
    const zenState = useZenStore.getState();
    if (zenState.mode !== 'online') {
      return {
        success: false,
        error: 'Vibeman is not in Zen mode. Cannot accept remote batch commands.',
      };
    }

    // Get project details
    const project = projectDb.getProject(payload.project_id);
    if (!project) {
      return {
        success: false,
        error: `Project not found: ${payload.project_id}`,
      };
    }

    const projectPath = payload.project_path || project.path;
    const projectName = project.name;

    // Find available session slot
    const sessionStore = useCLISessionStore.getState();
    const sessions = sessionStore.sessions;
    const sessionIds: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];

    let targetSessionId: CLISessionId | null = null;

    // Check preference first
    if (payload.session_preference && sessionIds.includes(payload.session_preference as CLISessionId)) {
      const prefSession = sessions[payload.session_preference as CLISessionId];
      if (!prefSession.isRunning && prefSession.queue.filter(t => t.status === 'pending').length === 0) {
        targetSessionId = payload.session_preference as CLISessionId;
      }
    }

    // Auto-assign to first available if no preference or preference unavailable
    if (!targetSessionId) {
      for (const sessionId of sessionIds) {
        const session = sessions[sessionId];
        if (!session.isRunning && session.queue.filter(t => t.status === 'pending').length === 0) {
          targetSessionId = sessionId;
          break;
        }
      }
    }

    if (!targetSessionId) {
      const activeSessions = sessionIds.filter(id => sessions[id].isRunning).length;
      return {
        success: false,
        error: `No available CLI session slots (${activeSessions}/4 busy)`,
      };
    }

    // Load requirements from filesystem
    const requirementsDir = path.join(projectPath, '.claude', 'requirements');
    const tasks: Array<{
      id: string;
      requirementName: string;
      projectPath: string;
      projectId: string;
      projectName: string;
      status: 'pending';
      addedAt: number;
    }> = [];

    for (const reqName of payload.requirement_names) {
      const reqFile = path.join(requirementsDir, `${reqName}.md`);
      if (fs.existsSync(reqFile)) {
        tasks.push({
          id: `${payload.project_id}-${reqName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          requirementName: reqName,
          projectPath,
          projectId: payload.project_id,
          projectName,
          status: 'pending',
          addedAt: Date.now(),
        });
      } else {
        console.warn(`[start_batch] Requirement not found: ${reqFile}`);
      }
    }

    if (tasks.length === 0) {
      return {
        success: false,
        error: 'No valid requirements found. Check that requirement files exist in .claude/requirements/',
      };
    }

    // Generate batch ID for event tracking
    const batchId = `batch-${Date.now()}`;

    // Add tasks to session queue
    sessionStore.addTasksToSession(targetSessionId, tasks);
    sessionStore.setAutoStart(targetSessionId, true);
    sessionStore.setRunning(targetSessionId, true);

    // Publish batch start event
    remoteEvents.publish('task_started', {
      taskId: tasks[0].id,
      title: tasks[0].requirementName,
      batchId,
      sessionId: targetSessionId,
      totalTasks: tasks.length,
    }, payload.project_id);

    // Start execution
    executeNextTask(targetSessionId);

    return {
      success: true,
      result: {
        session_id: targetSessionId,
        task_count: tasks.length,
        tasks_queued: tasks.map(t => t.requirementName),
        batch_id: batchId,
        message: `Started batch with ${tasks.length} tasks in session ${targetSessionId}`,
      },
    };
  } catch (error) {
    console.error('[start_batch] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error executing start_batch',
    };
  }
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
