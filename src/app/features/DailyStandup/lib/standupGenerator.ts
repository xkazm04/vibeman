/**
 * Standup Generator Service
 * Generates AI-powered daily/weekly standup summaries from implementation logs and scan results
 */

import { randomUUID } from 'crypto';
import { llmManager } from '@/lib/llm/llm-manager';
import {
  StandupSourceData,
  StandupBlocker,
  StandupHighlight,
  StandupFocusArea,
  DbStandupSummary,
} from '@/app/db/models/standup.types';

interface GenerationResult {
  success: boolean;
  summary?: Omit<DbStandupSummary, 'created_at' | 'updated_at'>;
  error?: string;
}

interface LLMStandupResponse {
  title: string;
  summary: string;
  blockers: StandupBlocker[];
  highlights: StandupHighlight[];
  velocityTrend: 'increasing' | 'stable' | 'decreasing';
  burnoutRisk: 'low' | 'medium' | 'high';
  focusAreas: StandupFocusArea[];
}

/**
 * Get date range for a period type
 */
export function getPeriodDateRange(
  periodType: 'daily' | 'weekly',
  referenceDate?: string
): { start: Date; end: Date } {
  const refDate = referenceDate ? new Date(referenceDate) : new Date();

  if (periodType === 'daily') {
    const start = new Date(refDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(refDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // Weekly - get Monday to Sunday
  const dayOfWeek = refDate.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const start = new Date(refDate);
  start.setDate(refDate.getDate() - daysFromMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Build the prompt for LLM standup generation
 */
function buildStandupPrompt(
  sourceData: StandupSourceData,
  periodType: 'daily' | 'weekly',
  periodLabel: string
): string {
  const implementationList = sourceData.implementationLogs
    .map((log) => `- ${log.title}: ${log.overview}`)
    .join('\n');

  const ideasByStatus = {
    accepted: sourceData.ideas.filter((i) => i.status === 'accepted').length,
    rejected: sourceData.ideas.filter((i) => i.status === 'rejected').length,
    implemented: sourceData.ideas.filter((i) => i.status === 'implemented').length,
    pending: sourceData.ideas.filter((i) => i.status === 'pending').length,
  };

  const ideasByScanType = sourceData.ideas.reduce((acc, idea) => {
    acc[idea.scanType] = (acc[idea.scanType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const scanTypeBreakdown = Object.entries(ideasByScanType)
    .map(([type, count]) => `  - ${type}: ${count} ideas`)
    .join('\n');

  const contextActivity = sourceData.contexts
    .filter((c) => c.implementedTasks > 0)
    .map((c) => `- ${c.name}: ${c.implementedTasks} tasks completed`)
    .join('\n');

  return `You are generating a ${periodType} standup summary for ${periodLabel}.

## Implementation Activity
${implementationList || 'No implementations this period.'}

## Ideas Generated
Total: ${sourceData.ideas.length}
- Accepted: ${ideasByStatus.accepted}
- Rejected: ${ideasByStatus.rejected}
- Implemented: ${ideasByStatus.implemented}
- Pending: ${ideasByStatus.pending}

By Scan Type:
${scanTypeBreakdown || '  None'}

## Scans Run
${sourceData.scans.length} scans completed

## Context Activity
${contextActivity || 'No context activity this period.'}

Based on this data, generate a standup summary in JSON format with:
1. A concise title (max 60 chars)
2. A narrative summary (2-3 paragraphs) describing what was accomplished
3. Any detected blockers (things slowing progress)
4. Highlights (achievements, milestones)
5. Velocity trend (increasing/stable/decreasing based on activity patterns)
6. Burnout risk (low/medium/high based on workload patterns)
7. Focus areas for the next period

Respond ONLY with valid JSON in this exact format:
{
  "title": "string",
  "summary": "string",
  "blockers": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "severity": "low|medium|high",
      "suggestedAction": "string (optional)"
    }
  ],
  "highlights": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "type": "achievement|milestone|quality_improvement|velocity_boost",
      "metric": "string (optional)"
    }
  ],
  "velocityTrend": "increasing|stable|decreasing",
  "burnoutRisk": "low|medium|high",
  "focusAreas": [
    {
      "area": "string",
      "priority": "high|medium|low",
      "reason": "string"
    }
  ]
}`;
}

/**
 * Parse LLM response into structured standup data
 */
function parseLLMResponse(response: string): LLMStandupResponse | null {
  try {
    // Clean up potential markdown code blocks
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);

    // Ensure all required fields exist with defaults
    return {
      title: parsed.title || 'Standup Summary',
      summary: parsed.summary || 'No summary generated.',
      blockers: Array.isArray(parsed.blockers)
        ? parsed.blockers.map((b: Partial<StandupBlocker>) => ({
            id: b.id || randomUUID(),
            title: b.title || 'Unnamed blocker',
            description: b.description || '',
            severity: b.severity || 'medium',
            suggestedAction: b.suggestedAction,
          }))
        : [],
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.map((h: Partial<StandupHighlight>) => ({
            id: h.id || randomUUID(),
            title: h.title || 'Unnamed highlight',
            description: h.description || '',
            type: h.type || 'achievement',
            metric: h.metric,
          }))
        : [],
      velocityTrend: ['increasing', 'stable', 'decreasing'].includes(parsed.velocityTrend)
        ? parsed.velocityTrend
        : 'stable',
      burnoutRisk: ['low', 'medium', 'high'].includes(parsed.burnoutRisk)
        ? parsed.burnoutRisk
        : 'low',
      focusAreas: Array.isArray(parsed.focusAreas)
        ? parsed.focusAreas.map((f: Partial<StandupFocusArea>) => ({
            area: f.area || 'General',
            priority: f.priority || 'medium',
            reason: f.reason || '',
            contextId: f.contextId,
            scanType: f.scanType,
          }))
        : [],
    };
  } catch (error) {
    console.error('[StandupGenerator] Failed to parse LLM response:', error);
    return null;
  }
}

/**
 * Generate a fallback summary without AI
 */
function generateFallbackSummary(
  sourceData: StandupSourceData,
  periodType: 'daily' | 'weekly',
  periodStart: Date,
  periodEnd: Date
): Omit<DbStandupSummary, 'created_at' | 'updated_at'> {
  const implementationsCount = sourceData.implementationLogs.length;
  const ideasGenerated = sourceData.ideas.length;
  const ideasAccepted = sourceData.ideas.filter((i) => i.status === 'accepted').length;
  const ideasRejected = sourceData.ideas.filter((i) => i.status === 'rejected').length;
  const ideasImplemented = sourceData.ideas.filter((i) => i.status === 'implemented').length;

  const periodLabel = periodType === 'daily' ? 'Today' : 'This Week';
  const title = `${periodLabel}'s Development Summary`;

  let summary = '';
  if (implementationsCount > 0) {
    summary += `Completed ${implementationsCount} implementation${implementationsCount > 1 ? 's' : ''} this period. `;
  }
  if (ideasGenerated > 0) {
    summary += `Generated ${ideasGenerated} idea${ideasGenerated > 1 ? 's' : ''}, with ${ideasAccepted} accepted and ${ideasImplemented} implemented. `;
  }
  if (sourceData.scans.length > 0) {
    summary += `Ran ${sourceData.scans.length} scan${sourceData.scans.length > 1 ? 's' : ''} across the project. `;
  }
  if (!summary) {
    summary = 'No significant activity recorded this period.';
  }

  return {
    id: randomUUID(),
    project_id: '', // Will be set by caller
    period_type: periodType,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    title,
    summary: summary.trim(),
    implementations_count: implementationsCount,
    ideas_generated: ideasGenerated,
    ideas_accepted: ideasAccepted,
    ideas_rejected: ideasRejected,
    ideas_implemented: ideasImplemented,
    scans_count: sourceData.scans.length,
    blockers: null,
    highlights: null,
    velocity_trend: 'stable',
    burnout_risk: 'low',
    focus_areas: null,
    input_tokens: null,
    output_tokens: null,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Generate a standup summary using AI
 */
export async function generateStandupSummary(
  projectId: string,
  sourceData: StandupSourceData,
  periodType: 'daily' | 'weekly',
  periodStart: Date,
  periodEnd: Date
): Promise<GenerationResult> {
  const periodLabel =
    periodType === 'daily'
      ? periodStart.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      : `Week of ${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // If no activity, return a simple summary without AI
  const hasActivity =
    sourceData.implementationLogs.length > 0 ||
    sourceData.ideas.length > 0 ||
    sourceData.scans.length > 0;

  if (!hasActivity) {
    const fallback = generateFallbackSummary(sourceData, periodType, periodStart, periodEnd);
    fallback.project_id = projectId;
    return { success: true, summary: fallback };
  }

  const prompt = buildStandupPrompt(sourceData, periodType, periodLabel);

  try {
    const response = await llmManager.generate({
      prompt,
      systemPrompt:
        'You are a technical project manager assistant generating concise development standup summaries. Always respond with valid JSON only.',
      maxTokens: 2000,
      temperature: 0.7,
    });

    if (!response.success || !response.response) {
      console.error('[StandupGenerator] LLM generation failed:', response.error);
      const fallback = generateFallbackSummary(sourceData, periodType, periodStart, periodEnd);
      fallback.project_id = projectId;
      return { success: true, summary: fallback };
    }

    const parsed = parseLLMResponse(response.response);

    if (!parsed) {
      console.error('[StandupGenerator] Failed to parse LLM response');
      const fallback = generateFallbackSummary(sourceData, periodType, periodStart, periodEnd);
      fallback.project_id = projectId;
      return { success: true, summary: fallback };
    }

    const summary: Omit<DbStandupSummary, 'created_at' | 'updated_at'> = {
      id: randomUUID(),
      project_id: projectId,
      period_type: periodType,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      title: parsed.title,
      summary: parsed.summary,
      implementations_count: sourceData.implementationLogs.length,
      ideas_generated: sourceData.ideas.length,
      ideas_accepted: sourceData.ideas.filter((i) => i.status === 'accepted').length,
      ideas_rejected: sourceData.ideas.filter((i) => i.status === 'rejected').length,
      ideas_implemented: sourceData.ideas.filter((i) => i.status === 'implemented').length,
      scans_count: sourceData.scans.length,
      blockers: parsed.blockers.length > 0 ? JSON.stringify(parsed.blockers) : null,
      highlights: parsed.highlights.length > 0 ? JSON.stringify(parsed.highlights) : null,
      velocity_trend: parsed.velocityTrend,
      burnout_risk: parsed.burnoutRisk,
      focus_areas: parsed.focusAreas.length > 0 ? JSON.stringify(parsed.focusAreas) : null,
      input_tokens: response.usage?.prompt_tokens || null,
      output_tokens: response.usage?.completion_tokens || null,
      generated_at: new Date().toISOString(),
    };

    return { success: true, summary };
  } catch (error) {
    console.error('[StandupGenerator] Error generating standup:', error);
    const fallback = generateFallbackSummary(sourceData, periodType, periodStart, periodEnd);
    fallback.project_id = projectId;
    return { success: true, summary: fallback };
  }
}
