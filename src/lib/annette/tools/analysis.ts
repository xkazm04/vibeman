/**
 * Analysis Tools - Codebase health assessment and deep CLI-based analysis
 *
 * Tools:
 * - assess_codebase_health: Instant DB-based health scoring across all contexts
 * - analyze_context: Deep read-only CLI analysis of a specific context
 * - get_analysis_findings: Parse completed CLI analysis output into structured findings
 * - create_directions_from_analysis: Convert findings into direction cards
 */

import { contextDb, implementationLogDb, directionOutcomeDb } from '@/app/db';
import { getBehavioralContext } from '@/lib/brain/behavioralContext';
import { buildAnalysisPrompt, type AnalysisType } from '../prompts/analysisPrompts';
import {
  findAnalysisLogFile,
  extractTextFromLog,
  parseAnalysisOutput,
  type AnalysisMeta,
  type AnalysisResult,
} from '../lib/analysisParser';
import type { CLIExecutionInfo } from './tasks';
import { logger } from '@/lib/logger';

// In-memory registry of analysis runs so get_analysis_findings can look up metadata
const analysisRegistry = new Map<string, AnalysisMeta>();

export async function executeAnalysisTools(
  name: string,
  input: Record<string, unknown>,
  projectId: string,
  projectPath?: string
): Promise<string> {
  switch (name) {
    case 'assess_codebase_health':
      return assessCodebaseHealth(input, projectId);

    case 'analyze_context':
      return analyzeContext(input, projectId, projectPath);

    case 'get_analysis_findings':
      return getAnalysisFindings(input, projectPath);

    case 'create_directions_from_analysis':
      return createDirectionsFromAnalysis(input, projectId);

    default:
      return JSON.stringify({ error: `Unknown analysis tool: ${name}` });
  }
}

// ─── Tool 1: assess_codebase_health ─────────────────────────────────────────

async function assessCodebaseHealth(
  input: Record<string, unknown>,
  projectId: string
): Promise<string> {
  try {
    const minScore = input.min_score ? parseInt(String(input.min_score), 10) : 0;

    // Fetch all contexts for the project
    const contexts = contextDb.getContextsByProject(projectId);
    if (contexts.length === 0) {
      return JSON.stringify({
        contexts: [],
        projectSummary: { totalContexts: 0, healthyCount: 0, needsAttentionCount: 0, overallScore: 0 },
        message: 'No contexts found. Run a context scan first to discover project areas.',
      });
    }

    // Get behavioral context (signals, patterns, activity)
    const behavioralCtx = getBehavioralContext(projectId);

    // Get implementation outcome stats
    let outcomeStats = { total: 0, successful: 0, failed: 0, reverted: 0, pending: 0 };
    try {
      outcomeStats = directionOutcomeDb.getStats(projectId, 14);
    } catch { /* no outcome data yet */ }

    // Get recent implementation logs
    let implLogs: Array<{ overview?: string; tested?: number }> = [];
    try {
      implLogs = implementationLogDb.getRecentLogsByProject(projectId, 20);
    } catch { /* no logs yet */ }

    // Score each context
    const scoredContexts = contexts.map(ctx => {
      let filePaths: string[] = [];
      try {
        filePaths = JSON.parse(ctx.file_paths || '[]');
      } catch { /* empty */ }

      const score = calculateHealthScore(ctx, filePaths, behavioralCtx, implLogs);
      const signals = identifySignals(ctx, filePaths, behavioralCtx);
      const suggestedAnalysis = suggestAnalysisType(signals);

      // Find last activity from behavioral context
      const activity = behavioralCtx.currentFocus?.activeContexts?.find(
        (c: { id: string }) => c.id === ctx.id
      );
      const lastActivity = activity ? 'active recently' : 'no recent activity';

      return {
        id: ctx.id,
        name: ctx.name,
        healthScore: score,
        fileCount: filePaths.length,
        lastActivity,
        signals,
        suggestedAnalysis,
      };
    });

    // Sort by health score (lowest = needs most attention)
    scoredContexts.sort((a, b) => a.healthScore - b.healthScore);

    // Filter by minimum score if specified
    const filtered = minScore > 0
      ? scoredContexts.filter(c => c.healthScore <= minScore)
      : scoredContexts;

    // Calculate project summary
    const healthyCount = scoredContexts.filter(c => c.healthScore >= 70).length;
    const needsAttentionCount = scoredContexts.filter(c => c.healthScore < 60).length;
    const overallScore = scoredContexts.length > 0
      ? Math.round(scoredContexts.reduce((sum, c) => sum + c.healthScore, 0) / scoredContexts.length)
      : 0;

    return JSON.stringify({
      contexts: filtered,
      projectSummary: {
        totalContexts: contexts.length,
        healthyCount,
        needsAttentionCount,
        overallScore,
      },
      outcomeStats: {
        successRate: outcomeStats.total > 0
          ? Math.round((outcomeStats.successful / outcomeStats.total) * 100)
          : null,
        total: outcomeStats.total,
        reverted: outcomeStats.reverted,
      },
    });
  } catch (error) {
    logger.error('assess_codebase_health failed', { error });
    return JSON.stringify({ error: 'Failed to assess codebase health' });
  }
}

function calculateHealthScore(
  context: { id: string; name: string; file_paths?: string | null },
  filePaths: string[],
  behavioralCtx: ReturnType<typeof getBehavioralContext>,
  implLogs: Array<{ overview?: string; tested?: number }>
): number {
  let score = 70; // baseline

  // Activity recency bonus/penalty
  const contextActivity = behavioralCtx.currentFocus?.activeContexts?.find(
    (c: { id: string; activityScore: number }) => c.id === context.id
  );
  if (contextActivity) {
    score += Math.min(contextActivity.activityScore * 3, 15);
  } else {
    score -= 10; // no recent activity = potential staleness
  }

  // Neglected area penalty
  if (behavioralCtx.trending?.neglectedAreas?.includes(context.name)) {
    score -= 15;
  }

  // Implementation success from logs touching this context's files
  const relatedLogs = implLogs.filter(log =>
    log.overview && filePaths.some(f => log.overview!.includes(f))
  );
  if (relatedLogs.length > 0) {
    const testedRatio = relatedLogs.filter(l => l.tested).length / relatedLogs.length;
    score += Math.round(testedRatio * 10);
  }

  // File count complexity penalty
  if (filePaths.length > 30) score -= 5;
  if (filePaths.length > 50) score -= 10;

  // AI navigation metadata quality signals
  try {
    let crossRefs: unknown[] = [];
    let entryPoints: unknown[] = [];
    let techStack: string[] = [];
    try { crossRefs = JSON.parse((context as Record<string, unknown>).cross_refs as string || '[]'); } catch {}
    try { entryPoints = JSON.parse((context as Record<string, unknown>).entry_points as string || '[]'); } catch {}
    try { techStack = JSON.parse((context as Record<string, unknown>).tech_stack as string || '[]'); } catch {}

    // Isolated contexts (no cross-refs) get a small penalty
    if (crossRefs.length === 0) score -= 3;
    // Contexts without entry points get a documentation penalty
    if (entryPoints.length === 0) score -= 3;
    // Too many different technologies = complexity signal
    if (techStack.length > 6) score -= 5;
  } catch { /* metadata scoring is best-effort */ }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function identifySignals(
  context: { id: string; name: string },
  filePaths: string[],
  behavioralCtx: ReturnType<typeof getBehavioralContext>
): string[] {
  const signals: string[] = [];

  // Check if neglected
  if (behavioralCtx.trending?.neglectedAreas?.includes(context.name)) {
    signals.push('neglected area');
  }

  // Check activity
  const isActive = behavioralCtx.currentFocus?.activeContexts?.some(
    (c: { id: string }) => c.id === context.id
  );
  if (!isActive) {
    signals.push('no recent activity');
  } else {
    signals.push('actively worked on');
  }

  // Check reverts
  if (behavioralCtx.patterns?.revertedCount > 0) {
    signals.push('project has recent reverts');
  }

  // File count
  if (filePaths.length > 40) {
    signals.push(`large module (${filePaths.length} files)`);
  }

  return signals;
}

function suggestAnalysisType(signals: string[]): AnalysisType {
  if (signals.includes('project has recent reverts')) return 'quality';
  if (signals.includes('neglected area')) return 'architecture';
  if (signals.some(s => s.startsWith('large module'))) return 'performance';
  return 'architecture';
}

// ─── Tool 2: analyze_context ────────────────────────────────────────────────

async function analyzeContext(
  input: Record<string, unknown>,
  projectId: string,
  projectPath?: string
): Promise<string> {
  const contextId = input.context_id as string;
  const analysisType = (input.analysis_type as AnalysisType) || 'architecture';

  if (!contextId) {
    return JSON.stringify({ error: 'context_id is required' });
  }

  if (!projectPath) {
    return JSON.stringify({ error: 'Project path is required for CLI analysis' });
  }

  // Fetch context details
  const context = contextDb.getContextById(contextId);
  if (!context) {
    return JSON.stringify({ error: `Context ${contextId} not found` });
  }

  let filePaths: string[] = [];
  try {
    filePaths = JSON.parse(context.file_paths || '[]');
  } catch { /* empty */ }

  if (filePaths.length === 0) {
    return JSON.stringify({ error: `Context "${context.name}" has no files to analyze` });
  }

  let apiRoutes: string[] | undefined;
  try {
    if (context.api_routes) {
      apiRoutes = JSON.parse(context.api_routes);
    }
  } catch { /* no routes */ }

  // Build the analysis prompt
  const promptContent = buildAnalysisPrompt(analysisType, {
    contextName: context.name,
    filePaths,
    apiRoutes,
  });

  // Create requirement file via API
  const timestamp = Date.now();
  const sanitizedName = context.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const requirementName = `analysis-${sanitizedName}-${analysisType}-${timestamp}`;

  try {
    const reqResponse = await fetch('http://localhost:3000/api/claude-code/requirement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        projectPath,
        name: requirementName,
        content: promptContent,
      }),
    });

    if (!reqResponse.ok) {
      const error = await reqResponse.text();
      return JSON.stringify({ success: false, error });
    }
  } catch (error) {
    return JSON.stringify({ success: false, error: 'Failed to create analysis requirement' });
  }

  // Register analysis metadata for later retrieval
  analysisRegistry.set(requirementName, {
    contextId,
    contextName: context.name,
    analysisType,
    requirementName,
    startedAt: timestamp,
  });

  // Return CLI execution info for MiniTerminal display
  const cliInfo: CLIExecutionInfo = {
    showCLI: true,
    requirementName,
    projectPath,
    projectId,
    autoStart: true,
  };

  return JSON.stringify({
    success: true,
    message: `Starting ${analysisType} analysis of "${context.name}" (${filePaths.length} files). Watch progress below.`,
    requirementName,
    cliExecution: cliInfo,
  });
}

// ─── Tool 3: get_analysis_findings ──────────────────────────────────────────

async function getAnalysisFindings(
  input: Record<string, unknown>,
  projectPath?: string
): Promise<string> {
  const requirementName = input.requirement_name as string;

  if (!requirementName) {
    return JSON.stringify({ error: 'requirement_name is required' });
  }

  if (!projectPath) {
    return JSON.stringify({ error: 'Project path is required to read analysis logs' });
  }

  // Get metadata from registry
  const meta = analysisRegistry.get(requirementName);
  if (!meta) {
    return JSON.stringify({
      error: `No analysis metadata found for "${requirementName}". Was analyze_context called first?`,
    });
  }

  // Find the log file
  const logFile = findAnalysisLogFile(projectPath, requirementName);
  if (!logFile) {
    return JSON.stringify({
      error: `Log file not found for "${requirementName}". The analysis may still be running or may have failed.`,
    });
  }

  try {
    // Extract text from CLI log
    const rawText = extractTextFromLog(logFile);

    if (!rawText || rawText.trim().length < 50) {
      return JSON.stringify({
        error: 'Analysis output is empty or too short. The CLI execution may have failed.',
        hint: 'Check the MiniTerminal for error messages.',
      });
    }

    // Parse into structured result
    const result = parseAnalysisOutput(rawText, {
      contextId: meta.contextId,
      contextName: meta.contextName,
      analysisType: meta.analysisType,
    });

    return JSON.stringify({
      success: true,
      analysis: {
        contextName: result.contextName,
        analysisType: result.analysisType,
        findingsCount: result.findings.length,
        findings: result.findings,
        recommendationsCount: result.recommendations.length,
        recommendations: result.recommendations,
        summary: result.summary,
      },
      requirementName,
      // Include raw for create_directions_from_analysis
      _rawResult: JSON.stringify(result),
    });
  } catch (error) {
    logger.error('Failed to parse analysis findings', { requirementName, error });
    return JSON.stringify({
      error: 'Failed to parse analysis output',
      hint: 'The CLI output may not match the expected format.',
    });
  }
}

// ─── Tool 4: create_directions_from_analysis ────────────────────────────────

async function createDirectionsFromAnalysis(
  input: Record<string, unknown>,
  projectId: string
): Promise<string> {
  const findingsJson = input.findings_json as string;
  const maxDirections = parseInt(String(input.max_directions || '3'), 10);

  if (!findingsJson) {
    return JSON.stringify({ error: 'findings_json is required' });
  }

  let result: AnalysisResult;
  try {
    result = JSON.parse(findingsJson) as AnalysisResult;
  } catch {
    return JSON.stringify({ error: 'Invalid findings_json — must be a valid AnalysisResult JSON' });
  }

  // Take top recommendations (by impact priority)
  const sorted = [...result.recommendations].sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    const effortOrder = { small: 0, medium: 1, large: 2 };
    const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
    if (impactDiff !== 0) return impactDiff;
    return effortOrder[a.effort] - effortOrder[b.effort];
  });

  const toConvert = sorted.slice(0, maxDirections);
  if (toConvert.length === 0) {
    return JSON.stringify({
      success: false,
      message: 'No recommendations to convert. The analysis may not have found actionable improvements.',
    });
  }

  const createdIds: string[] = [];
  const errors: string[] = [];

  for (const rec of toConvert) {
    try {
      const directionContent = [
        `## ${rec.title}`,
        '',
        rec.description,
        '',
        `**Effort:** ${rec.effort}`,
        `**Impact:** ${rec.impact}`,
        rec.files.length > 0 ? `**Files:** ${rec.files.map(f => `\`${f}\``).join(', ')}` : '',
        '',
        `*Source: ${result.analysisType} analysis of ${result.contextName}*`,
      ].filter(Boolean).join('\n');

      const response = await fetch('http://localhost:3000/api/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          context_id: result.contextId,
          summary: rec.title,
          direction: directionContent,
          status: 'pending',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        createdIds.push(data.id || data.direction?.id || 'created');
      } else {
        errors.push(`Failed to create direction for "${rec.title}"`);
      }
    } catch {
      errors.push(`Error creating direction for "${rec.title}"`);
    }
  }

  return JSON.stringify({
    success: createdIds.length > 0,
    message: `Created ${createdIds.length} directions from ${result.analysisType} analysis of ${result.contextName}.`,
    directionIds: createdIds,
    errors: errors.length > 0 ? errors : undefined,
  });
}
