/**
 * Domain Event Subscribers
 *
 * Handles cross-cutting side effects triggered by domain events.
 * Replaces scattered fire-and-forget try-catch blocks with centralized,
 * observable handlers that log errors instead of silently swallowing them.
 *
 * Each subscriber is isolated — one failing subscriber never blocks another.
 */

import { eventBus } from './eventBus';
import type { ImplementationLoggedEvent, TaskExecutionCompletedEvent, QuestionAnsweredEvent, BrainDirectionChangedEvent } from './types';
import { logger } from '@/lib/logger';

let registered = false;

/**
 * Register all domain event subscribers.
 * Safe to call multiple times — only registers once.
 */
export function registerDomainSubscribers(): void {
  if (registered) return;
  registered = true;

  eventBus.on('domain:implementation_logged', onImplementationLogged);
  eventBus.on('domain:task_execution_completed', onTaskExecutionCompleted);
  eventBus.on('question:answered', onQuestionAnswered);
  eventBus.on('brain:direction_changed', onDirectionChanged);
}

// ── Implementation Logged ────────────────────────────────────────────────────

function onImplementationLogged(event: ImplementationLoggedEvent): void {
  const { projectId, logId, requirementName, contextId, provider, model } = event;
  if (!projectId) return;

  // 1. Record brain signal
  try {
    const { signalCollector } = require('@/lib/brain/signalCollector');
    signalCollector.recordImplementation(projectId, {
      requirementId: logId,
      requirementName,
      contextId: contextId || null,
      filesCreated: [],
      filesModified: [],
      filesDeleted: [],
      success: true,
      executionTimeMs: 0,
      provider,
      model,
    });
  } catch (error) {
    logger.error('[DomainEvent] Signal recording failed for implementation_logged', {
      logId,
      projectId,
      error,
    });
  }

  // 2. Invalidate brain context cache
  try {
    const { invalidateContextCache } = require('@/lib/brain/brainService');
    invalidateContextCache(projectId);
  } catch (error) {
    logger.error('[DomainEvent] Context cache invalidation failed', {
      projectId,
      error,
    });
  }

  // 3. Auto-update idea status to 'implemented'
  try {
    const { ideaDb, contextDb } = require('@/app/db');
    const idea = ideaDb.getIdeaByRequirementId(requirementName);
    if (idea && idea.status !== 'implemented') {
      ideaDb.updateIdea(idea.id, { status: 'implemented' });
      if (idea.context_id) {
        contextDb.incrementImplementedTasks(idea.context_id);
      }
    }
  } catch (error) {
    logger.error('[DomainEvent] Idea status update failed', {
      requirementName,
      error,
    });
  }

  // 4. Check goal completion
  if (contextId) {
    try {
      const { checkGoalCompletion } = require('@/lib/goals/goalService');
      checkGoalCompletion(contextId, projectId);
    } catch (error) {
      logger.error('[DomainEvent] Goal completion check failed', {
        contextId,
        projectId,
        error,
      });
    }
  }
}

// ── Task Execution Completed ─────────────────────────────────────────────────

function onTaskExecutionCompleted(event: TaskExecutionCompletedEvent): void {
  const {
    projectId, taskId, requirementName, success, durationMs,
    filesModified, error, provider, model,
  } = event;
  if (!projectId) return;

  // 1. Record implementation signal (success or failure)
  try {
    const { signalCollector } = require('@/lib/brain/signalCollector');
    signalCollector.recordImplementation(projectId, {
      requirementId: taskId,
      requirementName,
      contextId: null,
      filesCreated: [],
      filesModified: filesModified || [],
      filesDeleted: [],
      success,
      executionTimeMs: durationMs || 0,
      error: success ? undefined : error,
      provider,
      model,
    });
  } catch (err) {
    logger.error('[DomainEvent] Signal recording failed for task_execution_completed', {
      taskId,
      projectId,
      error: err,
    });
  }

  // 2. Invalidate brain context cache
  try {
    const { invalidateContextCache } = require('@/lib/brain/brainService');
    invalidateContextCache(projectId);
  } catch (err) {
    logger.error('[DomainEvent] Context cache invalidation failed', {
      projectId,
      error: err,
    });
  }

  // 3. Record collective memory learning
  if (success) {
    try {
      const { onTaskCompleted } = require('@/lib/collective-memory/taskCompletionHook');
      onTaskCompleted({
        projectId,
        taskId,
        requirementName,
        success: true,
        filesChanged: filesModified || [],
        durationMs,
      });
    } catch (err) {
      logger.error('[DomainEvent] Collective memory recording failed', {
        taskId,
        error: err,
      });
    }
  } else {
    try {
      const { onTaskCompleted } = require('@/lib/collective-memory/taskCompletionHook');
      onTaskCompleted({
        projectId,
        taskId,
        requirementName,
        success: false,
        filesChanged: filesModified || [],
        errorMessage: error,
        durationMs,
      });
    } catch (err) {
      logger.error('[DomainEvent] Collective memory recording failed', {
        taskId,
        error: err,
      });
    }
  }
}

// ── Direction Changed ────────────────────────────────────────────────────────

function onDirectionChanged(event: BrainDirectionChangedEvent): void {
  const { projectId, directionId, action, contextId, contextName } = event;
  if (!projectId) return;

  // 1. Record brain signal
  try {
    const { signalCollector } = require('@/lib/brain/signalCollector');
    signalCollector.recordContextFocus(projectId, {
      contextId: contextId || directionId,
      contextName: contextName || directionId,
      duration: 0,
      actions: [`${action}_direction`],
    });
  } catch (error) {
    logger.error('[DomainEvent] Signal recording failed for direction_changed', {
      directionId,
      action,
      projectId,
      error,
    });
  }

  // 2. Record insight influence for causal validation
  try {
    const { brainInsightDb, insightInfluenceDb } = require('@/app/db');
    const activeInsights = brainInsightDb.getForEffectiveness(projectId);
    if (activeInsights.length > 0) {
      const now = new Date().toISOString();
      const insightBatch = activeInsights.map((i: { id: string; title: string; completed_at?: string | null }) => ({
        id: i.id,
        title: i.title,
        shownAt: i.completed_at || now,
      }));
      insightInfluenceDb.recordInfluenceBatch(projectId, directionId, action, insightBatch);

      // If there's a paired direction (from pair acceptance), record its influence too
      if (event.pairedDirectionId && event.pairedAction) {
        insightInfluenceDb.recordInfluenceBatch(projectId, event.pairedDirectionId, event.pairedAction, insightBatch);
      }
    }
  } catch (error) {
    logger.error('[DomainEvent] Insight influence recording failed for direction_changed', {
      directionId,
      action,
      projectId,
      error,
    });
  }

  // 3. Invalidate effectiveness + preference caches
  try {
    const { insightEffectivenessCache } = require('@/app/db');
    insightEffectivenessCache.invalidate(projectId);
  } catch (error) {
    logger.error('[DomainEvent] Cache invalidation failed for direction_changed', {
      projectId,
      error,
    });
  }

  // 4. Invalidate direction preference cache (relevant for pair decisions)
  if (event.pairedDirectionId) {
    try {
      const { directionPreferenceDb } = require('@/app/db');
      directionPreferenceDb.invalidate(projectId);
    } catch (error) {
      logger.error('[DomainEvent] Preference cache invalidation failed for direction_changed', {
        projectId,
        error,
      });
    }
  }
}

// ── Question Answered (Auto-Deepen) ─────────────────────────────────────────

async function onQuestionAnswered(event: QuestionAnsweredEvent): Promise<void> {
  const { projectId, questionId, answer } = event;
  if (!projectId) return;

  try {
    const { questionDb } = require('@/app/db');
    const { analyzeAnswerGaps, buildGapTargetingPrompt } = require('@/lib/questions/gapDetector');
    const { v4: uuidv4 } = require('uuid');

    const question = questionDb.getQuestionById(questionId);
    if (!question || question.status !== 'answered' || !question.answer) return;

    // Run gap analysis
    const analysis = analyzeAnswerGaps(questionId, answer);

    // Save gap analysis on the question
    questionDb.updateQuestion(questionId, {
      gap_score: analysis.gapScore,
      gap_analysis: JSON.stringify(analysis.gaps),
    });

    if (!analysis.shouldDeepen) {
      logger.info('[DomainEvent] Auto-deepen: answer is clear, no follow-ups needed', {
        questionId,
        gapScore: analysis.gapScore,
      });

      const { emitQuestionAutoDeepened } = require('./domainEmitters');
      emitQuestionAutoDeepened({
        projectId,
        questionId,
        deepened: false,
        gapScore: analysis.gapScore,
        gapCount: analysis.gaps.length,
        summary: analysis.summary,
        generatedCount: 0,
      });
      return;
    }

    // Check if follow-up children already exist
    const existingChildren = questionDb.getChildQuestions(questionId);
    if (existingChildren.length > 0) {
      const { emitQuestionAutoDeepened } = require('./domainEmitters');
      emitQuestionAutoDeepened({
        projectId,
        questionId,
        deepened: false,
        gapScore: analysis.gapScore,
        gapCount: analysis.gaps.length,
        summary: analysis.summary,
        generatedCount: 0,
      });
      return;
    }

    // Get ancestry chain for context
    const { questionTreeService } = require('@/lib/questions/questionTreeService');
    const chain = questionTreeService.getAncestryChain(questionId);
    const newDepth = (question.tree_depth ?? 0) + 1;

    const strategicContext = chain
      .filter((q: { status: string; answer: string | null }) => q.status === 'answered' && q.answer)
      .map((q: { question: string; answer: string }, i: number) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`)
      .join('\n\n');

    // Generate gap-targeted follow-ups via LLM
    const { llmManager } = await import('@/lib/llm');
    const gapTargetingPrompt = buildGapTargetingPrompt(analysis);
    const count = Math.min(Math.max(analysis.gaps.length, 2), 3);

    const prompt = buildAutoDeepenPrompt(question, strategicContext, gapTargetingPrompt, count);

    const result = await llmManager.generate({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      prompt,
      maxTokens: 2048,
      temperature: 0.7,
      taskType: 'auto-deepen-questions',
    });

    const responseText = typeof result.response === 'string' ? result.response : '';
    const generatedQuestions = parseFollowUpQuestions(responseText, count);

    if (generatedQuestions.length === 0) {
      logger.warn('[DomainEvent] Auto-deepen: LLM failed to generate questions', { questionId });
      const { emitQuestionAutoDeepened } = require('./domainEmitters');
      emitQuestionAutoDeepened({
        projectId,
        questionId,
        deepened: false,
        gapScore: analysis.gapScore,
        gapCount: analysis.gaps.length,
        summary: analysis.summary,
        generatedCount: 0,
      });
      return;
    }

    // Create follow-up questions in DB, flagged as auto-deepened
    const createdQuestions = generatedQuestions.map((questionText: string) => {
      return questionDb.createQuestion({
        id: `question_${uuidv4()}`,
        project_id: question.project_id,
        context_map_id: question.context_map_id,
        context_map_title: question.context_map_title,
        question: questionText,
        parent_id: questionId,
        tree_depth: newDepth,
        auto_deepened: 1,
      });
    });

    logger.info('[DomainEvent] Auto-deepen: generated targeted follow-ups', {
      questionId,
      gapScore: analysis.gapScore,
      generatedCount: createdQuestions.length,
      depth: newDepth,
    });

    const { emitQuestionAutoDeepened } = require('./domainEmitters');
    emitQuestionAutoDeepened({
      projectId,
      questionId,
      deepened: true,
      gapScore: analysis.gapScore,
      gapCount: analysis.gaps.length,
      summary: analysis.summary,
      generatedCount: createdQuestions.length,
    });
  } catch (error) {
    logger.error('[DomainEvent] Auto-deepen failed', { questionId, error });
  }
}

// ── Auto-Deepen Helpers ──────────────────────────────────────────────────────

function buildAutoDeepenPrompt(
  parent: { question: string; answer: string | null; context_map_title: string },
  strategicContext: string,
  gapTargetingPrompt: string,
  count: number
): string {
  return `You are a strategic product advisor conducting an adaptive interview. Your goal is to eliminate ambiguity from the user's answers by asking precise follow-up questions.

## Context Area: ${parent.context_map_title}

## Decision Chain So Far:
${strategicContext}
${gapTargetingPrompt}

## Task:
Generate exactly ${count} follow-up questions that:
1. Each directly targets a specific gap detected in the user's answer
2. Force a concrete, binary or specific choice (not open-ended)
3. Reference the exact hedging language or conditional the user used
4. Cannot be answered with another vague response

## Format:
Return ONLY the questions, one per line, prefixed with "Q: ". No other text.

Example:
Q: You said "it depends on scale" — at what specific user count does the architecture need to change: 1K, 10K, or 100K concurrent users?
Q: You mentioned both Redis and in-memory caching as options — which one should be the primary cache layer for v1?
Q: You said you'd "figure out auth later" — should we block on auth implementation before shipping, or launch without it?`;
}

function parseFollowUpQuestions(text: string, maxCount: number): string[] {
  const lines = text.split('\n').filter((l: string) => l.trim());
  const questions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(?:[-*]?\s*)?(?:Q\d*[:.]\s*)?(.+\?)\s*$/i);
    if (match && match[1]) {
      questions.push(match[1].trim());
      if (questions.length >= maxCount) break;
    } else if (trimmed.endsWith('?')) {
      questions.push(trimmed.replace(/^[-*]\s*/, ''));
      if (questions.length >= maxCount) break;
    }
  }

  return questions;
}
