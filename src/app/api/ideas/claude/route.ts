/**
 * API Route: Claude Ideas Generation
 *
 * POST /api/ideas/claude
 * Creates Claude Code requirement files for idea generation
 * Uses the standard prompt builder system for consistent prompts
 */

import { NextRequest, NextResponse } from 'next/server';
import { ScanType, SCAN_TYPE_CONFIGS, getScanTypeAbbr } from '@/app/features/Ideas/lib/scanTypes';
import { buildPrompt, PromptOptions } from '@/app/projects/ProjectAI/ScanIdeas/prompts';
import { buildContextSection, buildExistingIdeasSection, buildGoalsSection, buildBehavioralSection } from '@/app/projects/ProjectAI/ScanIdeas/lib/sectionBuilders';
import { contextDb, contextGroupDb, goalDb, ideaDb, DbContext, DbContextGroup } from '@/app/db';
import { logger } from '@/lib/logger';

interface ClaudeIdeasRequest {
  projectId: string;
  projectName: string;
  projectPath: string;
  scanType: ScanType;
  contextId?: string;
  groupId?: string;
  goalId?: string; // Focus scan on a specific goal
}

/** Group data with all contexts and aggregated file paths */
interface GroupData {
  group: DbContextGroup;
  contexts: DbContext[];
  allFilePaths: string[];
}

/**
 * Get the Vibeman API base URL for Claude Code to use
 * This allows the URL to be configured for different environments
 */
function getVibemanApiUrl(): string {
  // Check environment variable first (for production/staging)
  if (process.env.VIBEMAN_API_URL) {
    return process.env.VIBEMAN_API_URL;
  }
  // Check if we have a public URL configured
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Default to localhost:3000 for local development
  return 'http://localhost:3000';
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
  goalId?: string;
}): string {
  const { projectId, projectName, scanType, context, goalId } = config;
  const apiUrl = getVibemanApiUrl();

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

  // Load goals for matching — if goalId is set, focus on that specific goal
  let goalsSection: string;
  let goalFocusDirective = '';
  if (goalId) {
    const targetGoal = goalDb.getGoalById(goalId);
    const goalsForSection = targetGoal ? [targetGoal] : [];
    goalsSection = buildGoalsSection(goalsForSection);
    if (targetGoal) {
      goalFocusDirective = `\n\n## GOAL FOCUS\n\n**IMPORTANT:** This scan is specifically driven by the goal: "${targetGoal.title}"\n${targetGoal.description ? `Goal description: ${targetGoal.description}\n` : ''}\nEvery idea you generate MUST directly advance this goal. Set goal_id to "${targetGoal.id}" for all ideas. Do not generate ideas unrelated to this goal.\n`;
    }
  } else {
    const allGoals = goalDb.getGoalsByProject(projectId);
    const openGoals = allGoals.filter(goal => goal.status === 'open');
    goalsSection = buildGoalsSection(openGoals);
  }

  // Build the prompt using the standard prompt builder
  const promptOptions: PromptOptions = {
    projectName,
    aiDocsSection,
    contextSection,
    existingIdeasSection,
    codeSection: '', // Claude Code will analyze files directly
    hasContext: context !== null,
    behavioralSection: buildBehavioralSection(projectId),
  };

  const scanPrompt = buildPrompt(scanType, promptOptions);
  const fullPrompt = scanPrompt + '\n\n' + goalsSection + goalFocusDirective;

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

---

## CRITICAL: Understanding Your Task

**IMPORTANT DISTINCTION - READ CAREFULLY:**

1. **ANALYZE**: The "${projectName}" project (the codebase you're exploring)
2. **SAVE TO**: Vibeman's idea management database (a SEPARATE system at ${apiUrl})

You are NOT creating API endpoints. You are NOT modifying the target project's code.
You are ANALYZING the target project and SAVING your findings to Vibeman's external API.

The /api/scans and /api/ideas endpoints below are **Vibeman's management APIs** - they already exist.
Do NOT attempt to create these endpoints in the "${projectName}" project.

Your job is:
- READ and ANALYZE the "${projectName}" codebase
- GENERATE ideas based on your analysis
- SAVE those ideas by calling Vibeman's existing APIs via curl

---

## Analysis Prompt

Below is the specialized analysis prompt for this scan type. Use this to guide your analysis:

---

${fullPrompt}

---

## Saving Ideas to Vibeman's Database

**Note:** These API calls go to Vibeman's idea management system (${apiUrl}), NOT the project you're analyzing.

You need to perform TWO steps to save ideas:

### Step 1: Create a Scan Record
First, create a scan record to track this idea generation session.

\`\`\`bash
curl -s -X POST ${apiUrl}/api/scans \\
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
POST ${apiUrl}/api/ideas
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
  "effort": <1-10>,
  "impact": <1-10>,
  "risk": <1-10>,
  "goal_id": "<goal_id_if_matched>"
}
\`\`\`

**IMPORTANT:** Always include effort, impact, and risk scores (1-10) for every idea. Do NOT leave these fields empty or null.

### Field Requirements

**category** (string): One of:
- \`functionality\`: New features, missing capabilities, workflow improvements
- \`performance\`: Speed, efficiency, memory, database, rendering optimizations
- \`maintenance\`: Code organization, refactoring, technical debt, testing
- \`ui\`: Visual design, UX improvements, responsiveness
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

**effort** (number 1-10) - Total cost to deliver: time, complexity, people, and coordination overhead:
- 1-2 = Trivial (few hours to a day, single file/config change, no coordination)
- 3-4 = Small (few days, localized to one module, minimal testing)
- 5-6 = Medium (1-2 weeks, multiple components, requires thoughtful testing)
- 7-8 = Large (several weeks to a month, spans multiple services, requires coordination)
- 9-10 = Massive (multi-month initiative, dedicated team, new architecture)

**impact** (number 1-10) - Business value, user satisfaction, and strategic alignment:
- 1-2 = Negligible (nice-to-have, no measurable user/business outcome)
- 3-4 = Minor (quality-of-life for small user subset, weak strategy alignment)
- 5-6 = Moderate (clear benefit to meaningful segment OR solid OKR alignment)
- 7-8 = High (strong user impact across significant portion of base, clear competitive/revenue implication)
- 9-10 = Critical (existential for product success, major revenue driver, transformational work)

**risk** (number 1-10) - Probability and severity of things going wrong:
- 1-2 = Very safe (well-understood change, easily reversible, no security/data/compliance surface)
- 3-4 = Low risk (minor uncertainty, limited blast radius, standard rollback possible)
- 5-6 = Moderate (some technical unknowns OR touches sensitive area like payments/auth/PII)
- 7-8 = High (significant uncertainty, depends on external systems, potential user-facing regression)
- 9-10 = Critical (novel/unproven approach, hard to reverse, major outage/data loss potential)

**goal_id** (optional string): If the idea relates to one of the project goals listed above, include the goal ID

## Example Workflow

\`\`\`bash
# Step 1: Create scan record
SCAN_RESPONSE=$(curl -s -X POST ${apiUrl}/api/scans \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${projectId}",
    "scan_type": "claude_code_${scanType}",
    "summary": "Claude Code idea generation - ${scanLabel}"
  }')

# Extract scan_id from response
SCAN_ID=$(echo $SCAN_RESPONSE | jq -r '.scan.id')

# Step 2: Create ideas using the scan_id
curl -X POST ${apiUrl}/api/ideas \\
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
    "effort": 5,
    "impact": 7,
    "risk": 4
  }'
\`\`\`

## Execution Steps

**Phase 1: Analyze the "${projectName}" project**
1. Read the project's CLAUDE.md or AI.md documentation if available
2. Explore the codebase structure${context ? `, focusing on the context files` : ''}
3. Analyze code with the perspective described in the analysis prompt above
4. Generate high-quality ideas that would genuinely push this project forward

**Phase 2: Save ideas to Vibeman (external system at ${apiUrl})**
5. Create a scan record via curl to ${apiUrl}/api/scans
6. Save each idea via curl to ${apiUrl}/api/ideas using the scan_id
7. Report what ideas were created

**REMINDER:** Do NOT create any files or endpoints in "${projectName}". Only READ/ANALYZE it.

## Quality Standards

- **Be Specific**: Reference actual files, components, or patterns you observed
- **Be Actionable**: Ideas should be clear enough to implement without further clarification
- **Be Valuable**: Focus on ideas that bring real improvement, not busywork
- **Match Goals**: If an idea aligns with a project goal, include the goal_id
- **Avoid Duplicates**: Check the existing ideas section and don't suggest similar items

## Output

After completing the task, summarize:
- How many ideas were created (saved to Vibeman at ${apiUrl})
- Brief list of idea titles
- Any observations about the "${projectName}" codebase

**Final Checklist:**
- [ ] I analyzed the "${projectName}" codebase (READ ONLY)
- [ ] I did NOT create any new files in "${projectName}"
- [ ] I saved ideas via curl to Vibeman's API at ${apiUrl}
- [ ] Each idea has effort, impact, and risk scores (1-10)
`;
}

/**
 * Build Claude Code requirement content for a context group
 * This includes all contexts and all file paths from the group
 */
function buildClaudeIdeaRequirementForGroup(config: {
  projectId: string;
  projectName: string;
  scanType: ScanType;
  groupData: GroupData;
  goalId?: string;
}): string {
  const { projectId, projectName, scanType, groupData, goalId } = config;
  const { group, contexts, allFilePaths } = groupData;
  const apiUrl = getVibemanApiUrl();

  const scanConfig = SCAN_TYPE_CONFIGS.find(s => s.value === scanType);
  const scanLabel = scanConfig?.label ?? scanType;
  const scanEmoji = scanConfig?.emoji ?? '💡';

  // Build context group section
  const contextGroupSection = buildContextGroupSection(groupData);

  // Load existing ideas for this group's contexts to prevent duplicates
  const existingIdeas = contexts.flatMap(ctx => ideaDb.getIdeasByContext(ctx.id));
  const existingIdeasSection = buildExistingIdeasSection(existingIdeas);

  // Load goals — if goalId is set, focus on that specific goal
  let goalsSection: string;
  let goalFocusDirective = '';
  if (goalId) {
    const targetGoal = goalDb.getGoalById(goalId);
    const goalsForSection = targetGoal ? [targetGoal] : [];
    goalsSection = buildGoalsSection(goalsForSection);
    if (targetGoal) {
      goalFocusDirective = `\n\n## GOAL FOCUS\n\n**IMPORTANT:** This scan is specifically driven by the goal: "${targetGoal.title}"\n${targetGoal.description ? `Goal description: ${targetGoal.description}\n` : ''}\nEvery idea you generate MUST directly advance this goal. Set goal_id to "${targetGoal.id}" for all ideas. Do not generate ideas unrelated to this goal.\n`;
    }
  } else {
    const allGoals = goalDb.getGoalsByProject(projectId);
    const openGoals = allGoals.filter(goal => goal.status === 'open');
    goalsSection = buildGoalsSection(openGoals);
  }

  // Build the prompt using the standard prompt builder
  const promptOptions: PromptOptions = {
    projectName,
    aiDocsSection: '',
    contextSection: contextGroupSection,
    existingIdeasSection,
    codeSection: '',
    hasContext: true,
    behavioralSection: buildBehavioralSection(projectId),
  };

  const scanPrompt = buildPrompt(scanType, promptOptions);
  const fullPrompt = scanPrompt + '\n\n' + goalsSection + goalFocusDirective;

  return `# ${scanEmoji} Claude Code Idea Generation: ${scanLabel}

## Mission
You are tasked with generating high-quality backlog ideas for the "${projectName}" project.
Your role is: **${scanLabel}**

## Target: Context Group "${group.name}"
- Group ID: ${group.id}
- Contains ${contexts.length} contexts
- Total files: ${allFilePaths.length}

---

## CRITICAL: Understanding Your Task

**IMPORTANT DISTINCTION - READ CAREFULLY:**

1. **ANALYZE**: The "${projectName}" project (the codebase you're exploring)
2. **SAVE TO**: Vibeman's idea management database (a SEPARATE system at ${apiUrl})

You are NOT creating API endpoints. You are NOT modifying the target project's code.
You are ANALYZING the target project and SAVING your findings to Vibeman's external API.

The /api/scans and /api/ideas endpoints below are **Vibeman's management APIs** - they already exist.
Do NOT attempt to create these endpoints in the "${projectName}" project.

Your job is:
- READ and ANALYZE the "${projectName}" codebase
- GENERATE ideas based on your analysis
- SAVE those ideas by calling Vibeman's existing APIs via curl

---

${contextGroupSection}

---

## API Reference (For Context Data Access)

If you need to access context or group data, use these endpoints:

### Get Context Group Details
\`\`\`bash
curl -s "${apiUrl}/api/context-groups?projectId=${projectId}"
\`\`\`

### Get Contexts in This Group
\`\`\`bash
curl -s "${apiUrl}/api/contexts?groupId=${group.id}"
\`\`\`

### Update a Context (if files change after analysis)
\`\`\`bash
curl -X PUT "${apiUrl}/api/contexts" \\
  -H "Content-Type: application/json" \\
  -d '{"contextId": "<context_id>", "updates": {"filePaths": [...]}}'
\`\`\`

---

## Analysis Prompt

Below is the specialized analysis prompt for this scan type. Use this to guide your analysis:

---

${fullPrompt}

---

## Saving Ideas to Vibeman's Database

**Note:** These API calls go to Vibeman's idea management system (${apiUrl}), NOT the project you're analyzing.

**IMPORTANT:** For group-level ideas, set context_id to null since the idea spans multiple contexts.
Include a note in the idea description that it relates to the "${group.name}" group.

You need to perform TWO steps to save ideas:

### Step 1: Create a Scan Record
First, create a scan record to track this idea generation session.

\`\`\`bash
curl -s -X POST ${apiUrl}/api/scans \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${projectId}",
    "scan_type": "claude_code_${scanType}",
    "summary": "Claude Code idea generation - ${scanLabel} (Group: ${group.name})"
  }'
\`\`\`

The response will include a \`scan.id\` - save this for the next step.

### Step 2: Create Ideas
For each idea, make a POST request with this JSON body:

\`\`\`
POST ${apiUrl}/api/ideas
Content-Type: application/json

{
  "scan_id": "<scan_id_from_step_1>",
  "project_id": "${projectId}",
  "context_id": null,
  "scan_type": "${scanType}",
  "category": "<category>",
  "title": "<title>",
  "description": "<description> (Note: This idea relates to the ${group.name} group)",
  "reasoning": "<reasoning>",
  "effort": <1-10>,
  "impact": <1-10>,
  "risk": <1-10>,
  "goal_id": "<goal_id_if_matched>"
}
\`\`\`

**IMPORTANT:** Always include effort, impact, and risk scores (1-10) for every idea. Do NOT leave these fields empty or null.

### Field Requirements

**category** (string): One of:
- \`functionality\`: New features, missing capabilities, workflow improvements
- \`performance\`: Speed, efficiency, memory, database, rendering optimizations
- \`maintenance\`: Code organization, refactoring, technical debt, testing
- \`ui\`: Visual design, UX improvements, responsiveness
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

**effort** (number 1-10), **impact** (number 1-10), **risk** (number 1-10) - Use the same scale as individual context generation.

**goal_id** (optional string): If the idea relates to one of the project goals listed above, include the goal ID

## Example Workflow

\`\`\`bash
# Step 1: Create scan record
SCAN_RESPONSE=$(curl -s -X POST ${apiUrl}/api/scans \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${projectId}",
    "scan_type": "claude_code_${scanType}",
    "summary": "Claude Code idea generation - ${scanLabel} (Group: ${group.name})"
  }')

# Extract scan_id from response
SCAN_ID=$(echo $SCAN_RESPONSE | jq -r '.scan.id')

# Step 2: Create ideas using the scan_id
curl -X POST ${apiUrl}/api/ideas \\
  -H "Content-Type: application/json" \\
  -d '{
    "scan_id": "'$SCAN_ID'",
    "project_id": "${projectId}",
    "context_id": null,
    "scan_type": "${scanType}",
    "category": "functionality",
    "title": "Example: Cross-context caching strategy for ${group.name}",
    "description": "Implement shared caching layer across all contexts in the ${group.name} group. This would reduce redundant API calls and improve performance across ${contexts.map(c => c.name).join(', ')}.",
    "reasoning": "Currently each context handles caching independently. A unified approach would reduce complexity and improve cache hit rates.",
    "effort": 6,
    "impact": 7,
    "risk": 4
  }'
\`\`\`

## Execution Steps

**Phase 1: Analyze the "${projectName}" project - Group: ${group.name}**
1. Read the project's CLAUDE.md or AI.md documentation if available
2. Focus on the ${allFilePaths.length} files listed in this group
3. Look for cross-cutting concerns and patterns across the group's ${contexts.length} contexts
4. Generate high-quality ideas that benefit the entire group

**Phase 2: Save ideas to Vibeman (external system at ${apiUrl})**
5. Create a scan record via curl to ${apiUrl}/api/scans
6. Save each idea via curl to ${apiUrl}/api/ideas using the scan_id
7. Report what ideas were created

**REMINDER:** Do NOT create any files or endpoints in "${projectName}". Only READ/ANALYZE it.

## Quality Standards

- **Be Specific**: Reference actual files, components, or patterns you observed
- **Be Actionable**: Ideas should be clear enough to implement without further clarification
- **Be Valuable**: Focus on ideas that bring real improvement, not busywork
- **Cross-Context**: Look for patterns and improvements that span multiple contexts in this group
- **Match Goals**: If an idea aligns with a project goal, include the goal_id
- **Avoid Duplicates**: Check the existing ideas section and don't suggest similar items

## Output

After completing the task, summarize:
- How many ideas were created (saved to Vibeman at ${apiUrl})
- Brief list of idea titles
- Any observations about the "${projectName}" codebase

**Final Checklist:**
- [ ] I analyzed the "${projectName}" codebase (READ ONLY)
- [ ] I did NOT create any new files in "${projectName}"
- [ ] I saved ideas via curl to Vibeman's API at ${apiUrl}
- [ ] Each idea has effort, impact, and risk scores (1-10)
- [ ] Ideas focus on cross-context improvements for the "${group.name}" group
`;
}

/**
 * Build context group section with all contexts and file paths
 */
function buildContextGroupSection(groupData: GroupData): string {
  const { group, contexts, allFilePaths } = groupData;

  let section = `## Context Group Information\n\n`;
  section += `**Group Name**: ${group.name}\n`;
  section += `**Group ID**: ${group.id}\n\n`;

  section += `### Contexts in This Group (${contexts.length})\n\n`;
  contexts.forEach((ctx, index) => {
    const description = ctx.description || 'No description';
    section += `${index + 1}. **${ctx.name}** - ${description}\n`;
  });
  section += '\n';

  section += `### All Files in This Group (${allFilePaths.length} files)\n\n`;
  section += `Focus your analysis on these files:\n`;
  allFilePaths.forEach(path => {
    section += `- ${path}\n`;
  });
  section += '\n';

  return section;
}

export async function POST(request: NextRequest) {
  try {
    const body: ClaudeIdeasRequest = await request.json();

    const { projectId, projectName, projectPath, scanType, contextId, groupId, goalId } = body;

    // Validate required fields
    if (!projectId || !projectName || !projectPath || !scanType) {
      return NextResponse.json(
        { error: 'projectId, projectName, projectPath, and scanType are required' },
        { status: 400 }
      );
    }

    let requirementContent: string;
    let requirementSuffix: string;

    if (groupId) {
      // Load group with all its contexts and file paths
      const group = contextGroupDb.getGroupById(groupId);
      if (!group) {
        return NextResponse.json(
          { error: `Context group not found: ${groupId}` },
          { status: 404 }
        );
      }

      const groupContexts = contextDb.getContextsByGroup(groupId);
      const allFilePaths = groupContexts.flatMap(ctx => {
        // Parse file_paths if it's a JSON string
        const filePaths = typeof ctx.file_paths === 'string'
          ? JSON.parse(ctx.file_paths)
          : ctx.file_paths;
        return filePaths || [];
      });

      const groupData: GroupData = {
        group,
        contexts: groupContexts,
        allFilePaths: [...new Set(allFilePaths)], // Dedupe file paths
      };

      requirementContent = buildClaudeIdeaRequirementForGroup({
        projectId,
        projectName,
        scanType,
        groupData,
        goalId,
      });
      requirementSuffix = `-grp-${groupId.slice(0, 8)}`;
    } else {
      // Load context if specified (existing behavior)
      const context = contextId ? contextDb.getContextById(contextId) : null;

      requirementContent = buildClaudeIdeaRequirement({
        projectId,
        projectName,
        scanType,
        context,
        goalId,
      });
      requirementSuffix = contextId ? `-${contextId.slice(0, 8)}` : '-all';
    }

    // Build unique requirement name with scan type abbreviation
    // Format: idea-gen-<timestamp>-<suffix>-<abbr>
    const timestamp = Date.now();
    const abbr = getScanTypeAbbr(scanType);
    const requirementName = `idea-gen-${timestamp}${requirementSuffix}-${abbr}`;

    return NextResponse.json({
      success: true,
      requirementName,
      requirementContent,
      scanType,
      contextId: contextId || null,
      groupId: groupId || null,
    });

  } catch (error) {
    logger.error('[API] Claude Ideas error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
