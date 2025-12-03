/**
 * API Route: Claude Ideas Generation
 *
 * POST /api/ideas/claude
 * Creates Claude Code requirement files for idea generation
 * Uses the standard prompt builder system for consistent prompts
 */

import { NextRequest, NextResponse } from 'next/server';
import { ScanType, SCAN_TYPE_CONFIGS } from '@/app/features/Ideas/lib/scanTypes';
import { buildPrompt, PromptOptions } from '@/app/projects/ProjectAI/ScanIdeas/prompts';
import { buildContextSection, buildExistingIdeasSection, buildGoalsSection } from '@/app/projects/ProjectAI/ScanIdeas/lib/sectionBuilders';
import { contextDb, goalDb, ideaDb, DbContext } from '@/app/db';

interface ClaudeIdeasRequest {
  projectId: string;
  projectName: string;
  projectPath: string;
  scanType: ScanType;
  contextId?: string;
}

/**
 * Build Claude Code requirement content using the standard prompt builder
 * This ensures Claude Ideas uses the same prompts as non-Claude scans
 */
function buildClaudeIdeaRequirement(config: {
  projectId: string;
  projectName: string;
  scanType: ScanType;
  context: DbContext | null;
}): string {
  const { projectId, projectName, scanType, context } = config;

  const scanConfig = SCAN_TYPE_CONFIGS.find(s => s.value === scanType);
  const scanLabel = scanConfig?.label ?? scanType;
  const scanEmoji = scanConfig?.emoji ?? '💡';

  // NOTE: AI documentation (CLAUDE.md/AI.md) is intentionally excluded to reduce prompt size
  // Claude Code can read the project documentation directly if needed
  const aiDocsSection = '';

  // Build context section
  const contextSection = buildContextSection(context);

  // Load existing ideas to prevent duplicates
  const existingIdeas = context
    ? ideaDb.getIdeasByContext(context.id)
    : ideaDb.getIdeasByProject(projectId);
  const existingIdeasSection = buildExistingIdeasSection(existingIdeas);

  // Load open goals for goal matching
  const allGoals = goalDb.getGoalsByProject(projectId);
  const openGoals = allGoals.filter(goal => goal.status === 'open');
  const goalsSection = buildGoalsSection(openGoals);

  // Build the prompt using the standard prompt builder
  const promptOptions: PromptOptions = {
    projectName,
    aiDocsSection,
    contextSection,
    existingIdeasSection,
    codeSection: '', // Claude Code will analyze files directly
    hasContext: context !== null,
  };

  const scanPrompt = buildPrompt(scanType, promptOptions);
  const fullPrompt = scanPrompt + '\n\n' + goalsSection;

  // Build the Claude Code requirement wrapper
  return `# ${scanEmoji} Claude Code Idea Generation: ${scanLabel}

## Mission
You are tasked with generating high-quality backlog ideas for the "${projectName}" project.
Your role is: **${scanLabel}**

${context ? `
## Target Context
- Context ID: ${context.id}
- Context Name: ${context.name}
` : `
## Target: Full Project Analysis
`}

## Analysis Prompt

Below is the specialized analysis prompt for this scan type. Use this to guide your analysis:

---

${fullPrompt}

---

## Saving Ideas to Database

You need to perform TWO steps to save ideas:

### Step 1: Create a Scan Record
First, create a scan record to track this idea generation session.

\`\`\`bash
curl -s -X POST http://localhost:3000/api/scans \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${projectId}",
    "scan_type": "claude_code_${scanType}",
    "summary": "Claude Code idea generation - ${scanLabel}"
  }'
\`\`\`

The response will include a \`scan.id\` - save this for the next step.

### Step 2: Create Ideas
For each idea, make a POST request with this JSON body:

\`\`\`
POST http://localhost:3000/api/ideas
Content-Type: application/json

{
  "scan_id": "<scan_id_from_step_1>",
  "project_id": "${projectId}",
  "context_id": ${context ? `"${context.id}"` : 'null'},
  "scan_type": "${scanType}",
  "category": "<category>",
  "title": "<title>",
  "description": "<description>",
  "reasoning": "<reasoning>",
  "effort": <1|2|3>,
  "impact": <1|2|3>,
  "goal_id": "<goal_id_if_matched>"
}
\`\`\`

### Field Requirements

**category** (string): One of:
- \`functionality\`: New features, missing capabilities, workflow improvements
- \`performance\`: Speed, efficiency, memory, database, rendering optimizations
- \`maintenance\`: Code organization, refactoring, technical debt, testing
- \`ui\`: Visual design, UX improvements, accessibility, responsiveness
- \`code_quality\`: Security, error handling, type safety, edge cases
- \`user_benefit\`: High-level value propositions, business impact, user experience

**title** (string, max 60 chars): Clear, specific, action-oriented title

**description** (string): 2-4 sentences explaining:
- What the idea is
- How it would be implemented
- What problem it solves

**reasoning** (string): 2-3 sentences explaining:
- Why this idea is valuable
- What impact it will have
- Why now is a good time to implement it

**effort** (number 1-3):
- 1 = Low effort (1-2 hours, quick fix)
- 2 = Medium effort (1-2 days, moderate change)
- 3 = High effort (1+ weeks, major change)

**impact** (number 1-3):
- 1 = Low impact (nice to have)
- 2 = Medium impact (noticeable improvement)
- 3 = High impact (game changer, critical)

**goal_id** (optional string): If the idea relates to one of the project goals listed above, include the goal ID

## Example Workflow

\`\`\`bash
# Step 1: Create scan record
SCAN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/scans \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${projectId}",
    "scan_type": "claude_code_${scanType}",
    "summary": "Claude Code idea generation - ${scanLabel}"
  }')

# Extract scan_id from response
SCAN_ID=$(echo $SCAN_RESPONSE | jq -r '.scan.id')

# Step 2: Create ideas using the scan_id
curl -X POST http://localhost:3000/api/ideas \\
  -H "Content-Type: application/json" \\
  -d '{
    "scan_id": "'$SCAN_ID'",
    "project_id": "${projectId}",
    "context_id": ${context ? `"${context.id}"` : 'null'},
    "scan_type": "${scanType}",
    "category": "functionality",
    "title": "Example: Add user session caching layer",
    "description": "Implement Redis caching for user session data to reduce database queries. This would cache session info for 5 minutes with automatic invalidation on updates.",
    "reasoning": "Currently every page load queries the session table. This adds latency and database load. Caching would reduce DB calls by ~70%.",
    "effort": 2,
    "impact": 3
  }'
\`\`\`

## Execution Steps

1. Read the project's CLAUDE.md or AI.md documentation if available
2. Explore the codebase structure${context ? `, focusing on the context files` : ''}
3. Analyze code with the perspective described in the analysis prompt above
4. Generate 3-5 high-quality ideas following the specialized criteria
5. Create a scan record via /api/scans
6. Save each idea via /api/ideas using the scan_id
7. Report what ideas were created

## Quality Standards

- **Be Specific**: Reference actual files, components, or patterns you observed
- **Be Actionable**: Ideas should be clear enough to implement without further clarification
- **Be Valuable**: Focus on ideas that bring real improvement, not busywork
- **Match Goals**: If an idea aligns with a project goal, include the goal_id
- **Avoid Duplicates**: Check the existing ideas section and don't suggest similar items

## Output

After completing the task, summarize:
- How many ideas were created
- Brief list of idea titles
- Any observations about the codebase
`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ClaudeIdeasRequest = await request.json();

    const { projectId, projectName, projectPath, scanType, contextId } = body;

    // Validate required fields
    if (!projectId || !projectName || !projectPath || !scanType) {
      return NextResponse.json(
        { error: 'projectId, projectName, projectPath, and scanType are required' },
        { status: 400 }
      );
    }

    // Load context if specified
    const context = contextId ? contextDb.getContextById(contextId) : null;

    // Build the requirement content
    const requirementContent = buildClaudeIdeaRequirement({
      projectId,
      projectName,
      scanType,
      context
    });

    // Build unique requirement name
    const timestamp = Date.now();
    const contextSuffix = contextId ? `-ctx-${contextId.slice(0, 8)}` : '';
    const requirementName = `idea-gen-${scanType}${contextSuffix}-${timestamp}`;

    return NextResponse.json({
      success: true,
      requirementName,
      requirementContent,
      scanType,
      contextId: contextId || null
    });

  } catch (error) {
    console.error('[API] Claude Ideas error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
