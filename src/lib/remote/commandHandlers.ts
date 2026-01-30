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

  // Mesh commands (Emulator mode)
  commandProcessor.registerHandler('fetch_directions', handleFetchDirections);
  commandProcessor.registerHandler('fetch_ideas', handleFetchIdeas);
  commandProcessor.registerHandler('triage_direction', handleTriageDirection);
  commandProcessor.registerHandler('triage_idea', handleTriageIdea);
  commandProcessor.registerHandler('fetch_requirements', handleFetchRequirements);
  commandProcessor.registerHandler('start_remote_batch', handleStartRemoteBatch);
  commandProcessor.registerHandler('get_batch_status', handleGetBatchStatus);

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
    // Import directly from specific files to avoid loading React hooks
    const { useZenStore } = await import('@/app/zen/lib/zenStore');
    const { useCLISessionStore } = await import('@/components/cli/store/cliSessionStore');
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

// ============================================================================
// Mesh Command Handlers (Emulator Mode)
// ============================================================================

interface FetchDirectionsPayload {
  project_id?: string;
  status?: 'pending' | 'all';
  limit?: number;
}

interface TriageDirectionPayload {
  direction_id: string;
  action: 'accept' | 'reject' | 'skip';
  project_path?: string;
}

interface FetchRequirementsPayload {
  project_id?: string;
  project_path?: string;
}

interface StartRemoteBatchPayload {
  project_id: string;
  project_path?: string;
  requirement_names: string[];
  session_preference?: string;
}

interface GetBatchStatusPayload {
  session_id?: string;
}

/**
 * Fetch pending directions from this device
 */
async function handleFetchDirections(command: RemoteCommand): Promise<CommandHandlerResult> {
  try {
    const payload = command.payload as FetchDirectionsPayload;
    const { directionDb } = await import('@/app/db');

    const status = payload.status || 'pending';
    const limit = payload.limit || 50;

    let directions;
    if (status === 'pending') {
      directions = payload.project_id
        ? directionDb.getPendingDirections(payload.project_id)
        : directionDb.getAllPendingDirections();
    } else {
      directions = payload.project_id
        ? directionDb.getDirectionsByProject(payload.project_id)
        : directionDb.getAllPendingDirections(); // Fallback to pending for safety
    }

    // Limit results
    directions = directions.slice(0, limit);

    return {
      success: true,
      result: {
        directions: directions.map(d => ({
          id: d.id,
          summary: d.summary,
          direction: d.direction,
          context_name: d.context_name || d.context_map_title,
          project_id: d.project_id,
          status: d.status,
          created_at: d.created_at,
        })),
        total: directions.length,
      },
    };
  } catch (error) {
    console.error('[fetch_directions] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch directions',
    };
  }
}

interface FetchIdeasPayload {
  project_id?: string;
  status?: 'pending' | 'all';
  limit?: number;
}

interface TriageIdeaPayload {
  idea_id: string;
  action: 'accept' | 'reject' | 'delete';
  project_path?: string;
}

/**
 * Fetch pending ideas from this device
 */
async function handleFetchIdeas(command: RemoteCommand): Promise<CommandHandlerResult> {
  try {
    const payload = command.payload as FetchIdeasPayload;
    const { ideaDb } = await import('@/app/db');

    const status = payload.status || 'pending';
    const limit = payload.limit || 50;

    let ideas;
    if (status === 'pending') {
      ideas = payload.project_id
        ? ideaDb.getIdeasByProject(payload.project_id).filter(i => i.status === 'pending')
        : ideaDb.getIdeasByStatus('pending');
    } else {
      ideas = payload.project_id
        ? ideaDb.getIdeasByProject(payload.project_id)
        : ideaDb.getAllIdeas();
    }

    // Limit results
    ideas = ideas.slice(0, limit);

    return {
      success: true,
      result: {
        ideas: ideas.map(i => ({
          id: i.id,
          title: i.title,
          description: i.description,
          category: i.category,
          context_id: i.context_id,
          goal_id: i.goal_id,
          project_id: i.project_id,
          status: i.status,
          created_at: i.created_at,
        })),
        total: ideas.length,
      },
    };
  } catch (error) {
    console.error('[fetch_ideas] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch ideas',
    };
  }
}

/**
 * Triage an idea (accept/reject/delete)
 */
async function handleTriageIdea(command: RemoteCommand): Promise<CommandHandlerResult> {
  try {
    const payload = command.payload as TriageIdeaPayload;

    if (!payload.idea_id || !payload.action) {
      return { success: false, error: 'Missing required fields: idea_id, action' };
    }

    const { ideaDb, projectDb } = await import('@/app/db');

    const idea = ideaDb.getIdeaById(payload.idea_id);
    if (!idea) {
      return { success: false, error: `Idea not found: ${payload.idea_id}` };
    }

    if (payload.action === 'accept') {
      // Get project path
      const project = projectDb.getProject(idea.project_id);
      if (!project) {
        return { success: false, error: `Project not found: ${idea.project_id}` };
      }

      const projectPath = payload.project_path || project.path;
      const { v4: uuidv4 } = await import('uuid');
      const { createRequirement } = await import('@/app/Claude/lib/requirementApi');

      // Generate requirement ID
      const requirementId = `idea-${payload.idea_id.slice(0, 8)}-${uuidv4().slice(0, 8)}`;

      // Create requirement content from idea
      const content = `# ${idea.title}

## Category
${idea.category || 'enhancement'}

## Description
${idea.description}

## Implementation Notes
- Generated from accepted idea
- Original idea ID: ${payload.idea_id}
`;

      // Create requirement file
      createRequirement(projectPath, requirementId, content, true);

      // Update idea status
      ideaDb.updateIdea(payload.idea_id, {
        status: 'accepted',
        requirement_id: requirementId,
      });

      return {
        success: true,
        result: {
          idea_id: payload.idea_id,
          action: 'accepted',
          requirement_id: requirementId,
        },
      };
    } else if (payload.action === 'reject') {
      ideaDb.updateIdea(payload.idea_id, { status: 'rejected' });

      return {
        success: true,
        result: {
          idea_id: payload.idea_id,
          action: 'rejected',
        },
      };
    } else if (payload.action === 'delete') {
      ideaDb.deleteIdea(payload.idea_id);

      return {
        success: true,
        result: {
          idea_id: payload.idea_id,
          action: 'deleted',
        },
      };
    }

    return { success: false, error: `Invalid action: ${payload.action}` };
  } catch (error) {
    console.error('[triage_idea] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to triage idea',
    };
  }
}

/**
 * Triage a direction (accept/reject/skip)
 */
async function handleTriageDirection(command: RemoteCommand): Promise<CommandHandlerResult> {
  try {
    const payload = command.payload as TriageDirectionPayload;

    if (!payload.direction_id || !payload.action) {
      return { success: false, error: 'Missing required fields: direction_id, action' };
    }

    const { directionDb } = await import('@/app/db');

    // Get the direction
    const direction = directionDb.getDirectionById(payload.direction_id);
    if (!direction) {
      return { success: false, error: `Direction not found: ${payload.direction_id}` };
    }

    if (direction.status !== 'pending') {
      return { success: false, error: `Direction already processed: ${direction.status}` };
    }

    if (payload.action === 'accept') {
      // Accept direction - create requirement
      const { createRequirement } = await import('@/app/Claude/sub_ClaudeCodeManager/folderManager');
      const { projectDb } = await import('@/app/db');

      const project = projectDb.getProject(direction.project_id);
      if (!project) {
        return { success: false, error: `Project not found: ${direction.project_id}` };
      }

      const projectPath = payload.project_path || project.path;
      const timestamp = Date.now();
      const titleSlug = direction.summary
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 30);
      const requirementId = `dir-${timestamp}-${titleSlug}`;

      // Build requirement content
      const content = `# ${direction.summary}\n\n${direction.direction}`;

      // Create requirement file
      createRequirement(projectPath, requirementId, content, true);

      // Update direction status
      directionDb.acceptDirection(payload.direction_id, requirementId, `${projectPath}/.claude/requirements/${requirementId}.md`);

      return {
        success: true,
        result: {
          direction_id: payload.direction_id,
          action: 'accepted',
          requirement_id: requirementId,
        },
      };
    } else if (payload.action === 'reject') {
      // Reject direction
      directionDb.updateDirection(payload.direction_id, { status: 'rejected' });

      return {
        success: true,
        result: {
          direction_id: payload.direction_id,
          action: 'rejected',
        },
      };
    } else if (payload.action === 'skip') {
      // Skip - no change
      return {
        success: true,
        result: {
          direction_id: payload.direction_id,
          action: 'skipped',
        },
      };
    }

    return { success: false, error: `Invalid action: ${payload.action}` };
  } catch (error) {
    console.error('[triage_direction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to triage direction',
    };
  }
}

/**
 * Fetch requirements from this device
 * If project_id is not specified, fetches from all projects
 */
async function handleFetchRequirements(command: RemoteCommand): Promise<CommandHandlerResult> {
  try {
    const payload = command.payload as FetchRequirementsPayload;

    const { projectDb } = await import('@/app/db');
    const fs = await import('fs');
    const path = await import('path');

    const requirements: Array<{
      id: string;
      name: string;
      project_id: string;
      project_name: string;
      project_path: string;
      created_at: string;
      source: 'direction' | 'idea' | 'manual';
    }> = [];

    // Helper function to read requirements from a project
    const readProjectRequirements = (project: { id: string; name: string; path: string }) => {
      const requirementsDir = path.join(project.path, '.claude', 'requirements');

      if (fs.existsSync(requirementsDir)) {
        const files = fs.readdirSync(requirementsDir).filter((f: string) => f.endsWith('.md'));

        for (const file of files) {
          const name = file.replace('.md', '');
          const filePath = path.join(requirementsDir, file);

          try {
            const stats = fs.statSync(filePath);

            // Determine source from name prefix
            let source: 'direction' | 'idea' | 'manual' = 'manual';
            if (name.startsWith('dir-')) source = 'direction';
            else if (name.startsWith('idea-')) source = 'idea';

            requirements.push({
              id: name,
              name,
              project_id: project.id,
              project_name: project.name,
              project_path: project.path,
              created_at: stats.birthtime.toISOString(),
              source,
            });
          } catch {
            // Skip files that can't be read
          }
        }
      }
    };

    if (payload.project_id) {
      // Fetch from specific project
      const project = projectDb.getProject(payload.project_id);
      if (!project) {
        return { success: false, error: `Project not found: ${payload.project_id}` };
      }

      const projectWithPath = {
        ...project,
        path: payload.project_path || project.path,
      };
      readProjectRequirements(projectWithPath);

      return {
        success: true,
        result: {
          requirements,
          total: requirements.length,
          project_id: payload.project_id,
          project_name: project.name,
        },
      };
    } else {
      // Fetch from all projects
      const projects = projectDb.getAllProjects();

      for (const project of projects) {
        readProjectRequirements(project);
      }

      return {
        success: true,
        result: {
          requirements,
          total: requirements.length,
          project_count: projects.length,
        },
      };
    }
  } catch (error) {
    console.error('[fetch_requirements] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch requirements',
    };
  }
}

/**
 * Start a remote batch (alias for start_batch with better naming)
 */
async function handleStartRemoteBatch(command: RemoteCommand): Promise<CommandHandlerResult> {
  const payload = command.payload as StartRemoteBatchPayload;

  // Forward to existing handleStartBatch
  return handleStartBatch({
    ...command,
    payload: {
      project_id: payload.project_id,
      project_path: payload.project_path,
      requirement_names: payload.requirement_names,
      session_preference: payload.session_preference,
    },
  });
}

/**
 * Get batch/session status from this device
 */
async function handleGetBatchStatus(command: RemoteCommand): Promise<CommandHandlerResult> {
  try {
    const payload = command.payload as GetBatchStatusPayload;
    // Import directly to avoid loading React hooks
    const { useCLISessionStore } = await import('@/components/cli/store/cliSessionStore');

    type CLISessionId = 'cliSession1' | 'cliSession2' | 'cliSession3' | 'cliSession4';
    const sessionIds: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];

    const sessions = useCLISessionStore.getState().sessions;
    const batches: Array<{
      session_id: string;
      status: 'idle' | 'running' | 'paused';
      total_tasks: number;
      completed_tasks: number;
      failed_tasks: number;
      current_task?: string;
    }> = [];

    for (const sessionId of sessionIds) {
      // Filter to specific session if requested
      if (payload.session_id && sessionId !== payload.session_id) continue;

      const session = sessions[sessionId];
      const queue = session.queue || [];

      const completed = queue.filter(t => t.status === 'completed').length;
      const failed = queue.filter(t => t.status === 'failed').length;
      const running = queue.find(t => t.status === 'running');

      batches.push({
        session_id: sessionId,
        status: session.isRunning ? 'running' : 'idle',
        total_tasks: queue.length,
        completed_tasks: completed,
        failed_tasks: failed,
        current_task: running?.requirementName,
      });
    }

    return {
      success: true,
      result: {
        batches,
        active_sessions: batches.filter(b => b.status === 'running').length,
        total_sessions: 4,
      },
    };
  } catch (error) {
    console.error('[get_batch_status] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get batch status',
    };
  }
}
