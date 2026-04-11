/**
 * PR Webhook Handler
 *
 * Processes GitHub pull_request webhook events:
 * - Stores PR metadata in github_pull_requests table
 * - Links PRs to goals via attributePRToGoals()
 * - Triggers AI digest generation on open/synchronize
 */

import { pullRequestRepository } from '@/app/db/repositories/pull-request.repository';
import { attributePRToGoals } from '@/lib/goals/commitAttribution';
import { generatePRDigest } from './prDigestGenerator';
import { getDatabase } from '@/app/db/connection';
import { logger } from '@/lib/logger';
import type { DbGoal } from '@/app/db/models/types';

interface GitHubPRPayload {
  action: string;
  number: number;
  pull_request: {
    number: number;
    title: string;
    body: string | null;
    state: string;
    html_url: string;
    diff_url: string;
    head: { ref: string };
    base: { ref: string };
    user: { login: string };
    additions: number;
    deletions: number;
    changed_files: number;
    merged: boolean;
    merged_at: string | null;
    commits: number;
  };
}

function getActiveGoals(projectId: string): DbGoal[] {
  const db = getDatabase();
  return db.prepare(
    "SELECT * FROM goals WHERE project_id = ? AND status IN ('open', 'in_progress')"
  ).all(projectId) as DbGoal[];
}

/**
 * Handle a GitHub pull_request webhook event.
 * Returns a summary of what was processed.
 */
export async function handlePullRequestEvent(
  projectId: string,
  payload: GitHubPRPayload
): Promise<{ action: string; prId: string | null; goalLinked: boolean; digestGenerated: boolean }> {
  const { action, pull_request: pr } = payload;
  const result = { action, prId: null as string | null, goalLinked: false, digestGenerated: false };

  // Check if we already have this PR
  const existing = pullRequestRepository.getByProjectAndNumber(projectId, pr.number);

  if (action === 'opened' || action === 'reopened') {
    // Create or update the PR record
    let prRecord;
    if (existing) {
      pullRequestRepository.updateState(existing.id, 'open');
      prRecord = pullRequestRepository.getById(existing.id);
    } else {
      prRecord = pullRequestRepository.create({
        project_id: projectId,
        pr_number: pr.number,
        title: pr.title,
        body: pr.body,
        state: 'open',
        html_url: pr.html_url,
        diff_url: pr.diff_url,
        head_branch: pr.head.ref,
        base_branch: pr.base.ref,
        author: pr.user.login,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files,
      });
    }

    if (!prRecord) return result;
    result.prId = prRecord.id;

    // Link to goals via LLM attribution
    const goals = getActiveGoals(projectId);
    if (goals.length > 0) {
      const attribution = await attributePRToGoals(
        { number: pr.number, title: pr.title, body: pr.body || undefined },
        goals
      );
      if (attribution && attribution.goalIds.length > 0) {
        pullRequestRepository.updateGoalLink(prRecord.id, attribution.goalIds[0]);
        result.goalLinked = true;

        // Generate AI digest with goal context
        const linkedGoal = goals.find(g => g.id === attribution.goalIds[0]);
        generatePRDigest(prRecord.id, pr, linkedGoal || null).catch(err => {
          logger.error('[PRWebhook] Digest generation failed', { error: err });
        });
        result.digestGenerated = true;
      }
    }
  } else if (action === 'closed') {
    if (existing) {
      const state = pr.merged ? 'merged' : 'closed';
      pullRequestRepository.updateState(existing.id, state, pr.merged_at || undefined);
      result.prId = existing.id;
    }
  } else if (action === 'synchronize') {
    // PR was updated with new commits — regenerate digest
    if (existing) {
      result.prId = existing.id;
      const goals = getActiveGoals(projectId);
      const linkedGoal = existing.goal_id
        ? goals.find(g => g.id === existing.goal_id) || null
        : null;
      generatePRDigest(existing.id, pr, linkedGoal).catch(err => {
        logger.error('[PRWebhook] Digest regeneration failed', { error: err });
      });
      result.digestGenerated = true;
    }
  }

  return result;
}
