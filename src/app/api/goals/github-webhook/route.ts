/**
 * POST /api/goals/github-webhook
 *
 * Inbound GitHub webhook receiver for commit attribution.
 * Accepts push and pull_request events, uses LLM to analyze
 * commit messages against active goals, and pipes attributed
 * signals through the lifecycle engine.
 *
 * Setup: Configure a GitHub webhook pointing to this URL with:
 *   - Content type: application/json
 *   - Secret: same value as GITHUB_WEBHOOK_SECRET env var
 *   - Events: push, pull_request
 *
 * GET returns configuration status for the webhook.
 */

import { NextRequest, NextResponse } from 'next/server';
import { goalDb } from '@/app/db';
import { processSignal } from '@/lib/goals/goalLifecycleEngine';
import { verifyGitHubSignature } from '@/lib/integrations/webhookSignature';
import { attributeCommitsToGoals, attributePRToGoals } from '@/lib/goals/commitAttribution';
import type { CommitInfo, PRInfo } from '@/lib/goals/commitAttribution';
import { checkRateLimit } from '@/lib/api-helpers/rateLimiter';
import { env } from '@/lib/config/envConfig';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// GET — configuration status
// ---------------------------------------------------------------------------

export async function GET() {
  const secret = env.githubWebhookSecret();
  const configured = !!secret;

  return NextResponse.json({
    configured,
    webhookUrl: '/api/goals/github-webhook',
    requiredEnvVars: {
      GITHUB_WEBHOOK_SECRET: configured ? 'set' : 'missing',
    },
    supportedEvents: ['push', 'pull_request'],
  });
}

// ---------------------------------------------------------------------------
// POST — webhook receiver
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, '/api/goals/github-webhook', 'strict');
  if (rateLimited) return rateLimited;

  try {
    // Read raw body for signature verification
    const bodyText = await request.text();

    // Verify webhook signature
    const secret = env.githubWebhookSecret();
    if (!secret) {
      return NextResponse.json(
        { error: 'GITHUB_WEBHOOK_SECRET not configured' },
        { status: 503 }
      );
    }

    const sigHeader = request.headers.get('x-hub-signature-256');
    const verification = verifyGitHubSignature(bodyText, sigHeader, secret);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Signature verification failed' },
        { status: 401 }
      );
    }

    // Parse verified body
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Determine event type
    const githubEvent = request.headers.get('x-github-event');
    if (!githubEvent) {
      return NextResponse.json({ error: 'Missing x-github-event header' }, { status: 400 });
    }

    // Require projectId to know which goals to match against
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch active goals for this project
    const allGoals = goalDb.getGoalsByProject(projectId);
    const activeGoals = allGoals.filter(
      g => g.status === 'open' || g.status === 'in_progress'
    );

    if (activeGoals.length === 0) {
      return NextResponse.json({
        ok: true,
        event: githubEvent,
        message: 'No active goals to attribute to',
        signalsCreated: 0,
      });
    }

    // Route to the appropriate handler
    if (githubEvent === 'push') {
      const result = await handlePushEvent(body, activeGoals, projectId);
      return NextResponse.json({ ok: true, event: 'push', ...result });
    }

    if (githubEvent === 'pull_request') {
      const result = await handlePullRequestEvent(body, activeGoals, projectId);
      return NextResponse.json({ ok: true, event: 'pull_request', ...result });
    }

    // Ping event (sent on webhook creation) — acknowledge
    if (githubEvent === 'ping') {
      return NextResponse.json({ ok: true, event: 'ping', message: 'Webhook configured' });
    }

    return NextResponse.json({
      ok: true,
      event: githubEvent,
      message: `Event type '${githubEvent}' not processed for commit attribution`,
      signalsCreated: 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[GitHubWebhook] Error processing webhook', { error: message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Push event handler
// ---------------------------------------------------------------------------

async function handlePushEvent(
  body: Record<string, unknown>,
  goals: ReturnType<typeof goalDb.getGoalsByProject>,
  projectId: string
) {
  const rawCommits = body.commits as Array<{
    id: string;
    message: string;
    author?: { name?: string };
    timestamp?: string;
  }> | undefined;

  if (!rawCommits || rawCommits.length === 0) {
    return { signalsCreated: 0, message: 'No commits in push event' };
  }

  // Map to our CommitInfo shape
  const commits: CommitInfo[] = rawCommits.map(c => ({
    sha: c.id,
    message: c.message,
    author: c.author?.name,
    timestamp: c.timestamp,
  }));

  // Use LLM to attribute commits to goals
  const attributions = await attributeCommitsToGoals(commits, goals);

  let signalsCreated = 0;
  const matchedGoals = new Set<string>();

  for (const attr of attributions) {
    for (const goalId of attr.goalIds) {
      const result = processSignal({
        projectId,
        signalType: 'git_commit',
        contextId: attr.contextId,
        sourceId: attr.sourceId,
        sourceTitle: attr.sourceTitle,
        description: `Attributed commit: ${attr.sourceTitle}`,
        metadata: {
          attribution: 'llm',
          sha: attr.sourceId,
          targetGoalId: goalId,
        },
      });
      signalsCreated += result.matchedGoals.length;
      result.matchedGoals.forEach(id => matchedGoals.add(id));
    }
  }

  logger.info('[GitHubWebhook] Push event processed', {
    commits: commits.length,
    attributions: attributions.length,
    signalsCreated,
    matchedGoals: [...matchedGoals],
  });

  return {
    commitsReceived: commits.length,
    commitsAttributed: attributions.length,
    signalsCreated,
    matchedGoals: [...matchedGoals],
  };
}

// ---------------------------------------------------------------------------
// Pull request event handler
// ---------------------------------------------------------------------------

async function handlePullRequestEvent(
  body: Record<string, unknown>,
  goals: ReturnType<typeof goalDb.getGoalsByProject>,
  projectId: string
) {
  const action = body.action as string | undefined;

  // Only process opened, closed (merged), or synchronize events
  if (!action || !['opened', 'closed', 'synchronize'].includes(action)) {
    return { signalsCreated: 0, message: `PR action '${action}' not processed` };
  }

  const pr = body.pull_request as {
    number: number;
    title: string;
    body?: string;
    merged?: boolean;
  } | undefined;

  if (!pr) {
    return { signalsCreated: 0, message: 'No pull_request data in event' };
  }

  // Skip closed-but-not-merged PRs
  if (action === 'closed' && !pr.merged) {
    return { signalsCreated: 0, message: 'PR closed without merge, skipped' };
  }

  const prInfo: PRInfo = {
    number: pr.number,
    title: pr.title,
    body: pr.body || undefined,
  };

  const attribution = await attributePRToGoals(prInfo, goals);

  if (!attribution) {
    return { signalsCreated: 0, message: 'No goals matched for this PR' };
  }

  let signalsCreated = 0;
  const matchedGoals = new Set<string>();

  // For merged PRs, use a higher-weight signal type since merge = concrete progress
  const signalType = (action === 'closed' && pr.merged)
    ? 'implementation_log' as const
    : 'git_commit' as const;

  for (const goalId of attribution.goalIds) {
    const result = processSignal({
      projectId,
      signalType,
      contextId: attribution.contextId,
      sourceId: attribution.sourceId,
      sourceTitle: attribution.sourceTitle,
      description: action === 'closed'
        ? `Merged PR #${pr.number}: ${pr.title}`
        : `PR #${pr.number} ${action}: ${pr.title}`,
      metadata: {
        attribution: 'llm',
        prNumber: pr.number,
        prAction: action,
        merged: pr.merged || false,
        targetGoalId: goalId,
      },
    });
    signalsCreated += result.matchedGoals.length;
    result.matchedGoals.forEach(id => matchedGoals.add(id));
  }

  logger.info('[GitHubWebhook] PR event processed', {
    prNumber: pr.number,
    action,
    signalType,
    signalsCreated,
    matchedGoals: [...matchedGoals],
  });

  return {
    prNumber: pr.number,
    prAction: action,
    signalType,
    signalsCreated,
    matchedGoals: [...matchedGoals],
  };
}
