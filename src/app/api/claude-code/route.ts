import { NextRequest, NextResponse } from 'next/server';
import {
  claudeFolderExists,
  isClaudeFolderInitialized,
  initializeClaudeFolder,
  createRequirement,
  readRequirement,
  listRequirements,
  deleteRequirement,
  readClaudeSettings,
  updateClaudeSettings,
  executeRequirement,
} from '@/app/Claude/lib/claudeCodeManager';
import { generateRequirementsFromGoals, generateRequirementForGoal } from '@/app/Claude/lib/generateRequirementsFromGoals';
import {
  createProjectSnapshot,
  autoUpdateContexts,
} from '@/app/Claude/lib/contextAutoUpdate';

/**
 * GET - Check Claude folder status or list requirements
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');
    const action = searchParams.get('action');

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    // Check Claude folder status
    if (action === 'status') {
      const exists = claudeFolderExists(projectPath);
      const initStatus = isClaudeFolderInitialized(projectPath);

      return NextResponse.json({
        exists,
        initialized: initStatus.initialized,
        missing: initStatus.missing,
      });
    }

    // List requirements
    if (action === 'list-requirements') {
      const result = listRequirements(projectPath);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to list requirements' },
          { status: 500 }
        );
      }

      return NextResponse.json({ requirements: result.requirements });
    }

    // Read requirement
    if (action === 'read-requirement') {
      const requirementName = searchParams.get('name');
      if (!requirementName) {
        return NextResponse.json(
          { error: 'Requirement name is required' },
          { status: 400 }
        );
      }

      const result = readRequirement(projectPath, requirementName);
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
      const result = readClaudeSettings(projectPath);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to read settings' },
          { status: 500 }
        );
      }

      return NextResponse.json({ settings: result.settings });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in GET /api/claude-code:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Initialize folder, create requirement, or execute requirement
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, action, projectName, requirementName, content, settings } = body;

    // LOG INCOMING REQUEST
    console.log('[API Backend] 📨 POST /api/claude-code received:', {
      action,
      requirementName,
      timestamp: new Date().toISOString(),
    });

    // Actions that don't require projectPath
    const noProjectPathActions = ['get-task-status'];

    if (!projectPath && !noProjectPathActions.includes(action)) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    // Initialize Claude folder
    if (action === 'initialize') {
      const result = initializeClaudeFolder(projectPath, projectName);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to initialize Claude folder' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Claude folder initialized successfully',
        structure: result.structure,
      });
    }

    // Create requirement
    if (action === 'create-requirement') {
      if (!requirementName || !content) {
        return NextResponse.json(
          { error: 'Requirement name and content are required' },
          { status: 400 }
        );
      }

      const result = createRequirement(projectPath, requirementName, content);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to create requirement' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Requirement created successfully',
        filePath: result.filePath,
      });
    }

    // Execute requirement (async mode - queued execution)
    if (action === 'execute-requirement-async') {
      const { projectId } = body;

      if (!requirementName) {
        return NextResponse.json(
          { error: 'Requirement name is required' },
          { status: 400 }
        );
      }

      const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
      const taskId = executionQueue.addTask(projectPath, requirementName, projectId);

      return NextResponse.json({
        success: true,
        message: 'Requirement queued for execution',
        taskId,
        mode: 'async',
      });
    }

    // Execute requirement (sync mode - blocking, legacy)
    if (action === 'execute-requirement') {
      const { projectId, async } = body;

      if (!requirementName) {
        return NextResponse.json(
          { error: 'Requirement name is required' },
          { status: 400 }
        );
      }

      // If async mode requested, delegate to async handler
      if (async === true) {
        console.log('[API Backend] 🚀 CREATING NEW TASK:', {
          requirementName,
          projectId,
          mode: 'async',
        });

        const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
        const taskId = executionQueue.addTask(projectPath, requirementName, projectId);

        console.log('[API Backend] ✅ Task queued successfully:', { taskId });

        return NextResponse.json({
          success: true,
          message: 'Requirement queued for execution',
          taskId,
          mode: 'async',
        });
      }

      // Synchronous execution (blocking)
      // Create snapshot before execution for context auto-update
      const beforeSnapshot = projectId ? createProjectSnapshot(projectPath) : null;

      const result = await executeRequirement(projectPath, requirementName);
      if (!result.success) {
        return NextResponse.json(
          {
            error: result.error || 'Failed to execute requirement',
            sessionLimitReached: result.sessionLimitReached || false,
            logFilePath: result.logFilePath,
          },
          { status: result.sessionLimitReached ? 429 : 500 }
        );
      }

      // Auto-update contexts after successful execution
      let contextUpdateResults = null;
      if (projectId && beforeSnapshot) {
        try {
          console.log('Starting context auto-update...');
          contextUpdateResults = await autoUpdateContexts(projectId, projectPath, beforeSnapshot);
          console.log('Context auto-update completed:', contextUpdateResults);
        } catch (error) {
          console.error('Context auto-update failed:', error);
          // Don't fail the whole request if context update fails
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Requirement executed successfully',
        output: result.output,
        logFilePath: result.logFilePath,
        contextUpdates: contextUpdateResults,
        mode: 'sync',
      });
    }

    // Get execution task status
    if (action === 'get-task-status') {
      const { taskId } = body;

      if (!taskId) {
        return NextResponse.json(
          { error: 'Task ID is required' },
          { status: 400 }
        );
      }

      const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
      const task = executionQueue.getTask(taskId);

      if (!task) {
        console.error('[API Backend] ❌ Task not found:', { taskId });
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }

      // Log detailed task status for debugging
      console.log('[API Backend] 📊 Task status:', {
        taskId,
        status: task.status,
        hasError: !!task.error,
        error: task.error,
        hasOutput: !!task.output,
        progressLines: task.progress?.length || 0,
      });

      return NextResponse.json({ task });
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

      return NextResponse.json({
        success: true,
        message: 'Old tasks cleared',
      });
    }

    // Update settings
    if (action === 'update-settings') {
      if (!settings) {
        return NextResponse.json(
          { error: 'Settings data is required' },
          { status: 400 }
        );
      }

      const result = updateClaudeSettings(projectPath, settings);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to update settings' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully',
      });
    }

    // Generate requirements from goals
    if (action === 'generate-requirements') {
      const { projectId } = body;
      if (!projectId) {
        return NextResponse.json(
          { error: 'Project ID is required' },
          { status: 400 }
        );
      }

      const result = await generateRequirementsFromGoals(projectId, projectPath);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to generate requirements' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        count: result.count,
        requirements: result.requirements,
      });
    }

    // Generate requirement for a specific goal (async, non-blocking)
    if (action === 'generate-requirement-for-goal') {
      const { projectId, goalId } = body;
      if (!projectId || !goalId) {
        return NextResponse.json(
          { error: 'Project ID and Goal ID are required' },
          { status: 400 }
        );
      }

      const result = await generateRequirementForGoal(projectId, projectPath, goalId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to generate requirement for goal' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: result.message,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in POST /api/claude-code:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a requirement
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, requirementName } = body;

    if (!projectPath || !requirementName) {
      return NextResponse.json(
        { error: 'Project path and requirement name are required' },
        { status: 400 }
      );
    }

    const result = deleteRequirement(projectPath, requirementName);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete requirement' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Requirement deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/claude-code:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
