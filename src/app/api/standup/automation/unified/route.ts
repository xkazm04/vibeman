/**
 * Unified Automation API
 * Single endpoint to trigger comprehensive goal automation via ONE Claude Code task
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { automationSessionDb, techDebtDb, ideaDb, goalDb } from '@/app/db';
import { buildUnifiedAutomationPrompt } from '@/lib/standupAutomation/unifiedAutomationPrompt';
import { executionQueue } from '@/app/Claude/lib/claudeExecutionQueue';
import { createRequirement } from '@/app/Claude/sub_ClaudeCodeManager/folderManager';

/**
 * POST /api/standup/automation/unified
 * Start a unified automation session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      projectPath,
      projectName,
      strategy = 'build',
      autonomyLevel = 'cautious',
    } = body;

    if (!projectId || !projectPath) {
      return NextResponse.json(
        { success: false, error: 'projectId and projectPath are required' },
        { status: 400 }
      );
    }

    // Create automation session record
    const session = automationSessionDb.create({
      projectId,
      projectPath,
      config: {
        enabled: true,
        intervalMinutes: 0,
        projectIds: [projectId],
        autonomyLevel,
        strategy,
        modes: {
          evaluateGoals: true,
          updateStatuses: true,
          generateGoals: true,
          createAnalysisTasks: true,
        },
        notifyOnChanges: true,
      },
    });

    const sessionId = session.id;

    // Gather context for the automation
    const goals = goalDb.getGoalsByProject(projectId);
    const allIdeas = ideaDb.getIdeasByProject(projectId);
    const pendingIdeas = allIdeas.filter(idea => idea.status === 'pending');
    const techDebtItems = techDebtDb.getTechDebtByProject(projectId);

    // Build the unified prompt
    const prompt = buildUnifiedAutomationPrompt({
      sessionId,
      projectId,
      projectPath,
      projectName: projectName || 'Project',
      strategy,
      autonomyLevel,
      goals,
      pendingIdeas,
      techDebtItems: techDebtItems.map(td => ({
        id: td.id,
        title: td.title,
        severity: td.severity,
        description: td.description,
      })),
      recentImplementations: [],
    });

    // Create requirement file for Claude Code (using direct file system access)
    const requirementName = `unified-automation-${sessionId.slice(0, 8)}`;

    const createResult = createRequirement(projectPath, requirementName, prompt, true);
    if (!createResult.success) {
      const errorMsg = createResult.error || 'Unknown error';
      automationSessionDb.fail(sessionId, `Failed to create requirement: ${errorMsg}`);
      throw new Error(`Failed to create requirement: ${errorMsg}`);
    }

    logger.info('[Unified Automation] Requirement file created', {
      requirementName,
      projectPath,
      filePath: createResult.filePath,
    });

    // Queue execution in Claude Code - THIS IS THE KEY PART
    const taskId = executionQueue.addTask(
      projectPath,
      requirementName,
      projectId,
      undefined, // No git config for automation
      {
        sessionId,
        claudeSessionId: undefined,
      }
    );

    // Update session with task ID and set to running
    automationSessionDb.updateTaskId(sessionId, taskId);

    logger.info('[Unified Automation] Claude Code task queued', {
      sessionId,
      taskId,
      projectId,
      strategy,
      goalsCount: goals.length,
      ideasCount: pendingIdeas.length,
      techDebtCount: techDebtItems.length,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      taskId,
      requirementName,
      message: 'Automation task queued in Claude Code.',
      stats: {
        goalsToEvaluate: goals.filter(g => g.status !== 'done').length,
        pendingIdeas: pendingIdeas.length,
        techDebtItems: techDebtItems.length,
      },
    });
  } catch (error) {
    logger.error('[Unified Automation] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start automation',
      },
      { status: 500 }
    );
  }
}
