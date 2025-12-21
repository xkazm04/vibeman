import { NextRequest, NextResponse } from 'next/server';
import { discoveryConfigRepository } from '@/app/db/repositories/social-discovery.repository';
import {
  DISCOVERY_SYSTEM_PROMPT,
  buildDiscoveryPrompt,
  parseGrokResponse,
} from '@/app/features/Social/sub_SocDiscovery/lib/promptBuilder';
import type { DiscoverySearchResponse } from '@/app/features/Social/sub_SocDiscovery/lib/types';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

/**
 * POST /api/social/discovery/search
 * Execute a discovery search using Grok
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, configId, projectId } = body;

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
    if (!grokApiKey) {
      return NextResponse.json(
        { error: 'Grok API key not configured. Set GROK_API_KEY or XAI_API_KEY.' },
        { status: 500 }
      );
    }

    // Build the prompt
    const userPrompt = buildDiscoveryPrompt(query);

    // Call Grok API
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${grokApiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: DISCOVERY_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Discovery Search] Grok API error:', errorText);
      return NextResponse.json(
        { error: `Grok API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from Grok' },
        { status: 500 }
      );
    }

    // Parse the response
    const { tweets, searchQuery } = parseGrokResponse(content);

    // Update tracking if configId provided
    if (configId) {
      discoveryConfigRepository.updateSearchTracking(configId, tweets.length);
    }

    const result: DiscoverySearchResponse = {
      success: true,
      tweets,
      searchQuery,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Discovery Search] Error:', error);
    return NextResponse.json(
      {
        success: false,
        tweets: [],
        searchQuery: '',
        error: error instanceof Error ? error.message : 'Search failed',
      } as DiscoverySearchResponse,
      { status: 500 }
    );
  }
}
