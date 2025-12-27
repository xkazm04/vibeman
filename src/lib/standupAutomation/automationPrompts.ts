/**
 * Automation Prompts for Claude Code
 * Prompt templates that instruct Claude Code to explore codebase and submit results via API
 */

import type {
  GoalGenerationContext,
  GoalEvaluationContext,
  GoalStrategy,
  StandupAutomationConfig,
} from './types';
import type { DbGoal } from '@/app/db/models/types';

const API_BASE_URL = 'http://localhost:3000';

/**
 * Build the goal generation prompt for Claude Code
 * Instructs Claude to explore the codebase and generate strategic goal candidates
 */
export function buildGoalGenerationPrompt(params: {
  sessionId: string;
  projectId: string;
  projectPath: string;
  projectName: string;
  context: GoalGenerationContext;
  strategy: GoalStrategy;
}): string {
  const { sessionId, projectId, projectPath, projectName, context, strategy } = params;

  const completedGoalsList = context.completedGoals
    .slice(0, 10)
    .map(g => `  - ${g.title}`)
    .join('\n');

  const openGoalsList = context.openGoals
    .map(g => `  - ${g.title} (${g.status})`)
    .join('\n');

  const pendingIdeasByCategory: Record<string, number> = {};
  context.pendingIdeas.forEach(idea => {
    const cat = idea.scan_type || 'other';
    pendingIdeasByCategory[cat] = (pendingIdeasByCategory[cat] || 0) + 1;
  });

  const ideasBreakdown = Object.entries(pendingIdeasByCategory)
    .map(([cat, count]) => `  - ${cat}: ${count}`)
    .join('\n');

  const techDebtList = context.techDebtItems
    .slice(0, 10)
    .map(td => `  - [${td.severity}] ${td.title}`)
    .join('\n');

  const strategyGuidance = strategy === 'build'
    ? `## Strategy: BUILD MODE
Focus on creating NEW features and expanding functionality:
- Prioritize new capabilities over refinement
- Look for feature gaps and missing functionality
- Consider user-facing improvements
- Emphasize growth and expansion`
    : `## Strategy: POLISH MODE
Focus on IMPROVING and REFINING existing code:
- Prioritize code quality and maintainability
- Address technical debt and code smells
- Improve test coverage and documentation
- Optimize performance bottlenecks`;

  return `# Goal Generation Task

You are performing a strategic goal generation analysis for a software project.

## Project Information
- **Name**: ${projectName}
- **Path**: ${projectPath}
- **Session ID**: ${sessionId}
- **Project ID**: ${projectId}

${strategyGuidance}

## Current State

### Recently Completed Goals
${completedGoalsList || '  None - this is a fresh project'}

### Current Open Goals
${openGoalsList || '  None currently open'}

### Pending Ideas Backlog
Total: ${context.pendingIdeas.length}
By Category:
${ideasBreakdown || '  None'}

### Technical Debt Items
${techDebtList || '  No tech debt recorded'}

## Your Task

1. **Explore the Codebase**: Start by reading key files to understand the project structure:
   - Read README.md or package.json for project overview
   - Explore src/ directory structure
   - Look at main entry points and core modules
   - Identify patterns, TODOs, and improvement opportunities

2. **Update Progress**: As you explore, report your progress:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/progress" \\
  -H "Content-Type: application/json" \\
  -d '{"sessionId": "${sessionId}", "phase": "exploring", "progress": 25, "message": "Analyzing project structure..."}'
\`\`\`

3. **Generate Goal Candidates**: Based on your analysis, create 1-3 strategic goals that:
   - Align with the ${strategy.toUpperCase()} strategy
   - Build on patterns from completed goals
   - Address gaps not covered by open goals
   - Are achievable within 1-2 weeks
   - Have clear success criteria

4. **Submit Candidates**: When you have analyzed the codebase and generated candidates, submit them:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/candidates" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "${projectId}",
    "sessionId": "${sessionId}",
    "candidates": [
      {
        "title": "Goal title (max 80 chars)",
        "description": "2-3 sentences with success criteria",
        "reasoning": "Why this goal, why now",
        "priorityScore": 75,
        "category": "feature|refactor|testing|docs|performance|security",
        "source": "pattern_detection"
      }
    ],
    "metadata": {
      "explorationSummary": "Brief summary of what you discovered",
      "filesAnalyzed": ["list", "of", "files", "you", "read"],
      "patternsIdentified": ["patterns", "you", "noticed"]
    }
  }'
\`\`\`

## Guidelines

- Spend adequate time exploring the codebase before generating goals
- Each goal should be specific and actionable
- Priority scores: 90-100 = critical, 70-89 = high, 50-69 = medium, below 50 = low
- Categories to prioritize for ${strategy} strategy: ${
    strategy === 'build'
      ? 'feature, integration, enhancement'
      : 'refactor, testing, docs, performance, security'
  }

Start by exploring the project structure and key files.`;
}

/**
 * Build the goal evaluation prompt for Claude Code
 * Instructs Claude to gather evidence and evaluate goal progress
 */
export function buildGoalEvaluationPrompt(params: {
  sessionId: string;
  projectId: string;
  projectPath: string;
  goals: DbGoal[];
  contexts: Array<{ goalId: string; context: GoalEvaluationContext }>;
}): string {
  const { sessionId, projectId, projectPath, goals, contexts } = params;

  const goalsInfo = goals.map((goal, idx) => {
    const ctx = contexts.find(c => c.goalId === goal.id)?.context;
    const hypothesesInfo = ctx?.hypotheses?.length
      ? `Hypotheses: ${ctx.hypotheses.filter(h => h.status === 'verified').length}/${ctx.hypotheses.length} verified`
      : 'No hypotheses';

    return `${idx + 1}. **${goal.title}**
   - ID: ${goal.id}
   - Status: ${goal.status}
   - ${hypothesesInfo}
   - Description: ${goal.description?.slice(0, 100) || 'No description'}...`;
  }).join('\n\n');

  return `# Goal Evaluation Task

You are evaluating the progress of development goals for a software project.

## Project Information
- **Path**: ${projectPath}
- **Session ID**: ${sessionId}
- **Project ID**: ${projectId}

## Goals to Evaluate

${goalsInfo}

## Your Task

1. **For each goal**, explore the codebase to find evidence of progress:
   - Look for recent changes related to the goal
   - Check if the described functionality exists
   - Look for TODOs, comments, or work-in-progress code
   - Search for relevant tests

2. **Update Progress**: Report as you work:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/progress" \\
  -H "Content-Type: application/json" \\
  -d '{"sessionId": "${sessionId}", "phase": "evaluating", "progress": 50, "message": "Evaluating goal 2 of ${goals.length}..."}'
\`\`\`

3. **Submit Evaluations**: When complete, submit all evaluations:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/evaluations" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "${projectId}",
    "sessionId": "${sessionId}",
    "evaluations": [
      {
        "goalId": "goal-uuid-here",
        "shouldUpdate": true,
        "currentStatus": "open",
        "recommendedStatus": "in_progress",
        "evidence": "Found implementation in src/features/...",
        "blockers": [],
        "progress": 45,
        "confidence": 85,
        "reasoning": "Detailed explanation of findings"
      }
    ],
    "metadata": {
      "goalsAnalyzed": ${goals.length},
      "codebaseChangesDetected": ["list of relevant changes"],
      "implementationEvidence": {
        "goal-id-1": ["file1.ts:123", "file2.ts:45"],
        "goal-id-2": ["No evidence found"]
      }
    }
  }'
\`\`\`

## Status Transition Rules

- **open -> in_progress**: Work has started (code exists, tests written, etc.)
- **in_progress -> done**: Feature complete, all tests pass, documentation updated
- **in_progress -> blocked**: Explicit blockers found (missing dependencies, unclear requirements)
- Any status can remain unchanged if evidence is inconclusive

## Confidence Guidelines

- 90-100: Clear, definitive evidence (code exists and works)
- 70-89: Strong evidence (most implementation found)
- 50-69: Moderate evidence (partial implementation)
- Below 50: Weak evidence (speculation)

Only recommend status changes with confidence >= 70.

Start by examining the codebase for evidence related to each goal.`;
}

/**
 * Build the full automation cycle prompt for Claude Code
 * Combines exploration, generation, and evaluation into a single session
 */
export function buildFullAutomationPrompt(params: {
  sessionId: string;
  projectId: string;
  projectPath: string;
  projectName: string;
  config: StandupAutomationConfig;
  generationContext: GoalGenerationContext;
  evaluationGoals?: DbGoal[];
}): string {
  const {
    sessionId,
    projectId,
    projectPath,
    projectName,
    config,
    generationContext,
    evaluationGoals,
  } = params;

  const modeInstructions: string[] = [];

  if (config.modes.evaluateGoals && evaluationGoals?.length) {
    modeInstructions.push(`
## Phase 1: Goal Evaluation
Evaluate ${evaluationGoals.length} existing goals:
${evaluationGoals.map(g => `- ${g.title} (${g.status})`).join('\n')}

Search the codebase for evidence of progress on each goal.`);
  }

  if (config.modes.generateGoals) {
    modeInstructions.push(`
## Phase 2: Goal Generation
Generate 1-3 new strategic goals using the ${config.strategy.toUpperCase()} strategy.
Current open goals: ${generationContext.openGoals.length}
Pending ideas backlog: ${generationContext.pendingIdeas.length}
Tech debt items: ${generationContext.techDebtItems.length}`);
  }

  return `# Standup Automation Cycle

You are performing an automated standup analysis for a software project.

## Project Information
- **Name**: ${projectName}
- **Path**: ${projectPath}
- **Session ID**: ${sessionId}
- **Project ID**: ${projectId}
- **Strategy**: ${config.strategy}
- **Autonomy Level**: ${config.autonomyLevel}

## Modes Enabled
- Evaluate Goals: ${config.modes.evaluateGoals ? 'YES' : 'NO'}
- Update Statuses: ${config.modes.updateStatuses ? 'YES' : 'NO'}
- Generate Goals: ${config.modes.generateGoals ? 'YES' : 'NO'}

${modeInstructions.join('\n')}

## Workflow

1. Start by exploring the project structure
2. Report progress periodically:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/progress" \\
  -H "Content-Type: application/json" \\
  -d '{"sessionId": "${sessionId}", "phase": "exploring", "progress": 10, "message": "Starting exploration..."}'
\`\`\`

3. If evaluating goals, search for evidence and submit:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/evaluations" \\
  -H "Content-Type: application/json" \\
  -d '{"projectId": "${projectId}", "sessionId": "${sessionId}", "evaluations": [...], "metadata": {...}}'
\`\`\`

4. If generating goals, analyze and submit candidates:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/candidates" \\
  -H "Content-Type: application/json" \\
  -d '{"projectId": "${projectId}", "sessionId": "${sessionId}", "candidates": [...], "metadata": {...}}'
\`\`\`

## Important Notes

- Take your time exploring the codebase thoroughly
- Use the Read tool to examine files in detail
- Look for patterns, TODOs, and improvement opportunities
- Be specific about file locations when providing evidence
- Submit results via the API endpoints when each phase is complete

Begin by exploring the project structure.`;
}

/**
 * Build a minimal prompt for quick status check
 */
export function buildQuickStatusPrompt(params: {
  sessionId: string;
  projectId: string;
  goal: DbGoal;
}): string {
  const { sessionId, projectId, goal } = params;

  return `# Quick Goal Status Check

Check if this goal has been completed:
- **Goal**: ${goal.title}
- **Current Status**: ${goal.status}
- **Description**: ${goal.description || 'No description'}

Search for evidence that this goal is complete or in progress.

Submit your finding:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/evaluations" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "${projectId}",
    "sessionId": "${sessionId}",
    "evaluations": [{
      "goalId": "${goal.id}",
      "shouldUpdate": true/false,
      "currentStatus": "${goal.status}",
      "recommendedStatus": "open|in_progress|done",
      "evidence": "What you found",
      "blockers": [],
      "progress": 0-100,
      "confidence": 0-100,
      "reasoning": "Explanation"
    }],
    "metadata": {"goalsAnalyzed": 1, "codebaseChangesDetected": [], "implementationEvidence": {}}
  }'
\`\`\``;
}
