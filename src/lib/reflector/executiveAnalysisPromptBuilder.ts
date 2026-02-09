/**
 * Executive Analysis Prompt Builder
 * Builds Claude Code prompt for AI-driven executive insight analysis
 */

import { ideaDb, directionDb, architectureAnalysisDb } from '@/app/db';
import type { DbIdea, DbDirection } from '@/app/db';
import type { ScanType, ALL_SCAN_TYPES } from '@/app/features/Ideas/lib/scanTypes';
import type { TimeWindow } from '@/app/features/reflector/sub_Reflection/lib/types';

// ============================================================================
// TYPES
// ============================================================================

export interface ScanTypePerformance {
  scanType: string;
  total: number;
  accepted: number;
  rejected: number;
  implemented: number;
  pending: number;
  acceptanceRate: number;
}

export interface ContextMapPerformance {
  contextMapId: string;
  contextMapTitle: string;
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  acceptanceRate: number;
}

export interface ExecutiveAnalysisData {
  // Ideas stats
  ideasTotal: number;
  ideasAccepted: number;
  ideasRejected: number;
  ideasImplemented: number;
  ideasPending: number;
  ideasAcceptanceRate: number;

  // Scan type breakdown
  scanTypePerformance: ScanTypePerformance[];
  topPerformers: string[];
  underperformers: string[];

  // Directions stats (if available)
  directionsTotal: number;
  directionsAccepted: number;
  directionsRejected: number;
  directionsPending: number;
  directionsAcceptanceRate: number;

  // Context map breakdown (for directions)
  contextMapPerformance: ContextMapPerformance[];

  // Architecture context (from latest completed architecture analysis)
  architectureSummary: {
    projectsAnalyzed: number;
    relationshipsDiscovered: number;
    detectedPatterns: string[];
    completedAt: string;
  } | null;

  // Metadata
  projectName: string | null;
  contextName: string | null;
  timeWindow: string;
  analysisDate: string;
}

export interface BuildPromptConfig {
  analysisId: string;
  data: ExecutiveAnalysisData;
  projectId: string | null;
  apiBaseUrl?: string;
}

// ============================================================================
// DATA GATHERING
// ============================================================================

/**
 * Get date filter based on time window
 */
function getDateFilter(timeWindow: TimeWindow): Date | null {
  if (timeWindow === 'all') return null;

  const now = new Date();
  switch (timeWindow) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'quarter':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

/**
 * Filter items by date
 */
function filterByDate<T extends { created_at: string }>(items: T[], since: Date | null): T[] {
  if (!since) return items;
  return items.filter(item => new Date(item.created_at) >= since);
}

/**
 * Gather data for executive analysis
 */
export async function gatherExecutiveAnalysisData(
  projectId: string | null,
  contextId: string | null,
  timeWindow: TimeWindow = 'all',
  projectName?: string,
  contextName?: string
): Promise<ExecutiveAnalysisData> {
  const dateFilter = getDateFilter(timeWindow);

  // Get ideas
  let ideas: DbIdea[] = [];
  if (projectId) {
    ideas = ideaDb.getIdeasByProject(projectId);
    if (contextId) {
      ideas = ideas.filter(i => i.context_id === contextId);
    }
  } else {
    ideas = ideaDb.getAllIdeas();
  }
  ideas = filterByDate(ideas, dateFilter);

  // Calculate ideas stats
  const ideasTotal = ideas.length;
  const ideasAccepted = ideas.filter(i => i.status === 'accepted').length;
  const ideasRejected = ideas.filter(i => i.status === 'rejected').length;
  const ideasImplemented = ideas.filter(i => i.status === 'implemented').length;
  const ideasPending = ideas.filter(i => i.status === 'pending').length;
  const ideasAcceptanceRate = ideasTotal > 0
    ? Math.round(((ideasAccepted + ideasImplemented) / ideasTotal) * 100)
    : 0;

  // Calculate scan type performance
  const scanTypeMap = new Map<string, { total: number; accepted: number; rejected: number; implemented: number; pending: number }>();
  for (const idea of ideas) {
    const scanType = idea.scan_type || 'unknown';
    const existing = scanTypeMap.get(scanType) || { total: 0, accepted: 0, rejected: 0, implemented: 0, pending: 0 };
    existing.total++;
    if (idea.status === 'accepted') existing.accepted++;
    if (idea.status === 'rejected') existing.rejected++;
    if (idea.status === 'implemented') existing.implemented++;
    if (idea.status === 'pending') existing.pending++;
    scanTypeMap.set(scanType, existing);
  }

  const scanTypePerformance: ScanTypePerformance[] = Array.from(scanTypeMap.entries())
    .map(([scanType, stats]) => ({
      scanType,
      ...stats,
      acceptanceRate: stats.total > 0
        ? Math.round(((stats.accepted + stats.implemented) / stats.total) * 100)
        : 0
    }))
    .sort((a, b) => b.total - a.total);

  // Identify top performers and underperformers
  const performersWithData = scanTypePerformance.filter(s => s.total >= 3);
  const topPerformers = performersWithData
    .filter(s => s.acceptanceRate >= 60)
    .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
    .slice(0, 3)
    .map(s => s.scanType);

  const underperformers = performersWithData
    .filter(s => s.acceptanceRate < 40)
    .sort((a, b) => a.acceptanceRate - b.acceptanceRate)
    .slice(0, 3)
    .map(s => s.scanType);

  // Get directions
  let directions: DbDirection[] = [];
  if (projectId) {
    directions = directionDb.getDirectionsByProject(projectId);
    if (contextId) {
      directions = directions.filter(d => d.context_id === contextId);
    }
  }
  directions = filterByDate(directions, dateFilter);

  // Calculate directions stats
  const directionsTotal = directions.length;
  const directionsAccepted = directions.filter(d => d.status === 'accepted').length;
  const directionsRejected = directions.filter(d => d.status === 'rejected').length;
  const directionsPending = directions.filter(d => d.status === 'pending').length;
  const directionsAcceptanceRate = directionsTotal > 0
    ? Math.round((directionsAccepted / directionsTotal) * 100)
    : 0;

  // Calculate context map performance
  const contextMapMap = new Map<string, { title: string; total: number; accepted: number; rejected: number; pending: number }>();
  for (const dir of directions) {
    const mapId = dir.context_map_id;
    const existing = contextMapMap.get(mapId) || { title: dir.context_map_title, total: 0, accepted: 0, rejected: 0, pending: 0 };
    existing.total++;
    if (dir.status === 'accepted') existing.accepted++;
    if (dir.status === 'rejected') existing.rejected++;
    if (dir.status === 'pending') existing.pending++;
    contextMapMap.set(mapId, existing);
  }

  const contextMapPerformance: ContextMapPerformance[] = Array.from(contextMapMap.entries())
    .map(([contextMapId, stats]) => ({
      contextMapId,
      contextMapTitle: stats.title,
      total: stats.total,
      accepted: stats.accepted,
      rejected: stats.rejected,
      pending: stats.pending,
      acceptanceRate: stats.total > 0
        ? Math.round((stats.accepted / stats.total) * 100)
        : 0
    }))
    .sort((a, b) => b.total - a.total);

  // Get latest completed architecture analysis
  let architectureSummary: ExecutiveAnalysisData['architectureSummary'] = null;
  try {
    const scope = projectId ? 'project' : 'workspace';
    const scopeId = projectId || null;
    const latestArch = architectureAnalysisDb.getLatestCompleted(scope, scopeId);
    if (latestArch) {
      let patterns: string[] = [];
      if (latestArch.detected_patterns) {
        try { patterns = JSON.parse(latestArch.detected_patterns); } catch { /* ignore parse errors */ }
      }
      architectureSummary = {
        projectsAnalyzed: latestArch.projects_analyzed,
        relationshipsDiscovered: latestArch.relationships_discovered,
        detectedPatterns: Array.isArray(patterns) ? patterns : [],
        completedAt: latestArch.completed_at || latestArch.created_at,
      };
    }
  } catch {
    // Architecture analysis table may not exist yet - gracefully skip
  }

  return {
    ideasTotal,
    ideasAccepted,
    ideasRejected,
    ideasImplemented,
    ideasPending,
    ideasAcceptanceRate,
    scanTypePerformance,
    topPerformers,
    underperformers,
    directionsTotal,
    directionsAccepted,
    directionsRejected,
    directionsPending,
    directionsAcceptanceRate,
    contextMapPerformance,
    architectureSummary,
    projectName: projectName || null,
    contextName: contextName || null,
    timeWindow,
    analysisDate: new Date().toISOString(),
  };
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

/**
 * Build the executive analysis prompt for Claude Code
 */
export function buildExecutiveAnalysisPrompt(config: BuildPromptConfig): string {
  const { analysisId, data, projectId, apiBaseUrl = '' } = config;

  const sections: string[] = [];

  // Header
  sections.push(`# Executive Insights Deep Analysis

## Mission
Analyze the ideas and directions data to identify deeper patterns, anomalies,
correlations, and actionable recommendations that go beyond surface-level statistics.
Focus on insights that are genuinely useful and not obvious from the raw numbers.

## Analysis Context
- **Analysis ID**: \`${analysisId}\`
- **Project**: ${data.projectName || 'All Projects'}
- **Context**: ${data.contextName || 'All Contexts'}
- **Time Window**: ${data.timeWindow}
- **Analysis Date**: ${data.analysisDate}
`);

  // Ideas Statistics
  sections.push(`## Ideas Statistics

| Metric | Value |
|--------|-------|
| Total Ideas | ${data.ideasTotal} |
| Accepted | ${data.ideasAccepted} |
| Rejected | ${data.ideasRejected} |
| Implemented | ${data.ideasImplemented} |
| Pending | ${data.ideasPending} |
| **Acceptance Rate** | **${data.ideasAcceptanceRate}%** |
`);

  // Scan Type Performance
  if (data.scanTypePerformance.length > 0) {
    sections.push(`## Specialist (Scan Type) Performance

| Specialist | Total | Accepted | Rejected | Implemented | Pending | Acceptance Rate |
|------------|-------|----------|----------|-------------|---------|-----------------|
${data.scanTypePerformance.map(s =>
  `| ${s.scanType} | ${s.total} | ${s.accepted} | ${s.rejected} | ${s.implemented} | ${s.pending} | ${s.acceptanceRate}% |`
).join('\n')}

### Top Performers
${data.topPerformers.length > 0 ? data.topPerformers.map(s => `- ${s}`).join('\n') : '- None identified (need 3+ ideas with 60%+ acceptance)'}

### Underperformers (Need Attention)
${data.underperformers.length > 0 ? data.underperformers.map(s => `- ${s}`).join('\n') : '- None identified (all above 40% acceptance)'}
`);
  }

  // Directions Statistics (if available)
  if (data.directionsTotal > 0) {
    sections.push(`## Directions Statistics

| Metric | Value |
|--------|-------|
| Total Directions | ${data.directionsTotal} |
| Accepted | ${data.directionsAccepted} |
| Rejected | ${data.directionsRejected} |
| Pending | ${data.directionsPending} |
| **Acceptance Rate** | **${data.directionsAcceptanceRate}%** |
`);

    if (data.contextMapPerformance.length > 0) {
      sections.push(`### Context Map Performance

| Context Map | Total | Accepted | Rejected | Pending | Acceptance Rate |
|-------------|-------|----------|----------|---------|-----------------|
${data.contextMapPerformance.map(c =>
  `| ${c.contextMapTitle} | ${c.total} | ${c.accepted} | ${c.rejected} | ${c.pending} | ${c.acceptanceRate}% |`
).join('\n')}
`);
    }
  }

  // Architecture Context (from latest architecture analysis)
  if (data.architectureSummary) {
    const arch = data.architectureSummary;
    sections.push(`## Architecture Context

Latest architecture analysis completed ${arch.completedAt}:

| Metric | Value |
|--------|-------|
| Projects Analyzed | ${arch.projectsAnalyzed} |
| Relationships Discovered | ${arch.relationshipsDiscovered} |
| Detected Patterns | ${arch.detectedPatterns.length} |

${arch.detectedPatterns.length > 0
  ? `### Detected Patterns\n${arch.detectedPatterns.map(p => `- ${p}`).join('\n')}`
  : ''}

Use this architecture context to enrich your analysis. Cross-project dependencies
and patterns may explain idea acceptance/rejection trends.
`);
  }

  // Analysis Tasks
  sections.push(`## Analysis Tasks

Perform the following analysis on the data above:

### 1. Pattern Detection
Look for patterns the automated system might have missed:
- Correlations between specialist types (do certain specialists work well together?)
- Effort/impact patterns (are high-effort ideas rejected more?)
- Category-specific preferences
- Any unexpected patterns in the data

### 2. Anomaly Detection
Identify unusual patterns:
- Sudden changes in acceptance rates
- Unexpected high/low performers
- Statistical outliers
- Concerning trends

### 3. Root Cause Analysis
For underperforming areas:
- Why might certain specialists be rejected more?
- Are there common themes in rejections?
- What context factors might influence acceptance?

### 4. Strategic Recommendations
Based on the data, provide:
- Which specialists should be prioritized?
- What changes could improve acceptance rates?
- Are there untapped opportunities?
- Resource allocation suggestions

### 5. Actionable Insights
Generate 3-5 specific, actionable insights with:
- Clear title describing the insight
- Detailed description of what you found
- Confidence level (0-100)
- Evidence from the data
- Suggested action if actionable
`);

  // Output Instructions
  sections.push(`## Output Instructions

After completing your analysis, submit your findings via API:

\`\`\`bash
curl -X POST "${apiBaseUrl}/api/reflector/executive-analysis/${analysisId}/complete" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ideasAnalyzed": ${data.ideasTotal},
    "directionsAnalyzed": ${data.directionsTotal},
    "insights": [
      {
        "type": "pattern",
        "title": "Example: High-effort ideas have lower acceptance",
        "description": "Detailed explanation of the pattern...",
        "confidence": 85,
        "evidence": ["specific data point 1", "specific data point 2"],
        "actionable": true,
        "suggestedAction": "Consider breaking high-effort ideas into smaller chunks"
      }
    ],
    "narrative": "Executive summary paragraph describing the overall state and key findings...",
    "recommendations": [
      "Specific recommendation 1",
      "Specific recommendation 2"
    ]
  }'
\`\`\`

### Insight Types
Use these types for insights:
- \`pattern\`: A recurring pattern you identified
- \`anomaly\`: Something unexpected or unusual
- \`opportunity\`: An untapped potential
- \`warning\`: A concerning trend
- \`recommendation\`: A suggested action

### Quality Guidelines
1. **Be specific**: Use actual numbers from the data
2. **Be actionable**: Insights should suggest what to do
3. **Be confident**: Only report insights you're reasonably sure about
4. **Avoid obvious**: Don't state what's already clear from the numbers
5. **Prioritize**: Focus on the most impactful insights
`);

  return sections.join('\n');
}
