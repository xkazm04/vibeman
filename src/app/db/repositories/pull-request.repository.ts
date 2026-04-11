/**
 * Pull Request Repository
 * CRUD operations for the github_pull_requests table.
 */

import { getDatabase } from '../connection';
import { getCurrentTimestamp, selectOne, selectAll } from './repository.utils';

export interface DbPullRequest {
  id: string;
  project_id: string;
  goal_id: string | null;
  pr_number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  html_url: string;
  diff_url: string | null;
  head_branch: string | null;
  base_branch: string | null;
  author: string | null;
  additions: number;
  deletions: number;
  changed_files: number;
  merged_at: string | null;
  digest: string | null;
  digest_generated_at: string | null;
  alignment_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePullRequestInput {
  project_id: string;
  goal_id?: string | null;
  pr_number: number;
  title: string;
  body?: string | null;
  state?: 'open' | 'closed' | 'merged';
  html_url: string;
  diff_url?: string | null;
  head_branch?: string | null;
  base_branch?: string | null;
  author?: string | null;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  merged_at?: string | null;
}

export const pullRequestRepository = {
  create(input: CreatePullRequestInput): DbPullRequest {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    db.prepare(`
      INSERT INTO github_pull_requests (
        id, project_id, goal_id, pr_number, title, body, state, html_url,
        diff_url, head_branch, base_branch, author,
        additions, deletions, changed_files, merged_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, input.project_id, input.goal_id ?? null, input.pr_number,
      input.title, input.body ?? null, input.state ?? 'open', input.html_url,
      input.diff_url ?? null, input.head_branch ?? null, input.base_branch ?? null,
      input.author ?? null,
      input.additions ?? 0, input.deletions ?? 0, input.changed_files ?? 0,
      input.merged_at ?? null, now, now
    );

    return this.getById(id)!;
  },

  getById(id: string): DbPullRequest | null {
    const db = getDatabase();
    return selectOne<DbPullRequest>(db, 'SELECT * FROM github_pull_requests WHERE id = ?', id);
  },

  getByProjectAndNumber(projectId: string, prNumber: number): DbPullRequest | null {
    const db = getDatabase();
    return selectOne<DbPullRequest>(
      db,
      'SELECT * FROM github_pull_requests WHERE project_id = ? AND pr_number = ?',
      projectId, prNumber
    );
  },

  getByProject(projectId: string, limit: number = 50): DbPullRequest[] {
    const db = getDatabase();
    return selectAll<DbPullRequest>(
      db,
      'SELECT * FROM github_pull_requests WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
      projectId, limit
    );
  },

  getByGoal(goalId: string): DbPullRequest[] {
    const db = getDatabase();
    return selectAll<DbPullRequest>(
      db,
      'SELECT * FROM github_pull_requests WHERE goal_id = ? ORDER BY created_at DESC',
      goalId
    );
  },

  getCountsByGoal(projectId: string): { goal_id: string; open_count: number; merged_count: number }[] {
    const db = getDatabase();
    return selectAll(
      db,
      `SELECT goal_id,
        SUM(CASE WHEN state = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN state = 'merged' THEN 1 ELSE 0 END) as merged_count
      FROM github_pull_requests
      WHERE project_id = ? AND goal_id IS NOT NULL
      GROUP BY goal_id`,
      projectId
    );
  },

  updateState(id: string, state: 'open' | 'closed' | 'merged', mergedAt?: string): void {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    if (state === 'merged' && mergedAt) {
      db.prepare('UPDATE github_pull_requests SET state = ?, merged_at = ?, updated_at = ? WHERE id = ?')
        .run(state, mergedAt, now, id);
    } else {
      db.prepare('UPDATE github_pull_requests SET state = ?, updated_at = ? WHERE id = ?')
        .run(state, now, id);
    }
  },

  updateDigest(id: string, digest: string, alignmentScore?: number): void {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    db.prepare(
      'UPDATE github_pull_requests SET digest = ?, alignment_score = ?, digest_generated_at = ?, updated_at = ? WHERE id = ?'
    ).run(digest, alignmentScore ?? null, now, now, id);
  },

  updateGoalLink(id: string, goalId: string | null): void {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    db.prepare('UPDATE github_pull_requests SET goal_id = ?, updated_at = ? WHERE id = ?')
      .run(goalId, now, id);
  },
};
