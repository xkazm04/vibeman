/**
 * Goal Analysis Service
 * Automatically creates Claude Code requirement files for goal analysis
 */

import { logger } from '@/lib/logger';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import type { DbGoal } from '@/app/db/models/types';

export interface GoalAnalysisConfig {
  goal: DbGoal;
  projectPath: string;
  contextName?: string;
  contextFiles?: string[];
}

export interface GoalAnalysisResult {
  success: boolean;
  requirementName?: string;
  filePath?: string;
  error?: string;
}

/**
 * Build the analysis prompt for a new goal
 *
 * Design philosophy:
 * - Single unified IT analyst role (not fragmented agent personas)
 * - Multi-dimensional thinking as checklist (not separate roles)
 * - Output format optimized for direct Claude Code execution
 * - Minimal exploration overhead - goal should be actionable
 */
function buildGoalAnalysisPrompt(config: GoalAnalysisConfig): string {
  const { goal, contextName, contextFiles } = config;

  const contextSection = contextName
    ? `
## Scope

This goal is scoped to the **"${contextName}"** feature area.

**Relevant files:**
${contextFiles?.map(f => `- \`${f}\``).join('\n') || '- No specific files defined'}
`
    : '';

  return `# ${goal.title}

## Goal
${goal.description || goal.title}
${contextSection}

---

You are a senior software engineer tasked with implementing this goal. Your job is to analyze the goal, explore the codebase as needed, and then implement it.

## Analysis Checklist

Before implementing, briefly consider each dimension:

- [ ] **Feasibility**: Can this be done with the current architecture?
- [ ] **Impact scope**: What parts of the codebase are affected?
- [ ] **Dependencies**: Are there external dependencies or integrations?
- [ ] **Data flow**: How does data move through the affected components?
- [ ] **Edge cases**: What could go wrong? What inputs need handling?
- [ ] **Security**: Any authentication, authorization, or input validation needs?
- [ ] **Performance**: Will this affect load times or resource usage?
- [ ] **Testing**: How will you verify this works correctly?

## Instructions

1. **Explore** the relevant parts of the codebase to understand existing patterns
2. **Identify** the specific files and functions that need modification
3. **Implement** the changes following the project's existing conventions
4. **Verify** the implementation works (run build, check for type errors)

## Implementation Guidelines

- Follow existing code patterns and conventions in the project
- Make minimal, focused changes - don't refactor unrelated code
- Add appropriate error handling for new functionality
- Update types/interfaces if adding new data structures
- Avoid creating unnecessary abstractions or over-engineering

## Expected Output

When complete, provide:
1. Summary of changes made (files modified/created)
2. Any follow-up items or considerations
3. Verification that the build passes
`;
}

/**
 * Create a Claude Code analysis requirement for a goal
 * This is called fire-and-forget after goal creation
 */
export async function createGoalAnalysisRequirement(
  config: GoalAnalysisConfig
): Promise<GoalAnalysisResult> {
  try {
    const { goal, projectPath } = config;

    logger.info('[GoalAnalysis] Starting requirement creation:', {
      goalId: goal.id,
      goalTitle: goal.title,
      projectPath,
      contextName: config.contextName,
    });

    // Build the analysis prompt
    const prompt = buildGoalAnalysisPrompt(config);

    // Generate requirement name
    const requirementName = `goal-analysis-${goal.id.slice(0, 8)}`;

    logger.info('[GoalAnalysis] Creating requirement file:', {
      requirementName,
      projectPath,
      promptLength: prompt.length,
    });

    // Create the requirement file
    const result = createRequirement(projectPath, requirementName, prompt, true);

    if (!result.success) {
      logger.error('[GoalAnalysis] Failed to create requirement:', {
        error: result.error,
        projectPath,
        requirementName,
      });
      return {
        success: false,
        error: result.error || 'Failed to create requirement file',
      };
    }

    logger.info('[GoalAnalysis] Requirement created successfully:', {
      requirementName,
      filePath: result.filePath,
    });

    return {
      success: true,
      requirementName,
      filePath: result.filePath,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[GoalAnalysis] Exception during requirement creation:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Fire-and-forget wrapper for goal analysis
 */
export function fireAndForgetGoalAnalysis(
  config: GoalAnalysisConfig,
  context: string
): void {
  logger.info('[GoalAnalysis] Fire-and-forget triggered:', {
    context,
    goalId: config.goal.id,
    projectPath: config.projectPath,
  });

  Promise.resolve().then(async () => {
    try {
      const result = await createGoalAnalysisRequirement(config);
      if (result.success) {
        logger.info(`[GoalAnalysis] Fire-and-forget completed [${context}]:`, {
          filePath: result.filePath,
        });
      } else {
        logger.warn(`[GoalAnalysis] Fire-and-forget failed [${context}]:`, {
          error: result.error,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[GoalAnalysis] Fire-and-forget exception [${context}]:`, {
        error: errorMessage,
      });
    }
  });
}
