/**
 * Claude Ideas Handler
 * 
 * Experimental feature: Generate ideas using Claude Code instead of LLM providers
 * This creates requirement files that Claude Code processes asynchronously
 */

import { ScanType, SCAN_TYPE_CONFIGS } from '../../lib/scanTypes';
import { BatchId } from '@/app/features/TaskRunner/store/taskRunnerStore';
import { executeFireAndForget, PipelineConfig } from '@/app/features/Onboarding/sub_Blueprint/lib/pipeline';

export interface ClaudeIdeasConfig {
  projectId: string;
  projectName: string;
  projectPath: string;
  scanTypes: ScanType[];
  contextId?: string;
  contextName?: string;
  batchId: BatchId;
}

export interface ClaudeIdeasResult {
  success: boolean;
  tasksCreated: number;
  taskIds: string[];
  errors: string[];
}

/**
 * Build the requirement content that instructs Claude Code how to generate and save ideas
 */
function buildClaudeIdeaRequirement(config: {
  projectId: string;
  projectName: string;
  scanType: ScanType;
  contextId?: string;
  contextName?: string;
}): string {
  const scanConfig = SCAN_TYPE_CONFIGS.find(s => s.value === config.scanType);
  const scanLabel = scanConfig?.label ?? config.scanType;
  const scanEmoji = scanConfig?.emoji ?? '💡';
  const scanDescription = scanConfig?.description ?? 'Generate improvement ideas';
  
  const contextInfo = config.contextId 
    ? `\n## Target Context\n- Context ID: ${config.contextId}\n- Context Name: ${config.contextName ?? 'Unknown'}\n`
    : '\n## Target: Full Project Analysis\n';

  return `# ${scanEmoji} Claude Code Idea Generation: ${scanLabel}

## Mission
You are tasked with generating high-quality backlog ideas for the "${config.projectName}" project.
Your role is: **${scanLabel}** - ${scanDescription}

${contextInfo}

## Analysis Instructions

1. **Analyze the Codebase**: 
   - Read and understand the project structure
   - Identify patterns, issues, and opportunities relevant to your role
   - Consider both technical and user experience aspects

2. **Generate Ideas**:
   - Create 3-5 actionable, specific ideas
   - Each idea should have clear value and be implementable
   - Focus on your specific perspective (${scanLabel})

## Saving Ideas to Database

You need to perform TWO steps to save ideas:

### Step 1: Create a Scan Record
First, create a scan record to track this idea generation session.

\`\`\`
POST /api/scans
Content-Type: application/json

{
  "project_id": "${config.projectId}",
  "scan_type": "claude_code_${config.scanType}",
  "summary": "Claude Code idea generation - ${scanLabel}"
}
\`\`\`

The response will include a \`scan.id\` - save this for the next step.

### Step 2: Create Ideas
For each idea, make a POST request with this JSON body:

\`\`\`
POST /api/ideas
Content-Type: application/json

{
  "scan_id": "<scan_id_from_step_1>",
  "project_id": "${config.projectId}",
  "context_id": ${config.contextId ? `"${config.contextId}"` : 'null'},
  "scan_type": "${config.scanType}",
  "category": "<category>",
  "title": "<title>",
  "description": "<description>",
  "reasoning": "<reasoning>",
  "effort": <1|2|3>,
  "impact": <1|2|3>
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

## Example Workflow

\`\`\`bash
# Step 1: Create scan record
SCAN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/scans \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${config.projectId}",
    "scan_type": "claude_code_${config.scanType}",
    "summary": "Claude Code idea generation - ${scanLabel}"
  }')

# Extract scan_id from response (you'll need to parse the JSON)
SCAN_ID=$(echo $SCAN_RESPONSE | jq -r '.scan.id')

# Step 2: Create ideas using the scan_id
curl -X POST http://localhost:3000/api/ideas \\
  -H "Content-Type: application/json" \\
  -d '{
    "scan_id": "'$SCAN_ID'",
    "project_id": "${config.projectId}",
    "context_id": ${config.contextId ? `"${config.contextId}"` : 'null'},
    "scan_type": "${config.scanType}",
    "category": "functionality",
    "title": "Add user session caching layer",
    "description": "Implement Redis caching for user session data to reduce database queries. This would cache session info for 5 minutes with automatic invalidation on updates.",
    "reasoning": "Currently every page load queries the session table. This adds latency and database load. Caching would reduce DB calls by ~70% and improve response times.",
    "effort": 2,
    "impact": 3
  }'
\`\`\`

## Execution Steps

1. Read the project's CLAUDE.md or AI.md documentation if available
2. Explore the codebase structure
3. Analyze code relevant to your perspective (${scanLabel})
4. Generate 3-5 high-quality ideas
5. Create a scan record via /api/scans
6. Save each idea via /api/ideas using the scan_id
7. Report what ideas were created

## Quality Standards

- **Be Specific**: Reference actual files, components, or patterns you observed
- **Be Actionable**: Ideas should be clear enough to implement without further clarification
- **Be Valuable**: Focus on ideas that bring real improvement, not busywork
- **Be Bold**: Don't be afraid to suggest significant changes if they're warranted

## Output

After completing the task, summarize:
- How many ideas were created
- Brief list of idea titles
- Any observations about the codebase
`;
}

/**
 * Execute Claude Ideas generation for multiple scan types
 * Creates Claude Code requirement files and queues them for processing
 */
export async function executeClaudeIdeas(config: ClaudeIdeasConfig): Promise<ClaudeIdeasResult> {
  console.log('[ClaudeIdeas] === STARTING EXECUTION ===');
  console.log('[ClaudeIdeas] Config:', JSON.stringify({
    projectId: config.projectId,
    projectName: config.projectName,
    projectPath: config.projectPath,
    scanTypesCount: config.scanTypes.length,
    scanTypes: config.scanTypes,
    contextId: config.contextId,
    batchId: config.batchId
  }, null, 2));

  const result: ClaudeIdeasResult = {
    success: false,
    tasksCreated: 0,
    taskIds: [],
    errors: []
  };

  // Validate required fields
  if (!config.projectPath) {
    const errorMsg = 'projectPath is required but was empty or undefined';
    console.error('[ClaudeIdeas] VALIDATION ERROR:', errorMsg);
    result.errors.push(errorMsg);
    return result;
  }

  if (!config.scanTypes || config.scanTypes.length === 0) {
    const errorMsg = 'No scan types selected';
    console.error('[ClaudeIdeas] VALIDATION ERROR:', errorMsg);
    result.errors.push(errorMsg);
    return result;
  }

  for (const scanType of config.scanTypes) {
    const scanConfig = SCAN_TYPE_CONFIGS.find(s => s.value === scanType);
    const scanLabel = scanConfig?.label ?? scanType;
    
    console.log(`[ClaudeIdeas] Processing scan type: ${scanLabel} (${scanType})`);
    
    // Build unique requirement name
    const timestamp = Date.now();
    const contextSuffix = config.contextId ? `-ctx-${config.contextId.slice(0, 8)}` : '';
    const requirementName = `idea-gen-${scanType}${contextSuffix}-${timestamp}`;

    console.log(`[ClaudeIdeas] Requirement name: ${requirementName}`);

    // Build the requirement content
    const requirementContent = buildClaudeIdeaRequirement({
      projectId: config.projectId,
      projectName: config.projectName,
      scanType,
      contextId: config.contextId,
      contextName: config.contextName
    });

    console.log(`[ClaudeIdeas] Requirement content length: ${requirementContent.length} chars`);

    // Pipeline configuration
    const pipelineConfig: PipelineConfig = {
      projectPath: config.projectPath,
      projectId: config.projectId,
      requirementName,
      requirementContent,
      onProgress: (progress, message) => {
        console.log(`[ClaudeIdeas] ${scanLabel}: ${progress}% - ${message}`);
      },
      onComplete: (pipelineResult) => {
        console.log(`[ClaudeIdeas] ${scanLabel}: Task completed`, pipelineResult.taskId);
      },
      onError: (error) => {
        console.error(`[ClaudeIdeas] ${scanLabel}: Pipeline error callback`, error.message);
      }
    };

    console.log(`[ClaudeIdeas] Calling executeFireAndForget with projectPath: ${pipelineConfig.projectPath}`);

    try {
      // Execute fire-and-forget (don't wait for completion)
      const pipelineResult = await executeFireAndForget(pipelineConfig);
      
      console.log(`[ClaudeIdeas] Pipeline result for ${scanLabel}:`, JSON.stringify(pipelineResult, null, 2));
      
      if (pipelineResult.success && pipelineResult.taskId) {
        result.tasksCreated++;
        result.taskIds.push(pipelineResult.taskId);
        console.log(`[ClaudeIdeas] SUCCESS: Task created with ID ${pipelineResult.taskId}`);
      } else {
        const errorMsg = `${scanLabel}: ${pipelineResult.error || 'Unknown error (no taskId)'}`;
        result.errors.push(errorMsg);
        console.error(`[ClaudeIdeas] FAILED:`, errorMsg);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`${scanLabel}: ${errorMessage}`);
      console.error(`[ClaudeIdeas] EXCEPTION for ${scanLabel}:`, errorMessage);
    }
  }

  result.success = result.tasksCreated > 0;
  console.log('[ClaudeIdeas] === EXECUTION COMPLETE ===');
  console.log('[ClaudeIdeas] Final result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Execute Claude Ideas for all contexts (batch mode)
 */
export async function executeClaudeIdeasBatch(config: {
  projectId: string;
  projectName: string;
  projectPath: string;
  scanTypes: ScanType[];
  contexts: Array<{ id: string; name: string }>;
  batchId: BatchId;
}): Promise<ClaudeIdeasResult> {
  const result: ClaudeIdeasResult = {
    success: false,
    tasksCreated: 0,
    taskIds: [],
    errors: []
  };

  // Process each context
  for (const context of config.contexts) {
    const contextResult = await executeClaudeIdeas({
      projectId: config.projectId,
      projectName: config.projectName,
      projectPath: config.projectPath,
      scanTypes: config.scanTypes,
      contextId: context.id,
      contextName: context.name,
      batchId: config.batchId
    });

    result.tasksCreated += contextResult.tasksCreated;
    result.taskIds.push(...contextResult.taskIds);
    result.errors.push(...contextResult.errors);
  }

  // Also run full project analysis (no context)
  const projectResult = await executeClaudeIdeas({
    projectId: config.projectId,
    projectName: config.projectName,
    projectPath: config.projectPath,
    scanTypes: config.scanTypes,
    batchId: config.batchId
  });

  result.tasksCreated += projectResult.tasksCreated;
  result.taskIds.push(...projectResult.taskIds);
  result.errors.push(...projectResult.errors);

  result.success = result.tasksCreated > 0;
  return result;
}
