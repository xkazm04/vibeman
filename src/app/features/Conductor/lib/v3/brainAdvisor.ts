/**
 * Brain Advisor — Conductor v3 Brain Integration
 *
 * Three integration points connecting the v3 pipeline to the Brain subsystem:
 *
 * 1. Pre-cycle: Generate clarifying questions about the goal via LLM
 * 2. During PLAN: Extract warnings from Brain behavioral context
 * 3. After REFLECT: Feed implementation outcomes back to Brain
 *
 * All functions are non-blocking — failures return empty/void gracefully.
 */

import { getBehavioralContext } from '@/lib/brain/behavioralContext';
import { recordSignal } from '@/lib/brain/brainService';
import { SignalType } from '@/types/signals';
import type { V3Task, ReflectOutput } from './types';

// ============================================================================
// Types
// ============================================================================

export interface BrainQuestion {
  id: string;
  question: string;
  context: string;
}

export interface GenerateBrainQuestionsInput {
  projectId: string;
  projectPath: string;
  goalTitle: string;
  goalDescription: string;
}

export interface GetBrainWarningsInput {
  projectId: string;
  projectPath: string;
}

export interface FeedBrainOutcomeInput {
  projectId: string;
  tasks: V3Task[];
  reflectOutput: ReflectOutput;
}

// ============================================================================
// Moment 1: Pre-cycle — Generate Brain Questions
// ============================================================================

/**
 * Generate 3-5 clarifying questions about the goal via LLM.
 * Uses the local AI chat endpoint (same pattern as intent refinement).
 * Non-blocking: returns empty array on any failure.
 */
export async function generateBrainQuestions(
  input: GenerateBrainQuestionsInput
): Promise<BrainQuestion[]> {
  try {
    const prompt = buildQuestionPrompt(input.goalTitle, input.goalDescription, input.projectPath);

    const response = await fetch('http://localhost:3000/api/llm/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, provider: 'anthropic', temperature: 0.3 }),
    });

    if (!response.ok) {
      console.warn('[BrainAdvisor] Question generation failed:', response.status);
      return [];
    }

    const data = await response.json();
    if (!data.success || !data.response) {
      console.warn('[BrainAdvisor] LLM returned no response');
      return [];
    }
    const content = data.response;

    // Parse JSON from the response — handle markdown code fences
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      console.warn('[BrainAdvisor] Unexpected response shape, no questions array');
      return [];
    }

    return parsed.questions
      .filter(
        (q: Record<string, unknown>) =>
          typeof q.id === 'string' &&
          typeof q.question === 'string' &&
          typeof q.context === 'string'
      )
      .slice(0, 5) as BrainQuestion[];
  } catch (err) {
    console.warn('[BrainAdvisor] generateBrainQuestions failed:', err);
    return [];
  }
}

function buildQuestionPrompt(
  goalTitle: string,
  goalDescription: string,
  projectPath: string
): string {
  return `You are an experienced software architect reviewing a development goal before implementation begins.

Project path: ${projectPath}

Goal title: ${goalTitle}
Goal description: ${goalDescription}

Generate 3-5 clarifying questions that would help produce a better implementation plan.
Focus on:
- Ambiguous requirements that need clarification
- Edge cases the user may not have considered
- Dependencies or constraints that could affect the approach
- Scope boundaries (what's included vs excluded)

Respond with ONLY a JSON object in this exact format:
{
  "questions": [
    { "id": "q1", "question": "The question text", "context": "Why this matters for the plan" },
    { "id": "q2", "question": "...", "context": "..." }
  ]
}`;
}

// ============================================================================
// Moment 2: During PLAN — Get Brain Warnings
// ============================================================================

/**
 * Extract actionable warnings from Brain behavioral context.
 * Inspects insights, revert counts, and success rates.
 * Synchronous — uses in-process Brain data.
 */
export function getBrainWarnings(input: GetBrainWarningsInput): string[] {
  try {
    const ctx = getBehavioralContext(input.projectId);

    if (!ctx.hasData) {
      return [];
    }

    const warnings: string[] = [];

    // High-confidence warning insights
    if (ctx.topInsights && ctx.topInsights.length > 0) {
      for (const insight of ctx.topInsights) {
        if (insight.confidence > 70 && insight.type === 'warning') {
          warnings.push(`[Brain] ${insight.title}: ${insight.description}`);
        }
      }
    }

    // Revert pattern detection
    if (ctx.patterns.revertedCount > 0) {
      warnings.push(
        `[Brain] ${ctx.patterns.revertedCount} recent revert(s) detected — avoid similar patterns`
      );
    }

    // Low success rate warning
    if (ctx.patterns.successRate > 0 && ctx.patterns.successRate < 50) {
      warnings.push(
        `[Brain] Low implementation success rate (${ctx.patterns.successRate}%) — consider simpler tasks`
      );
    }

    return warnings;
  } catch (err) {
    console.warn('[BrainAdvisor] getBrainWarnings failed:', err);
    return [];
  }
}

// ============================================================================
// Moment 4: Get Knowledge Base Context for Plan Phase
// ============================================================================

/**
 * Retrieve relevant Knowledge Base entries for a goal context.
 * Uses dynamic require to avoid circular dependencies.
 * Non-blocking: returns empty string on any failure.
 */
export function getKBContext(input: {
  projectId: string;
  goalTitle: string;
  goalDescription: string;
}): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { knowledgeBaseService } = require('@/lib/knowledge-base/knowledgeBaseService');
    const entries = knowledgeBaseService.getRelevantForTask({
      taskTitle: input.goalTitle,
      taskDescription: input.goalDescription,
      projectId: input.projectId,
      limit: 10,
    });
    if (entries.length === 0) return '';
    return knowledgeBaseService.formatKBForPrompt(entries);
  } catch (err) {
    console.warn('[BrainAdvisor] getKBContext failed:', err);
    return '';
  }
}

// ============================================================================
// Moment 3: After REFLECT — Feed Outcome to Brain
// ============================================================================

/**
 * Feed implementation outcomes back to the Brain as behavioral signals.
 * Records a signal for each completed task and an overall summary signal.
 * Non-blocking: catches and logs all errors.
 */
export async function feedBrainOutcome(input: FeedBrainOutcomeInput): Promise<void> {
  try {
    const { projectId, tasks, reflectOutput } = input;

    // Record individual task outcomes
    const completedTasks = tasks.filter((t) => t.status === 'completed' && t.result);
    const failedTasks = tasks.filter((t) => t.status === 'failed');

    for (const task of completedTasks) {
      recordSignal({
        projectId,
        signalType: SignalType.IMPLEMENTATION,
        data: {
          taskTitle: task.title,
          success: task.result?.success ?? true,
          filesChanged: task.result?.filesChanged ?? [],
          executionTimeMs: task.result?.durationMs ?? 0,
          provider: task.result?.provider ?? 'unknown',
          model: task.result?.model ?? 'unknown',
          commitSha: task.result?.commitSha,
          source: 'conductor-v3',
        },
      });
    }

    // Record overall cycle outcome summary
    recordSignal({
      projectId,
      signalType: SignalType.IMPLEMENTATION,
      data: {
        taskTitle: `[v3 cycle] ${reflectOutput.summary}`,
        success: reflectOutput.status === 'done' || completedTasks.length > failedTasks.length,
        filesChanged: completedTasks.flatMap((t) => t.result?.filesChanged ?? []),
        executionTimeMs: 0,
        provider: 'conductor-v3',
        model: 'aggregate',
        lessonsLearned: reflectOutput.lessonsLearned,
        source: 'conductor-v3',
      },
    });
    // Best-effort KB enrichment for completed tasks
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@/lib/knowledge-base/knowledgeEnrichment') as {
        knowledgeEnrichment?: { enrichFromTask: (input: { projectId: string; taskTitle: string; filesChanged: string[] }) => void };
      };
      if (mod.knowledgeEnrichment) {
        for (const task of completedTasks) {
          mod.knowledgeEnrichment.enrichFromTask({
            projectId,
            taskTitle: task.title,
            filesChanged: task.result?.filesChanged ?? [],
          });
        }
      }
    } catch {
      // knowledgeEnrichment module may not exist yet — silently ignore
    }
  } catch (err) {
    console.warn('[BrainAdvisor] feedBrainOutcome failed:', err);
  }
}
