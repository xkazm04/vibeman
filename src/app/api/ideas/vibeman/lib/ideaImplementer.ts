import { ideaDb, goalDb, contextDb } from '@/app/db';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { buildRequirementFromIdea } from '@/lib/scanner/reqFileBuilder';
import { generateRequirementName } from './ideaHelpers';

interface ImplementationResult {
  success: boolean;
  requirementName?: string;
  taskId?: string;
  error?: string;
}

export async function implementIdea(
  ideaId: string,
  projectPath: string
): Promise<ImplementationResult> {
  try {
    // 1. Get the idea
    const idea = ideaDb.getIdeaById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Store original status for rollback
    const originalStatus = idea.status;

    // 2. Update idea status to accepted (only if not already accepted)
    if (idea.status !== 'accepted') {
      ideaDb.updateIdea(ideaId, { status: 'accepted' });
    }

    try {
      // 3. Generate requirement file name
      const requirementName = generateRequirementName(ideaId, idea.title);

      // 4. Fetch goal and context if they exist
      const goal = idea.goal_id ? goalDb.getGoalById(idea.goal_id) : null;
      const context = idea.context_id ? contextDb.getContextById(idea.context_id) : null;

      // 5. Build requirement content using unified builder
      const content = buildRequirementFromIdea({
        idea,
        goal,
        context,
      });

      // 6. Create requirement file
      const createResult = createRequirement(projectPath, requirementName, content);

      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create requirement');
      }

      // 7. Update idea with requirement_id (the requirement file name)
      ideaDb.updateIdea(ideaId, { requirement_id: requirementName });

      // 8. Queue requirement for execution using the execution queue
      const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
      const taskId = executionQueue.addTask(projectPath, requirementName, idea.project_id);

      return {
        success: true,
        requirementName,
        taskId,
      };
    } catch (error) {
      // Rollback idea status on error
      ideaDb.updateIdea(ideaId, { status: originalStatus });
      throw error;
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
