/**
 * Reflection Prompt Builder
 * Builds Claude Code requirement for autonomous reflection sessions
 * Supports both per-project and global (cross-project) reflection modes
 */

import fs from 'fs';
import path from 'path';
import { directionDb, directionOutcomeDb, behavioralSignalDb, brainReflectionDb, brainInsightDb, contextDb } from '@/app/db';
import type { DbDirection, DbDirectionOutcome } from '@/app/db';
import type { LearningInsight } from '@/app/db/models/brain.types';
import { GitManager } from '@/lib/gitManager';

// ============================================================================
// TYPES
// ============================================================================

export interface GitCommitInfo {
  sha: string;
  message: string;
  date: string;
  filesChanged: string[];
}

export interface ReflectionData {
  acceptedDirections: Array<DbDirection & { outcome?: DbDirectionOutcome | null }>;
  rejectedDirections: DbDirection[];
  outcomeStats: {
    total: number;
    successful: number;
    failed: number;
    reverted: number;
  };
  signalCounts: Record<string, number>;
  currentBrainGuide: string | null;
  previousInsights: LearningInsight[];
  gitHistory: GitCommitInfo[];
  gitRepoUrl: string | null;
  ideaDecisions: Array<{ ideaTitle: string; category: string; accepted: boolean; contextName: string | null; timestamp: string }>;
  implementationHistory: Array<{ requirementName: string; success: boolean; filesModified: string[]; executionTimeMs: number; timestamp: string }>;
}

export interface GlobalReflectionData {
  projects: Array<{
    id: string;
    name: string;
    acceptedCount: number;
    rejectedCount: number;
    topAccepted: DbDirection[];
    topRejected: DbDirection[];
    outcomeStats: { total: number; successful: number; failed: number; reverted: number };
  }>;
  globalOutcomeStats: { total: number; successful: number; failed: number; reverted: number };
  previousGlobalInsights: LearningInsight[];
  currentGlobalGuide: string | null;
}

// ============================================================================
// PER-PROJECT REFLECTION
// ============================================================================

/**
 * Gather data for per-project reflection analysis
 */
export async function gatherReflectionData(
  projectId: string,
  projectPath: string,
  maxDirections: number = 30,
  gitRepoUrl?: string | null
): Promise<ReflectionData> {
  // Get accepted directions
  const acceptedDirections = directionDb.getAcceptedDirections(projectId)
    .slice(0, maxDirections)
    .map(d => ({
      ...d,
      outcome: directionOutcomeDb.getByDirectionId(d.id),
    }));

  // Get rejected directions
  const rejectedDirections = directionDb.getRejectedDirections(projectId)
    .slice(0, maxDirections);

  // Get outcome statistics
  const outcomeStats = directionOutcomeDb.getStats(projectId, 30);

  // Get signal counts
  const signalCounts = behavioralSignalDb.getCountByType(projectId, 30);

  // Get idea decision signals (Tinder swipes) for preference analysis
  const ideaDecisionSignals = behavioralSignalDb.getByProject(projectId, {
    signalType: 'context_focus',
    limit: 100,
  }).filter(s => {
    try {
      const data = JSON.parse(s.data);
      return data.ideaId !== undefined; // Only idea decisions, not other context_focus signals
    } catch { return false; }
  });

  // Get implementation signals for execution pattern analysis
  const implementationSignals = behavioralSignalDb.getByTypeAndWindow(projectId, 'implementation', 30);

  // Read current brain-guide.md if it exists
  let currentBrainGuide: string | null = null;
  const brainGuidePath = path.join(projectPath, '.claude', 'skills', 'brain-guide.md');
  if (fs.existsSync(brainGuidePath)) {
    currentBrainGuide = fs.readFileSync(brainGuidePath, 'utf-8');
  }

  // Get previous insights to prevent duplicates (from brain_insights table)
  const previousInsights = brainInsightDb.getAllInsights(projectId, 100);

  // Get git history for correlation analysis with timeout protection
  let gitHistory: GitCommitInfo[] = [];
  let detectedRepoUrl = gitRepoUrl || null;

  try {
    const GIT_TIMEOUT_MS = 5000;
    const gitPromise = (async () => {
      const isGit = await GitManager.isGitRepo(projectPath);
      if (!isGit) return { commits: [] as GitCommitInfo[], remoteUrl: null as string | null };

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      const commits = await GitManager.getRecentCommits(projectPath, {
        since: thirtyDaysAgo,
        limit: 30,
      });

      let remoteUrl: string | null = null;
      if (!gitRepoUrl) {
        remoteUrl = await GitManager.getRemoteUrl(projectPath);
      }

      return { commits, remoteUrl };
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Git operations timed out')), GIT_TIMEOUT_MS)
    );

    const result = await Promise.race([gitPromise, timeoutPromise]);
    gitHistory = result.commits;
    if (result.remoteUrl) detectedRepoUrl = result.remoteUrl;
  } catch (error) {
    console.warn('[ReflectionPromptBuilder] Git history unavailable:', error instanceof Error ? error.message : error);
  }

  // Parse idea decisions from signals
  const ideaDecisions = ideaDecisionSignals.map(s => {
    try {
      const data = JSON.parse(s.data);
      return {
        ideaTitle: data.ideaTitle || 'Unknown',
        category: data.category || 'general',
        accepted: data.accepted === true,
        contextName: data.contextName || s.context_name || null,
        timestamp: s.timestamp,
      };
    } catch { return null; }
  }).filter(Boolean) as ReflectionData['ideaDecisions'];

  // Parse implementation history from signals
  const implementationHistory = implementationSignals.map(s => {
    try {
      const data = JSON.parse(s.data);
      return {
        requirementName: data.requirementName || 'Unknown task',
        success: data.success === true,
        filesModified: data.filesModified || [],
        executionTimeMs: data.executionTimeMs || 0,
        timestamp: s.timestamp,
      };
    } catch { return null; }
  }).filter(Boolean) as ReflectionData['implementationHistory'];

  return {
    acceptedDirections,
    rejectedDirections,
    outcomeStats,
    signalCounts,
    currentBrainGuide,
    previousInsights,
    gitHistory,
    gitRepoUrl: detectedRepoUrl,
    ideaDecisions,
    implementationHistory,
  };
}

/**
 * Format directions for the prompt
 */
function formatDirectionsForPrompt(
  directions: Array<DbDirection & { outcome?: DbDirectionOutcome | null }>,
  type: 'accepted' | 'rejected'
): string {
  if (directions.length === 0) {
    return `*No ${type} directions in the analysis period.*`;
  }

  return directions.map((d, i) => {
    const outcomeInfo = d.outcome
      ? `
   - Execution: ${d.outcome.execution_success ? 'SUCCESS' : 'FAILED'}${d.outcome.was_reverted ? ' (REVERTED)' : ''}
   - Files changed: ${d.outcome.files_changed ? JSON.parse(d.outcome.files_changed).length : 'unknown'}
   - User satisfaction: ${d.outcome.user_satisfaction || 'not rated'}/5`
      : '';

    return `### ${i + 1}. "${d.summary}"
**Context**: ${d.context_map_title}
**Date**: ${d.created_at}
**Status**: ${type.toUpperCase()}${outcomeInfo}

<details>
<summary>Direction content</summary>

${d.direction.slice(0, 500)}${d.direction.length > 500 ? '...' : ''}

</details>
`;
  }).join('\n---\n\n');
}

/**
 * Format git history for the prompt
 */
function formatGitHistory(commits: GitCommitInfo[]): string {
  if (commits.length === 0) return '*No git history available.*';

  return commits.slice(0, 20).map(c =>
    `- **${c.date.split(' ')[0]}** \`${c.sha.slice(0, 7)}\`: ${c.message.slice(0, 80)}${c.message.length > 80 ? '...' : ''} (${c.filesChanged.length} files)`
  ).join('\n');
}

/**
 * Format previous insights for dedup instructions
 */
function formatPreviousInsights(insights: LearningInsight[]): string {
  if (insights.length === 0) return '*No previous insights recorded.*';

  return insights.map(i =>
    `- [${i.type}] **"${i.title}"** (confidence: ${i.confidence}%): ${i.description.slice(0, 100)}${i.description.length > 100 ? '...' : ''}`
  ).join('\n');
}

/**
 * Build the reflection requirement content
 */
export function buildReflectionRequirement(config: {
  projectId: string;
  projectName: string;
  projectPath: string;
  reflectionId: string;
  data: ReflectionData;
}): string {
  const { projectId, projectName, projectPath, reflectionId, data } = config;

  const apiUrl = process.env.VIBEMAN_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const acceptedSection = formatDirectionsForPrompt(data.acceptedDirections, 'accepted');
  const rejectedSection = formatDirectionsForPrompt(data.rejectedDirections, 'rejected');

  const currentGuideSection = data.currentBrainGuide
    ? `\`\`\`markdown
${data.currentBrainGuide}
\`\`\``
    : '*No brain-guide.md exists yet. Create one from scratch.*';

  const gitSection = data.gitHistory.length > 0
    ? `## Recent Git History (Last 30 Days)

${formatGitHistory(data.gitHistory)}

${data.gitRepoUrl ? `**Repository**: ${data.gitRepoUrl}` : ''}

---`
    : '';

  // Build idea preferences section
  const ideaPreferencesSection = data.ideaDecisions.length > 0
    ? `## Idea Review Patterns (Tinder Swipes)

The user has reviewed ${data.ideaDecisions.length} ideas. Analyze these preferences:

### Accepted Ideas (${data.ideaDecisions.filter(d => d.accepted).length})
${data.ideaDecisions.filter(d => d.accepted).map(d =>
  `- **"${d.ideaTitle}"** (${d.category})${d.contextName ? ` — ${d.contextName}` : ''}`
).join('\n') || '*None*'}

### Rejected Ideas (${data.ideaDecisions.filter(d => !d.accepted).length})
${data.ideaDecisions.filter(d => !d.accepted).map(d =>
  `- **"${d.ideaTitle}"** (${d.category})${d.contextName ? ` — ${d.contextName}` : ''}`
).join('\n') || '*None*'}

### Category Preferences
${(() => {
  const cats = new Map<string, { accepted: number; rejected: number }>();
  for (const d of data.ideaDecisions) {
    const c = cats.get(d.category) || { accepted: 0, rejected: 0 };
    if (d.accepted) c.accepted++; else c.rejected++;
    cats.set(d.category, c);
  }
  return Array.from(cats.entries()).map(([cat, counts]) =>
    `- **${cat}**: ${counts.accepted} accepted, ${counts.rejected} rejected (${Math.round(counts.accepted / (counts.accepted + counts.rejected) * 100)}% acceptance rate)`
  ).join('\n');
})()}

---`
    : '';

  // Build implementation history section
  const implementationSection = data.implementationHistory.length > 0
    ? `## Task Execution History

${data.implementationHistory.length} tasks executed in last 30 days:
- Successful: ${data.implementationHistory.filter(t => t.success).length}
- Failed: ${data.implementationHistory.filter(t => !t.success).length}
- Avg execution time: ${Math.round(data.implementationHistory.reduce((sum, t) => sum + t.executionTimeMs, 0) / data.implementationHistory.length / 1000)}s

### Recent Tasks
${data.implementationHistory.slice(0, 15).map(t =>
  `- ${t.success ? '\u2713' : '\u2717'} **${t.requirementName}** (${t.filesModified.length} files, ${Math.round(t.executionTimeMs / 1000)}s)`
).join('\n')}

---`
    : '';

  // Build context architecture section from active contexts
  const contextArchitectureSection = buildContextArchitectureSection(projectId);

  const previousInsightsSection = data.previousInsights.length > 0
    ? `## Previously Identified Insights

The following insights have already been identified in prior reflections.
Do NOT regenerate these. Only submit NEW patterns or significantly EVOLVED confidence levels.
If an existing insight now has stronger evidence, submit it with the \`evolves\` field referencing the previous title.

${formatPreviousInsights(data.previousInsights)}

---`
    : '';

  return `# Brain Reflection: Analyze Direction Patterns

## Mission

Analyze patterns in accepted vs rejected directions to understand what resonates with the user. Update the brain-guide.md with learned insights.

**This is an autonomous reflection session.** Your goal is to:
1. Identify patterns in what makes directions successful
2. Update the brain-guide.md with specific examples
3. Report insights back to the system

## Project Information

- **Project**: ${projectName}
- **Project ID**: ${projectId}
- **Project Path**: ${projectPath}
- **Reflection ID**: ${reflectionId}

## Data Summary

- **Accepted directions**: ${data.acceptedDirections.length}
- **Rejected directions**: ${data.rejectedDirections.length}
- **Outcome statistics**:
  - Total executed: ${data.outcomeStats.total}
  - Successful: ${data.outcomeStats.successful}
  - Failed: ${data.outcomeStats.failed}
  - Reverted: ${data.outcomeStats.reverted}
- **Behavioral signals**: ${Object.values(data.signalCounts).reduce((a, b) => a + b, 0)} total
- **Idea decisions reviewed**: ${data.ideaDecisions.length} (${data.ideaDecisions.filter(d => d.accepted).length} accepted, ${data.ideaDecisions.filter(d => !d.accepted).length} rejected)
- **Task executions**: ${data.implementationHistory.length} (${data.implementationHistory.filter(t => t.success).length} successful)
- **Git commits analyzed**: ${data.gitHistory.length}
- **Previous insights on record**: ${data.previousInsights.length}

---

${previousInsightsSection}

${contextArchitectureSection}

${gitSection}

${ideaPreferencesSection}

${implementationSection}

## Accepted Directions (Last 30 Days)

${acceptedSection}

---

## Rejected Directions (Last 30 Days)

${rejectedSection}

---

## Current Brain Guide

${currentGuideSection}

---

## Analysis Tasks

### 1. Pattern Detection

Analyze the accepted vs rejected directions and identify:

- **What categories/types are consistently accepted?**
  - Look at context areas, scope sizes, feature types
  - Note any clear preferences

- **What phrases or approaches lead to rejection?**
  - Buzzwords, overly broad scope, speculative features
  - Timing or context mismatches

- **Are there context-specific preferences?**
  - Does the user prefer different styles for different areas?
  - Any patterns in which contexts get accepted vs rejected?

### 2. Outcome Correlation

If outcome data is available:

- **Do certain direction types lead to successful implementations?**
- **What patterns exist in reverted implementations?**
- **Is there a correlation between direction scope and success?**

### 3. Gap Analysis

Compare actual behavior to current brain-guide.md:

- **What's documented that contradicts actual behavior?**
- **What patterns exist that aren't documented?**
- **Are there outdated observations?**

${data.gitHistory.length > 0 ? `### 4. Git Correlation

Compare git commits with direction decisions:

- **Which accepted directions led to actual commits?**
- **Were any commits made in areas where directions were rejected?**
- **Is there implementation activity in areas not covered by the direction system?**
- **Are commit messages consistent with direction summaries?**
` : ''}
---

## Output Instructions

### Step 1: Update brain-guide.md

Read the current file at: \`${projectPath}/.claude/skills/brain-guide.md\`

Update the **"Learning From Decisions"** section with:

1. **Specific examples of accepted directions** - quote the summary and explain why it worked
2. **Specific examples of rejected directions** - quote the summary and explain concerns
3. **New patterns identified** - any consistent observations

Example format for the section:

\`\`\`markdown
## Learning From Decisions

### Direction Examples

#### Session: ${new Date().toISOString().split('T')[0]}

**Accepted: "[Summary of accepted direction]"** (Context name)
> Why it worked: [Specific reasoning based on the user's actual behavior]

**Rejected: "[Summary of rejected direction]"** (Context name)
> Concern: [What made this problematic]

### Patterns Identified

- [Pattern 1 with evidence]
- [Pattern 2 with evidence]
\`\`\`

**Important**:
- Keep existing content, add new examples
- Be specific, not generic
- Use actual direction summaries as examples
- Don't remove previous learning, build on it

### Step 2: Submit Insights to API

After updating the file, submit your insights:

\`\`\`bash
curl -X POST ${apiUrl}/api/brain/reflection/${reflectionId}/complete \\
  -H "Content-Type: application/json" \\
  -d '{
    "directionsAnalyzed": ${data.acceptedDirections.length + data.rejectedDirections.length},
    "outcomesAnalyzed": ${data.outcomeStats.total},
    "signalsAnalyzed": ${Object.values(data.signalCounts).reduce((a, b) => a + b, 0)},
    "insights": [
      {
        "type": "preference_learned",
        "title": "Short descriptive title",
        "description": "What you learned",
        "confidence": 75,
        "evidence": ["direction_id_1", "direction_id_2"],
        "evolves": "Title of previous insight if updating one"
      }
    ],
    "guideSectionsUpdated": ["Learning From Decisions"]
  }'
\`\`\`

Insight types:
- \`preference_learned\`: A clear user preference identified
- \`pattern_detected\`: A pattern in acceptance/rejection
- \`warning\`: Something concerning (high revert rate, etc.)
- \`recommendation\`: Suggested action based on analysis

Confidence levels:
- 80-100: Strong evidence (5+ examples)
- 50-79: Emerging pattern (2-4 examples)
- 30-49: Tentative observation (1-2 examples)

**Important**: Only submit insights that are genuinely NEW or have significantly evolved.
If an existing insight now has stronger evidence, include \`"evolves": "Previous insight title"\` to indicate evolution rather than duplication.

---

## Quality Guidelines

- **Be specific, not generic**: Use actual direction titles
- **Show evidence**: Reference specific directions
- **Don't overfit**: 2 examples isn't a strong pattern
- **Preserve history**: Add to existing learning, don't replace
- **Stay objective**: Report what you see, not what you assume
- **Avoid duplicates**: Check previous insights before submitting

---

## Completion

After completing both steps:
1. Confirm brain-guide.md was updated
2. Confirm API call succeeded
3. Summarize what you learned

This reflection will help improve future direction generation.
`;
}

// ============================================================================
// GLOBAL (CROSS-PROJECT) REFLECTION
// ============================================================================

/**
 * Gather data for global (cross-project) reflection
 */
export async function gatherGlobalReflectionData(
  projects: Array<{ id: string; name: string; path: string }>,
  maxDirectionsPerProject: number = 15
): Promise<GlobalReflectionData> {
  const projectsData: GlobalReflectionData['projects'] = [];

  let globalTotal = 0, globalSuccessful = 0, globalFailed = 0, globalReverted = 0;

  for (const project of projects.slice(0, 10)) {
    const accepted = directionDb.getAcceptedDirections(project.id).slice(0, maxDirectionsPerProject);
    const rejected = directionDb.getRejectedDirections(project.id).slice(0, maxDirectionsPerProject);
    const stats = directionOutcomeDb.getStats(project.id, 60);

    globalTotal += stats.total;
    globalSuccessful += stats.successful;
    globalFailed += stats.failed;
    globalReverted += stats.reverted;

    projectsData.push({
      id: project.id,
      name: project.name,
      acceptedCount: accepted.length,
      rejectedCount: rejected.length,
      topAccepted: accepted.slice(0, 5),
      topRejected: rejected.slice(0, 5),
      outcomeStats: stats,
    });
  }

  // Get previous global insights (from brain_insights table)
  const previousGlobalInsights = brainInsightDb.getAllInsightsGlobal(100)
    .map(({ project_id: _pid, ...insight }) => insight);

  // Read global brain-guide.md
  let currentGlobalGuide: string | null = null;
  const globalGuidePath = path.join(process.cwd(), '.claude', 'skills', 'global-brain-guide.md');
  if (fs.existsSync(globalGuidePath)) {
    currentGlobalGuide = fs.readFileSync(globalGuidePath, 'utf-8');
  }

  return {
    projects: projectsData,
    globalOutcomeStats: { total: globalTotal, successful: globalSuccessful, failed: globalFailed, reverted: globalReverted },
    previousGlobalInsights,
    currentGlobalGuide,
  };
}

/**
 * Build global reflection requirement
 */
export function buildGlobalReflectionRequirement(config: {
  reflectionId: string;
  data: GlobalReflectionData;
  workspacePath: string;
}): string {
  const { reflectionId, data, workspacePath } = config;

  const apiUrl = process.env.VIBEMAN_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const projectsSummary = data.projects.map(p =>
    `### ${p.name}
- Accepted: ${p.acceptedCount} | Rejected: ${p.rejectedCount}
- Outcomes: ${p.outcomeStats.successful} success, ${p.outcomeStats.failed} failed, ${p.outcomeStats.reverted} reverted
- Top accepted: ${p.topAccepted.map(d => `"${d.summary}"`).join(', ') || 'none'}
- Top rejected: ${p.topRejected.map(d => `"${d.summary}"`).join(', ') || 'none'}`
  ).join('\n\n');

  const previousInsightsSection = data.previousGlobalInsights.length > 0
    ? `## Previously Identified Global Insights

Do NOT regenerate these. Only submit NEW cross-project patterns or evolved insights.

${formatPreviousInsights(data.previousGlobalInsights)}

---`
    : '';

  const currentGuideSection = data.currentGlobalGuide
    ? `\`\`\`markdown
${data.currentGlobalGuide}
\`\`\``
    : '*No global-brain-guide.md exists yet. Create one from scratch.*';

  return `# Global Brain Reflection: Cross-Project Pattern Analysis

## Mission

Analyze decision patterns ACROSS ALL PROJECTS to identify meta-level preferences and strategies. This is a portfolio-level reflection.

**Your goal is to find patterns that repeat across projects:**
1. Universal preferences (what the user always/never accepts)
2. Cross-project strategies (consistent approaches to similar problems)
3. Portfolio-wide warnings (recurring failure patterns)

## Reflection ID: ${reflectionId}

## Aggregated Statistics

- **Projects analyzed**: ${data.projects.length}
- **Total outcomes**: ${data.globalOutcomeStats.total}
  - Successful: ${data.globalOutcomeStats.successful}
  - Failed: ${data.globalOutcomeStats.failed}
  - Reverted: ${data.globalOutcomeStats.reverted}

---

${previousInsightsSection}

## Per-Project Direction Patterns

${projectsSummary}

---

## Current Global Brain Guide

${currentGuideSection}

---

## Analysis Tasks

### 1. Cross-Project Preferences

Look for patterns that appear across multiple projects:

- **Direction types consistently accepted everywhere** (e.g., performance fixes, small-scope changes)
- **Direction types consistently rejected everywhere** (e.g., major refactors, speculative features)
- **Common scope preferences** (small vs large changes, single-file vs multi-file)

### 2. Success Pattern Analysis

Across all projects:

- **What implementation approaches succeed most often?**
- **Are reverts concentrated in certain types of work?**
- **Is there a project-independent success predictor?**

### 3. Portfolio Strategy Detection

Higher-level observations:

- **Are some projects getting more attention than others?**
- **Are there neglected areas that might need direction?**
- **Do different projects show different maturity patterns?**

---

## Output Instructions

### Step 1: Update global-brain-guide.md

Create or update: \`${workspacePath}/.claude/skills/global-brain-guide.md\`

Structure:

\`\`\`markdown
# Global Brain Guide - Cross-Project Patterns

## Universal Preferences
- [What the user always accepts/rejects regardless of project]

## Cross-Project Strategies
- [Approaches that work across all projects]

## Portfolio Warnings
- [Recurring failure patterns to avoid]

## Per-Project Notes
- [Any project-specific observations worth noting globally]

## Last Updated
${new Date().toISOString().split('T')[0]}
\`\`\`

### Step 2: Submit Insights to API

\`\`\`bash
curl -X POST ${apiUrl}/api/brain/reflection/${reflectionId}/complete \\
  -H "Content-Type: application/json" \\
  -d '{
    "directionsAnalyzed": ${data.projects.reduce((sum, p) => sum + p.acceptedCount + p.rejectedCount, 0)},
    "outcomesAnalyzed": ${data.globalOutcomeStats.total},
    "signalsAnalyzed": 0,
    "insights": [
      {
        "type": "pattern_detected",
        "title": "Cross-project pattern title",
        "description": "What you observed across projects",
        "confidence": 75,
        "evidence": ["project_id_1", "project_id_2"]
      }
    ],
    "guideSectionsUpdated": ["Universal Preferences", "Cross-Project Strategies"]
  }'
\`\`\`

**Important**: Only submit cross-project insights. Per-project observations belong in per-project reflections.

---

## Completion

1. Confirm global-brain-guide.md was updated
2. Confirm API call succeeded
3. Summarize cross-project patterns found
`;
}

/**
 * Build context architecture section for reflection prompt
 */
function buildContextArchitectureSection(projectId: string): string {
  try {
    const contexts = contextDb.getContextsByProject(projectId);
    if (contexts.length === 0) return '';

    const contextLines: string[] = [];
    for (const ctx of contexts.slice(0, 10)) {
      let dbTables: string[] = [];
      let apiSurface: Array<{ path: string; methods: string }> = [];
      let crossRefs: Array<{ contextId: string; relationship: string }> = [];
      let techStack: string[] = [];
      try { dbTables = JSON.parse(ctx.db_tables || '[]'); } catch {}
      try { apiSurface = JSON.parse(ctx.api_surface || '[]'); } catch {}
      try { crossRefs = JSON.parse(ctx.cross_refs || '[]'); } catch {}
      try { techStack = JSON.parse(ctx.tech_stack || '[]'); } catch {}

      if (dbTables.length === 0 && apiSurface.length === 0 && crossRefs.length === 0) continue;

      const parts: string[] = [`### ${ctx.name}`];
      if (dbTables.length > 0) parts.push(`- **DB Tables**: ${dbTables.join(', ')}`);
      if (apiSurface.length > 0) parts.push(`- **API**: ${apiSurface.map(a => `${a.methods} ${a.path}`).join(', ')}`);
      if (crossRefs.length > 0) parts.push(`- **Cross-refs**: ${crossRefs.map(r => `${r.relationship} → ${r.contextId}`).join(', ')}`);
      if (techStack.length > 0) parts.push(`- **Tech**: ${techStack.join(', ')}`);
      contextLines.push(parts.join('\n'));
    }

    if (contextLines.length === 0) return '';

    return `## Context Architecture

The following contexts have rich metadata. Use this to produce architecture-aware insights
(e.g., contexts sharing the same DB table but lacking cross_refs may need tighter integration).

${contextLines.join('\n\n')}

---`;
  } catch {
    return '';
  }
}

// Note: writeReflectionRequirement was removed in favor of direct prompt execution
// The prompt content is now sent directly to Claude Code CLI without writing to disk
