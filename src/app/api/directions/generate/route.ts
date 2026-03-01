/**
 * API Route: Generate Directions
 *
 * POST /api/directions/generate
 * Creates a Claude Code requirement file for direction generation
 *
 * Supports both:
 * - SQLite contexts (primary) via selectedContextIds
 * - JSON contexts (fallback) via selectedContexts
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import { ContextMapEntry } from '../../context-map/route';
import { getBrainContext, formatBrainForDirections, getObservabilityContext, formatObservabilityForBrain } from '@/lib/brain/brainContext';
import { getBehavioralContext, formatBehavioralForPrompt } from '@/lib/brain/behavioralContext';
import { computePreferenceProfile, formatPreferenceForPrompt } from '@/lib/directions/preferenceEngine';
import { withObservability } from '@/lib/observability/middleware';
import { aiOrchestrator } from '@/lib/ai/aiOrchestrator';
import { contextDb, contextGroupDb, directionPreferenceDb } from '@/app/db';
import type { DbContext, DbContextGroup } from '@/app/db';

interface AnsweredQuestion {
  id: string;
  question: string;
  answer: string;
}

/**
 * Unified context format for direction generation
 * Works with both SQLite and JSON context sources
 */
interface UnifiedContext {
  id: string;
  title: string;
  summary: string;
  filepaths: {
    ui?: string[];
    lib?: string[];
    api?: string[];
    data?: string[];
  };
  // SQLite-specific fields
  contextId?: string;  // SQLite context ID
  groupId?: string;    // SQLite context group ID
  groupName?: string;  // Context group name
  layer?: string;      // pages, client, server, external
  category?: string;   // ui, lib, api, data
  businessFeature?: string;  // Human-readable feature name
}

interface GenerateDirectionsRequest {
  projectId: string;
  projectName: string;
  projectPath: string;
  // PRIMARY: SQLite context IDs
  selectedContextIds?: string[];
  // FALLBACK: JSON contexts (for backward compatibility)
  selectedContexts?: ContextMapEntry[];
  directionsPerContext?: number;
  userContext?: string;  // User's dilemma/topic description
  answeredQuestions?: AnsweredQuestion[];  // Selected answered questions for context
  brainstormAll?: boolean;  // When true, brainstorm across entire project holistically
}

/**
 * Convert SQLite context to unified format
 */
function sqliteContextToUnified(ctx: DbContext, group: DbContextGroup | null): UnifiedContext {
  // Parse file_paths if stored as JSON string
  let filePaths: string[] = [];
  if (ctx.file_paths) {
    try {
      filePaths = typeof ctx.file_paths === 'string'
        ? JSON.parse(ctx.file_paths)
        : ctx.file_paths;
    } catch {
      filePaths = [];
    }
  }

  // Categorize files by type based on path patterns
  const categorizedFiles = {
    ui: filePaths.filter(f => f.includes('/components/') || f.includes('/features/') || f.endsWith('.tsx')),
    lib: filePaths.filter(f => f.includes('/lib/') || f.includes('/hooks/') || f.includes('/utils/')),
    api: filePaths.filter(f => f.includes('/api/') || f.includes('route.ts')),
    data: filePaths.filter(f => f.includes('/db/') || f.includes('/models/') || f.includes('types.ts')),
  };

  return {
    id: ctx.id,
    title: ctx.name,
    summary: ctx.description || '',
    filepaths: categorizedFiles,
    contextId: ctx.id,
    groupId: ctx.group_id || undefined,
    groupName: group?.name || undefined,
    layer: group?.type || undefined,
    category: ctx.category || undefined,
    businessFeature: ctx.business_feature || undefined,
  };
}

/**
 * Convert JSON context to unified format (for backward compatibility)
 */
function jsonContextToUnified(ctx: ContextMapEntry): UnifiedContext {
  return {
    id: ctx.id,
    title: ctx.title,
    summary: ctx.summary,
    filepaths: {
      ui: ctx.filepaths.ui || [],
      lib: ctx.filepaths.lib || ctx.filepaths.logic || [],
      api: ctx.filepaths.api || ctx.filepaths.server || [],
      data: ctx.filepaths.data || [],
    },
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
 * Build the Claude Code requirement content for direction generation
 */
function buildDirectionRequirement(config: {
  projectId: string;
  projectName: string;
  projectPath: string;
  selectedContexts: UnifiedContext[];
  directionsPerContext: number;
  userContext?: string;
  answeredQuestions?: AnsweredQuestion[];
  brainContext?: string;  // Injected brain decision patterns
}): string {
  const { projectId, projectName, projectPath, selectedContexts, directionsPerContext, userContext, answeredQuestions = [], brainContext = '' } = config;
  const apiUrl = getVibemanApiUrl();

  // Build context sections with SQLite metadata
  const contextSections = selectedContexts.map(ctx => {
    const allFiles = [
      ...(ctx.filepaths.ui || []),
      ...(ctx.filepaths.lib || []),
      ...(ctx.filepaths.api || []),
      ...(ctx.filepaths.data || [])
    ];

    // Include SQLite-specific info if available
    const sqliteInfo = ctx.contextId ? `
**SQLite Context ID**: \`${ctx.contextId}\`
**Group**: ${ctx.groupName || 'Ungrouped'} (Layer: ${ctx.layer || 'unknown'})
**Category**: ${ctx.category || 'unclassified'}
**Business Feature**: ${ctx.businessFeature || 'General'}
` : '';

    return `### ${ctx.title} (${ctx.id})
${sqliteInfo}
**Summary**: ${ctx.summary}

**Files to analyze**:
${allFiles.map(f => `- \`${f}\``).join('\n')}
`;
  }).join('\n---\n\n');

  return `# Strategic Development Directions: ${projectName}

## Mission

Generate **ambitious, high-impact development directions** for each context area. Each direction should represent a **full Claude Code session worth of work** - a significant feature, architectural improvement, or capability enhancement that delivers substantial business value.

**Think like a Principal Engineer or VP of Engineering.** Focus on transformative improvements that will meaningfully advance the product, not incremental tweaks or small fixes.

## Scale of Impact

Each direction should be **substantial enough to warrant its own Claude Code session** (typically 30-90 minutes of AI-assisted development). This means:

- **NOT**: "Add a loading spinner" or "Fix typo in error message"
- **YES**: "Implement real-time collaboration for the editor" or "Add comprehensive undo/redo system"

## Project Information

- **Project ID**: ${projectId}
- **Project Path**: ${projectPath}
- **Directions per Context**: ${directionsPerContext}

${userContext ? `## User Focus Area

The user has provided the following context about their current focus or dilemma:

> ${userContext}

**Use this focus area to prioritize and guide your direction suggestions.** Ensure generated directions align with or address this specific concern.

` : ''}${answeredQuestions.length > 0 ? `## Strategic Input from Answered Questions

The user has answered the following strategic questions about the project. These represent their thinking about the project direction:

${answeredQuestions.map(q => `**Q:** ${q.question}
**A:** ${q.answer}`).join('\n\n')}

**Consider these answers when generating directions.** They provide valuable insight into the user's priorities and vision.

` : ''}${brainContext}## Context Map Entries to Analyze

${contextSections}

---

## Instructions

### Step 1: Strategic Analysis

For each context entry, perform deep analysis:

1. **Read ALL files thoroughly** - understand every component, hook, utility, and API endpoint
2. **Map the data flow** - how does state move through the system?
3. **Identify architectural patterns** - what patterns are used? What's missing?
4. **Evaluate user experience** - what are the friction points? What would delight users?
5. **Consider scale** - how would this handle 10x more data/users?

### Step 2: Identify High-Impact Opportunities

Look for opportunities in these strategic categories:

**Feature Expansion:**
- What major functionality is missing that users would expect?
- What would make this feature "complete" or "professional-grade"?
- What integrations would multiply the value?

**Architecture Evolution:**
- What patterns would improve maintainability at scale?
- Where are there tightly coupled components that should be decoupled?
- What abstractions would make future development faster?

**User Experience Transformation:**
- What workflows are awkward or multi-step that could be streamlined?
- What delightful features would differentiate this from competitors?
- What power-user features would make experts more productive?

**Data & Intelligence:**
- Where could analytics, caching, or optimization dramatically improve performance?
- What data could be surfaced that would provide insights?
- Where could AI/ML enhance the experience?

**Reliability & Quality:**
- What comprehensive error handling would make this bulletproof?
- What testing infrastructure would prevent regressions?
- What observability would help debug production issues?

### Step 3: Generate Strategic Directions as Paired Alternatives

For each context, generate **${directionsPerContext} problem-solution pairs**. Each pair consists of:
- **One problem statement**: The challenge or opportunity being addressed
- **Two alternative directions**: Different approaches to solve the same problem (Variant A and Variant B)

This allows users to compare approaches and pick the best one for their situation.

**Each direction MUST include:**

1. **Summary** (compelling one-liner): Clear, ambitious title that conveys the approach
2. **Direction content** (detailed markdown with sections):
   - **Vision**: What is the end state we're building toward?
   - **Business Value**: Why does this matter? What problem does it solve?
   - **Scope**: What's included and what's explicitly out of scope?
   - **Key Components**: What are the major pieces to build?
   - **Technical Approach**: High-level architecture and patterns to use
   - **Trade-offs**: What are the pros and cons of this approach vs alternatives?
   - **Files to Create/Modify**: Specific paths
   - **Success Criteria**: How do we know when it's done?
   - **Potential Challenges**: What might be tricky?
3. **Hypothesis assertions** (JSON array of measurable checks): Machine-verifiable assertions derived from the success criteria. After implementation, these are auto-checked against the git diff outcome.
   Each assertion has: \`description\` (human label), \`metric\` (one of: lines_added, lines_removed, files_changed, execution_success, was_reverted, file_touched), \`operator\` (<, <=, >, >=, ==, !=, contains), \`expected\` (number, boolean, or string).
   Example: \`[{"description":"Creates fewer than 10 new files","metric":"files_changed","operator":"<","expected":10},{"description":"Implementation succeeds","metric":"execution_success","operator":"==","expected":true},{"description":"Not reverted","metric":"was_reverted","operator":"==","expected":false}]\`

### Step 4: Save Direction Pairs to Database

For each problem, create **TWO directions** with matching \`pair_id\`:

**First, generate a unique pair_id** (e.g., \`pair_<timestamp>_<index>\`)

**Then create Variant A:**
\`\`\`bash
curl -X POST ${apiUrl}/api/directions \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${projectId}",
    "context_id": "<sqlite_context_id>",
    "context_name": "<context_title>",
    "context_group_id": "<sqlite_group_id_if_available>",
    "context_map_id": "<context_id>",
    "context_map_title": "<context_title>",
    "summary": "<Variant A: approach title>",
    "direction": "<full markdown content with all sections>",
    "hypothesis_assertions": "<JSON array of measurable assertions from success criteria>",
    "pair_id": "<unique_pair_id>",
    "pair_label": "A",
    "problem_statement": "<the problem both variants solve>"
  }'
\`\`\`

**Then create Variant B (same pair_id):**
\`\`\`bash
curl -X POST ${apiUrl}/api/directions \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${projectId}",
    "context_id": "<sqlite_context_id>",
    "context_name": "<context_title>",
    "context_group_id": "<sqlite_group_id_if_available>",
    "context_map_id": "<context_id>",
    "context_map_title": "<context_title>",
    "summary": "<Variant B: alternative approach title>",
    "direction": "<full markdown content with all sections>",
    "hypothesis_assertions": "<JSON array of measurable assertions from success criteria>",
    "pair_id": "<same_unique_pair_id>",
    "pair_label": "B",
    "problem_statement": "<the problem both variants solve>"
  }'
\`\`\`

**Important**:
- Both directions in a pair MUST have the same \`pair_id\`
- Use \`pair_label\` "A" for the first variant and "B" for the second
- Include the same \`problem_statement\` in both to help users understand what they're solving
- Make the two variants genuinely different approaches (e.g., build vs buy, simple vs comprehensive, quick-win vs long-term)

## Direction Quality Guidelines

### EXCELLENT Direction Pairs (Genuine Alternatives):

**Example Problem: "Need better error handling across the application"**

**Variant A - Centralized Error Boundary System:**
\`\`\`json
{
  "pair_id": "pair_1706745600_001",
  "pair_label": "A",
  "problem_statement": "Error handling is inconsistent across the app, leading to poor user experience and difficult debugging",
  "summary": "Variant A: Implement centralized error boundary system with recovery strategies",
  "direction": "## Centralized Error Boundary System\\n\\n### Vision\\nCreate a hierarchical error boundary system that catches, logs, and recovers from errors gracefully at multiple levels.\\n\\n### Trade-offs\\n**Pros:** Simpler implementation, React-native approach, good for unexpected errors\\n**Cons:** Less granular control, can't handle async errors as well\\n\\n### Technical Approach\\n- React Error Boundaries at app, feature, and component levels\\n- Centralized error logging service\\n- Recovery strategies: retry, fallback UI, reload..."
}
\`\`\`

**Variant B - Distributed Error Handling with Result Types:**
\`\`\`json
{
  "pair_id": "pair_1706745600_001",
  "pair_label": "B",
  "problem_statement": "Error handling is inconsistent across the app, leading to poor user experience and difficult debugging",
  "summary": "Variant B: Implement Result/Either pattern with typed error handling throughout",
  "direction": "## Distributed Result-Based Error Handling\\n\\n### Vision\\nAdopt functional programming patterns with Result/Either types to make error handling explicit and type-safe throughout the codebase.\\n\\n### Trade-offs\\n**Pros:** Type-safe, explicit error paths, better for expected errors, composable\\n**Cons:** Learning curve, more verbose, requires refactoring existing code\\n\\n### Technical Approach\\n- Create Result<T, E> type utilities\\n- Refactor async functions to return Results\\n- Pattern matching for error handling..."
}
\`\`\`

### What Makes Good Paired Alternatives:

1. **Same problem, different philosophy**: e.g., "Build vs Buy", "Simple vs Comprehensive", "Quick-win vs Long-term"
2. **Clear trade-offs**: Each variant should have distinct pros and cons
3. **Both are viable**: Don't make one obviously worse
4. **Different technical approaches**: Not just cosmetic differences

### BAD Pairs (Avoid These):

- Same solution with minor tweaks (e.g., using tabs vs spaces)
- One clearly superior option (biased comparison)
- Solutions to different problems
- Variants that can't stand alone

### The Paired Direction Litmus Test:

A good pair should:
1. **Solve the same clearly-stated problem** - users understand what they're choosing between
2. **Offer genuine trade-offs** - neither is universally better
3. **Both require similar effort** - both are worthy of implementation time
4. **Help users think strategically** - the choice reveals priorities

## Output Summary

After generating all directions, summarize:
- Total directions created: X
- Strategic themes identified
- Potential impact assessment (high/medium for each)
- Recommended priority order

---

**Remember**: Each accepted direction will spawn a full Claude Code implementation session. Make them worthy of that investment - ambitious, valuable, and transformative.
`;
}

/**
 * Build brainstorm requirement - holistic view across entire project
 */
function buildBrainstormRequirement(config: {
  projectId: string;
  projectName: string;
  projectPath: string;
  allContexts: UnifiedContext[];
  directionsCount: number;
  userContext?: string;
  answeredQuestions?: AnsweredQuestion[];
  brainContext?: string;
}): string {
  const { projectId, projectName, projectPath, allContexts, directionsCount, userContext, answeredQuestions = [], brainContext = '' } = config;
  const apiUrl = getVibemanApiUrl();

  // Build condensed context overview with SQLite info if available
  const contextOverview = allContexts.map(ctx => {
    const fileCount = [
      ...(ctx.filepaths.ui || []),
      ...(ctx.filepaths.lib || []),
      ...(ctx.filepaths.api || []),
      ...(ctx.filepaths.data || [])
    ].length;
    const layerInfo = ctx.layer ? ` [${ctx.layer}]` : '';
    return `- **${ctx.title}** (${ctx.id})${layerInfo}: ${ctx.summary} [${fileCount} files]`;
  }).join('\n');

  return `# Strategic Brainstorm: ${projectName}

## Mission

Generate **${directionsCount} strategic development directions** by analyzing the entire project holistically. Unlike focused context analysis, this is a **bird's-eye view** exercise - look for cross-cutting opportunities, architectural improvements, and strategic initiatives that span multiple areas.

**Think like a Principal Engineer reviewing the entire product.** What would move the needle? What opportunities exist at the intersections of different features?

## Project Information

- **Project ID**: ${projectId}
- **Project Path**: ${projectPath}
- **Total Contexts**: ${allContexts.length}
- **Directions to Generate**: ${directionsCount}

${userContext ? `## Focus Area

The user has provided this context about their current thinking:

> ${userContext}

**Let this guide your brainstorming** - but don't limit yourself to only this area.

` : ''}${answeredQuestions.length > 0 ? `## Strategic Input from User

The user has shared these thoughts about the project direction:

${answeredQuestions.map(q => `**Q:** ${q.question}
**A:** ${q.answer}`).join('\n\n')}

` : ''}${brainContext}## Project Landscape

Here's an overview of all ${allContexts.length} contexts in this project:

${contextOverview}

---

## Instructions

### Step 1: Holistic Analysis

Take a **bird's-eye view** of the project:

1. **Map the ecosystem** - How do these contexts relate to each other?
2. **Identify gaps** - What's missing between the pieces?
3. **Spot patterns** - What repeated problems could be solved systematically?
4. **Consider the user journey** - What friction points exist across features?
5. **Think scale** - What would need to change for 10x growth?

### Step 2: Cross-Cutting Opportunities

Look for opportunities that span multiple contexts:

**Integration Opportunities:**
- Where could features work better together?
- What data could be shared more effectively?
- What user workflows cross multiple contexts?

**Architectural Opportunities:**
- What patterns are inconsistent across the codebase?
- What infrastructure would benefit multiple features?
- What abstractions would reduce overall complexity?

**Strategic Opportunities:**
- What would differentiate this product?
- What would make power users significantly more productive?
- What would reduce operational burden?

### Step 3: Generate Strategic Directions

Generate exactly **${directionsCount} directions** that:
- Span or benefit multiple contexts
- Address systemic rather than local issues
- Would make a visible difference to users or developers
- Are worthy of dedicated implementation sessions

**For each direction, use context_map_id "cross-cutting"** since these span multiple areas.

### Step 4: Save Directions to Database

For each direction, make a POST request:

\`\`\`bash
curl -X POST ${apiUrl}/api/directions \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${projectId}",
    "context_map_id": "cross-cutting",
    "context_map_title": "Cross-Cutting Initiative",
    "summary": "<compelling one-liner summary>",
    "direction": "<full markdown content with all sections>",
    "hypothesis_assertions": "<JSON array of measurable assertions from success criteria>"
  }'
\`\`\`

## Direction Format

Each direction should include:

1. **Summary** (compelling one-liner): What is this initiative?
2. **Direction content** (detailed markdown):
   - **Vision**: What does success look like?
   - **Contexts Affected**: Which areas does this touch?
   - **Business Value**: Why does this matter?
   - **Approach**: High-level implementation strategy
   - **Success Criteria**: How do we know it's done?
   - **Key Risks**: What could go wrong?
3. **Hypothesis assertions** (JSON array): Machine-verifiable assertions from the success criteria. Each has \`description\`, \`metric\` (lines_added, lines_removed, files_changed, execution_success, was_reverted, file_touched), \`operator\` (<, <=, >, >=, ==, !=, contains), \`expected\` (number/boolean/string).

## Quality Guidelines

**EXCELLENT Brainstorm Directions:**
- "Unify state management patterns across all feature modules"
- "Build cross-context search that surfaces content from any feature"
- "Create shared component library with consistent interaction patterns"
- "Implement project-wide keyboard navigation system"

**NOT Brainstorm Material** (too narrow):
- "Add loading spinner to one component"
- "Fix bug in single feature"
- "Refactor one file"

## Output Summary

After generating all directions, provide:
- List of all ${directionsCount} directions created
- Key themes that emerged
- Recommended implementation order
- Dependencies between directions

---

**Remember**: This is strategic thinking time. These directions should represent meaningful investments that improve the product as a whole, not just individual features.
`;
}

async function handlePost(request: NextRequest) {
  try {
    const body: GenerateDirectionsRequest = await request.json();

    const {
      projectId,
      projectName,
      projectPath,
      selectedContextIds,
      selectedContexts,
      directionsPerContext = 3,
      userContext,
      answeredQuestions,
      brainstormAll = false
    } = body;

    // Validate required fields
    if (!projectId || !projectName || !projectPath) {
      return NextResponse.json(
        { error: 'projectId, projectName, and projectPath are required' },
        { status: 400 }
      );
    }

    // Build unified contexts from either SQLite IDs or JSON contexts
    let unifiedContexts: UnifiedContext[] = [];

    // PRIMARY: Use SQLite context IDs if provided
    if (selectedContextIds && selectedContextIds.length > 0) {
      logger.info('[API] Fetching contexts from SQLite database', { count: selectedContextIds.length });

      for (const ctxId of selectedContextIds) {
        const ctx = contextDb.getContextById(ctxId);
        if (ctx) {
          const group = ctx.group_id ? contextGroupDb.getGroupById(ctx.group_id) : null;
          unifiedContexts.push(sqliteContextToUnified(ctx, group));
        } else {
          logger.warn('[API] Context not found in SQLite:', { ctxId });
        }
      }
    }
    // FALLBACK: Use JSON contexts for backward compatibility
    else if (selectedContexts && selectedContexts.length > 0) {
      logger.info('[API] Using JSON contexts (fallback mode)', { count: selectedContexts.length });
      unifiedContexts = selectedContexts.map(jsonContextToUnified);
    }

    if (unifiedContexts.length === 0) {
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

    // Load brain context if available
    const brain = getBrainContext(normalizedProjectPath);
    const brainContext = formatBrainForDirections(brain);

    if (brain.exists) {
      logger.info('[API] Brain context loaded for direction generation');
    }

    // Load observability context if available
    const obsContext = getObservabilityContext(projectId);
    const obsSection = formatObservabilityForBrain(obsContext);

    if (obsContext.hasData) {
      logger.info('[API] Observability context loaded for direction generation', {
        topEndpoints: obsContext.topEndpoints.length,
        highErrorEndpoints: obsContext.highErrorEndpoints.length
      });
    }

    // Load behavioral context (user activity patterns)
    const behavioralCtx = getBehavioralContext(projectId);
    const behavioralSection = formatBehavioralForPrompt(behavioralCtx);

    if (behavioralCtx.hasData) {
      logger.info('[API] Behavioral context loaded for direction generation', {
        activeContexts: behavioralCtx.currentFocus.activeContexts.length,
        successRate: behavioralCtx.patterns.successRate
      });
    }

    // Load architectural context graph (full project awareness)
    const architectureSection = aiOrchestrator.getProjectArchitectureSection(projectId);

    // Load user preference profile from pair decision history
    let preferenceSection = '';
    try {
      const cached = directionPreferenceDb.get(projectId);
      let profile;
      if (cached) {
        profile = {
          projectId,
          vector: JSON.parse(cached.vector_json),
          sampleCount: cached.sample_count,
          axisCounts: JSON.parse(cached.axis_counts_json),
          stability: cached.stability,
          computedAt: cached.computed_at,
        };
      } else {
        profile = computePreferenceProfile(projectId);
        if (profile.sampleCount > 0) {
          directionPreferenceDb.set(
            projectId,
            JSON.stringify(profile.vector),
            profile.sampleCount,
            JSON.stringify(profile.axisCounts),
            profile.stability
          );
        }
      }
      preferenceSection = formatPreferenceForPrompt(profile);
      if (preferenceSection) {
        logger.info('[API] Preference profile loaded for direction generation', {
          sampleCount: profile.sampleCount,
          stability: profile.stability,
        });
      }
    } catch {
      // Preference loading is non-critical
    }

    // Combine brain, observability, behavioral, architectural, and preference context
    const combinedContext = brainContext + obsSection + behavioralSection + architectureSection + preferenceSection;

    // Build requirement content - use brainstorm builder for holistic mode
    const requirementContent = brainstormAll
      ? buildBrainstormRequirement({
          projectId,
          projectName,
          projectPath: normalizedProjectPath,
          allContexts: unifiedContexts,
          directionsCount: directionsPerContext,
          userContext,
          answeredQuestions,
          brainContext: combinedContext
        })
      : buildDirectionRequirement({
          projectId,
          projectName,
          projectPath: normalizedProjectPath,
          selectedContexts: unifiedContexts,
          directionsPerContext,
          userContext,
          answeredQuestions,
          brainContext: combinedContext
        });

    // Create requirement file with short name
    const timestamp = Date.now();
    const requirementName = brainstormAll ? `brainstorm-${timestamp}` : `direction-gen-${timestamp}`;

    // Ensure .claude/commands directory exists
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

    logger.info('[API] Direction generation requirement created:', {
      requirementName,
      requirementPath,
      contextCount: unifiedContexts.length,
      directionsPerContext,
      brainstormAll,
      fileExists,
      fileSize: fileStats?.size,
      usedSqliteContexts: !!selectedContextIds && selectedContextIds.length > 0
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
      expectedDirections: brainstormAll ? directionsPerContext : unifiedContexts.length * directionsPerContext,
      brainContextUsed: brain.exists,
      observabilityContextUsed: obsContext.hasData,
      preferenceContextUsed: !!preferenceSection,
      brainstormAll,
      usedSqliteContexts: !!selectedContextIds && selectedContextIds.length > 0
    });

  } catch (error) {
    logger.error('[API] Directions generate error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export with observability tracking
export const POST = withObservability(handlePost, '/api/directions/generate');
