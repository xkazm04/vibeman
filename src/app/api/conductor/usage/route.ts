/**
 * Conductor Usage API
 *
 * Returns subscription usage data for CLI providers.
 * - Claude: Rate-limit headers from Anthropic API
 * - Copilot: Premium request usage from GitHub API
 * - Gemini: Local request tracking (no API available)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider');

  try {
    if (provider === 'claude') {
      return NextResponse.json(await getClaudeUsage());
    }
    if (provider === 'copilot') {
      return NextResponse.json(await getCopilotUsage());
    }
    if (provider === 'gemini') {
      return NextResponse.json(await getGeminiUsage());
    }

    // Return all providers
    const [claude, copilot, gemini] = await Promise.allSettled([
      getClaudeUsage(),
      getCopilotUsage(),
      getGeminiUsage(),
    ]);

    return NextResponse.json({
      ...(claude.status === 'fulfilled' ? claude.value : {}),
      ...(copilot.status === 'fulfilled' ? copilot.value : {}),
      ...(gemini.status === 'fulfilled' ? gemini.value : {}),
    });
  } catch (error) {
    console.error('[conductor/usage] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}

/**
 * Claude: Use a lightweight message count endpoint via rate-limit headers.
 * Every Anthropic API response includes `anthropic-ratelimit-*` headers.
 */
async function getClaudeUsage(): Promise<Record<string, unknown>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return {};

  try {
    // Use the messages endpoint with a minimal payload to get rate-limit headers
    // Using count_tokens endpoint which is cheaper
    const res = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });

    const reqLimit = res.headers.get('anthropic-ratelimit-requests-limit');
    const reqRemaining = res.headers.get('anthropic-ratelimit-requests-remaining');
    const tokensLimit = res.headers.get('anthropic-ratelimit-tokens-limit');
    const tokensRemaining = res.headers.get('anthropic-ratelimit-tokens-remaining');
    const inputLimit = res.headers.get('anthropic-ratelimit-input-tokens-limit');
    const inputRemaining = res.headers.get('anthropic-ratelimit-input-tokens-remaining');
    const outputLimit = res.headers.get('anthropic-ratelimit-output-tokens-limit');
    const outputRemaining = res.headers.get('anthropic-ratelimit-output-tokens-remaining');

    const limit = reqLimit ? parseInt(reqLimit) : null;
    const remaining = reqRemaining ? parseInt(reqRemaining) : null;

    return {
      claude: {
        used: limit && remaining ? limit - remaining : null,
        limit,
        unit: 'req/min',
        details: {
          tokensUsed: tokensLimit && tokensRemaining
            ? parseInt(tokensLimit) - parseInt(tokensRemaining)
            : null,
          tokensLimit: tokensLimit ? parseInt(tokensLimit) : null,
          inputTokensLimit: inputLimit ? parseInt(inputLimit) : null,
          inputTokensRemaining: inputRemaining ? parseInt(inputRemaining) : null,
          outputTokensLimit: outputLimit ? parseInt(outputLimit) : null,
          outputTokensRemaining: outputRemaining ? parseInt(outputRemaining) : null,
        },
      },
    };
  } catch {
    return {};
  }
}

/**
 * Copilot: Use GitHub billing API for premium request usage.
 */
async function getCopilotUsage(): Promise<Record<string, unknown>> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return {};

  try {
    // Get authenticated user's login
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        Accept: 'application/vnd.github+json',
      },
    });

    if (!userRes.ok) return {};
    const user = await userRes.json();

    // Get premium request usage for current month
    const now = new Date();
    const usageRes = await fetch(
      `https://api.github.com/users/${user.login}/settings/billing/premium_request/usage?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!usageRes.ok) return {};
    const usageData = await usageRes.json();

    const totalUsed = (usageData.usageItems || []).reduce(
      (sum: number, item: { grossQuantity?: number }) => sum + (item.grossQuantity || 0),
      0
    );

    // Copilot Pro has 300 premium req/month, Pro+ has 1500
    const estimatedLimit = totalUsed > 300 ? 1500 : 300;

    return {
      copilot: {
        used: totalUsed,
        limit: estimatedLimit,
        unit: 'req/mo',
        details: {
          items: usageData.usageItems?.slice(0, 5),
        },
      },
    };
  } catch {
    return {};
  }
}

/**
 * Gemini: No official API. Track locally from conductor pipeline runs.
 */
async function getGeminiUsage(): Promise<Record<string, unknown>> {
  try {
    const db = getDatabase();

    // Count Gemini-routed tasks from recent conductor runs (last 24h)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM conductor_runs
      WHERE started_at > ? AND config_snapshot LIKE '%gemini%'
    `).get(cutoff) as { count: number } | undefined;

    const used = row?.count || 0;
    // Free tier: 1500 req/day for Gemini Advanced, 1000 for free
    const limit = 1000;

    return {
      gemini: {
        used,
        limit,
        unit: 'req/day',
        details: { source: 'local-tracking' },
      },
    };
  } catch {
    return {};
  }
}
