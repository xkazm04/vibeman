/**
 * Conductor Usage API
 *
 * Returns subscription usage data for CLI providers.
 * - Claude: Rate-limit headers from Anthropic API
 */

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/config/envConfig';

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider');

  try {
    if (provider === 'claude') {
      return NextResponse.json(await getClaudeUsage());
    }

    const [claude] = await Promise.allSettled([getClaudeUsage()]);

    return NextResponse.json({
      ...(claude.status === 'fulfilled' ? claude.value : {}),
    });
  } catch (error) {
    console.error('[conductor/usage] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}

/**
 * Claude: Use countTokens for a minimal call and read rate-limit headers
 * from the raw Response. Every Anthropic API response includes
 * `anthropic-ratelimit-*` headers regardless of endpoint.
 */
async function getClaudeUsage(): Promise<Record<string, unknown>> {
  const apiKey = env.anthropicApiKey();
  if (!apiKey) return {};

  try {
    const client = new Anthropic({ apiKey });
    const { response } = await client.messages
      .countTokens({
        model: 'claude-sonnet-4-6',
        messages: [{ role: 'user', content: 'hi' }],
      })
      .withResponse();

    const reqLimit = response.headers.get('anthropic-ratelimit-requests-limit');
    const reqRemaining = response.headers.get('anthropic-ratelimit-requests-remaining');
    const tokensLimit = response.headers.get('anthropic-ratelimit-tokens-limit');
    const tokensRemaining = response.headers.get('anthropic-ratelimit-tokens-remaining');
    const inputLimit = response.headers.get('anthropic-ratelimit-input-tokens-limit');
    const inputRemaining = response.headers.get('anthropic-ratelimit-input-tokens-remaining');
    const outputLimit = response.headers.get('anthropic-ratelimit-output-tokens-limit');
    const outputRemaining = response.headers.get('anthropic-ratelimit-output-tokens-remaining');

    const limit = reqLimit ? parseInt(reqLimit) : null;
    const remaining = reqRemaining ? parseInt(reqRemaining) : null;

    return {
      claude: {
        used: limit && remaining ? limit - remaining : null,
        limit,
        unit: 'req/min',
        details: {
          tokensUsed:
            tokensLimit && tokensRemaining
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
