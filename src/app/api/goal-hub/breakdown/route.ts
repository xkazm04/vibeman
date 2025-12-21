/**
 * Goal Breakdown API
 * Creates Claude Code requirement file for multi-agent goal analysis
 * The requirement file instructs Claude Code to:
 * 1. Analyze goal from multiple agent perspectives
 * 2. Generate hypotheses and save to database
 * 3. Create implementation requirement files for each hypothesis
 */

import { NextRequest, NextResponse } from 'next/server';
import { goalDb, contextDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { createErrorResponse, notFoundResponse } from '@/lib/api-helpers';
import { SCAN_TYPE_CONFIGS, type ScanTypeConfig } from '@/app/features/Ideas/lib/scanTypes';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';

// Agent types most relevant for goal breakdown analysis
const BREAKDOWN_AGENTS: string[] = [
  'zen_architect',
  'bug_hunter',
  'perf_optimizer',
  'security_protector',
  'user_empathy_champion',
  'data_flow_optimizer',
  'ambiguity_guardian',
];

/**
 * POST /api/goal-hub/breakdown
 * Generate a Claude Code requirement file for goal breakdown
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goalId, projectId, projectPath } = body;

    if (!goalId || !projectId || !projectPath) {
      return createErrorResponse('goalId, projectId, and projectPath are required', 400);
    }

    // Get the goal
    let goal;
    try {
      goal = goalDb.getGoalById(goalId);
    } catch (dbError) {
      logger.error('Database error getting goal:', { data: dbError });
      return createErrorResponse(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown'}`, 500);
    }

    if (!goal) {
      return notFoundResponse('Goal');
    }

    // Get context if goal has context_id
    let contextData: { name: string; filePaths: string[] } | null = null;
    if (goal.context_id) {
      const context = contextDb.getContextById(goal.context_id);
      if (context) {
        contextData = {
          name: context.name,
          filePaths: JSON.parse(context.file_paths || '[]'),
        };
      }
    }

    // Build the breakdown prompt
    const prompt = buildBreakdownPrompt({
      goalId,
      goalTitle: goal.title,
      goalDescription: goal.description || '',
      projectId,
      contextData,
    });

    const requirementName = `goal-breakdown-${goalId.slice(0, 8)}`;

    logger.info('Creating breakdown requirement file', {
      requirementName,
      projectPath,
      goalId
    });

    // Create the requirement file directly
    const result = createRequirement(projectPath, requirementName, prompt, true);

    if (!result.success) {
      logger.error('Failed to create requirement file:', {
        error: result.error
      });
      return createErrorResponse(result.error || 'Failed to create requirement file', 500);
    }

    return NextResponse.json({
      success: true,
      requirementName,
      filePath: result.filePath,
      message: `Requirement file created: ${requirementName}.md`,
    });
  } catch (error) {
    logger.error('Error in POST /api/goal-hub/breakdown:', {
      data: error,
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

/**
 * Build the multi-agent breakdown prompt for Claude Code
 */
function buildBreakdownPrompt(config: {
  goalId: string;
  goalTitle: string;
  goalDescription: string;
  projectId: string;
  contextData: { name: string; filePaths: string[] } | null;
}): string {
  const { goalId, goalTitle, goalDescription, projectId, contextData } = config;

  // Get agent configurations
  const agents = BREAKDOWN_AGENTS
    .map(type => SCAN_TYPE_CONFIGS.find(c => c.value === type))
    .filter((c): c is ScanTypeConfig => c !== undefined);

  const agentSection = agents
    .map(agent => `- **${agent.emoji} ${agent.label}**: ${agent.description}`)
    .join('\n');

  const contextSection = contextData
    ? `
## Feature Context

This goal is associated with the **"${contextData.name}"** context.

### Files in this context:
${contextData.filePaths.map(f => `- \`${f}\``).join('\n')}

Focus your analysis on how the goal impacts these specific files and this feature area.
`
    : '';

  return `# Goal Breakdown Analysis

## Goal Information

- **Goal ID:** \`${goalId}\`
- **Title:** ${goalTitle}
${goalDescription ? `- **Description:** ${goalDescription}` : ''}
- **Project ID:** \`${projectId}\`
${contextSection}

## Your Task

You will:
1. Analyze this goal from multiple expert perspectives
2. **SAVE each hypothesis to the database via curl** (REQUIRED - this is how they appear in the UI)
3. Create ONE consolidated implementation requirement file

## Agent Perspectives

${agentSection}

---

## STEP 1: Analyze the Goal

Think through:
- Architecture and design considerations
- Potential bugs and edge cases
- Performance implications
- Security concerns
- User experience impact
- Accessibility requirements

For each insight, prepare a hypothesis with:
- **title**: Short descriptive name (e.g., "Input validation for user data")
- **statement**: Testable condition (e.g., "When user submits empty form, validation errors should display")
- **category**: One of: behavior, performance, security, accessibility, ux, integration, edge_case, data, error
- **priority**: 1-10 (10=critical, 1=nice-to-have)
- **agentSource**: Which perspective identified this (e.g., bug_hunter, security_protector)

---

## STEP 2: Save Hypotheses to Database (REQUIRED)

⚠️ **CRITICAL**: You MUST execute a curl command for EACH hypothesis. Without this, hypotheses won't appear in the Goal Hub UI.

For each hypothesis you identified, run:

\`\`\`bash
curl -X POST "http://localhost:3000/api/goal-hub/hypotheses" -H "Content-Type: application/json" -d '{"goalId":"${goalId}","projectId":"${projectId}","title":"TITLE_HERE","statement":"STATEMENT_HERE","reasoning":"REASONING_HERE","category":"CATEGORY_HERE","priority":PRIORITY_NUMBER,"agentSource":"AGENT_HERE"}'
\`\`\`

**Example** (copy and modify for each hypothesis):
\`\`\`bash
curl -X POST "http://localhost:3000/api/goal-hub/hypotheses" -H "Content-Type: application/json" -d '{"goalId":"${goalId}","projectId":"${projectId}","title":"Form validation","statement":"When user submits invalid data, clear error messages should appear","reasoning":"Prevents bad data and improves UX","category":"behavior","priority":8,"agentSource":"bug_hunter"}'
\`\`\`

Run one curl command per hypothesis. Verify each returns a JSON response with an "id" field.

---

## STEP 3: Create Implementation Requirement File

After ALL hypotheses are saved to the database, create ONE implementation file.

**File path:** \`.claude/commands/implement-goal-${goalId.slice(0, 8)}.md\`

**Content:**

\`\`\`markdown
# Implement Goal: ${goalTitle}

## Overview
Implement all changes required for: "${goalTitle}"
${contextData ? `\nFeature context: "${contextData.name}"` : ''}

## Changes Required

### 1. [Change Area Name]
**Files:** \`path/to/file.ts\`
**What:** Description of changes needed
**Why:** Which hypothesis this addresses

### 2. [Change Area Name]
**Files:** \`path/to/file.ts\`
**What:** Description of changes needed
**Why:** Which hypothesis this addresses

[Add more sections as needed...]

## Testing
- [ ] Verify change 1 works correctly
- [ ] Verify change 2 works correctly
- [ ] Run existing tests
- [ ] No regressions
\`\`\`

---

## Output Checklist

Before finishing, confirm:
- [ ] Listed all hypotheses identified during analysis
- [ ] Executed curl command for EACH hypothesis (check for successful JSON responses)
- [ ] Created implementation file at \`.claude/commands/implement-goal-${goalId.slice(0, 8)}.md\`

Report:
1. Number of hypotheses saved to database
2. Path to implementation file created
`;
}
