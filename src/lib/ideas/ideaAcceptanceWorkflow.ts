/**
 * IdeaAcceptanceWorkflow — single source of truth for accepting an idea.
 *
 * Encapsulates the full orchestration:
 *   1. Validate idea state
 *   2. Fetch associated goal / context
 *   3. Build & wrap requirement content
 *   4. Update DB status (rollback-safe: DB first, file second)
 *   5. Write requirement file to disk
 *   6. Record brain signal
 *   7. Surface dependency graph (prerequisites + unlocks)
 *
 * All API routes and services call `acceptIdea()` instead of
 * reimplementing the workflow.
 */

import { ideaDb, goalDb, contextDb, type DbIdea } from '@/app/db';
import { ideaDependencyRepository } from '@/app/db/repositories/idea-dependency.repository';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { buildRequirementFromIdea } from '@/lib/scanner/reqFileBuilder';
import {
  wrapRequirementForMCP,
  wrapRequirementForExecution,
  type WrapperMode,
} from '@/lib/prompts/requirement_file';
import { signalCollector } from '@/lib/brain/signalCollector';
import { IdeaStateMachine } from '@/lib/ideas/ideaStateMachine';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AcceptIdeaOptions {
  ideaId: string;
  projectPath: string;
  wrapperMode?: WrapperMode;
}

export interface DependencyInfo {
  id: string;
  title: string;
  status: string;
  category: string;
}

export interface AcceptIdeaResult {
  success: true;
  requirementName: string;
  wrapperMode: WrapperMode;
  prerequisites: DependencyInfo[];
  unlocks: DependencyInfo[];
}

export interface AcceptIdeaError {
  success: false;
  code: string;
  message: string;
}

export type AcceptIdeaOutcome = AcceptIdeaResult | AcceptIdeaError;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateRequirementName(ideaId: string, title: string): string {
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 30);
  return `idea-${ideaId.substring(0, 8)}-${sanitizedTitle}`;
}

function rollbackStatus(
  ideaId: string,
  previousStatus: DbIdea['status'],
  previousRequirementId: string | null,
): boolean {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      ideaDb.updateIdea(ideaId, {
        status: previousStatus,
        requirement_id: previousRequirementId ?? null,
      });
      const verify = ideaDb.getIdeaById(ideaId);
      if (verify && verify.status === previousStatus) return true;
      logger.warn('[IdeaAcceptance] Rollback verification failed, retrying...', { attempt, ideaId });
    } catch (rollbackError) {
      logger.error('[IdeaAcceptance] Rollback attempt failed:', { rollbackError, attempt, ideaId });
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main workflow
// ---------------------------------------------------------------------------

export function acceptIdea(opts: AcceptIdeaOptions): AcceptIdeaOutcome {
  const { ideaId, projectPath, wrapperMode = 'mcp' } = opts;

  // 1. Validate idea exists and has a title
  const idea = ideaDb.getIdeaById(ideaId);
  if (!idea) {
    return { success: false, code: 'IDEA_NOT_FOUND', message: 'Idea not found' };
  }
  if (!idea.title || typeof idea.title !== 'string') {
    return { success: false, code: 'MISSING_FIELD', message: 'Idea is missing required title field' };
  }

  // 1b. Validate state transition is allowed
  const transition = IdeaStateMachine.authorize(idea.status, 'accepted');
  if (!transition.allowed) {
    return { success: false, code: 'INVALID_TRANSITION', message: transition.reason };
  }

  // 2. Generate requirement file name
  const requirementName = generateRequirementName(ideaId, idea.title);

  // 3. Fetch associated goal / context (optional enrichment)
  let goal = null;
  let context = null;
  try {
    goal = idea.goal_id ? goalDb.getGoalById(idea.goal_id) : null;
    context = idea.context_id ? contextDb.getContextById(idea.context_id) : null;
  } catch (error) {
    logger.error('[IdeaAcceptance] Failed to fetch associated data:', { error });
  }

  // 4. Build requirement content
  let requirementContent: string;
  try {
    requirementContent = buildRequirementFromIdea({ idea, goal, context });
  } catch (error) {
    logger.error('[IdeaAcceptance] Failed to build requirement content:', { error });
    return { success: false, code: 'BUILD_FAILED', message: 'Failed to generate requirement content' };
  }

  // 5. Wrap requirement content
  let wrappedContent: string;
  try {
    wrappedContent =
      wrapperMode === 'full'
        ? wrapRequirementForExecution({
            requirementContent,
            projectPath,
            projectId: idea.project_id,
            contextId: idea.context_id || undefined,
          })
        : wrapRequirementForMCP({
            requirementContent,
            projectId: idea.project_id,
            contextId: idea.context_id || undefined,
          });
  } catch (error) {
    logger.error('[IdeaAcceptance] Failed to wrap requirement content:', { error, wrapperMode });
    return { success: false, code: 'WRAP_FAILED', message: 'Failed to wrap requirement content' };
  }

  // 6. Update DB status FIRST (rollback-safe: DB first, file second)
  const previousStatus = idea.status;
  const previousRequirementId = idea.requirement_id;
  try {
    ideaDb.updateIdea(ideaId, { status: 'accepted', requirement_id: requirementName });
  } catch (error) {
    logger.error('[IdeaAcceptance] Failed to update idea status:', { error });
    return { success: false, code: 'DB_UPDATE_FAILED', message: 'Failed to update idea status' };
  }

  // 7. Write requirement file to disk
  try {
    const result = createRequirement(projectPath, requirementName, wrappedContent, true);
    if (!result.success) throw new Error(result.error || 'File creation failed');
  } catch (error) {
    logger.error('[IdeaAcceptance] Failed to create requirement file, rolling back DB:', { error });
    const ok = rollbackStatus(ideaId, previousStatus, previousRequirementId);
    if (!ok) {
      logger.error(
        '[IdeaAcceptance] CRITICAL: Rollback failed after 3 attempts. Idea may be orphaned.',
        { ideaId, requirementName, previousStatus },
      );
    }
    return { success: false, code: 'FILE_FAILED', message: 'Failed to create requirement file' };
  }

  // 8. Record brain signal (non-critical)
  try {
    signalCollector.recordIdeaDecision(idea.project_id, {
      ideaId: idea.id,
      ideaTitle: idea.title || 'Untitled',
      category: idea.category || 'general',
      accepted: true,
      contextId: idea.context_id || null,
      contextName: context?.name || null,
    });
  } catch { /* signal recording must never break the main flow */ }

  // 9. Surface dependency graph (non-critical)
  let prerequisites: DependencyInfo[] = [];
  let unlocks: DependencyInfo[] = [];
  try {
    prerequisites = ideaDependencyRepository.getPrerequisites(ideaId).map((d) => ({
      id: d.source_id,
      title: d.source_title,
      status: d.source_status,
      category: d.source_category,
    }));
    unlocks = ideaDependencyRepository.getUnlockedByAccepting(ideaId).map((d) => ({
      id: d.target_id,
      title: d.target_title,
      status: d.target_status,
      category: d.target_category,
    }));
  } catch { /* dependency surfacing must never break the accept flow */ }

  return {
    success: true,
    requirementName,
    wrapperMode,
    prerequisites,
    unlocks,
  };
}
