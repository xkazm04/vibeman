/**
 * Conductor Usage API
 *
 * Returns subscription usage data for CLI providers.
 * - Claude: Rate-limit headers from Anthropic API
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/config/envConfig';

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider');

  try {
    if (provider === 'claude') {
      return NextResponse.json(await getClaudeUsage());
    }

    // Return all providers
    const [claude] = await Promise.allSettled([
      getClaudeUsage(),
    ]);

    return NextResponse.json({
      ...(claude.status === 'fulfilled' ? claude.value : {}),
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
  const apiKey = env.anthropicApiKey();
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
