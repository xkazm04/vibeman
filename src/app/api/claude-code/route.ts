import { NextRequest, NextResponse } from 'next/server';
import {
  claudeFolderExists,
  isClaudeFolderInitialized,
  initializeClaudeFolder,
  createRequirement,
  readRequirement,
  updateRequirement,
  listRequirements,
  deleteRequirement,
  readClaudeSettings,
  updateClaudeSettings,
} from '@/app/Claude/lib/claudeCodeManager';
import { validateRequired, successResponse, errorResponse, handleOperationResult } from './helpers';
import { getTaskStatus } from './taskStatusHandler';
import { queueExecution, executeSync } from './executionHandlers';

/**
 * GET - Check Claude folder status or list requirements
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');
    const action = searchParams.get('action');

    const validationError = validateRequired({ projectPath }, ['projectPath']);
    if (validationError) return validationError;

    // Check Claude folder status
    if (action === 'status') {
      const exists = claudeFolderExists(projectPath!);
      const initStatus = isClaudeFolderInitialized(projectPath!);

      return NextResponse.json({
        exists,
        initialized: initStatus.initialized,
        missing: initStatus.missing,
      });
    }

    // List requirements
    if (action === 'list-requirements') {
      const result = listRequirements(projectPath!);
      return handleOperationResult(
        result,
        'Requirements listed successfully',
        'Failed to list requirements'
      );
    }

    // Read requirement
    if (action === 'read-requirement') {
      const requirementName = searchParams.get('name');
      const nameError = validateRequired({ name: requirementName }, ['name']);
      if (nameError) return nameError;

      const result = readRequirement(projectPath!, requirementName!);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to read requirement' },
          { status: 404 }
        );
      }

      return NextResponse.json({ content: result.content });
    }

    // Read settings
    if (action === 'read-settings') {
      const result = readClaudeSettings(projectPath!);
      return handleOperationResult(
        result,
        'Settings read successfully',
        'Failed to read settings'
      );
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );
  } catch (error) {
    return errorResponse(error, 'Error in GET /api/claude-code');
  }
}

/**
 * POST - Initialize folder, create requirement, or execute requirement
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, action, projectName, requirementName, content, settings } = body;

    // Actions that don't require projectPath
    const noProjectPathActions = ['get-task-status'];

    if (!projectPath && !noProjectPathActions.includes(action)) {
      return validateRequired({ projectPath }, ['projectPath']);
    }

    // Initialize Claude folder
    if (action === 'initialize') {
      const result = initializeClaudeFolder(projectPath, projectName);
      return handleOperationResult(
        result,
        'Claude folder initialized successfully',
        'Failed to initialize Claude folder'
      );
    }

    // Create requirement
    if (action === 'create-requirement') {
      const validationError = validateRequired({ requirementName, content }, ['requirementName', 'content']);
      if (validationError) return validationError;

      const result = createRequirement(projectPath, requirementName, content);
      return handleOperationResult(
        result,
        'Requirement created successfully',
        'Failed to create requirement'
      );
    }

    // Execute requirement (async mode - queued execution)
    if (action === 'execute-requirement-async') {
      const { projectId } = body;
      const validationError = validateRequired({ requirementName }, ['requirementName']);
      if (validationError) return validationError;

      return queueExecution(projectPath, requirementName, projectId);
    }

    // Execute requirement (sync mode - blocking, legacy)
    if (action === 'execute-requirement') {
      const { projectId, async } = body;
      const validationError = validateRequired({ requirementName }, ['requirementName']);
      if (validationError) return validationError;

      // If async mode requested, delegate to async handler
      if (async === true) {
        return queueExecution(projectPath, requirementName, projectId);
      }

      // Synchronous execution (blocking)
      return executeSync(projectPath, requirementName, projectId);
    }

    // Get execution task status
    if (action === 'get-task-status') {
      const { taskId } = body;
      const validationError = validateRequired({ taskId }, ['taskId']);
      if (validationError) return validationError;

      return getTaskStatus(taskId);
    }

    // List all execution tasks for a project
    if (action === 'list-tasks') {
      const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
      const tasks = executionQueue.getProjectTasks(projectPath);

      return NextResponse.json({ tasks });
    }

    // Clear old completed tasks
    if (action === 'clear-old-tasks') {
      const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
      executionQueue.clearOldTasks();

      return successResponse({}, 'Old tasks cleared');
    }

    // Update settings
    if (action === 'update-settings') {
      const validationError = validateRequired({ settings }, ['settings']);
      if (validationError) return validationError;

      const result = updateClaudeSettings(projectPath, settings);
      return handleOperationResult(
        result,
        'Settings updated successfully',
        'Failed to update settings'
      );
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );
  } catch (error) {
    return errorResponse(error, 'Error in POST /api/claude-code');
  }
}

/**
 * DELETE - Delete a requirement
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, requirementName } = body;

    const validationError = validateRequired({ projectPath, requirementName }, ['projectPath', 'requirementName']);
    if (validationError) return validationError;

    const result = deleteRequirement(projectPath, requirementName);
    return handleOperationResult(
      result,
      'Requirement deleted successfully',
      'Failed to delete requirement'
    );
  } catch (error) {
    return errorResponse(error, 'Error in DELETE /api/claude-code');
  }
}

/**
 * PUT - Update requirement
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, action, requirementName, content } = body;

    const validationError = validateRequired({ projectPath }, ['projectPath']);
    if (validationError) return validationError;

    // Update requirement
    if (action === 'update-requirement') {
      const contentError = validateRequired({ requirementName, content }, ['requirementName', 'content']);
      if (contentError) return contentError;

      const result = updateRequirement(projectPath, requirementName, content);
      return handleOperationResult(
        result,
        'Requirement updated successfully',
        'Failed to update requirement'
      );
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );
  } catch (error) {
    return errorResponse(error, 'Error in PUT /api/claude-code');
  }
}
