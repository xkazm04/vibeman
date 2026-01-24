/**
 * API Route: Generate Questions
 *
 * POST /api/questions/generate
 * Creates a Claude Code requirement file for question generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import { contextDb, contextGroupDb, DbContext, DbContextGroup } from '@/app/db';
import { ContextMapEntry } from '../../context-map/route';

interface GenerateQuestionsRequest {
  projectId: string;
  projectName: string;
  projectPath: string;
  // PRIMARY: SQLite context IDs
  selectedContextIds?: string[];
  // FALLBACK: JSON contexts (for backward compatibility)
  selectedContexts?: ContextMapEntry[];
  questionsPerContext?: number;
}

/**
 * Unified context structure for template rendering
 */
interface UnifiedContext {
  id: string;
  title: string;
  summary: string;
  files: string[];
  groupName?: string;
  groupLayer?: string;
  category?: string;
}

/**
 * Convert SQLite context to unified format
 */
function sqliteContextToUnified(ctx: DbContext, group?: DbContextGroup | null): UnifiedContext {
  let files: string[] = [];
  try {
    files = JSON.parse(ctx.file_paths || '[]');
  } catch {
    files = [];
  }

  return {
    id: ctx.id,
    title: ctx.name,
    summary: ctx.description || '',
    files,
    groupName: group?.name,
    groupLayer: group?.type || undefined,
    category: ctx.category || undefined
  };
}

/**
 * Convert JSON ContextMapEntry to unified format (backward compatibility)
 */
function jsonContextToUnified(ctx: ContextMapEntry): UnifiedContext {
  const allFiles = [
    ...(ctx.filepaths.ui || []),
    ...(ctx.filepaths.lib || []),
    ...(ctx.filepaths.api || [])
  ];

  return {
    id: ctx.id,
    title: ctx.title,
    summary: ctx.summary,
    files: allFiles
  };
}

/**
 * Get the Vibeman API base URL for Claude Code to use
 */
function getVibemanApiUrl(): string {
  if (process.env.VIBEMAN_API_URL) {
    return process.env.VIBEMAN_API_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:3000';
}

/**
 * Build the Claude Code requirement content for question generation
 */
function buildQuestionRequirement(config: {
  projectId: string;
  projectName: string;
  projectPath: string;
  unifiedContexts: UnifiedContext[];
  questionsPerContext: number;
}): string {
  const { projectId, projectName, projectPath, unifiedContexts, questionsPerContext } = config;
  const apiUrl = getVibemanApiUrl();

  // Build context sections
  const contextSections = unifiedContexts.map(ctx => {
    const groupInfo = ctx.groupName
      ? `**Group**: ${ctx.groupName}${ctx.groupLayer ? ` (${ctx.groupLayer})` : ''}\n`
      : '';
    const categoryInfo = ctx.category ? `**Category**: ${ctx.category}\n` : '';

    return `### ${ctx.title} (${ctx.id})

${groupInfo}${categoryInfo}**Summary**: ${ctx.summary}

**Files to analyze**:
${ctx.files.map(f => `- \`${f}\``).join('\n')}
`;
  }).join('\n---\n\n');

  return `# Strategic Question Generation: ${projectName}

## Mission

Generate high-level strategic questions that uncover the **vision, direction, and architectural philosophy** for each feature area. These questions become Goals that guide all future development decisions.

**Think like a product strategist and architect, not a developer.** Focus on the "why" and "where", not the "how".

## Project Information

- **Project ID**: ${projectId}
- **Project Path**: ${projectPath}
- **Questions per Context**: ${questionsPerContext}

## Context Map Entries to Analyze

${contextSections}

---

## Instructions

### Step 1: Check for Context Map

First, verify the context_map.json exists:

\`\`\`bash
ls "${projectPath}/context_map.json"
\`\`\`

If it doesn't exist, use the skill:

\`\`\`
/context-map-generator
\`\`\`

### Step 2: Strategic Analysis

For each context entry:

1. **Read the files** to understand what this feature area does today
2. **Think about the feature's future** - where could this evolve?
3. **Identify strategic decision points** - what product/architectural choices would shape its direction?
4. **Generate exactly ${questionsPerContext} strategic questions** in these categories:

**Vision & Direction:**
- What is the ultimate purpose of this feature for users?
- How should this feature evolve over the next 6-12 months?
- What user problems should this solve that it doesn't today?

**Architecture & Scale:**
- What scale should this be designed for?
- Should this be a standalone module or deeply integrated?
- What are the key architectural principles that should govern this area?

**User Experience Philosophy:**
- What should the user experience feel like?
- What level of complexity should be exposed vs. hidden?
- Who is the primary user persona for this feature?

**Product Strategy:**
- How does this fit into the overall product vision?
- What would make this a "killer feature"?
- What trade-offs are acceptable (speed vs. features, simplicity vs. power)?

### Step 3: Save Questions to Database

For each question, make a POST request:

\`\`\`bash
curl -X POST ${apiUrl}/api/questions \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${projectId}",
    "context_map_id": "<context_id>",
    "context_map_title": "<context_title>",
    "question": "<your strategic question here>"
  }'
\`\`\`

## Question Quality Guidelines

### GOOD Questions (Strategic, Visionary):
- "What is the long-term vision for the Blueprint scanning system - should it become a fully automated CI/CD pipeline, or remain a developer-guided analysis tool?"
- "Should the Ideas system prioritize quantity (many small suggestions) or quality (fewer, more impactful architectural recommendations)?"
- "What user persona should the Context Management feature optimize for - solo developers managing personal projects, or teams coordinating on large codebases?"
- "How should the TaskRunner balance automation vs. control - fully autonomous execution, or human-in-the-loop approval for each step?"
- "What is the acceptable complexity ceiling for this feature - should power users have access to advanced configuration, or should simplicity be prioritized?"

### BAD Questions (Too Technical/Implementation-Focused):
- "Should we use useEffect or useSWR for data fetching?" (implementation detail)
- "Should the button be blue or green?" (minor UI decision)
- "Should we add error handling to this function?" (obvious code quality)
- "What state management library should we use?" (technical choice, not strategic)
- "Should this component be server-side or client-side rendered?" (too narrow)

### The Litmus Test:
A good strategic question should:
1. **Influence months of development** - not just one PR
2. **Require product thinking** - not just technical knowledge
3. **Have multiple valid answers** - each leading to different feature directions
4. **Shape user experience** - not just code architecture

## Output Summary

After generating all questions, summarize:
- Total questions created: X
- Key strategic themes identified
- Potential feature directions uncovered

---

**Important**: Each answer to these questions becomes a Goal that guides ALL future idea generation and development for this feature area. Think big.
`;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateQuestionsRequest = await request.json();

    const {
      projectId,
      projectName,
      projectPath,
      selectedContextIds,
      selectedContexts,
      questionsPerContext = 3
    } = body;

    // Validate required fields
    if (!projectId || !projectName || !projectPath) {
      return NextResponse.json(
        { error: 'projectId, projectName, and projectPath are required' },
        { status: 400 }
      );
    }

    // Must have either selectedContextIds (SQLite) or selectedContexts (JSON fallback)
    if ((!selectedContextIds || selectedContextIds.length === 0) &&
        (!selectedContexts || selectedContexts.length === 0)) {
      return NextResponse.json(
        { error: 'At least one context must be selected (via selectedContextIds or selectedContexts)' },
        { status: 400 }
      );
    }

    // Normalize the project path for the current OS
    const normalizedProjectPath = path.normalize(projectPath);

    // Verify project path exists
    if (!fs.existsSync(normalizedProjectPath)) {
      logger.error('[API] Project path does not exist:', { projectPath, normalizedProjectPath });
      return NextResponse.json(
        { error: `Project path does not exist: ${normalizedProjectPath}` },
        { status: 400 }
      );
    }

    // Convert to unified contexts
    let unifiedContexts: UnifiedContext[] = [];

    if (selectedContextIds && selectedContextIds.length > 0) {
      // PRIMARY: Fetch SQLite contexts
      logger.info('[API] Using SQLite contexts for question generation', {
        contextIds: selectedContextIds
      });

      for (const ctxId of selectedContextIds) {
        const ctx = contextDb.getContextById(ctxId);
        if (ctx) {
          const group = ctx.group_id ? contextGroupDb.getGroupById(ctx.group_id) : null;
          unifiedContexts.push(sqliteContextToUnified(ctx, group));
        }
      }
    } else if (selectedContexts && selectedContexts.length > 0) {
      // FALLBACK: Use JSON contexts (backward compatibility)
      logger.info('[API] Using JSON contexts for question generation (fallback)', {
        contextCount: selectedContexts.length
      });
      unifiedContexts = selectedContexts.map(jsonContextToUnified);
    }

    if (unifiedContexts.length === 0) {
      return NextResponse.json(
        { error: 'No valid contexts found' },
        { status: 400 }
      );
    }

    // Build requirement content
    const requirementContent = buildQuestionRequirement({
      projectId,
      projectName,
      projectPath: normalizedProjectPath,
      unifiedContexts,
      questionsPerContext
    });

    // Create requirement file with short name
    const timestamp = Date.now();
    const requirementName = `question-gen-${timestamp}`;

    // Ensure .claude/commands directory exists (where Vibeman reads requirements from)
    const requirementsDir = path.join(normalizedProjectPath, '.claude', 'commands');
    logger.info('[API] Creating commands directory:', { requirementsDir });

    if (!fs.existsSync(requirementsDir)) {
      fs.mkdirSync(requirementsDir, { recursive: true });
      logger.info('[API] Created commands directory');
    }

    // Write requirement file
    const requirementPath = path.join(requirementsDir, `${requirementName}.md`);
    logger.info('[API] Writing requirement file:', { requirementPath, contentLength: requirementContent.length });

    fs.writeFileSync(requirementPath, requirementContent, 'utf-8');

    // Verify file was written
    const fileExists = fs.existsSync(requirementPath);
    const fileStats = fileExists ? fs.statSync(requirementPath) : null;

    logger.info('[API] Question generation requirement created:', {
      requirementName,
      requirementPath,
      contextCount: unifiedContexts.length,
      questionsPerContext,
      fileExists,
      fileSize: fileStats?.size
    });

    if (!fileExists) {
      return NextResponse.json(
        { error: 'Failed to write requirement file - file does not exist after write' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requirementName,
      requirementPath,
      contextCount: unifiedContexts.length,
      expectedQuestions: unifiedContexts.length * questionsPerContext
    });

  } catch (error) {
    logger.error('[API] Questions generate error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
