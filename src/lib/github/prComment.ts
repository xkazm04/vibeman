/**
 * PR Comment poster
 *
 * Publishes the AI PR digest back to the pull request as a single, self-updating
 * comment (REST issues/comments API). This is the growth surface: every reviewer
 * on the PR sees an attributed, useful review instead of it sitting in local DB.
 *
 * Idempotent — finds our own previous comment (via a hidden marker) and edits it
 * on `synchronize`, so a PR never accrues duplicate digests.
 */

import { getGitHubToken } from './client';
import { logger } from '@/lib/logger';

const GITHUB_API = 'https://api.github.com';

/** Hidden marker used to locate + update our own comment instead of duplicating. */
const MARKER = '<!-- vibeman-pr-digest -->';

/** Parse owner/repo from a PR html_url like https://github.com/owner/repo/pull/123 */
export function parseRepoFromUrl(htmlUrl: string): { owner: string; repo: string } | null {
  const m = htmlUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\//);
  return m ? { owner: m[1], repo: m[2] } : null;
}

function ghFetch(path: string, init: RequestInit, token: string): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });
}

/**
 * Create, or update in place, a single Vibeman digest comment on a PR.
 * Returns true when the comment was posted/updated.
 */
export async function upsertPullRequestComment(
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
): Promise<boolean> {
  const token = getGitHubToken();
  if (!token) {
    logger.warn('[PRComment] No GitHub token configured — skipping PR comment');
    return false;
  }

  const fullBody = `${body}\n\n${MARKER}`;

  try {
    // Look for an existing Vibeman comment to edit.
    const listRes = await ghFetch(
      `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`,
      { method: 'GET' },
      token,
    );
    if (listRes.ok) {
      const comments = (await listRes.json()) as Array<{ id: number; body?: string }>;
      const existing = comments.find((c) => c.body?.includes(MARKER));
      if (existing) {
        const patchRes = await ghFetch(
          `/repos/${owner}/${repo}/issues/comments/${existing.id}`,
          { method: 'PATCH', body: JSON.stringify({ body: fullBody }) },
          token,
        );
        if (!patchRes.ok) {
          logger.warn('[PRComment] Failed to update comment', { status: patchRes.status });
        }
        return patchRes.ok;
      }
    }

    // No existing comment — create one.
    const createRes = await ghFetch(
      `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      { method: 'POST', body: JSON.stringify({ body: fullBody }) },
      token,
    );
    if (!createRes.ok) {
      logger.warn('[PRComment] Failed to create comment', { status: createRes.status });
    }
    return createRes.ok;
  } catch (error) {
    logger.error('[PRComment] Failed to upsert PR comment', { error });
    return false;
  }
}
