/**
 * Migration 228: GitHub Pull Requests
 *
 * Creates a table to store PR metadata linked to goals.
 * Populated by the GitHub webhook receiver when PR events arrive.
 * Supports AI-generated review digests stored alongside PR data.
 */

import type { MigrationLogger } from './migration.utils';

export function migrate228GithubPullRequests(
  db: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown }; exec: (sql: string) => void },
  logger: MigrationLogger
) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS github_pull_requests (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        goal_id TEXT,
        pr_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'closed', 'merged')),
        html_url TEXT NOT NULL,
        diff_url TEXT,
        head_branch TEXT,
        base_branch TEXT,
        author TEXT,
        additions INTEGER DEFAULT 0,
        deletions INTEGER DEFAULT 0,
        changed_files INTEGER DEFAULT 0,
        merged_at TEXT,
        digest TEXT,
        digest_generated_at TEXT,
        alignment_score INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
      )
    `);
    logger.info('[Migration 228] Created github_pull_requests table');
  } catch (e: unknown) {
    logger.info('[Migration 228] github_pull_requests table may already exist');
  }

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_gh_pr_project ON github_pull_requests(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_gh_pr_goal ON github_pull_requests(goal_id)',
    'CREATE INDEX IF NOT EXISTS idx_gh_pr_state ON github_pull_requests(state, project_id)',
    'CREATE INDEX IF NOT EXISTS idx_gh_pr_number ON github_pull_requests(project_id, pr_number)',
    'CREATE INDEX IF NOT EXISTS idx_gh_pr_created ON github_pull_requests(created_at DESC)',
  ];

  for (const idx of indexes) {
    try {
      db.prepare(idx).run();
    } catch {
      // Index might already exist
    }
  }

  logger.info('[Migration 228] GitHub pull requests migration complete');
}
